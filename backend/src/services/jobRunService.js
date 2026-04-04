const ScheduledJobRun = require("../models/ScheduledJobRun");
const { ApiError } = require("../utils/ApiError");

function lockIsStale(run, staleAfterMs) {
  if (!run || run.status !== "running") return false;
  const base = run.lastHeartbeatAt || run.startedAt;
  return !base || (Date.now() - new Date(base).getTime()) > staleAfterMs;
}

async function acquireJobRun({ jobName, scheduledFor, idempotencyKey, lockToken, staleAfterMs }) {
  const now = new Date();
  const existing = await ScheduledJobRun.findOne({ idempotencyKey });

  if (!existing) {
    return {
      run: await ScheduledJobRun.create({
        jobName,
        scheduledFor,
        startedAt: now,
        idempotencyKey,
        status: "running",
        lockToken,
        lastHeartbeatAt: now,
        attemptCount: 1
      }),
      acquired: true,
      reason: "created"
    };
  }

  if (existing.status === "completed") {
    return { run: existing.toObject(), acquired: false, reason: "already_completed" };
  }

  if (existing.status === "running" && !lockIsStale(existing, staleAfterMs)) {
    return { run: existing.toObject(), acquired: false, reason: "already_running" };
  }

  const updated = await ScheduledJobRun.findOneAndUpdate(
    {
      _id: existing._id,
      $or: [
        { status: { $in: ["failed", "skipped"] } },
        {
          status: "running",
          lastHeartbeatAt: { $lte: new Date(Date.now() - staleAfterMs) }
        }
      ]
    },
    {
      $set: {
        status: "running",
        startedAt: now,
        completedAt: null,
        errorSummary: null,
        lockToken,
        lastHeartbeatAt: now
      },
      $inc: { attemptCount: 1 }
    },
    { new: true }
  );

  if (!updated) {
    return { run: existing.toObject(), acquired: false, reason: "lock_conflict" };
  }

  return { run: updated.toObject(), acquired: true, reason: "reacquired" };
}

async function heartbeatJobRun(idempotencyKey, lockToken, patch = {}) {
  return ScheduledJobRun.findOneAndUpdate(
    { idempotencyKey, lockToken, status: "running" },
    { $set: { ...patch, lastHeartbeatAt: new Date() } },
    { new: true }
  );
}

async function finishJobRun(idempotencyKey, lockToken, patch) {
  return ScheduledJobRun.findOneAndUpdate(
    { idempotencyKey, lockToken },
    { $set: { ...patch, completedAt: new Date(), lastHeartbeatAt: new Date() } },
    { new: true }
  );
}

async function failJobRun(idempotencyKey, lockToken, errorSummary, patch = {}) {
  return finishJobRun(idempotencyKey, lockToken, {
    status: "failed",
    errorSummary,
    ...patch
  });
}

async function getJobRunByWindow(jobName, scheduledFor) {
  return ScheduledJobRun.findOne({ jobName, scheduledFor }).lean();
}

function assertOwnedRun(runState) {
  if (!runState?.acquired) {
    throw new ApiError(409, `Job run not acquired: ${runState?.reason || "unknown"}`);
  }
}

module.exports = {
  acquireJobRun,
  heartbeatJobRun,
  finishJobRun,
  failJobRun,
  getJobRunByWindow,
  assertOwnedRun
};
