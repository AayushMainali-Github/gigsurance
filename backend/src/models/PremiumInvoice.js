const { mongoose } = require("../config/db");

const premiumInvoiceSchema = new mongoose.Schema({
  premiumDecisionId: { type: mongoose.Schema.Types.ObjectId, ref: "WeeklyPremiumDecision", required: true, unique: true, index: true },
  amountInr: { type: Number, required: true },
  dueAt: { type: Date, required: true, index: true },
  status: { type: String, enum: ["pending", "paid", "waived", "overdue"], default: "pending", index: true },
  paidAt: { type: Date, default: null }
}, { collection: "premium_invoices", timestamps: true, versionKey: false });

module.exports = mongoose.models.PremiumInvoice || mongoose.model("PremiumInvoice", premiumInvoiceSchema);
