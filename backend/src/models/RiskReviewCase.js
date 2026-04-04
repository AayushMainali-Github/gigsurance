const { mongoose } = require("../config/db");

const riskReviewCaseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  policyId: { type: mongoose.Schema.Types.ObjectId, ref: "Policy", required: true, index: true },
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: "LinkedWorker", required: true, index: true },
  source: { type: String, enum: ["premium", "payout"], required: true, index: true },
  sourceDecisionId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  score: { type: Number, default: 0 },
  band: { type: String, default: null },
  reviewReason: { type: String, required: true },
  confidenceInputs: { type: mongoose.Schema.Types.Mixed, default: null },
  actionTaken: { type: String, default: "flagged" },
  autoPenaltyApplied: { type: Boolean, default: false, index: true },
  manualReviewRequired: { type: Boolean, default: false, index: true },
  status: { type: String, enum: ["open", "investigating", "cleared", "penalized", "blocked"], default: "open", index: true },
  notes: { type: String, default: null },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  reviewedAt: { type: Date, default: null }
}, { collection: "risk_review_cases", timestamps: true, versionKey: false });

riskReviewCaseSchema.index({ source: 1, sourceDecisionId: 1 }, { unique: true });

module.exports = mongoose.models.RiskReviewCase || mongoose.model("RiskReviewCase", riskReviewCaseSchema);
