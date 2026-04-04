const { mongoose } = require("../config/db");

const payoutTransactionSchema = new mongoose.Schema({
  payoutDecisionId: { type: mongoose.Schema.Types.ObjectId, ref: "DailyPayoutDecision", required: true, unique: true, index: true },
  amountInr: { type: Number, required: true },
  status: { type: String, enum: ["pending", "paid", "held", "failed"], default: "pending", index: true },
  disbursedAt: { type: Date, default: null },
  referenceId: { type: String, default: null },
  reconciliationState: { type: String, enum: ["unreconciled", "reconciled"], default: "unreconciled", index: true }
}, { collection: "payout_transactions", timestamps: true, versionKey: false });

module.exports = mongoose.models.PayoutTransaction || mongoose.model("PayoutTransaction", payoutTransactionSchema);
