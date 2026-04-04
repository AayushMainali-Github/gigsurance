const RiskReviewCase = require("../models/RiskReviewCase");
const Policy = require("../models/Policy");
const User = require("../models/User");
const DailyPayoutDecision = require("../models/DailyPayoutDecision");
const WeeklyPremiumDecision = require("../models/WeeklyPremiumDecision");
const { writeAuditLog } = require("./auditLogService");
const { ApiError } = require("../utils/ApiError");

async function upsertRiskReviewCase({
  userId,
  policyId,
  workerId,
  source,
  sourceDecisionId,
  score,
  band,
  reviewReason,
  confidenceInputs,
  actionTaken,
  autoPenaltyApplied,
  manualReviewRequired,
  status = "open"
}) {
  return RiskReviewCase.findOneAndUpdate(
    { source, sourceDecisionId },
    {
      $set: {
        userId,
        policyId,
        workerId,
        score,
        band,
        reviewReason,
        confidenceInputs,
        actionTaken,
        autoPenaltyApplied,
        manualReviewRequired,
        status
      }
    },
    { upsert: true, new: true }
  );
}

async function createPremiumReviewCase({ policy, decision, penalty, quote }) {
  if (!penalty.riskReviewFlag && !penalty.manualReviewFlag) return null;
  return upsertRiskReviewCase({
    userId: policy.userId,
    policyId: policy._id,
    workerId: policy.linkedWorkerId,
    source: "premium",
    sourceDecisionId: decision._id,
    score: quote.quoteConfidenceScore,
    band: quote.quoteConfidenceBand,
    reviewReason: penalty.reason,
    confidenceInputs: {
      confidenceScore: quote.quoteConfidenceScore,
      confidenceBand: quote.quoteConfidenceBand,
      predictedNextWeekIncomeInr: quote.predictedNextWeekIncomeInr
    },
    actionTaken: penalty.penaltyMultiplier > 1 ? "premium_penalty_applied" : "flagged",
    autoPenaltyApplied: penalty.penaltyMultiplier > 1,
    manualReviewRequired: penalty.manualReviewFlag,
    status: penalty.manualReviewFlag ? "open" : "investigating"
  });
}

async function createPayoutReviewCase({ policy, decision, penalty, payout }) {
  if (!penalty.riskReviewFlag && !penalty.manualReviewFlag) return null;
  return upsertRiskReviewCase({
    userId: policy.userId,
    policyId: policy._id,
    workerId: policy.linkedWorkerId,
    source: "payout",
    sourceDecisionId: decision._id,
    score: payout.decisionConfidenceScore,
    band: payout.decisionConfidenceBand,
    reviewReason: penalty.reason,
    confidenceInputs: {
      confidenceScore: payout.decisionConfidenceScore,
      confidenceBand: payout.decisionConfidenceBand,
      recommendedTrustAction: payout.recommendedTrustAction,
      triggerCertaintyScore: payout.triggerCertaintyScore,
      locationAlignmentScore: payout.locationAlignmentScore
    },
    actionTaken: penalty.holdPayout ? "payout_held" : penalty.penaltyMultiplier < 1 ? "payout_penalty_applied" : "flagged",
    autoPenaltyApplied: penalty.penaltyMultiplier < 1,
    manualReviewRequired: penalty.manualReviewFlag,
    status: penalty.manualReviewFlag ? "open" : "investigating"
  });
}

async function listRiskReviewCases(filter = {}) {
  return RiskReviewCase.find(filter).sort({ createdAt: -1 }).lean();
}

async function getRiskReviewCase(caseId) {
  const item = await RiskReviewCase.findById(caseId).lean();
  if (!item) throw new ApiError(404, "Risk review case not found");
  return item;
}

async function applyReviewAction({ caseId, adminUserId, action, notes }) {
  const reviewCase = await RiskReviewCase.findById(caseId);
  if (!reviewCase) throw new ApiError(404, "Risk review case not found");

  if (action === "clear_case" || action === "mark_false_positive") {
    reviewCase.status = "cleared";
    reviewCase.actionTaken = action;
  } else if (action === "confirm_penalty") {
    reviewCase.status = "penalized";
    reviewCase.actionTaken = action;
  } else if (action === "suspend_user") {
    reviewCase.status = "blocked";
    reviewCase.actionTaken = action;
    await User.updateOne({ _id: reviewCase.userId }, { $set: { status: "suspended" } });
  } else if (action === "override_premium") {
    reviewCase.status = "penalized";
    reviewCase.actionTaken = action;
    await WeeklyPremiumDecision.updateOne({ _id: reviewCase.sourceDecisionId }, { $set: { status: "quoted" } });
  } else if (action === "override_payout") {
    reviewCase.status = "penalized";
    reviewCase.actionTaken = action;
    await DailyPayoutDecision.updateOne({ _id: reviewCase.sourceDecisionId }, { $set: { status: "approved" } });
  } else {
    throw new ApiError(400, "Unsupported review action");
  }

  reviewCase.notes = notes || reviewCase.notes;
  reviewCase.reviewedBy = adminUserId;
  reviewCase.reviewedAt = new Date();
  await reviewCase.save();

  await writeAuditLog({
    actorType: "admin",
    actorId: adminUserId,
    action,
    entityType: "risk_review_case",
    entityId: reviewCase._id,
    payload: { notes, source: reviewCase.source, sourceDecisionId: reviewCase.sourceDecisionId }
  });

  if (reviewCase.policyId) {
    await Policy.updateOne(
      { _id: reviewCase.policyId },
      {
        $set: {
          latestReviewMeta: {
            caseId: reviewCase._id,
            action,
            reviewedAt: reviewCase.reviewedAt
          }
        }
      }
    );
  }

  return reviewCase.toObject();
}

module.exports = {
  createPremiumReviewCase,
  createPayoutReviewCase,
  listRiskReviewCases,
  getRiskReviewCase,
  applyReviewAction
};
