require("dotenv").config();

const bcrypt = require("bcryptjs");
const { connectDb, mongoose } = require("../src/config/db");
const { config } = require("../src/config/env");
const { listDeliveryDrivers, healthcheckMockApi } = require("../src/services/mockApiClient");
const { processWeeklyPremiumRun, weekBounds } = require("../src/services/weeklyPremiumService");
const { processDailyPayoutRun } = require("../src/services/dailyPayoutService");
const { writeLedgerEntries, snapshotGlobalBalance } = require("../src/services/ledgerService");
const User = require("../src/models/User");
const LinkedWorker = require("../src/models/LinkedWorker");
const Policy = require("../src/models/Policy");
const DailyPayoutDecision = require("../src/models/DailyPayoutDecision");
const IncidentWindow = require("../src/models/IncidentWindow");
const LedgerEntry = require("../src/models/LedgerEntry");
const PremiumInvoice = require("../src/models/PremiumInvoice");
const PremiumCollectionAttempt = require("../src/models/PremiumCollectionAttempt");
const PayoutTransaction = require("../src/models/PayoutTransaction");
const RiskReviewCase = require("../src/models/RiskReviewCase");
const ScheduledJobRun = require("../src/models/ScheduledJobRun");
const WeeklyPremiumDecision = require("../src/models/WeeklyPremiumDecision");
const AuditLog = require("../src/models/AuditLog");
const AccountBalanceSnapshot = require("../src/models/AccountBalanceSnapshot");
const { ROLES } = require("../src/constants/roles");
const { healthcheck } = require("../src/services/mlClient");

function getArgValue(flag, fallback) {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index === process.argv.length - 1) return fallback;
  const value = Number(process.argv[index + 1]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function utcDate(daysAgo, hour = 0, minute = 1) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysAgo, hour, minute, 0, 0));
}

function deterministicScore(input) {
  const text = String(input || "");
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash % 10000) / 10000;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function buildSeedEmail(driver) {
  return `seeded+${String(driver.platformName).toLowerCase()}-${String(driver.platformDriverId).toLowerCase()}@gigsurance.local`;
}

function buildStartedAt(driver, horizonDays) {
  const offset = 12 + Math.floor(deterministicScore(driver.platformDriverId) * Math.max(12, Math.floor(horizonDays / 3)));
  return utcDate(horizonDays - offset, 9, 0);
}

async function clearBackendCollections() {
  await Promise.all([
    User.deleteMany({}),
    LinkedWorker.deleteMany({}),
    Policy.deleteMany({}),
    WeeklyPremiumDecision.deleteMany({}),
    PremiumInvoice.deleteMany({}),
    PremiumCollectionAttempt.deleteMany({}),
    DailyPayoutDecision.deleteMany({}),
    PayoutTransaction.deleteMany({}),
    IncidentWindow.deleteMany({}),
    LedgerEntry.deleteMany({}),
    RiskReviewCase.deleteMany({}),
    AuditLog.deleteMany({}),
    ScheduledJobRun.deleteMany({}),
    AccountBalanceSnapshot.deleteMany({})
  ]);
}

async function ensureSeededPolicy(driver, passwordHash, horizonDays) {
  const email = buildSeedEmail(driver);
  const user = await User.findOneAndUpdate(
    { email },
    {
      $setOnInsert: {
        email,
        passwordHash,
        role: ROLES.USER,
        status: "active"
      }
    },
    { upsert: true, new: true }
  );

  const startedAt = buildStartedAt(driver, horizonDays);
  const noClaimWeeks = Math.floor(deterministicScore(`${driver.platformDriverId}:noclaim`) * 7);

  const linkedWorker = await LinkedWorker.findOneAndUpdate(
    { platformName: driver.platformName, platformDriverId: driver.platformDriverId },
    {
      $set: {
        userId: user._id,
        city: driver.city,
        state: driver.state,
        cityTier: driver.cityTier,
        linkedAt: startedAt,
        enrollmentStatus: "enrolled",
        workerSnapshotCache: driver
      },
      $setOnInsert: {
        platformName: String(driver.platformName).toLowerCase(),
        platformDriverId: driver.platformDriverId
      }
    },
    { upsert: true, new: true }
  );

  const policy = await Policy.findOneAndUpdate(
    { linkedWorkerId: linkedWorker._id },
    {
      $set: {
        userId: user._id,
        status: "active",
        startedAt,
        noClaimWeeks,
        endedAt: null
      }
    },
    { upsert: true, new: true }
  );

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        linkedWorkerId: linkedWorker._id,
        currentPolicyId: policy._id
      },
      $addToSet: {
        linkedWorkers: linkedWorker._id
      }
    }
  );

  return { user, linkedWorker, policy };
}

async function seedPortfolioUsers({ driverCount, horizonDays }) {
  const selectedDrivers = await listDeliveryDrivers({ sortBy: "joinedAt", order: "asc" }, driverCount);
  const passwordHash = await bcrypt.hash("SeededUser!123", 10);

  for (const driver of selectedDrivers) {
    await ensureSeededPolicy(driver, passwordHash, horizonDays);
  }

  return selectedDrivers.length;
}

function eachMondayWithinHorizon(horizonDays) {
  const start = utcDate(horizonDays, 0, 1);
  const end = new Date();
  const cursor = new Date(start);
  const day = cursor.getUTCDay();
  const offsetToMonday = day === 0 ? 1 : ((8 - day) % 7);
  cursor.setUTCDate(cursor.getUTCDate() + offsetToMonday);

  const dates = [];
  while (cursor <= end) {
    dates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }
  return dates;
}

async function replayHistoricalPremiums(horizonDays) {
  const mondays = eachMondayWithinHorizon(horizonDays);
  for (const scheduledFor of mondays) {
    await processWeeklyPremiumRun({ scheduledFor });
  }
  return mondays.length;
}

async function replayHistoricalPayouts(horizonDays) {
  const scheduledDays = [];
  for (let offset = horizonDays - 1; offset >= 0; offset -= 1) {
    scheduledDays.push(utcDate(offset, 0, 1));
  }

  for (const scheduledFor of scheduledDays) {
    await processDailyPayoutRun({ scheduledFor });
  }

  return scheduledDays.length;
}

async function settleHistoricalInvoices() {
  let paidCount = 0;
  let overdueCount = 0;
  let waivedCount = 0;
  let lastId = null;

  while (true) {
    const invoices = await PremiumInvoice.find(lastId ? { _id: { $gt: lastId } } : {})
      .sort({ _id: 1 })
      .limit(100)
      .populate({
        path: "premiumDecisionId",
        populate: [{ path: "userId" }, { path: "policyId" }, { path: "workerId" }]
      });

    if (!invoices.length) break;

    for (const invoice of invoices) {
      lastId = invoice._id;
    const dueAt = new Date(invoice.dueAt);
    const ageDays = Math.floor((Date.now() - dueAt.getTime()) / (24 * 60 * 60 * 1000));
    if (ageDays <= 0) continue;

    const roll = deterministicScore(invoice._id);
    let status = "paid";
    if (roll > 0.9) status = "waived";
    else if (roll > 0.78) status = "overdue";

    const paidAt = status === "paid" ? addDays(dueAt, 1 + Math.floor(roll * 4)) : null;

    await PremiumInvoice.updateOne(
      { _id: invoice._id },
      { $set: { status, paidAt } }
    );

    await PremiumCollectionAttempt.findOneAndUpdate(
      { premiumInvoiceId: invoice._id },
      {
        $set: {
          attemptedAt: paidAt || addDays(dueAt, 2),
          amountInr: invoice.amountInr,
          status: status === "paid" ? "succeeded" : status === "overdue" ? "failed" : "pending",
          providerRef: status === "paid" ? `seed-pay-${invoice._id}` : null,
          failureReason: status === "overdue" ? "customer_balance_unavailable" : null
        }
      },
      { upsert: true, new: true }
    );

    if (status === "paid" || status === "waived") {
      const type = status === "paid" ? "premium_paid" : "premium_waived";
      await writeLedgerEntries([{
        userId: invoice.premiumDecisionId.userId?._id || invoice.premiumDecisionId.userId,
        policyId: invoice.premiumDecisionId.policyId?._id || invoice.premiumDecisionId.policyId,
        city: invoice.premiumDecisionId.workerId?.city,
        state: invoice.premiumDecisionId.workerId?.state,
        platformName: invoice.premiumDecisionId.workerId?.platformName,
        type,
        direction: "credit",
        amountInr: invoice.amountInr,
        sourceType: "premium_invoice",
        sourceId: invoice._id,
        effectiveAt: paidAt || addDays(dueAt, 2),
        metadata: { seeded: true, invoiceStatus: status },
        idempotencyKey: `seed:${type}:${invoice._id}`
      }]);
    }

    if (status === "paid") paidCount += 1;
    else if (status === "overdue") overdueCount += 1;
    else if (status === "waived") waivedCount += 1;
  }
  }

  return { paidCount, overdueCount, waivedCount };
}

async function settleHistoricalPayouts() {
  let paidCount = 0;
  let heldCount = 0;
  let failedCount = 0;
  let lastId = null;

  while (true) {
    const transactions = await PayoutTransaction.find(lastId ? { _id: { $gt: lastId } } : {})
      .sort({ _id: 1 })
      .limit(100)
      .populate({
        path: "payoutDecisionId",
        populate: [{ path: "workerId" }]
      });

    if (!transactions.length) break;

    for (const transaction of transactions) {
      lastId = transaction._id;
    if (transaction.status !== "pending") {
      if (transaction.status === "held") heldCount += 1;
      if (transaction.status === "failed") failedCount += 1;
      continue;
    }

    const ageDays = Math.floor((Date.now() - new Date(transaction.createdAt).getTime()) / (24 * 60 * 60 * 1000));
    if (ageDays < 2) continue;

    const roll = deterministicScore(transaction._id);
    const status = roll > 0.96 ? "failed" : "paid";
    const disbursedAt = status === "paid" ? addDays(new Date(transaction.createdAt), 1 + Math.floor(roll * 3)) : null;

    await PayoutTransaction.updateOne(
      { _id: transaction._id },
      {
        $set: {
          status,
          disbursedAt,
          referenceId: status === "paid" ? `seed-payout-${transaction._id}` : null,
          reconciliationState: status === "paid" ? "reconciled" : "unreconciled"
        }
      }
    );

    if (status === "paid") paidCount += 1;
    else failedCount += 1;
  }
  }

  return { paidCount, heldCount, failedCount };
}

async function refreshPolicyPointers() {
  const currentWeek = weekBounds(new Date()).weekStart;
  let lastId = null;
  while (true) {
    const policies = await Policy.find(lastId ? { _id: { $gt: lastId } } : {}).sort({ _id: 1 }).limit(200);
    if (!policies.length) break;
    for (const policy of policies) {
      lastId = policy._id;
    const latestQuote = await WeeklyPremiumDecision.findOne({ policyId: policy._id, weekStart: currentWeek }).sort({ createdAt: -1 }).lean();
    if (latestQuote) {
      policy.currentWeeklyPremiumInr = latestQuote.finalPremiumInr;
    }
    await policy.save();
  }
  }
}

async function main() {
  const driverCount = getArgValue("--drivers", 1000);
  const horizonDays = getArgValue("--days", 60);

  console.log(`Seeding historical backend portfolio: drivers=${driverCount}, days=${horizonDays}`);
  console.log(`Using mock API ${config.mockApiBaseUrl} and ML API ${config.mlApiBaseUrl}`);

  await healthcheckMockApi();
  await healthcheck();
  await connectDb();
  await clearBackendCollections();

  const seededUsers = await seedPortfolioUsers({ driverCount, horizonDays });
  const premiumRuns = await replayHistoricalPremiums(horizonDays);
  const payoutRuns = await replayHistoricalPayouts(horizonDays);
  const invoiceSettlement = await settleHistoricalInvoices();
  const payoutSettlement = await settleHistoricalPayouts();
  await refreshPolicyPointers();
  await snapshotGlobalBalance(new Date());

  const counts = {
    users: await User.countDocuments({ email: /@gigsurance\.local$/ }),
    linkedWorkers: await LinkedWorker.countDocuments({}),
    policies: await Policy.countDocuments({}),
    weeklyPremiumDecisions: await WeeklyPremiumDecision.countDocuments({}),
    payoutDecisions: await mongoose.connection.collection("daily_payout_decisions").countDocuments({})
  };

  console.log("Historical seed complete.");
  console.log(JSON.stringify({
    seededUsers,
    premiumRuns,
    payoutRuns,
    invoiceSettlement,
    payoutSettlement,
    counts
  }, null, 2));
}

main()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Historical seed failed:", error);
    if (error?.statusCode === 503) {
      console.error("Make sure both services are running first:");
      console.error(`- mock-api at ${config.mockApiBaseUrl}`);
      console.error(`- ml api at ${config.mlApiBaseUrl}`);
    }
    await mongoose.disconnect();
    process.exit(1);
  });
