const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const { connectDb, disconnectDb, resetDatabase } = require("./utils/db");
const { seedWeather } = require("./generators/weatherGenerator");
const { seedAqi } = require("./generators/aqiGenerator");
const { seedDelivery } = require("./generators/deliveryGenerator");
const { reportDeliveryValidation, reportUniquenessValidation } = require("./validators/reporting");

async function main() {
  await connectDb();
  try {
    await resetDatabase();
    console.log("[seed:all] dropped database before reseed");

    await seedWeather({
      seed: process.env.SEED || 42,
      envMonths: Number(process.env.ENV_MONTHS || 24),
      batchSize: Number(process.env.BATCH_SIZE || 1000),
      clearExisting: false,
      cityFilter: null,
      dryRun: false
    });

    await seedAqi({
      seed: process.env.SEED || 42,
      envMonths: Number(process.env.ENV_MONTHS || 24),
      batchSize: Number(process.env.BATCH_SIZE || 1000),
      clearExisting: false,
      cityFilter: null,
      dryRun: false
    });

    await seedDelivery({
      seed: process.env.SEED || 42,
      driverCount: Number(process.env.DRIVER_COUNT || 100000),
      deliveryMonths: Number(process.env.DELIVERY_MONTHS || 24),
      batchSize: Number(process.env.BATCH_SIZE || 1000),
      clearExisting: false,
      cityFilter: null,
      dryRun: false,
      limit: null
    });

    await reportUniquenessValidation();
    await reportDeliveryValidation(Number(process.env.DRIVER_COUNT || 100000));
  } finally {
    await disconnectDb();
  }
}

main().catch((error) => {
  console.error("[seed:all] failed", error);
  process.exitCode = 1;
});
