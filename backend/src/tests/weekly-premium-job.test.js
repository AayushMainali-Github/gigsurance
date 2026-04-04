const test = require("node:test");
const assert = require("node:assert/strict");
const { setTestEnv, freshRequire, stubMethods } = require("./helpers/module");
const { policyFixture, linkedWorkerFixture, quoteResponseFixture } = require("./fixtures");

setTestEnv();

test("weekly premium run produces quoted decision and progress callbacks", async () => {
  const Policy = freshRequire("models/Policy.js");
  const LinkedWorker = freshRequire("models/LinkedWorker.js");
  const WeeklyPremiumDecision = freshRequire("models/WeeklyPremiumDecision.js");
  const PremiumInvoice = freshRequire("models/PremiumInvoice.js");
  const mlClient = freshRequire("services/mlClient.js");
  const ledgerService = freshRequire("services/ledgerService.js");
  const riskReviewService = freshRequire("services/riskReviewService.js");

  let decisionPayload = null;
  let invoicePayload = null;
  let progressSeen = null;

  const restorePolicy = stubMethods(Policy, {
    find: () => ({ lean: async () => ([{ ...policyFixture }]) }),
    updateOne: async () => ({ acknowledged: true })
  });
  const restoreWorker = stubMethods(LinkedWorker, {
    find: () => ({ lean: async () => ([{ ...linkedWorkerFixture }]) })
  });
  const restoreDecision = stubMethods(WeeklyPremiumDecision, {
    findOneAndUpdate: async (_filter, patch) => {
      decisionPayload = patch.$set;
      return { _id: "decision-1" };
    }
  });
  const restoreInvoice = stubMethods(PremiumInvoice, {
    findOneAndUpdate: async (_filter, patch) => {
      invoicePayload = patch.$set;
      return patch;
    }
  });
  const restoreMl = stubMethods(mlClient, {
    quoteBatch: async () => ({
      normalized: {
        version: "ml.quote.batch.v1",
        results: [freshRequire("services/mlNormalizers.js").normalizeQuoteResponse(quoteResponseFixture)],
        errors: []
      },
      archive: {
        requestPayload: { items: [{ worker_id: linkedWorkerFixture.platformDriverId }] },
        rawResponse: { results: [quoteResponseFixture] }
      }
    })
  });
  const restoreLedger = stubMethods(ledgerService, {
    writeLedgerEntries: async () => []
  });
  const restoreReview = stubMethods(riskReviewService, {
    createPremiumReviewCase: async () => null
  });
  const weeklyPremiumService = freshRequire("services/weeklyPremiumService.js");

  try {
    const result = await weeklyPremiumService.processWeeklyPremiumRun({
      scheduledFor: new Date("2026-04-06T00:01:00.000Z"),
      onProgress: async (progress) => { progressSeen = progress; }
    });
    assert.equal(result.processedCount, 1);
    assert.equal(result.successCount, 1);
    assert.equal(decisionPayload.status, "quoted");
    assert.ok(invoicePayload.amountInr > 0);
    assert.equal(progressSeen.processedCount, 1);
  } finally {
    restorePolicy();
    restoreWorker();
    restoreDecision();
    restoreInvoice();
    restoreMl();
    restoreLedger();
    restoreReview();
  }
});
