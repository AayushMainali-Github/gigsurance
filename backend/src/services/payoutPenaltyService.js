const { roundMoney } = require("./premiumPenaltyService");

function derivePayoutPenalty({ confidenceScore, confidenceBand, recommendedTrustAction }) {
  const score = Number(confidenceScore || 0);
  const action = recommendedTrustAction || "auto_allow";

  if (score < 75) {
    return {
      riskReviewFlag: true,
      manualReviewFlag: true,
      penaltyMultiplier: 1,
      holdPayout: false,
      reason: "low_confidence_flag_only"
    };
  }

  let penaltyMultiplier = 1;
  let holdPayout = false;

  if (action === "allow_with_checks") penaltyMultiplier = 0.92;
  if (action === "soft_hold") {
    penaltyMultiplier = 0.8;
    holdPayout = true;
  }
  if (action === "manual_review") {
    penaltyMultiplier = 0.7;
    holdPayout = true;
  }

  if (confidenceBand === "low") {
    penaltyMultiplier = Math.min(penaltyMultiplier, 0.75);
    holdPayout = true;
  } else if (confidenceBand === "medium") {
    penaltyMultiplier = Math.min(penaltyMultiplier, 0.9);
  }

  if (score >= 90) {
    penaltyMultiplier = Math.min(penaltyMultiplier, 0.78);
    holdPayout = true;
  } else if (score >= 85) {
    penaltyMultiplier = Math.min(penaltyMultiplier, 0.86);
  }

  return {
    riskReviewFlag: action !== "auto_allow" || score >= 85,
    manualReviewFlag: holdPayout,
    penaltyMultiplier: roundMoney(penaltyMultiplier),
    holdPayout,
    reason: "trust_penalty_applied"
  };
}

module.exports = { derivePayoutPenalty };
