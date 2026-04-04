const cron = require("node-cron");
const { logger } = require("../config/logger");
const { config } = require("../config/env");
const { JOB_NAMES } = require("../constants/jobNames");
const { acquireJobRun, heartbeatJobRun, finishJobRun, failJobRun } = require("../services/jobRunService");
const { processWeeklyPremiumRun } = require("../services/weeklyPremiumService");
const { processDailyPayoutRun } = require("../services/dailyPayoutService");
const { processDailyReconciliationRun } = require("../services/reconciliationService");
const { processStaleReviewReminderRun } = require("../services/staleReviewReminderService");

function idempotencyKey(jobName, scheduledFor) {
  return `${jobName}:${scheduledFor.toISOString()}`;
}

async function executeWithRetry(executor, retries) {
  let attempt = 0;
  let lastError = null;
  while (attempt <= retries) {
    try {
      return await executor(attempt);
    } catch (error) {
      lastError = error;
      attempt += 1;
      if (attempt > retries) throw lastError;
    }
  }
  throw lastError;
}

async function executeScheduledJob(jobName, scheduledFor) {
  const key = idempotencyKey(jobName, scheduledFor);
  const lockToken = `${process.pid}:${jobName}:${Date.now()}`;
  const runState = await acquireJobRun({
    jobName,
    scheduledFor,
    idempotencyKey: key,
    lockToken,
    staleAfterMs: config.jobLockStaleMs
  });

  if (!runState.acquired) {
    logger.info({ jobName, scheduledFor, reason: runState.reason }, "scheduled job skipped");
    return runState.run;
  }

  logger.info({ jobName, scheduledFor, lockToken }, "scheduled job triggered");

  try {
    const result = await executeWithRetry(async () => {
      const onProgress = async (progress) => {
        await heartbeatJobRun(key, lockToken, {
          processedCount: progress.processedCount,
          successCount: progress.successCount,
          failureCount: progress.failureCount,
          cursor: progress.cursor || null
        });
      };

      if (jobName === JOB_NAMES.WEEKLY_PREMIUM_RUN) {
        return processWeeklyPremiumRun({ scheduledFor, onProgress });
      }
      if (jobName === JOB_NAMES.DAILY_PAYOUT_RUN) {
        return processDailyPayoutRun({ scheduledFor, onProgress });
      }
      if (jobName === JOB_NAMES.DAILY_RECONCILIATION_RUN) {
        return processDailyReconciliationRun({ scheduledFor, onProgress });
      }
      if (jobName === JOB_NAMES.STALE_REVIEW_REMINDER_RUN) {
        return processStaleReviewReminderRun({ scheduledFor, onProgress });
      }
      return { processedCount: 0, successCount: 0, failureCount: 0, cursor: null };
    }, config.jobMaxRetries);

    await finishJobRun(key, lockToken, {
      status: "completed",
      processedCount: result.processedCount || 0,
      successCount: result.successCount || 0,
      failureCount: result.failureCount || 0,
      cursor: result.cursor || null
    });
  } catch (error) {
    logger.error({ jobName, scheduledFor, error: error.message }, "scheduled job failed");
    await failJobRun(key, lockToken, error.message);
  }
}

function startScheduler() {
  cron.schedule("1 0 * * *", () => {
    void executeScheduledJob(JOB_NAMES.DAILY_PAYOUT_RUN, new Date());
  });

  cron.schedule("1 0 * * 1", () => {
    void executeScheduledJob(JOB_NAMES.WEEKLY_PREMIUM_RUN, new Date());
  });

  cron.schedule("15 0 * * *", () => {
    void executeScheduledJob(JOB_NAMES.DAILY_RECONCILIATION_RUN, new Date());
  });

  cron.schedule("30 0 * * *", () => {
    void executeScheduledJob(JOB_NAMES.STALE_REVIEW_REMINDER_RUN, new Date());
  });

  logger.info("scheduler bootstrap complete");
}

module.exports = { startScheduler };
