const express = require("express");
const User = require("../../models/User");
const LinkedWorker = require("../../models/LinkedWorker");
const Policy = require("../../models/Policy");
const RiskReviewCase = require("../../models/RiskReviewCase");
const WeeklyPremiumDecision = require("../../models/WeeklyPremiumDecision");
const DailyPayoutDecision = require("../../models/DailyPayoutDecision");
const { asyncHandler } = require("../../utils/asyncHandler");
const { toLinkedWorkerDto, toPolicyDto, toUserDto } = require("../../utils/dto");

const router = express.Router();

async function resolveWorkerContext(userId, authFallback = {}) {
  const user = await User.findById(userId).lean();
  const resolvedUser = user || { _id: userId, email: authFallback.email, role: authFallback.role };
  const linkedWorker = resolvedUser?.linkedWorkerId ? await LinkedWorker.findById(resolvedUser.linkedWorkerId).lean() : null;
  const currentPolicy = resolvedUser?.currentPolicyId ? await Policy.findById(resolvedUser.currentPolicyId).lean() : null;
  return { user: resolvedUser, linkedWorker, currentPolicy };
}

router.get("/me", asyncHandler(async (req, res) => {
  const { user, linkedWorker, currentPolicy } = await resolveWorkerContext(req.auth.sub, req.auth);
  res.json({
    ok: true,
    data: {
      ...toUserDto(user),
      linkedWorker: toLinkedWorkerDto(linkedWorker),
      currentPolicy: toPolicyDto(currentPolicy)
    }
  });
}));

router.get("/me/dashboard", asyncHandler(async (req, res) => {
  const { user, linkedWorker, currentPolicy } = await resolveWorkerContext(req.auth.sub, req.auth);
  const currentPremium = await WeeklyPremiumDecision.findOne({ userId: req.auth.sub, status: "quoted" }).sort({ weekStart: -1 }).lean();
  const latestPayout = await DailyPayoutDecision.findOne({ userId: req.auth.sub }).sort({ incidentDate: -1 }).lean();
  const openReviewCount = currentPolicy
    ? await RiskReviewCase.countDocuments({
      policyId: currentPolicy._id,
      status: { $in: ["open", "investigating"] }
    })
    : 0;

  res.json({
    ok: true,
    data: {
      user: toUserDto(user),
      linkedWorker: toLinkedWorkerDto(linkedWorker),
      currentPolicy: toPolicyDto(currentPolicy),
      coverage: currentPolicy ? {
        policyId: currentPolicy._id,
        status: currentPolicy.status,
        currentWeeklyPremiumInr: currentPolicy.currentWeeklyPremiumInr,
        noClaimWeeks: currentPolicy.noClaimWeeks,
        fraudMultiplier: currentPolicy.fraudMultiplier,
        payoutReductionMultiplier: currentPolicy.payoutReductionMultiplier
      } : null,
      currentPremium: currentPremium ? {
        id: currentPremium._id,
        weekStart: currentPremium.weekStart,
        weekEnd: currentPremium.weekEnd,
        finalPremiumInr: currentPremium.finalPremiumInr,
        confidenceScore: currentPremium.confidenceScore,
        confidenceBand: currentPremium.confidenceBand,
        riskReviewFlag: currentPremium.riskReviewFlag,
        manualReviewFlag: currentPremium.manualReviewFlag,
        status: currentPremium.status
      } : null,
      latestPayout: latestPayout ? {
        id: latestPayout._id,
        incidentDate: latestPayout.incidentDate,
        finalPayoutInr: latestPayout.finalPayoutInr,
        recommendedTrustAction: latestPayout.recommendedTrustAction,
        riskReviewFlag: latestPayout.riskReviewFlag,
        manualReviewFlag: latestPayout.manualReviewFlag,
        status: latestPayout.status
      } : null,
      reviewSummary: {
        openCount: openReviewCount,
        hasOpenReview: openReviewCount > 0
      }
    }
  });
}));

router.get("/me/policy-summary", asyncHandler(async (req, res) => {
  const { user, linkedWorker, currentPolicy } = await resolveWorkerContext(req.auth.sub, req.auth);

  res.json({
    ok: true,
    data: {
      user: toUserDto(user),
      linkedWorker: toLinkedWorkerDto(linkedWorker),
      currentPolicy: toPolicyDto(currentPolicy),
      coverage: currentPolicy ? {
        policyId: currentPolicy._id,
        status: currentPolicy.status,
        currentWeeklyPremiumInr: currentPolicy.currentWeeklyPremiumInr,
        noClaimWeeks: currentPolicy.noClaimWeeks,
        fraudMultiplier: currentPolicy.fraudMultiplier,
        payoutReductionMultiplier: currentPolicy.payoutReductionMultiplier
      } : null
    }
  });
}));

module.exports = { usersRouter: router };
