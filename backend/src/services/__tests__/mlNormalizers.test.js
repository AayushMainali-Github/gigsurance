const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeQuoteResponse, normalizePayoutResponse } = require("../mlNormalizers");
const { quoteResponseFixture, payoutResponseFixture } = require("../../tests/fixtures");

test("normalizeQuoteResponse maps ml quote payloads", () => {
  const quote = normalizeQuoteResponse(quoteResponseFixture);
  assert.equal(quote.version, "ml.quote.v1");
  assert.equal(quote.workerId, "SWIGGY-DEL-00000145");
  assert.equal(quote.premiumAmountInr, 84.4);
  assert.equal(quote.quoteConfidenceScore, 88);
  assert.equal(quote.predictedNextWeekIncomeInr, 4180.2);
  assert.equal(quote.fragilityFeatures.structuralFragilityScore, 0.33);
});

test("normalizePayoutResponse maps ml payout payloads", () => {
  const payout = normalizePayoutResponse(payoutResponseFixture);
  assert.equal(payout.version, "ml.payout.v1");
  assert.equal(payout.recommendedPayoutInr, 220.5);
  assert.equal(payout.payoutEligible, true);
  assert.equal(payout.decisionConfidenceScore, 89);
  assert.equal(payout.locationAlignmentScore100, 92);
});
