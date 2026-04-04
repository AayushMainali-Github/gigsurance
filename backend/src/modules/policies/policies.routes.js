const express = require("express");
const Policy = require("../../models/Policy");
const RiskReviewCase = require("../../models/RiskReviewCase");
const { asyncHandler } = require("../../utils/asyncHandler");
const { toPolicyDto } = require("../../utils/dto");
const { enrollPolicyController, pausePolicyController, cancelPolicyController } = require("./policies.controller");

const router = express.Router();

router.get("/", asyncHandler(async (req, res) => {
  const items = await Policy.find({ userId: req.auth.sub }).sort({ createdAt: -1 }).lean();
  res.json({ ok: true, data: items.map(toPolicyDto) });
}));
router.get("/current", asyncHandler(async (req, res) => {
  const item = await Policy.findOne({ userId: req.auth.sub, status: { $in: ["active", "paused", "pending"] } }).sort({ createdAt: -1 }).lean();
  res.json({ ok: true, data: toPolicyDto(item) });
}));
router.get("/current/coverage", asyncHandler(async (req, res) => {
  const item = await Policy.findOne({ userId: req.auth.sub, status: { $in: ["active", "paused", "pending"] } }).sort({ createdAt: -1 }).lean();
  res.json({
    ok: true,
    data: item ? {
      policyId: item._id,
      status: item.status,
      currentWeeklyPremiumInr: item.currentWeeklyPremiumInr,
      noClaimWeeks: item.noClaimWeeks,
      fraudMultiplier: item.fraudMultiplier,
      payoutReductionMultiplier: item.payoutReductionMultiplier
    } : null
  });
}));
router.get("/current/weekly-risk", asyncHandler(async (req, res) => {
  const item = await Policy.findOne({ userId: req.auth.sub, status: { $in: ["active", "paused", "pending"] } }).sort({ createdAt: -1 }).lean();
  res.json({
    ok: true,
    data: item ? {
      latestQuoteMeta: item.latestQuoteMeta,
      latestPayoutMeta: item.latestPayoutMeta
    } : null
  });
}));
router.get("/current/review-status", asyncHandler(async (req, res) => {
  const item = await Policy.findOne({ userId: req.auth.sub, status: { $in: ["active", "paused", "pending"] } }).sort({ createdAt: -1 }).lean();
  const reviews = item ? await RiskReviewCase.find({ policyId: item._id, status: { $in: ["open", "investigating"] } }).sort({ createdAt: -1 }).lean() : [];
  res.json({ ok: true, data: reviews });
}));
router.post("/enroll", enrollPolicyController);
router.post("/pause", pausePolicyController);
router.post("/cancel", cancelPolicyController);

module.exports = { policiesRouter: router };
