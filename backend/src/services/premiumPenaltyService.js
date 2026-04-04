function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function derivePremiumPenalty({ confidenceScore, confidenceBand }) {
  const score = Number(confidenceScore || 0);

  if (score < 75) {
    return {
      riskReviewFlag: true,
      manualReviewFlag: true,
      penaltyMultiplier: 1,
      reason: "low_confidence_flag_only"
    };
  }

  let penaltyMultiplier = 1.05;
  if (score >= 90) penaltyMultiplier = 1.22;
  else if (score >= 85) penaltyMultiplier = 1.15;
  else if (score >= 80) penaltyMultiplier = 1.1;

  if (confidenceBand === "low") penaltyMultiplier = Math.max(penaltyMultiplier, 1.2);
  if (confidenceBand === "medium") penaltyMultiplier = Math.max(penaltyMultiplier, 1.1);

  return {
    riskReviewFlag: score >= 85 || confidenceBand === "low",
    manualReviewFlag: score >= 92 || confidenceBand === "low",
    penaltyMultiplier: roundMoney(penaltyMultiplier),
    reason: "confidence_penalty_applied"
  };
}

module.exports = { derivePremiumPenalty, roundMoney };
