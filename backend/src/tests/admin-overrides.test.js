const test = require("node:test");
const assert = require("node:assert/strict");
const { setTestEnv, freshRequire, stubMethods } = require("./helpers/module");
const { policyFixture } = require("./fixtures");

setTestEnv();

test("overridePremiumDecision updates invoice, policy, and audit trail", async () => {
  const WeeklyPremiumDecision = freshRequire("models/WeeklyPremiumDecision.js");
  const PremiumInvoice = freshRequire("models/PremiumInvoice.js");
  const Policy = freshRequire("models/Policy.js");
  const auditLogService = freshRequire("services/auditLogService.js");
  const ledgerService = freshRequire("services/ledgerService.js");

  const decision = {
    _id: "premium-decision-1",
    userId: "user-1",
    policyId: "policy-1",
    basePremiumInr: 100,
    finalPremiumInr: 110,
    penaltyMultiplier: 1.1,
    manualReviewFlag: true,
    status: "pending",
    finalDecisionSnapshot: {},
    async save() { return this; },
    toObject() { return this; }
  };
  let invoicePatch = null;
  let policyPatch = null;
  let auditPayload = null;
  let ledgerWritten = null;

  const restoreDecision = stubMethods(WeeklyPremiumDecision, {
    findById: async () => decision
  });
  const restoreInvoice = stubMethods(PremiumInvoice, {
    findOneAndUpdate: async (_filter, patch) => { invoicePatch = patch; return patch; }
  });
  const restorePolicy = stubMethods(Policy, {
    updateOne: async (_filter, patch) => { policyPatch = patch; return { acknowledged: true }; }
  });
  const restoreAudit = stubMethods(auditLogService, {
    writeAuditLog: async (payload) => { auditPayload = payload; return payload; }
  });
  const restoreLedger = stubMethods(ledgerService, {
    writeLedgerEntry: async (payload) => { ledgerWritten = payload; return payload; }
  });
  const adminService = freshRequire("services/adminService.js");

  try {
    const result = await adminService.overridePremiumDecision({
      decisionId: "premium-decision-1",
      adminUserId: "admin-1",
      finalPremiumInr: 125,
      reason: "manual correction"
    });

    assert.equal(result.finalPremiumInr, 125);
    assert.equal(invoicePatch.$set.amountInr, 125);
    assert.equal(policyPatch.$set.currentWeeklyPremiumInr, 125);
    assert.equal(auditPayload.action, "override_premium");
    assert.equal(ledgerWritten.metadata.overrideType, "premium");
  } finally {
    restoreDecision();
    restoreInvoice();
    restorePolicy();
    restoreAudit();
    restoreLedger();
  }
});
