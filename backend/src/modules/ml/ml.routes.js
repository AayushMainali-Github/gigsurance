const express = require("express");
const { asyncHandler } = require("../../utils/asyncHandler");
const { healthcheck, quoteWorker, assessPayout } = require("../../services/mlClient");

const router = express.Router();

router.get("/health", asyncHandler(async (_req, res) => {
  const data = await healthcheck();
  res.json({ ok: true, data });
}));

router.post("/quote/preview", asyncHandler(async (req, res) => {
  const result = await quoteWorker(req.body);
  res.status(result.ok ? 200 : 503).json({ ok: result.ok, data: result.normalized, archive: result.archive });
}));

router.post("/payout/preview", asyncHandler(async (req, res) => {
  const result = await assessPayout(req.body);
  res.status(result.ok ? 200 : 503).json({ ok: result.ok, data: result.normalized, archive: result.archive });
}));

module.exports = { mlRouter: router };
