function buildPremiumExplanation({ quote, penalty, basePremiumInr, finalPremiumInr, weekStart, weekEnd }) {
  return {
    type: "premium",
    summary: penalty.penaltyMultiplier > 1
      ? "Weekly premium increased by trust penalty rules."
      : penalty.manualReviewFlag
        ? "Weekly premium held at base amount and flagged for review."
        : "Weekly premium accepted at base amount.",
    modelInputs: {
      workerId: quote.workerId,
      platformName: quote.platformName,
      predictedNextWeekIncomeInr: quote.predictedNextWeekIncomeInr,
      fragilityFeatures: quote.fragilityFeatures,
      forecastDetails: quote.forecastDetails
    },
    modelOutputs: {
      premiumAmountInr: quote.premiumAmountInr,
      quoteConfidenceScore: quote.quoteConfidenceScore,
      quoteConfidenceBand: quote.quoteConfidenceBand
    },
    backendDecision: {
      weekStart,
      weekEnd,
      basePremiumInr,
      penaltyMultiplier: penalty.penaltyMultiplier,
      finalPremiumInr,
      riskReviewFlag: penalty.riskReviewFlag,
      manualReviewFlag: penalty.manualReviewFlag
    },
    penaltyExplanation: {
      reason: penalty.reason,
      label: penalty.penaltyMultiplier > 1 ? "premium_penalty_applied" : "flag_only_or_base_quote",
      deltaInr: Number((finalPremiumInr - basePremiumInr).toFixed(2))
    }
  };
}

function buildPayoutExplanation({ payout, penalty, incident, basePayoutInr, finalPayoutInr, status }) {
  return {
    type: "payout",
    summary: !payout.payoutEligible
      ? "Payout marked not eligible for this incident window."
      : penalty.holdPayout
        ? "Payout reduced and held for manual review."
        : penalty.penaltyMultiplier < 1
          ? "Payout reduced by trust penalty rules."
          : "Payout approved without reduction.",
    modelInputs: {
      workerId: payout.workerId,
      platformName: payout.platformName,
      incidentCity: incident.city,
      incidentState: incident.state,
      disruptionScore: incident.disruptionScore
    },
    modelOutputs: {
      recommendedPayoutInr: payout.recommendedPayoutInr,
      payoutEligible: payout.payoutEligible,
      decisionConfidenceScore: payout.decisionConfidenceScore,
      decisionConfidenceBand: payout.decisionConfidenceBand,
      recommendedTrustAction: payout.recommendedTrustAction,
      triggerCertaintyScore: payout.triggerCertaintyScore,
      locationAlignmentScore: payout.locationAlignmentScore
    },
    backendDecision: {
      incidentDate: incident.date,
      basePayoutInr,
      penaltyMultiplier: penalty.penaltyMultiplier,
      finalPayoutInr,
      status,
      holdPayout: penalty.holdPayout,
      riskReviewFlag: penalty.riskReviewFlag,
      manualReviewFlag: penalty.manualReviewFlag
    },
    penaltyExplanation: {
      reason: penalty.reason,
      label: penalty.holdPayout ? "hold_for_review" : penalty.penaltyMultiplier < 1 ? "payout_reduction_applied" : "no_reduction",
      deltaInr: Number((basePayoutInr - finalPayoutInr).toFixed(2))
    }
  };
}

function buildOverrideExplanation({ kind, previousValue, nextValue, reason, adminUserId, status }) {
  return {
    kind,
    previousValue,
    nextValue,
    reason,
    status: status || null,
    overriddenBy: adminUserId,
    overriddenAt: new Date()
  };
}

module.exports = {
  buildPremiumExplanation,
  buildPayoutExplanation,
  buildOverrideExplanation
};
