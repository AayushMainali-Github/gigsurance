const test = require("node:test");
const assert = require("node:assert/strict");
const { setTestEnv, freshRequire, stubMethods } = require("./helpers/module");

setTestEnv();

test("acquireJobRun creates a new running lock", async () => {
  const ScheduledJobRun = freshRequire("models/ScheduledJobRun.js");
  const jobRunService = freshRequire("services/jobRunService.js");
  const restore = stubMethods(ScheduledJobRun, {
    findOne: async () => null,
    create: async (payload) => ({ ...payload, toObject() { return this; } })
  });

  try {
    const result = await jobRunService.acquireJobRun({
      jobName: "daily-payout-run",
      scheduledFor: new Date("2026-04-04T00:01:00.000Z"),
      idempotencyKey: "daily-payout-run:2026-04-04T00:01:00.000Z",
      lockToken: "lock-1",
      staleAfterMs: 60000
    });
    assert.equal(result.acquired, true);
    assert.equal(result.reason, "created");
    assert.equal(result.run.lockToken, "lock-1");
  } finally {
    restore();
  }
});

test("acquireJobRun refuses to reacquire healthy running lock", async () => {
  const ScheduledJobRun = freshRequire("models/ScheduledJobRun.js");
  const jobRunService = freshRequire("services/jobRunService.js");
  const running = {
    status: "running",
    startedAt: new Date(),
    lastHeartbeatAt: new Date(),
    toObject() { return this; }
  };
  const restore = stubMethods(ScheduledJobRun, {
    findOne: async () => running
  });

  try {
    const result = await jobRunService.acquireJobRun({
      jobName: "daily-payout-run",
      scheduledFor: new Date(),
      idempotencyKey: "key-1",
      lockToken: "lock-2",
      staleAfterMs: 60000
    });
    assert.equal(result.acquired, false);
    assert.equal(result.reason, "already_running");
  } finally {
    restore();
  }
});
