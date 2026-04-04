const test = require("node:test");
const assert = require("node:assert/strict");
const { derivePremiumPenalty } = require("../services/premiumPenaltyService");
const { derivePayoutPenalty } = require("../services/payoutPenaltyService");
const { flaggedTrustFixture } = require("./fixtures");

test("premium penalty stays neutral below confidence threshold", () => {
  const result = derivePremiumPenalty({ confidenceScore: 74, confidenceBand: "high" });
  assert.equal(result.penaltyMultiplier, 1);
  assert.equal(result.manualReviewFlag, true);
});

test("premium confidence handling keeps price neutral and flags only for review", () => {
  const result = derivePremiumPenalty({ confidenceScore: 91, confidenceBand: "low" });
  assert.equal(result.riskReviewFlag, true);
  assert.equal(result.penaltyMultiplier, 1);
  assert.equal(result.reason, "confidence_review_only");
});

test("payout penalty can hold high-risk cases", () => {
  const result = derivePayoutPenalty(flaggedTrustFixture);
  assert.equal(result.holdPayout, true);
  assert.ok(result.penaltyMultiplier < 1);
});
