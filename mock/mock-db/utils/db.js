const path = require("path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

async function connectDb() {
  const mongoUri = process.env.MONGO_URI;
  const dbName = process.env.DB_NAME;
  if (!mongoUri) throw new Error("MONGO_URI is required in .env");
  await mongoose.connect(mongoUri, dbName ? { dbName } : {});
  return mongoose.connection;
}

async function disconnectDb() {
  await mongoose.disconnect();
}

module.exports = { connectDb, disconnectDb, mongoose };
