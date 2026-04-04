function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function derivePremiumPenalty({ confidenceScore, confidenceBand }) {
  const score = Number(confidenceScore || 0);
  const normalizedBand = String(confidenceBand || "").toLowerCase();

  if (score < 75) {
    return {
      riskReviewFlag: true,
      manualReviewFlag: true,
      penaltyMultiplier: 1,
      reason: "low_confidence_flag_only"
    };
  }

  return {
    riskReviewFlag: normalizedBand === "low" || score >= 90,
    manualReviewFlag: normalizedBand === "low" || score >= 95,
    penaltyMultiplier: 1,
    reason: "confidence_review_only"
  };
}

module.exports = { derivePremiumPenalty, roundMoney };
