const { mongoose } = require("../utils/db");

const aqiSnapshotSchema = new mongoose.Schema({
  city: { type: String, required: true },
  state: { type: String, required: true },
  tsUnix: { type: Number, required: true },
  aqi: { type: Number, required: true },
  category: { type: String, required: true },
  pm25: { type: Number, required: true },
  pm10: { type: Number, required: true },
  no2: { type: Number, required: true },
  so2: { type: Number, required: true },
  o3: { type: Number, required: true },
  co: { type: Number, required: true },
  severityScore: { type: Number, required: true }
}, { collection: "aqi_snapshots", versionKey: false });

aqiSnapshotSchema.index({ city: 1, tsUnix: 1 }, { unique: true });
aqiSnapshotSchema.index({ tsUnix: 1 });
aqiSnapshotSchema.index({ city: 1 });

module.exports = mongoose.models.AqiSnapshot || mongoose.model("AqiSnapshot", aqiSnapshotSchema);
