function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeQuoteResponse(raw) {
  return {
    version: "ml.quote.v1",
    workerId: raw.worker_id || null,
    platformName: raw.platform_name || null,
    premiumAmountInr: toNumber(raw.premium_inr),
    premiumDeliveries: toNumber(raw.premium_deliveries),
    quoteConfidenceScore: toNumber(raw.quote_confidence_score),
    quoteConfidenceBand: raw.quote_confidence_band || null,
    predictedNextWeekIncomeInr: toNumber(raw.predicted_next_week_income_inr),
    forecastDetails: raw.forecast_details || raw.forecast_window || null,
    fragilityFeatures: {
      structuralFragilityScore: toNumber(raw.structural_fragility_score, null),
      environmentalFragilityScore: toNumber(raw.environmental_fragility_score, null),
      resilienceTrajectoryScore: toNumber(raw.resilience_trajectory_score, null),
      seasonalRiskPhaseScore: toNumber(raw.seasonal_risk_phase_score, null),
      earningsRegimeShiftScore: toNumber(raw.earnings_regime_shift_score, null),
      weatherResilienceDividend: toNumber(raw.weather_resilience_dividend, null)
    },
    pricingReceipt: raw.pricing_receipt || null,
    raw
  };
}

function normalizePayoutResponse(raw) {
  return {
    version: "ml.payout.v1",
    workerId: raw.worker_id || null,
    platformName: raw.platform_name || null,
    recommendedPayoutInr: toNumber(raw.recommended_payout_inr),
    payoutEligible: Boolean(raw.payout_eligible),
    decisionConfidenceScore: toNumber(raw.decision_confidence_score),
    decisionConfidenceBand: raw.decision_confidence_band || null,
    recommendedTrustAction: raw.recommended_trust_action || null,
    triggerCertaintyScore: toNumber(raw.trigger_certainty_score),
    triggerStrengthScore: toNumber(raw.payout_trigger_strength ?? raw.trigger_strength_score),
    claimConfidence: toNumber(raw.claim_confidence),
    locationAlignmentScore: toNumber(raw.location_alignment_score),
    locationAlignmentScore100: toNumber(raw.location_alignment_score_100),
    cohortSupportScore: toNumber(raw.cohort_support_score),
    counterfactualCoherenceScore: toNumber(raw.counterfactual_coherence_score),
    historicalDataDepthScore: toNumber(raw.historical_data_depth_score),
    environmentForecastAgreementScore: toNumber(raw.environment_forecast_agreement_score),
    payoutReceipt: raw.payout_receipt || null,
    raw
  };
}

module.exports = { normalizeQuoteResponse, normalizePayoutResponse };
