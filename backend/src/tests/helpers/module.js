const path = require("path");

function setTestEnv() {
  process.env.PORT = process.env.PORT || "5000";
  process.env.NODE_ENV = "test";
  process.env.MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
  process.env.DB_NAME = process.env.DB_NAME || "gigsurance_test";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
  process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
  process.env.ML_API_BASE_URL = process.env.ML_API_BASE_URL || "http://127.0.0.1:8000";
  process.env.ENABLE_SCHEDULER = "false";
  process.env.JOB_LOCK_STALE_MS = process.env.JOB_LOCK_STALE_MS || "900000";
  process.env.JOB_MAX_RETRIES = process.env.JOB_MAX_RETRIES || "1";
}

function freshRequire(relativePathFromBackendSrc) {
  const resolved = path.resolve(__dirname, "..", "..", relativePathFromBackendSrc);
  delete require.cache[resolved];
  return require(resolved);
}

function stubMethods(target, replacements) {
  const originals = {};
  for (const [key, value] of Object.entries(replacements)) {
    originals[key] = target[key];
    target[key] = value;
  }
  return () => {
    for (const [key, value] of Object.entries(originals)) {
      target[key] = value;
    }
  };
}

module.exports = {
  setTestEnv,
  freshRequire,
  stubMethods
};
