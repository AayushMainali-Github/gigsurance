const { mongoose } = require("../config/db");

const weeklyPremiumDecisionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  policyId: { type: mongoose.Schema.Types.ObjectId, ref: "Policy", required: true, index: true },
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: "LinkedWorker", required: true, index: true },
  weekStart: { type: Date, required: true, index: true },
  weekEnd: { type: Date, required: true },
  basePremiumInr: { type: Number, required: true },
  penaltyMultiplier: { type: Number, required: true, default: 1 },
  finalPremiumInr: { type: Number, required: true },
  confidenceScore: { type: Number, default: 0 },
  confidenceBand: { type: String, default: null },
  riskReviewFlag: { type: Boolean, default: false, index: true },
  manualReviewFlag: { type: Boolean, default: false, index: true },
  mlReceipt: { type: mongoose.Schema.Types.Mixed, default: null },
  finalDecisionSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
  penaltyExplanation: { type: mongoose.Schema.Types.Mixed, default: null },
  adminOverride: { type: mongoose.Schema.Types.Mixed, default: null },
  mlVersion: { type: String, default: null },
  status: { type: String, enum: ["pending", "quoted", "failed"], default: "pending", index: true }
}, { collection: "weekly_premium_decisions", timestamps: true, versionKey: false });

weeklyPremiumDecisionSchema.index({ policyId: 1, weekStart: 1 }, { unique: true });

module.exports = mongoose.models.WeeklyPremiumDecision || mongoose.model("WeeklyPremiumDecision", weeklyPremiumDecisionSchema);
