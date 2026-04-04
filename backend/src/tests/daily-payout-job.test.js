const test = require("node:test");
const assert = require("node:assert/strict");
const { setTestEnv, freshRequire, stubMethods } = require("./helpers/module");
const { policyFixture, linkedWorkerFixture, payoutResponseFixture, incidentFixture } = require("./fixtures");

setTestEnv();

test("daily payout run produces payout decision and transaction", async () => {
  const Policy = freshRequire("models/Policy.js");
  const LinkedWorker = freshRequire("models/LinkedWorker.js");
  const DailyPayoutDecision = freshRequire("models/DailyPayoutDecision.js");
  const PayoutTransaction = freshRequire("models/PayoutTransaction.js");
  const mlClient = freshRequire("services/mlClient.js");
  const incidentDetectionService = freshRequire("services/incidentDetectionService.js");
  const ledgerService = freshRequire("services/ledgerService.js");
  const riskReviewService = freshRequire("services/riskReviewService.js");
  const dailyPayoutService = freshRequire("services/dailyPayoutService.js");

  let decisionPayload = null;
  let txPayload = null;

  const restorePolicy = stubMethods(Policy, {
    find: () => ({ lean: async () => ([{ ...policyFixture }]) }),
    updateOne: async () => ({ acknowledged: true })
  });
  const restoreWorker = stubMethods(LinkedWorker, {
    find: () => ({ lean: async () => ([{ ...linkedWorkerFixture }]) })
  });
  const restoreDecision = stubMethods(DailyPayoutDecision, {
    findOneAndUpdate: async (_filter, patch) => {
      decisionPayload = patch.$set;
      return { _id: "payout-decision-1" };
    }
  });
  const restoreTx = stubMethods(PayoutTransaction, {
    findOneAndUpdate: async (_filter, patch) => {
      txPayload = patch.$set;
      return patch;
    }
  });
  const restoreMl = stubMethods(mlClient, {
    assessPayoutBatch: async () => ({
      normalized: {
        version: "ml.payout.batch.v1",
        results: [freshRequire("services/mlNormalizers.js").normalizePayoutResponse(payoutResponseFixture)],
        errors: []
      },
      archive: {
        requestPayload: { items: [{ worker_id: linkedWorkerFixture.platformDriverId }] },
        rawResponse: { results: [payoutResponseFixture] }
      }
    })
  });
  const restoreIncident = stubMethods(incidentDetectionService, {
    previousDay: () => incidentFixture.date,
    detectIncidentsForDate: async () => ([incidentFixture])
  });
  const restoreLedger = stubMethods(ledgerService, {
    writeLedgerEntries: async () => [],
    snapshotGlobalBalance: async () => null
  });
  const restoreReview = stubMethods(riskReviewService, {
    createPayoutReviewCase: async () => null
  });

  try {
    const result = await dailyPayoutService.processDailyPayoutRun({
      scheduledFor: new Date("2026-04-04T00:01:00.000Z")
    });
    assert.equal(result.processedCount, 1);
    assert.equal(result.successCount, 1);
    assert.equal(decisionPayload.payoutEligible, true);
    assert.ok(["pending", "held", "failed"].includes(txPayload.status));
  } finally {
    restorePolicy();
    restoreWorker();
    restoreDecision();
    restoreTx();
    restoreMl();
    restoreIncident();
    restoreLedger();
    restoreReview();
  }
});
