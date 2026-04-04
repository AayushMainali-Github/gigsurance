const { mongoose } = require("../config/db");

const accountBalanceSnapshotSchema = new mongoose.Schema({
  scopeType: { type: String, enum: ["global", "user", "policy"], required: true, index: true },
  scopeId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
  asOfDate: { type: Date, required: true, index: true },
  totals: {
    grossPremiumsBilled: { type: Number, default: 0 },
    premiumsCollected: { type: Number, default: 0 },
    grossPayoutsApproved: { type: Number, default: 0 },
    payoutsPaid: { type: Number, default: 0 },
    heldLiabilities: { type: Number, default: 0 },
    netWrittenPremium: { type: Number, default: 0 },
    claimRatio: { type: Number, default: 0 },
    profitLoss: { type: Number, default: 0 }
  }
}, { collection: "account_balance_snapshots", timestamps: true, versionKey: false });

accountBalanceSnapshotSchema.index({ scopeType: 1, scopeId: 1, asOfDate: 1 }, { unique: true });

module.exports = mongoose.models.AccountBalanceSnapshot || mongoose.model("AccountBalanceSnapshot", accountBalanceSnapshotSchema);
