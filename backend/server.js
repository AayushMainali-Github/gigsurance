require("dotenv").config();

const { connectDb } = require("./src/config/db");
const { buildApp } = require("./src/app");
const { startScheduler, runLatestCatchupJobs } = require("./src/scheduler");
const { config } = require("./src/config/env");
const { logger } = require("./src/config/logger");

async function bootstrap() {
  await connectDb();

  const app = buildApp();
  const server = app.listen(config.port, () => {
    logger.info({ port: config.port, env: config.nodeEnv }, "backend server listening");
  });

  if (config.enableScheduler) {
    await runLatestCatchupJobs(new Date());
    startScheduler();
  }

  const shutdown = async (signal) => {
    logger.info({ signal }, "shutdown requested");
    server.close(() => {
      logger.info("http server closed");
      process.exit(0);
    });
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

bootstrap().catch((error) => {
  logger.error({ error }, "backend bootstrap failed");
  process.exit(1);
});
