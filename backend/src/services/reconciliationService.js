const PayoutTransaction = require("../models/PayoutTransaction");
const PremiumInvoice = require("../models/PremiumInvoice");
const { snapshotGlobalBalance } = require("./ledgerService");

async function processDailyReconciliationRun({ scheduledFor = new Date(), onProgress } = {}) {
  const [unreconciledPayouts, overdueInvoices] = await Promise.all([
    PayoutTransaction.countDocuments({ reconciliationState: "unreconciled" }),
    PremiumInvoice.updateMany(
      { status: "pending", dueAt: { $lt: scheduledFor } },
      { $set: { status: "overdue" } }
    )
  ]);

  await snapshotGlobalBalance(scheduledFor);

  const result = {
    processedCount: unreconciledPayouts + Number(overdueInvoices.modifiedCount || 0),
    successCount: unreconciledPayouts,
    failureCount: 0,
    cursor: {
      reconciledAt: scheduledFor.toISOString(),
      overdueInvoicesMarked: Number(overdueInvoices.modifiedCount || 0)
    }
  };

  if (onProgress) await onProgress(result);
  return result;
}

module.exports = { processDailyReconciliationRun };
