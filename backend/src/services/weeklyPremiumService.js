const Policy = require("../models/Policy");
const LinkedWorker = require("../models/LinkedWorker");
const WeeklyPremiumDecision = require("../models/WeeklyPremiumDecision");
const PremiumInvoice = require("../models/PremiumInvoice");
const { quoteBatch } = require("./mlClient");
const { derivePremiumPenalty, roundMoney } = require("./premiumPenaltyService");
const { logger } = require("../config/logger");
const { writeLedgerEntries } = require("./ledgerService");
const { createPremiumReviewCase } = require("./riskReviewService");
const { buildPremiumExplanation } = require("./explanationFormatter");

function weekBounds(scheduledFor = new Date()) {
  const base = new Date(scheduledFor);
  const day = base.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + diffToMonday, 0, 1, 0, 0));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  end.setUTCHours(23, 59, 59, 999);
  return { weekStart: start, weekEnd: end };
}

async function listActivePoliciesForPricing() {
  return Policy.find({ status: "active" }).lean();
}

async function processWeeklyPremiumRun({ scheduledFor = new Date(), onProgress } = {}) {
  const { weekStart, weekEnd } = weekBounds(scheduledFor);
  const policies = await listActivePoliciesForPricing();

  if (!policies.length) {
    return { processedCount: 0, successCount: 0, failureCount: 0, weekStart, weekEnd };
  }

  const workerIds = policies.map((policy) => policy.linkedWorkerId);
  const workers = await LinkedWorker.find({ _id: { $in: workerIds } }).lean();
  const workerMap = new Map(workers.map((worker) => [String(worker._id), worker]));

  const batchPayload = {
    horizon_days: 7,
    no_claim_weeks: 0,
    continue_on_error: true,
    items: policies.map((policy) => {
      const worker = workerMap.get(String(policy.linkedWorkerId));
      return {
        worker_id: worker?.platformDriverId,
        platform_name: worker?.platformName,
        no_claim_weeks: policy.noClaimWeeks || 0
      };
    }).filter((item) => item.worker_id && item.platform_name)
  };

  const batchResult = await quoteBatch(batchPayload);
  const resultMap = new Map((batchResult.normalized.results || []).map((item) => [`${item.platformName}:${item.workerId}`, item]));
  const errorSet = new Set((batchResult.normalized.errors || []).map((item) => `${item.platform_name}:${item.worker_id}`));

  let successCount = 0;
  let failureCount = 0;
  for (const policy of policies) {
    const worker = workerMap.get(String(policy.linkedWorkerId));
    if (!worker) {
      failureCount += 1;
      if (onProgress) {
        await onProgress({
          processedCount: successCount + failureCount,
          successCount,
          failureCount,
          cursor: { lastPolicyId: String(policy._id), weekStart: weekStart.toISOString() }
        });
      }
      continue;
    }

    const key = `${worker.platformName}:${worker.platformDriverId}`;
    const quote = resultMap.get(key);

    if (!quote || errorSet.has(key)) {
      await WeeklyPremiumDecision.findOneAndUpdate(
        { policyId: policy._id, weekStart },
        {
          $set: {
            userId: policy.userId,
            workerId: policy.linkedWorkerId,
            weekEnd,
            basePremiumInr: 0,
            penaltyMultiplier: 1,
            finalPremiumInr: 0,
            confidenceScore: 0,
            confidenceBand: null,
            riskReviewFlag: true,
            manualReviewFlag: true,
            mlReceipt: batchResult.archive,
            mlVersion: batchResult.normalized.version,
            status: "failed"
          }
        },
        { upsert: true, new: true }
      );
      failureCount += 1;
      continue;
    }

    const penalty = derivePremiumPenalty({
      confidenceScore: quote.quoteConfidenceScore,
      confidenceBand: quote.quoteConfidenceBand
    });

    const basePremiumInr = roundMoney(quote.premiumAmountInr);
    const finalPremiumInr = roundMoney(basePremiumInr * penalty.penaltyMultiplier);
    const explanation = buildPremiumExplanation({
      quote,
      penalty,
      basePremiumInr,
      finalPremiumInr,
      weekStart,
      weekEnd
    });

    const decision = await WeeklyPremiumDecision.findOneAndUpdate(
      { policyId: policy._id, weekStart },
      {
        $set: {
          userId: policy.userId,
          workerId: policy.linkedWorkerId,
          weekEnd,
          basePremiumInr,
          penaltyMultiplier: penalty.penaltyMultiplier,
          finalPremiumInr,
          confidenceScore: quote.quoteConfidenceScore,
          confidenceBand: quote.quoteConfidenceBand,
          riskReviewFlag: penalty.riskReviewFlag,
          manualReviewFlag: penalty.manualReviewFlag,
          mlReceipt: {
            modelRequest: batchResult.archive.requestPayload,
            modelResponse: batchResult.archive.rawResponse,
            normalizedDecision: quote,
            archive: batchResult.archive
          },
          finalDecisionSnapshot: explanation.backendDecision,
          penaltyExplanation: explanation.penaltyExplanation,
          mlVersion: quote.version,
          status: "quoted"
        }
      },
      { upsert: true, new: true }
    );

    await PremiumInvoice.findOneAndUpdate(
      { premiumDecisionId: decision._id },
      {
        $set: {
          amountInr: finalPremiumInr,
          dueAt: weekStart,
          status: "pending"
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
        type: "premium_charged",
        direction: "credit",
        amountInr: finalPremiumInr,
        sourceType: "weekly_premium_decision",
        sourceId: decision._id,
        effectiveAt: weekStart,
        metadata: {
          basePremiumInr,
          penaltyMultiplier: penalty.penaltyMultiplier,
          confidenceScore: quote.quoteConfidenceScore
        },
        idempotencyKey: `ledger:premium_charged:${decision._id}`
      },
      {
        userId: policy.userId,
        policyId: policy._id,
        city: worker.city,
        state: worker.state,
        platformName: worker.platformName,
        type: penalty.penaltyMultiplier > 1 ? "fraud_penalty_applied" : "manual_adjustment",
        direction: "credit",
        amountInr: roundMoney(finalPremiumInr - basePremiumInr),
        sourceType: "weekly_premium_decision",
        sourceId: decision._id,
        effectiveAt: weekStart,
        metadata: {
          penaltyMultiplier: penalty.penaltyMultiplier,
          riskReviewFlag: penalty.riskReviewFlag,
          manualReviewFlag: penalty.manualReviewFlag
        },
        idempotencyKey: `ledger:premium_penalty:${decision._id}`
      }
    ]);

    await Policy.updateOne(
      { _id: policy._id },
      {
        $set: {
          currentWeeklyPremiumInr: finalPremiumInr,
          fraudMultiplier: penalty.penaltyMultiplier,
          latestQuoteMeta: {
            weekStart,
            weekEnd,
            confidenceScore: quote.quoteConfidenceScore,
            confidenceBand: quote.quoteConfidenceBand,
            riskReviewFlag: penalty.riskReviewFlag,
            manualReviewFlag: penalty.manualReviewFlag,
            predictedNextWeekIncomeInr: quote.predictedNextWeekIncomeInr,
            premiumDecisionId: decision._id,
            explanation
          }
        }
      }
    );

    await createPremiumReviewCase({
      policy,
      decision,
      penalty,
      quote
    });

    successCount += 1;
    if (onProgress) {
      await onProgress({
        processedCount: successCount + failureCount,
        successCount,
        failureCount,
        cursor: { lastPolicyId: String(policy._id), weekStart: weekStart.toISOString() }
      });
    }
  }

  logger.info({ weekStart, weekEnd, processedCount: policies.length, successCount, failureCount }, "weekly premium run completed");

  return {
    weekStart,
    weekEnd,
    processedCount: policies.length,
    successCount,
    failureCount,
    cursor: { lastPolicyId: policies.length ? String(policies[policies.length - 1]._id) : null, weekStart: weekStart.toISOString() }
  };
}

module.exports = { processWeeklyPremiumRun, weekBounds };
