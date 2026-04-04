const Policy = require("../models/Policy");
const LinkedWorker = require("../models/LinkedWorker");
const DailyPayoutDecision = require("../models/DailyPayoutDecision");
const PayoutTransaction = require("../models/PayoutTransaction");
const { assessPayoutBatch } = require("./mlClient");
const { derivePayoutPenalty } = require("./payoutPenaltyService");
const { detectIncidentsForDate, previousDay } = require("./incidentDetectionService");
const { roundMoney } = require("./premiumPenaltyService");
const { logger } = require("../config/logger");
const { writeLedgerEntries, snapshotGlobalBalance } = require("./ledgerService");
const { createPayoutReviewCase } = require("./riskReviewService");
const { buildPayoutExplanation } = require("./explanationFormatter");

async function processDailyPayoutRun({ scheduledFor = new Date(), onProgress } = {}) {
  const incidentDate = previousDay(scheduledFor);
  const incidents = await detectIncidentsForDate(incidentDate);

  if (!incidents.length) {
    return { processedCount: 0, successCount: 0, failureCount: 0, incidentDate };
  }

  const policies = await Policy.find({ status: "active" }).lean();
  if (!policies.length) {
    return { processedCount: 0, successCount: 0, failureCount: 0, incidentDate };
  }

  const workers = await LinkedWorker.find({ _id: { $in: policies.map((policy) => policy.linkedWorkerId) } }).lean();
  const workerMap = new Map(workers.map((worker) => [String(worker._id), worker]));
  const incidentMap = new Map(incidents.map((incident) => [`${incident.city}|${incident.state}`, incident]));

  const eligible = policies
    .map((policy) => ({ policy, worker: workerMap.get(String(policy.linkedWorkerId)) }))
    .filter(({ worker }) => worker && incidentMap.has(`${worker.city}|${worker.state}`));

  if (!eligible.length) {
    return { processedCount: 0, successCount: 0, failureCount: 0, incidentDate };
  }

  const batchPayload = {
    horizon_days: 1,
    affected_days: 1,
    continue_on_error: true,
    items: eligible.map(({ policy, worker }) => {
      const incident = incidentMap.get(`${worker.city}|${worker.state}`);
      const startedAt = policy.startedAt ? new Date(policy.startedAt) : null;
      const daysSinceEnrollment = startedAt ? Math.max(0, Math.floor((incidentDate.getTime() - startedAt.getTime()) / (24 * 60 * 60 * 1000))) : 0;
      return {
        worker_id: worker.platformDriverId,
        platform_name: worker.platformName,
        horizon_days: 1,
        affected_days: 1,
        incident_city: incident.city,
        incident_state: incident.state,
        days_since_enrollment: daysSinceEnrollment,
        no_claim_weeks: policy.noClaimWeeks || 0,
        verified_incident: incident.verified,
        forecast_overrides: {
          disruption_score: incident.disruptionScore
        }
      };
    })
  };

  const batchResult = await assessPayoutBatch(batchPayload);
  const resultMap = new Map((batchResult.normalized.results || []).map((item) => [`${item.platformName}:${item.workerId}`, item]));
  const errorSet = new Set((batchResult.normalized.errors || []).map((item) => `${item.platform_name}:${item.worker_id}`));

  let successCount = 0;
  let failureCount = 0;

  for (const { policy, worker } of eligible) {
    const incident = incidentMap.get(`${worker.city}|${worker.state}`);
    const key = `${worker.platformName}:${worker.platformDriverId}`;
    const payout = resultMap.get(key);

    if (!payout || errorSet.has(key)) {
      await DailyPayoutDecision.findOneAndUpdate(
        { policyId: policy._id, incidentDate: incident.date },
        {
          $set: {
            userId: policy.userId,
            workerId: policy.linkedWorkerId,
            basePayoutInr: 0,
            penaltyMultiplier: 1,
            finalPayoutInr: 0,
            payoutEligible: false,
            confidenceScore: 0,
            confidenceBand: null,
            riskReviewFlag: true,
            manualReviewFlag: true,
            recommendedTrustAction: "manual_review",
            mlReceipt: batchResult.archive,
            mlVersion: batchResult.normalized.version,
            status: "failed"
          }
        },
        { upsert: true, new: true }
      );
      failureCount += 1;
      if (onProgress) {
        await onProgress({
          processedCount: successCount + failureCount,
          successCount,
          failureCount,
          cursor: { lastPolicyId: String(policy._id), incidentDate: incident.date.toISOString() }
        });
      }
      continue;
    }

    const penalty = derivePayoutPenalty({
      confidenceScore: payout.decisionConfidenceScore,
      confidenceBand: payout.decisionConfidenceBand,
      recommendedTrustAction: payout.recommendedTrustAction
    });

    const basePayoutInr = roundMoney(payout.recommendedPayoutInr);
    const finalPayoutInr = payout.payoutEligible ? roundMoney(basePayoutInr * penalty.penaltyMultiplier) : 0;
    const status = !payout.payoutEligible ? "not_eligible" : penalty.holdPayout ? "held" : "approved";
    const explanation = buildPayoutExplanation({
      payout,
      penalty,
      incident,
      basePayoutInr,
      finalPayoutInr,
      status
    });

    const decision = await DailyPayoutDecision.findOneAndUpdate(
      { policyId: policy._id, incidentDate: incident.date },
      {
        $set: {
          userId: policy.userId,
          workerId: policy.linkedWorkerId,
          basePayoutInr,
          penaltyMultiplier: penalty.penaltyMultiplier,
          finalPayoutInr,
          payoutEligible: payout.payoutEligible,
          confidenceScore: payout.decisionConfidenceScore,
          confidenceBand: payout.decisionConfidenceBand,
          riskReviewFlag: penalty.riskReviewFlag,
          manualReviewFlag: penalty.manualReviewFlag,
          recommendedTrustAction: payout.recommendedTrustAction,
          mlReceipt: {
            modelRequest: batchResult.archive.requestPayload,
            modelResponse: batchResult.archive.rawResponse,
            normalizedDecision: payout,
            archive: batchResult.archive,
            incidentContext: incident
          },
          finalDecisionSnapshot: explanation.backendDecision,
          penaltyExplanation: explanation.penaltyExplanation,
          mlVersion: payout.version,
          status
        }
      },
      { upsert: true, new: true }
    );

    await PayoutTransaction.findOneAndUpdate(
      { payoutDecisionId: decision._id },
      {
        $set: {
          amountInr: finalPayoutInr,
          status: status === "approved" ? "pending" : status === "held" ? "held" : "failed",
          reconciliationState: "unreconciled"
        }
      },
      { upsert: true, new: true }
    );

    await writeLedgerEntries([
      {
        userId: policy.userId,
        policyId: policy._id,
        city: worker.city,
        state: worker.state,
        platformName: worker.platformName,
        type: "payout_approved",
        direction: "debit",
        amountInr: finalPayoutInr,
        sourceType: "daily_payout_decision",
        sourceId: decision._id,
        effectiveAt: incident.date,
        metadata: {
          basePayoutInr,
          penaltyMultiplier: penalty.penaltyMultiplier,
          recommendedTrustAction: payout.recommendedTrustAction
        },
        idempotencyKey: `ledger:payout_approved:${decision._id}`
      },
      {
        userId: policy.userId,
        policyId: policy._id,
        city: worker.city,
        state: worker.state,
        platformName: worker.platformName,
        type: penalty.holdPayout ? "payout_held" : "payout_paid",
        direction: "debit",
        amountInr: finalPayoutInr,
        sourceType: "payout_transaction",
        sourceId: decision._id,
        effectiveAt: incident.date,
        metadata: {
          transactionStatus: status === "approved" ? "pending" : status,
          reconciliationState: "unreconciled"
        },
        idempotencyKey: `ledger:payout_state:${decision._id}`
      }
    ]);

    await Policy.updateOne(
      { _id: policy._id },
      {
        $set: {
          payoutReductionMultiplier: penalty.penaltyMultiplier,
          latestPayoutMeta: {
            incidentDate: incident.date,
            city: incident.city,
            state: incident.state,
            disruptionScore: incident.disruptionScore,
            confidenceScore: payout.decisionConfidenceScore,
            confidenceBand: payout.decisionConfidenceBand,
            riskReviewFlag: penalty.riskReviewFlag,
            manualReviewFlag: penalty.manualReviewFlag,
            recommendedTrustAction: payout.recommendedTrustAction,
            payoutDecisionId: decision._id,
            explanation
          }
        }
      }
    );

    await createPayoutReviewCase({
      policy,
      decision,
      penalty,
      payout
    });

    successCount += 1;
    if (onProgress) {
      await onProgress({
        processedCount: successCount + failureCount,
        successCount,
        failureCount,
        cursor: { lastPolicyId: String(policy._id), incidentDate: incident.date.toISOString() }
      });
    }
  }

  logger.info({ incidentDate, processedCount: eligible.length, successCount, failureCount }, "daily payout run completed");
  await snapshotGlobalBalance(new Date(scheduledFor));
  return {
    incidentDate,
    processedCount: eligible.length,
    successCount,
    failureCount,
    cursor: { lastPolicyId: eligible.length ? String(eligible[eligible.length - 1].policy._id) : null, incidentDate: incidentDate.toISOString() }
  };
}

module.exports = { processDailyPayoutRun };
