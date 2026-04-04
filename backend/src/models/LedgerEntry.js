const { mongoose } = require("../config/db");

const ledgerEntrySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  policyId: { type: mongoose.Schema.Types.ObjectId, ref: "Policy", default: null, index: true },
  city: { type: String, default: null, index: true },
  state: { type: String, default: null, index: true },
  platformName: { type: String, default: null, index: true },
  type: {
    type: String,
    enum: [
      "premium_charged",
      "premium_paid",
      "premium_waived",
      "payout_approved",
      "payout_paid",
      "payout_held",
      "fraud_penalty_applied",
      "manual_adjustment",
      "refund"
    ],
    required: true,
    index: true
  },
  direction: { type: String, enum: ["debit", "credit"], required: true, index: true },
  amountInr: { type: Number, required: true },
  sourceType: { type: String, required: true, index: true },
  sourceId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  effectiveAt: { type: Date, required: true, index: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: null },
  idempotencyKey: { type: String, required: true, unique: true, index: true }
}, { collection: "ledger_entries", timestamps: true, versionKey: false });

module.exports = mongoose.models.LedgerEntry || mongoose.model("LedgerEntry", ledgerEntrySchema);
