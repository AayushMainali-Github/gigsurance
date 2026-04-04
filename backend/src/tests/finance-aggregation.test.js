const test = require("node:test");
const assert = require("node:assert/strict");
const { setTestEnv, freshRequire, stubMethods } = require("./helpers/module");

setTestEnv();

test("buildFinanceSummary aggregates ledger totals", async () => {
  const LedgerEntry = freshRequire("models/LedgerEntry.js");
  const ledgerService = freshRequire("services/ledgerService.js");
  const restore = stubMethods(LedgerEntry, {
    find: () => ({
      lean: async () => ([
        { type: "premium_charged", amountInr: 300 },
        { type: "premium_paid", amountInr: 250 },
        { type: "payout_approved", amountInr: 120 },
        { type: "payout_paid", amountInr: 80 },
        { type: "payout_held", amountInr: 20 }
      ])
    })
  });

  try {
    const summary = await ledgerService.buildFinanceSummary({});
    assert.equal(summary.grossPremiumsBilled, 300);
    assert.equal(summary.premiumsCollected, 250);
    assert.equal(summary.grossPayoutsApproved, 120);
    assert.equal(summary.payoutsPaid, 80);
    assert.equal(summary.heldLiabilities, 20);
    assert.equal(summary.netWrittenPremium, 180);
    assert.equal(summary.profitLoss, 150);
  } finally {
    restore();
  }
});
