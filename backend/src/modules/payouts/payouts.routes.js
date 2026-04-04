const express = require("express");
const DailyPayoutDecision = require("../../models/DailyPayoutDecision");
const PayoutTransaction = require("../../models/PayoutTransaction");
const IncidentWindow = require("../../models/IncidentWindow");
const LinkedWorker = require("../../models/LinkedWorker");
const { asyncHandler } = require("../../utils/asyncHandler");
const { parsePagination } = require("../../utils/pagination");
const { toIncidentDto, toPayoutDecisionDto, toPayoutTransactionDto } = require("../../utils/dto");

const router = express.Router();

router.get("/", asyncHandler(async (req, res) => {
  const { limit, page, skip } = parsePagination(req.query);
  const decisions = await DailyPayoutDecision.find({ userId: req.auth.sub }).sort({ incidentDate: -1 }).skip(skip).limit(limit).lean();
  const transactions = await PayoutTransaction.find({
    payoutDecisionId: { $in: decisions.map((decision) => decision._id) }
  }).sort({ createdAt: -1 }).lean();

  res.json({
    ok: true,
    data: {
      decisions: decisions.map(toPayoutDecisionDto),
      transactions: transactions.map(toPayoutTransactionDto)
    },
    page,
    limit
  });
}));

router.get("/history", asyncHandler(async (req, res) => {
  const { limit, page, skip } = parsePagination(req.query);
  const items = await DailyPayoutDecision.find({ userId: req.auth.sub }).sort({ incidentDate: -1 }).skip(skip).limit(limit).lean();
  res.json({ ok: true, data: items.map(toPayoutDecisionDto), page, limit });
}));

router.get("/latest", asyncHandler(async (req, res) => {
  const item = await DailyPayoutDecision.findOne({ userId: req.auth.sub }).sort({ incidentDate: -1 }).lean();
  res.json({ ok: true, data: toPayoutDecisionDto(item) });
}));

router.get("/:decisionId/receipt", asyncHandler(async (req, res) => {
  const item = await DailyPayoutDecision.findOne({ _id: req.params.decisionId, userId: req.auth.sub }).lean();
  res.json({ ok: true, data: item?.mlReceipt?.normalized?.payoutReceipt || item?.mlReceipt?.payoutReceipt || null });
}));

router.get("/incidents/history", asyncHandler(async (req, res) => {
  const userWorker = await LinkedWorker.findOne({ userId: req.auth.sub, enrollmentStatus: { $in: ["linked", "enrolled"] } }).sort({ linkedAt: -1 }).lean();
  const { limit, page, skip } = parsePagination(req.query);
  const items = await IncidentWindow.find(userWorker ? { city: userWorker.city, state: userWorker.state } : {})
    .sort({ date: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
  res.json({ ok: true, data: items.map(toIncidentDto), page, limit });
}));

module.exports = { payoutsRouter: router };
