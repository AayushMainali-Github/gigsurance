const { mongoose } = require("../config/db");

const policySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  linkedWorkerId: { type: mongoose.Schema.Types.ObjectId, ref: "LinkedWorker", required: true, index: true },
  status: { type: String, enum: ["active", "paused", "cancelled", "pending"], default: "active", index: true },
  startedAt: { type: Date, required: true, default: Date.now },
  endedAt: { type: Date, default: null },
  currentWeeklyPremiumInr: { type: Number, default: 0 },
  noClaimWeeks: { type: Number, default: 0 },
  fraudMultiplier: { type: Number, default: 1 },
  payoutReductionMultiplier: { type: Number, default: 1 },
  latestQuoteMeta: { type: mongoose.Schema.Types.Mixed, default: null },
  latestPayoutMeta: { type: mongoose.Schema.Types.Mixed, default: null }
}, { collection: "policies", timestamps: true, versionKey: false });

policySchema.index({ userId: 1, status: 1 });
policySchema.index({ linkedWorkerId: 1, status: 1 });

module.exports = mongoose.models.Policy || mongoose.model("Policy", policySchema);
