const { mongoose } = require("../config/db");

const premiumCollectionAttemptSchema = new mongoose.Schema({
  premiumInvoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "PremiumInvoice", required: true, index: true },
  attemptedAt: { type: Date, required: true, default: Date.now, index: true },
  amountInr: { type: Number, required: true },
  status: { type: String, enum: ["pending", "succeeded", "failed"], default: "pending", index: true },
  providerRef: { type: String, default: null },
  failureReason: { type: String, default: null }
}, { collection: "premium_collection_attempts", timestamps: true, versionKey: false });

module.exports = mongoose.models.PremiumCollectionAttempt || mongoose.model("PremiumCollectionAttempt", premiumCollectionAttemptSchema);
