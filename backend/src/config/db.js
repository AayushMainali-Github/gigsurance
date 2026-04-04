const mongoose = require("mongoose");
const { config } = require("./env");
const { logger } = require("./logger");

async function connectDb() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(config.mongoUri, {
    dbName: config.dbName
  });
  logger.info({ dbName: config.dbName }, "mongodb connected");
}

module.exports = { mongoose, connectDb };
