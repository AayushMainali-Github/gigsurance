const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const { parseArgs } = require("./utils/cli");
const { connectDb, disconnectDb } = require("./utils/db");
const { seedDelivery } = require("./generators/deliveryGenerator");
const { reportDeliveryValidation } = require("./validators/reporting");

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.seed) {
    console.log("Usage: node delivery-db.js --seed [--city Bengaluru] [--limit 1000] [--dry-run] [--clear]");
    return;
  }

  const driverCount = Number(args.limit || process.env.DRIVER_COUNT || 100000);
  await connectDb();
  try {
    const result = await seedDelivery({
      seed: args.seedValue || process.env.SEED || 42,
      driverCount,
      deliveryMonths: Number(process.env.DELIVERY_MONTHS || 48),
      batchSize: Number(args.batchSize || process.env.BATCH_SIZE || 1000),
      clearExisting: Boolean(args.clear),
      cityFilter: args.city || null,
      dryRun: Boolean(args["dry-run"]),
      limit: args.limit || null
    });
    console.log("[delivery] result:", result);
    if (!args["dry-run"]) await reportDeliveryValidation(driverCount);
  } finally {
    await disconnectDb();
  }
}

main().catch((error) => {
  console.error("[delivery] failed", error);
  process.exitCode = 1;
});
