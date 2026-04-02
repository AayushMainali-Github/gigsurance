const mongoose = require("mongoose");

async function connectDb() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required in mock-corn/.env");
  await mongoose.connect(process.env.MONGO_URI, process.env.DB_NAME ? { dbName: process.env.DB_NAME } : {});
}

async function disconnectDb() {
  await mongoose.disconnect();
}

module.exports = { connectDb, disconnectDb, mongoose };
