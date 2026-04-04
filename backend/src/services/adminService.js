const User = require("../models/User");
const LinkedWorker = require("../models/LinkedWorker");
const Policy = require("../models/Policy");
const WeeklyPremiumDecision = require("../models/WeeklyPremiumDecision");
const PremiumInvoice = require("../models/PremiumInvoice");
const DailyPayoutDecision = require("../models/DailyPayoutDecision");
const PayoutTransaction = require("../models/PayoutTransaction");
const RiskReviewCase = require("../models/RiskReviewCase");
const LedgerEntry = require("../models/LedgerEntry");
const AuditLog = require("../models/AuditLog");
const { buildFinanceSummary, writeLedgerEntry } = require("./ledgerService");
const { writeAuditLog } = require("./auditLogService");
const { ApiError } = require("../utils/ApiError");
const { parsePagination } = require("../utils/pagination");
const { buildOverrideExplanation } = require("./explanationFormatter");

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

async function getAdminDashboardMetrics() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const dayOfWeek = now.getDay();
  const mondayOffset = (dayOfWeek + 6) % 7;
  const weekStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset));
  const weekEnd = endOfDay(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6));

  const [
    totalInsuredUsers,
    activePolicies,
    weeklyPremiums,
    payoutLiabilityTodayRows,
    payoutsPaidTodayRows,
    flaggedCaseCount,
    overrideCount,
    overdueInvoices
  ] = await Promise.all([
    User.countDocuments({ currentPolicyId: { $ne: null } }),
    Policy.countDocuments({ status: "active" }),
    WeeklyPremiumDecision.aggregate([
      { $match: { weekStart: { $gte: weekStart, $lte: weekEnd } } },
      { $group: { _id: null, total: { $sum: "$finalPremiumInr" } } }
    ]),
    PayoutTransaction.aggregate([
      { $match: { createdAt: { $gte: todayStart, $lte: todayEnd }, status: { $in: ["pending", "held"] } } },
      { $group: { _id: null, total: { $sum: "$amountInr" } } }
    ]),
    PayoutTransaction.aggregate([
      { $match: { disbursedAt: { $gte: todayStart, $lte: todayEnd }, status: "paid" } },
      { $group: { _id: null, total: { $sum: "$amountInr" } } }
    ]),
    RiskReviewCase.countDocuments({ status: { $in: ["open", "investigating"] } }),
    AuditLog.countDocuments({ action: { $in: ["override_premium", "override_payout"] } }),
    PremiumInvoice.countDocuments({ status: "overdue" })
  ]);

  const finance = await buildFinanceSummary({ from: todayStart, to: todayEnd });
  return {
    totalInsuredUsers,
    activePolicies,
    premiumBilledThisWeekInr: weeklyPremiums[0]?.total || 0,
    payoutLiabilityTodayInr: payoutLiabilityTodayRows[0]?.total || 0,
    payoutPaidTodayInr: payoutsPaidTodayRows[0]?.total || 0,
    netDailyMarginInr: finance.profitLoss,
    claimRatio: finance.claimRatio,
    flaggedCaseCount,
    overrideCount,
    overdueInvoices
  };
}

async function searchUsers(query) {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.role) filter.role = query.role;
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), "i");
    filter.$or = [{ email: rx }];
  }

  const [items, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("linkedWorkerId")
      .populate("currentPolicyId")
      .lean(),
    User.countDocuments(filter)
  ]);

  return { items, pagination: { page, limit, total } };
}

async function searchPolicies(query) {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.city || query.platformName) {
    const workers = await LinkedWorker.find({
      ...(query.city ? { city: query.city } : {}),
      ...(query.platformName ? { platformName: String(query.platformName).toLowerCase() } : {})
    }).select("_id");
    filter.linkedWorkerId = { $in: workers.map((item) => item._id) };
  }

  const [items, total] = await Promise.all([
    Policy.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId")
      .populate("linkedWorkerId")
      .lean(),
    Policy.countDocuments(filter)
  ]);

  return { items, pagination: { page, limit, total } };
}

async function getPremiumQueue(query) {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.overdueOnly === "true") filter.status = "overdue";

  const [items, total] = await Promise.all([
    PremiumInvoice.find(filter)
      .sort({ dueAt: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "premiumDecisionId",
        populate: [{ path: "userId" }, { path: "workerId" }, { path: "policyId" }]
      })
      .lean(),
    PremiumInvoice.countDocuments(filter)
  ]);

  return { items, pagination: { page, limit, total } };
}

async function getPayoutQueue(query) {
  const { page, limit, skip } = parsePagination(query);
  const statusFilter = query.status ? { status: query.status } : { status: { $in: ["pending", "held", "failed"] } };

  const [items, total] = await Promise.all([
    PayoutTransaction.find(statusFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "payoutDecisionId",
        populate: [{ path: "userId" }, { path: "workerId" }, { path: "policyId" }]
      })
      .lean(),
    PayoutTransaction.countDocuments(statusFilter)
  ]);

  return { items, pagination: { page, limit, total } };
}

async function getUnderwritingExposure(query) {
  const policyFilter = { status: "active" };
  const workerFilter = {};
  if (query.city) workerFilter.city = query.city;
  if (query.platformName) workerFilter.platformName = String(query.platformName).toLowerCase();
  const workers = await LinkedWorker.find(workerFilter).select("_id city state cityTier platformName");
  const workerMap = new Map(workers.map((worker) => [String(worker._id), worker]));
  policyFilter.linkedWorkerId = { $in: workers.map((worker) => worker._id) };

  const activePolicies = await Policy.find(policyFilter).lean();
  const exposure = new Map();
  for (const policy of activePolicies) {
    const worker = workerMap.get(String(policy.linkedWorkerId));
    if (!worker) continue;
    const key = `${worker.city}::${worker.platformName}`;
    const current = exposure.get(key) || {
      city: worker.city,
      state: worker.state,
      cityTier: worker.cityTier,
      platformName: worker.platformName,
      activePolicies: 0,
      weeklyPremiumInr: 0,
      payoutReductionAvg: 0
    };
    current.activePolicies += 1;
    current.weeklyPremiumInr += Number(policy.currentWeeklyPremiumInr || 0);
    current.payoutReductionAvg += Number(policy.payoutReductionMultiplier || 1);
    exposure.set(key, current);
  }

  return Array.from(exposure.values())
    .map((item) => ({
      ...item,
      weeklyPremiumInr: Number(item.weeklyPremiumInr.toFixed(2)),
      payoutReductionAvg: item.activePolicies ? Number((item.payoutReductionAvg / item.activePolicies).toFixed(4)) : 0
    }))
    .sort((a, b) => b.activePolicies - a.activePolicies);
}

async function listAuditLogs(query) {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};
  if (query.actorType) filter.actorType = query.actorType;
  if (query.action) filter.action = query.action;
  if (query.entityType) filter.entityType = query.entityType;
  if (query.entityId) filter.entityId = query.entityId;

  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(filter)
  ]);

  return { items, pagination: { page, limit, total } };
}

async function listReviewQueue(query) {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.source) filter.source = query.source;
  if (query.manualReviewRequired) filter.manualReviewRequired = query.manualReviewRequired === "true";

  const [items, total] = await Promise.all([
    RiskReviewCase.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    RiskReviewCase.countDocuments(filter)
  ]);

  return { items, pagination: { page, limit, total } };
}

async function suspendUserAccount({ userId, adminUserId, reason }) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");
  user.status = "suspended";
  await user.save();

  await writeAuditLog({
    actorType: "admin",
    actorId: adminUserId,
    action: "suspend_user_account",
    entityType: "user",
    entityId: user._id,
    payload: { reason }
  });

  return user.toObject();
}

async function annotateAccount({ userId, adminUserId, note }) {
  const user = await User.findById(userId).lean();
  if (!user) throw new ApiError(404, "User not found");

  await writeAuditLog({
    actorType: "admin",
    actorId: adminUserId,
    action: "annotate_account",
    entityType: "user",
    entityId: user._id,
    payload: { note }
  });

  return { userId: user._id, note };
}

async function overridePremiumDecision({ decisionId, adminUserId, finalPremiumInr, reason }) {
  const decision = await WeeklyPremiumDecision.findById(decisionId);
  if (!decision) throw new ApiError(404, "Weekly premium decision not found");
  const previousValue = decision.finalPremiumInr;
  const overrideExplanation = buildOverrideExplanation({
    kind: "premium",
    previousValue,
    nextValue: finalPremiumInr,
    reason,
    adminUserId
  });

  decision.finalPremiumInr = finalPremiumInr;
  decision.penaltyMultiplier = decision.basePremiumInr > 0 ? Number((finalPremiumInr / decision.basePremiumInr).toFixed(4)) : 1;
  decision.manualReviewFlag = false;
  decision.status = "quoted";
  decision.adminOverride = overrideExplanation;
  decision.finalDecisionSnapshot = {
    ...(decision.finalDecisionSnapshot || {}),
    penaltyMultiplier: decision.penaltyMultiplier,
    finalPremiumInr
  };
  await decision.save();

  await PremiumInvoice.findOneAndUpdate(
    { premiumDecisionId: decision._id },
    { $set: { amountInr: finalPremiumInr } }
  );

  await Policy.updateOne(
    { _id: decision.policyId },
    {
      $set: {
        currentWeeklyPremiumInr: finalPremiumInr,
        fraudMultiplier: decision.penaltyMultiplier
      }
    }
  );

  await writeLedgerEntry({
    userId: decision.userId,
    policyId: decision.policyId,
    type: "manual_adjustment",
    direction: "credit",
    amountInr: finalPremiumInr,
    sourceType: "weekly_premium_decision",
    sourceId: decision._id,
    effectiveAt: new Date(),
    metadata: { reason, overrideType: "premium" },
    idempotencyKey: `manual-adjustment-premium-${decision._id}-${finalPremiumInr}`
  });

  await writeAuditLog({
    actorType: "admin",
    actorId: adminUserId,
    action: "override_premium",
    entityType: "weekly_premium_decision",
    entityId: decision._id,
    payload: { finalPremiumInr, reason },
    explanationSummary: "Admin overrode weekly premium decision.",
    requestPayload: { finalPremiumInr, reason },
    responsePayload: { adminOverride: overrideExplanation }
  });

  return decision.toObject();
}

async function overridePayoutDecision({ decisionId, adminUserId, finalPayoutInr, status, reason }) {
  const decision = await DailyPayoutDecision.findById(decisionId);
  if (!decision) throw new ApiError(404, "Daily payout decision not found");
  const previousValue = decision.finalPayoutInr;
  const overrideExplanation = buildOverrideExplanation({
    kind: "payout",
    previousValue,
    nextValue: finalPayoutInr,
    reason,
    adminUserId,
    status: status || "approved"
  });

  decision.finalPayoutInr = finalPayoutInr;
  decision.penaltyMultiplier = decision.basePayoutInr > 0 ? Number((finalPayoutInr / decision.basePayoutInr).toFixed(4)) : 1;
  decision.manualReviewFlag = false;
  decision.status = status || "approved";
  decision.adminOverride = overrideExplanation;
  decision.finalDecisionSnapshot = {
    ...(decision.finalDecisionSnapshot || {}),
    penaltyMultiplier: decision.penaltyMultiplier,
    finalPayoutInr,
    status: decision.status
  };
  await decision.save();

  await PayoutTransaction.findOneAndUpdate(
    { payoutDecisionId: decision._id },
    {
      $set: {
        amountInr: finalPayoutInr,
        status: decision.status === "approved" ? "pending" : decision.status
      }
    }
  );

  await Policy.updateOne(
    { _id: decision.policyId },
    { $set: { payoutReductionMultiplier: decision.penaltyMultiplier } }
  );

  await writeLedgerEntry({
    userId: decision.userId,
    policyId: decision.policyId,
    type: "manual_adjustment",
    direction: "debit",
    amountInr: finalPayoutInr,
    sourceType: "daily_payout_decision",
    sourceId: decision._id,
    effectiveAt: new Date(),
    metadata: { reason, overrideType: "payout", status: decision.status },
    idempotencyKey: `manual-adjustment-payout-${decision._id}-${finalPayoutInr}-${decision.status}`
  });

  await writeAuditLog({
    actorType: "admin",
    actorId: adminUserId,
    action: "override_payout",
    entityType: "daily_payout_decision",
    entityId: decision._id,
    payload: { finalPayoutInr, status: decision.status, reason },
    explanationSummary: "Admin overrode daily payout decision.",
    requestPayload: { finalPayoutInr, status: decision.status, reason },
    responsePayload: { adminOverride: overrideExplanation }
  });

  return decision.toObject();
}

module.exports = {
  getAdminDashboardMetrics,
  searchUsers,
  searchPolicies,
  getPremiumQueue,
  getPayoutQueue,
  getUnderwritingExposure,
  listAuditLogs,
  listReviewQueue,
  suspendUserAccount,
  annotateAccount,
  overridePremiumDecision,
  overridePayoutDecision
};
