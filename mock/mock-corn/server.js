const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const { connectDb, disconnectDb } = require("./src/db");
const { runAllJobs, startSchedulers } = require("./src/jobs");

async function main() {
  const runOnce = process.argv.includes("--run-once");
  await connectDb();
  if (runOnce) {
    await runAllJobs();
    await disconnectDb();
    return;
  }
  await runAllJobs();
  startSchedulers();
}

main().catch(async (error) => {
  console.error("[mock-corn] failed", error);
  try { await disconnectDb(); } catch (_) {}
  process.exitCode = 1;
});
