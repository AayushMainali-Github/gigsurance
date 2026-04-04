const express = require("express");
const AccountBalanceSnapshot = require("../../models/AccountBalanceSnapshot");
const { asyncHandler } = require("../../utils/asyncHandler");
const { buildFinanceSummary } = require("../../services/ledgerService");
const { getAdminDashboardMetrics } = require("../../services/adminService");

const router = express.Router();

router.get("/summary", asyncHandler(async (req, res) => {
  const from = req.query.from ? new Date(req.query.from) : undefined;
  const to = req.query.to ? new Date(req.query.to) : undefined;
  const city = req.query.city || undefined;
  const platformName = req.query.platformName || undefined;

  const summary = await buildFinanceSummary({ from, to, city, platformName });
  res.json({ ok: true, data: summary });
}));

router.get("/snapshots/latest", asyncHandler(async (_req, res) => {
  const snapshot = await AccountBalanceSnapshot.findOne({ scopeType: "global", scopeId: null }).sort({ asOfDate: -1 }).lean();
  res.json({ ok: true, data: snapshot });
}));

router.get("/dashboard", asyncHandler(async (_req, res) => {
  const [summary, metrics] = await Promise.all([
    buildFinanceSummary({}),
    getAdminDashboardMetrics()
  ]);
  res.json({ ok: true, data: { summary, metrics } });
}));

module.exports = { financeRouter: router };
