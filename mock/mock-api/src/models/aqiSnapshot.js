const { mongoose } = require("../db");

const aqiSnapshotSchema = new mongoose.Schema({
  city: String,
  state: String,
  tsUnix: Number,
  aqi: Number,
  category: String,
  pm25: Number,
  pm10: Number,
  no2: Number,
  so2: Number,
  o3: Number,
  co: Number,
  severityScore: Number
}, { collection: "aqi_snapshots", versionKey: false });

module.exports = mongoose.models.ApiAqiSnapshot || mongoose.model("ApiAqiSnapshot", aqiSnapshotSchema);
