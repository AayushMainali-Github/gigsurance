const { mongoose } = require("../config/db");

const dailyPayoutDecisionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  policyId: { type: mongoose.Schema.Types.ObjectId, ref: "Policy", required: true, index: true },
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: "LinkedWorker", required: true, index: true },
  incidentDate: { type: Date, required: true, index: true },
  basePayoutInr: { type: Number, required: true, default: 0 },
  penaltyMultiplier: { type: Number, required: true, default: 1 },
  finalPayoutInr: { type: Number, required: true, default: 0 },
  payoutEligible: { type: Boolean, default: false, index: true },
  confidenceScore: { type: Number, default: 0 },
  confidenceBand: { type: String, default: null },
  riskReviewFlag: { type: Boolean, default: false, index: true },
  manualReviewFlag: { type: Boolean, default: false, index: true },
  recommendedTrustAction: { type: String, default: null },
  mlReceipt: { type: mongoose.Schema.Types.Mixed, default: null },
  finalDecisionSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
  penaltyExplanation: { type: mongoose.Schema.Types.Mixed, default: null },
  adminOverride: { type: mongoose.Schema.Types.Mixed, default: null },
  mlVersion: { type: String, default: null },
  status: { type: String, enum: ["pending", "approved", "held", "failed", "not_eligible"], default: "pending", index: true }
}, { collection: "daily_payout_decisions", timestamps: true, versionKey: false });

dailyPayoutDecisionSchema.index({ policyId: 1, incidentDate: 1 }, { unique: true });

module.exports = mongoose.models.DailyPayoutDecision || mongoose.model("DailyPayoutDecision", dailyPayoutDecisionSchema);
