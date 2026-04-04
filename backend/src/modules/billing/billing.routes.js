const express = require("express");
const PremiumInvoice = require("../../models/PremiumInvoice");
const WeeklyPremiumDecision = require("../../models/WeeklyPremiumDecision");
const { asyncHandler } = require("../../utils/asyncHandler");
const { parsePagination } = require("../../utils/pagination");
const { toInvoiceDto, toPremiumDecisionDto } = require("../../utils/dto");

const router = express.Router();

router.get("/", asyncHandler(async (req, res) => {
  const { limit, page, skip } = parsePagination(req.query);
  const decisions = await WeeklyPremiumDecision.find({ userId: req.auth.sub }).sort({ weekStart: -1 }).skip(skip).limit(limit).lean();
  const invoices = await PremiumInvoice.find({
    premiumDecisionId: { $in: decisions.map((decision) => decision._id) }
  }).sort({ createdAt: -1 }).lean();

  res.json({
    ok: true,
    data: {
      decisions: decisions.map(toPremiumDecisionDto),
      invoices: invoices.map(toInvoiceDto)
    },
    page,
    limit
  });
}));

router.get("/current", asyncHandler(async (req, res) => {
  const current = await WeeklyPremiumDecision.findOne({ userId: req.auth.sub, status: "quoted" }).sort({ weekStart: -1 }).lean();
  res.json({ ok: true, data: toPremiumDecisionDto(current) });
}));

router.get("/history", asyncHandler(async (req, res) => {
  const { limit, page, skip } = parsePagination(req.query);
  const items = await WeeklyPremiumDecision.find({ userId: req.auth.sub }).sort({ weekStart: -1 }).skip(skip).limit(limit).lean();
  res.json({ ok: true, data: items.map(toPremiumDecisionDto), page, limit });
}));

router.get("/invoices", asyncHandler(async (req, res) => {
  const { limit, page, skip } = parsePagination(req.query);
  const decisions = await WeeklyPremiumDecision.find({ userId: req.auth.sub }).select("_id").lean();
  const items = await PremiumInvoice.find({
    premiumDecisionId: { $in: decisions.map((item) => item._id) },
    ...(req.query.status ? { status: req.query.status } : {})
  }).sort({ dueAt: -1 }).skip(skip).limit(limit).lean();
  res.json({ ok: true, data: items.map(toInvoiceDto), page, limit });
}));

router.get("/next-due", asyncHandler(async (req, res) => {
  const decisions = await WeeklyPremiumDecision.find({ userId: req.auth.sub }).select("_id").lean();
  const item = await PremiumInvoice.findOne({
    premiumDecisionId: { $in: decisions.map((decision) => decision._id) },
    status: "pending"
  }).sort({ dueAt: 1 }).lean();
  res.json({ ok: true, data: toInvoiceDto(item) });
}));

router.post("/invoices/:invoiceId/pay", asyncHandler(async (req, res) => {
  const invoice = await PremiumInvoice.findByIdAndUpdate(
    req.params.invoiceId,
    { $set: { status: "paid", paidAt: new Date() } },
    { new: true }
  ).lean();
  res.json({ ok: true, data: toInvoiceDto(invoice) });
}));

module.exports = { billingRouter: router };
