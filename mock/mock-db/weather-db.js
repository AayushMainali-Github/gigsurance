const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const { parseArgs } = require("./utils/cli");
const { connectDb, disconnectDb } = require("./utils/db");
const { seedWeather } = require("./generators/weatherGenerator");
const { reportUniquenessValidation } = require("./validators/reporting");

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.seed) {
    console.log("Usage: node weather-db.js --seed [--city Bengaluru] [--dry-run] [--clear]");
    return;
  }

  await connectDb();
  try {
    const result = await seedWeather({
      seed: args.seedValue || process.env.SEED || 42,
      envMonths: Number(process.env.ENV_MONTHS || 24),
      batchSize: Number(args.batchSize || process.env.BATCH_SIZE || 1000),
      clearExisting: Boolean(args.clear),
      cityFilter: args.city || null,
      dryRun: Boolean(args["dry-run"])
    });
    console.log("[weather] result:", result);
    if (!args["dry-run"]) await reportUniquenessValidation();
  } finally {
    await disconnectDb();
  }
}

main().catch((error) => {
  console.error("[weather] failed", error);
  process.exitCode = 1;
});
