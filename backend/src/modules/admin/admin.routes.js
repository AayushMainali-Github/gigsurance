const express = require("express");
const { asyncHandler } = require("../../utils/asyncHandler");
const { validate } = require("../../middleware/validate");
const {
  adminUserActionSchema,
  adminAnnotationSchema,
  adminPremiumOverrideSchema,
  adminPayoutOverrideSchema
} = require("./admin.schemas");
const {
  getAdminDashboardMetrics,
  searchUsers,
  searchPolicies,
  getPremiumQueue,
  getPayoutQueue,
  getUnderwritingExposure,
  listReviewQueue,
  suspendUserAccount,
  annotateAccount,
  overridePremiumDecision,
  overridePayoutDecision
} = require("../../services/adminService");

const router = express.Router();

router.get("/dashboard", asyncHandler(async (_req, res) => {
  const data = await getAdminDashboardMetrics();
  res.json({ ok: true, data });
}));

router.get("/users", asyncHandler(async (req, res) => {
  const data = await searchUsers(req.query);
  res.json({ ok: true, data });
}));

router.post("/users/:userId/suspend", validate(adminUserActionSchema), asyncHandler(async (req, res) => {
  const data = await suspendUserAccount({
    userId: req.params.userId,
    adminUserId: req.auth.sub,
    reason: req.body.reason
  });
  res.json({ ok: true, data });
}));

router.post("/users/:userId/notes", validate(adminAnnotationSchema), asyncHandler(async (req, res) => {
  const data = await annotateAccount({
    userId: req.params.userId,
    adminUserId: req.auth.sub,
    note: req.body.note
  });
  res.json({ ok: true, data });
}));

router.get("/policies", asyncHandler(async (req, res) => {
  const data = await searchPolicies(req.query);
  res.json({ ok: true, data });
}));

router.get("/queues/premiums", asyncHandler(async (req, res) => {
  const data = await getPremiumQueue(req.query);
  res.json({ ok: true, data });
}));

router.get("/queues/payouts", asyncHandler(async (req, res) => {
  const data = await getPayoutQueue(req.query);
  res.json({ ok: true, data });
}));

router.get("/queues/reviews", asyncHandler(async (req, res) => {
  const data = await listReviewQueue(req.query);
  res.json({ ok: true, data });
}));

router.get("/exposure", asyncHandler(async (req, res) => {
  const data = await getUnderwritingExposure(req.query);
  res.json({ ok: true, data });
}));

router.post("/premiums/:decisionId/override", validate(adminPremiumOverrideSchema), asyncHandler(async (req, res) => {
  const data = await overridePremiumDecision({
    decisionId: req.params.decisionId,
    adminUserId: req.auth.sub,
    finalPremiumInr: req.body.finalPremiumInr,
    reason: req.body.reason
  });
  res.json({ ok: true, data });
}));

router.post("/payouts/:decisionId/override", validate(adminPayoutOverrideSchema), asyncHandler(async (req, res) => {
  const data = await overridePayoutDecision({
    decisionId: req.params.decisionId,
    adminUserId: req.auth.sub,
    finalPayoutInr: req.body.finalPayoutInr,
    status: req.body.status,
    reason: req.body.reason
  });
  res.json({ ok: true, data });
}));

module.exports = { adminRouter: router };
