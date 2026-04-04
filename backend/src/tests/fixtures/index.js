const userFixture = {
  _id: "user-1",
  email: "rider@example.com",
  role: "user",
  status: "active",
  linkedWorkers: [],
  linkedWorkerId: null,
  currentPolicyId: null,
  async save() {
    return this;
  }
};

const linkedWorkerFixture = {
  _id: "worker-link-1",
  userId: "user-1",
  platformName: "swiggy",
  platformDriverId: "SWIGGY-DEL-00000145",
  city: "Delhi",
  state: "Delhi",
  cityTier: "tier1",
  enrollmentStatus: "linked",
  workerSnapshotCache: {},
  async save() {
    return this;
  }
};

const policyFixture = {
  _id: "policy-1",
  userId: "user-1",
  linkedWorkerId: "worker-link-1",
  status: "active",
  startedAt: new Date("2026-03-01T00:00:00.000Z"),
  currentWeeklyPremiumInr: 100,
  noClaimWeeks: 3,
  fraudMultiplier: 1,
  payoutReductionMultiplier: 1
};

const quoteResponseFixture = {
  worker_id: "SWIGGY-DEL-00000145",
  platform_name: "swiggy",
  premium_inr: 84.4,
  premium_deliveries: 2.1,
  quote_confidence_score: 88,
  quote_confidence_band: "high",
  predicted_next_week_income_inr: 4180.2,
  forecast_details: { combined_disruption_score: 0.44 },
  structural_fragility_score: 0.33,
  environmental_fragility_score: 0.41,
  resilience_trajectory_score: 0.64,
  pricing_receipt: { components: [] }
};

const payoutResponseFixture = {
  worker_id: "SWIGGY-DEL-00000145",
  platform_name: "swiggy",
  recommended_payout_inr: 220.5,
  payout_eligible: true,
  decision_confidence_score: 89,
  decision_confidence_band: "medium",
  recommended_trust_action: "allow_with_checks",
  trigger_certainty_score: 0.71,
  location_alignment_score: 0.92,
  location_alignment_score_100: 92,
  cohort_support_score: 0.66,
  payout_receipt: { components: [] }
};

const incidentFixture = {
  _id: "incident-1",
  date: new Date("2026-04-03T00:00:00.000Z"),
  city: "Delhi",
  state: "Delhi",
  disruptionScore: 0.83,
  triggerType: "storm",
  verified: true,
  sourceEvidence: { weatherSeverity: 0.82, aqiSeverity: 0.4 }
};

const flaggedTrustFixture = {
  confidenceScore: 93,
  confidenceBand: "low",
  recommendedTrustAction: "manual_review"
};

module.exports = {
  userFixture,
  linkedWorkerFixture,
  policyFixture,
  quoteResponseFixture,
  payoutResponseFixture,
  incidentFixture,
  flaggedTrustFixture
};
