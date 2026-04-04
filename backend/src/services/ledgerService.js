const LedgerEntry = require("../models/LedgerEntry");
const AccountBalanceSnapshot = require("../models/AccountBalanceSnapshot");

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

async function writeLedgerEntry(entry) {
  return LedgerEntry.findOneAndUpdate(
    { idempotencyKey: entry.idempotencyKey },
    { $setOnInsert: entry },
    { upsert: true, new: true }
  );
}

async function writeLedgerEntries(entries) {
  const written = [];
  for (const entry of entries) {
    written.push(await writeLedgerEntry(entry));
  }
  return written;
}

function sumAmounts(entries, type) {
  return roundMoney(entries.filter((entry) => entry.type === type).reduce((sum, entry) => sum + Number(entry.amountInr || 0), 0));
}

async function buildFinanceSummary({ from, to, city, platformName } = {}) {
  const filter = {};
  if (from || to) {
    filter.effectiveAt = {};
    if (from) filter.effectiveAt.$gte = from;
    if (to) filter.effectiveAt.$lte = to;
  }
  if (city) filter.city = city;
  if (platformName) filter.platformName = platformName;

  const entries = await LedgerEntry.find(filter).lean();
  const grossPremiumsBilled = sumAmounts(entries, "premium_charged");
  const premiumsCollected = sumAmounts(entries, "premium_paid");
  const grossPayoutsApproved = sumAmounts(entries, "payout_approved");
  const payoutsPaid = sumAmounts(entries, "payout_paid");
  const heldLiabilities = sumAmounts(entries, "payout_held");
  const netWrittenPremium = roundMoney(grossPremiumsBilled - grossPayoutsApproved);
  const claimRatio = grossPremiumsBilled > 0 ? Number((grossPayoutsApproved / grossPremiumsBilled).toFixed(4)) : 0;
  const profitLoss = roundMoney(premiumsCollected - payoutsPaid - heldLiabilities);

  return {
    grossPremiumsBilled,
    premiumsCollected,
    grossPayoutsApproved,
    payoutsPaid,
    heldLiabilities,
    netWrittenPremium,
    claimRatio,
    profitLoss
  };
}

async function snapshotGlobalBalance(asOfDate = new Date()) {
  const totals = await buildFinanceSummary({ to: asOfDate });
  return AccountBalanceSnapshot.findOneAndUpdate(
    { scopeType: "global", scopeId: null, asOfDate },
    { $set: { totals } },
    { upsert: true, new: true }
  );
}

module.exports = { writeLedgerEntry, writeLedgerEntries, buildFinanceSummary, snapshotGlobalBalance };
