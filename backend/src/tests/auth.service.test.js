const test = require("node:test");
const assert = require("node:assert/strict");
const { setTestEnv, freshRequire, stubMethods } = require("./helpers/module");
const { userFixture } = require("./fixtures");

setTestEnv();

test("signup hashes password and returns token", async () => {
  const User = freshRequire("models/User.js");
  const workersService = freshRequire("modules/workers/workers.service.js");
  const restore = stubMethods(User, {
    findOne: () => ({ lean: async () => null }),
    create: async ({ email, passwordHash }) => ({ ...userFixture, email, passwordHash })
  });
  const restoreWorkers = stubMethods(workersService, {
    linkWorkerToUser: async () => ({ _id: "worker-link-1" })
  });
  const authService = freshRequire("modules/auth/auth.service.js");

  try {
    const result = await authService.signup({
      email: "rider@example.com",
      password: "secret123",
      platformName: "swiggy",
      platformDriverId: "SWIGGY-DEL-00000145"
    });
    assert.equal(result.user.email, "rider@example.com");
    assert.ok(result.user.passwordHash);
    assert.notEqual(result.user.passwordHash, "secret123");
    assert.ok(result.accessToken);
  } finally {
    restore();
    restoreWorkers();
  }
});

test("login rejects invalid password", async () => {
  const bcrypt = require("bcryptjs");
  const User = freshRequire("models/User.js");
  const authService = freshRequire("modules/auth/auth.service.js");
  const passwordHash = await bcrypt.hash("right-pass", 10);
  const restore = stubMethods(User, {
    findOne: async () => ({
      ...userFixture,
      passwordHash,
      async save() {
        return this;
      }
    })
  });

  try {
    await assert.rejects(
      () => authService.login({ email: "rider@example.com", password: "wrong-pass" }),
      (error) => error.statusCode === 401
    );
  } finally {
    restore();
  }
});
