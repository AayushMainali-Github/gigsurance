const RiskReviewCase = require("../models/RiskReviewCase");
const { writeAuditLog } = require("./auditLogService");

async function processStaleReviewReminderRun({ scheduledFor = new Date(), onProgress } = {}) {
  const staleBefore = new Date(scheduledFor.getTime() - (48 * 60 * 60 * 1000));
  const staleCases = await RiskReviewCase.find({
    status: { $in: ["open", "investigating"] },
    updatedAt: { $lte: staleBefore }
  }).lean();

  for (const item of staleCases) {
    await writeAuditLog({
      actorType: "system",
      actorId: null,
      action: "stale_review_reminder",
      entityType: "risk_review_case",
      entityId: item._id,
      payload: { scheduledFor, staleBefore }
    });
  }

  const result = {
    processedCount: staleCases.length,
    successCount: staleCases.length,
    failureCount: 0,
    cursor: {
      staleBefore: staleBefore.toISOString(),
      notifiedCaseIds: staleCases.map((item) => String(item._id))
    }
  };

  if (onProgress) await onProgress(result);
  return result;
}

module.exports = { processStaleReviewReminderRun };
