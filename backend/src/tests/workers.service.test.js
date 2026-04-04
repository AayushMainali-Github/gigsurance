const test = require("node:test");
const assert = require("node:assert/strict");
const { setTestEnv, freshRequire, stubMethods } = require("./helpers/module");
const { userFixture, linkedWorkerFixture } = require("./fixtures");

setTestEnv();

test("linkWorkerToUser links operational worker to user", async () => {
  const User = freshRequire("models/User.js");
  const LinkedWorker = freshRequire("models/LinkedWorker.js");
  const ExternalDeliveryDriver = freshRequire("models/ExternalDeliveryDriver.js");
  const workersService = freshRequire("modules/workers/workers.service.js");

  const mutableUser = { ...userFixture, linkedWorkers: [], linkedWorkerId: null, async save() { return this; } };
  const restoreUser = stubMethods(User, {
    findById: async () => mutableUser
  });
  const restoreLinked = stubMethods(LinkedWorker, {
    findById: async () => null,
    findOne: async () => null,
    findOneAndUpdate: async () => ({ ...linkedWorkerFixture })
  });
  const restoreExternal = stubMethods(ExternalDeliveryDriver, {
    findOne: () => ({
      lean: async () => ({
        platformName: "swiggy",
        platformDriverId: "SWIGGY-DEL-00000145",
        city: "Delhi",
        state: "Delhi",
        cityTier: "tier1",
        joinedAt: new Date("2026-01-01T00:00:00.000Z"),
        driverProfile: { archetype: "full_time" }
      })
    })
  });

  try {
    const linked = await workersService.linkWorkerToUser("user-1", {
      platformName: "swiggy",
      platformDriverId: "SWIGGY-DEL-00000145"
    });
    assert.equal(linked.platformName, "swiggy");
    assert.equal(mutableUser.linkedWorkerId, "worker-link-1");
    assert.deepEqual(mutableUser.linkedWorkers, ["worker-link-1"]);
  } finally {
    restoreUser();
    restoreLinked();
    restoreExternal();
  }
});
