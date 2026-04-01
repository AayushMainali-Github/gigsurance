const { mongoose } = require("../utils/db");

const weatherSnapshotSchema = new mongoose.Schema({
  city: { type: String, required: true },
  state: { type: String, required: true },
  tsUnix: { type: Number, required: true },
  tempC: { type: Number, required: true },
  feelsLikeC: { type: Number, required: true },
  humidity: { type: Number, required: true },
  windKph: { type: Number, required: true },
  rainMm: { type: Number, required: true },
  cloudPct: { type: Number, required: true },
  conditionMain: { type: String, required: true },
  conditionDetail: { type: String, required: true },
  visibilityKm: { type: Number, required: true },
  pressureMb: { type: Number, required: true },
  weatherSeverityScore: { type: Number, required: true },
  heatRisk: { type: Number, required: true },
  stormRisk: { type: Number, required: true }
}, { collection: "weather_snapshots", versionKey: false });

weatherSnapshotSchema.index({ city: 1, tsUnix: 1 }, { unique: true });
weatherSnapshotSchema.index({ tsUnix: 1 });
weatherSnapshotSchema.index({ city: 1 });

module.exports = mongoose.models.WeatherSnapshot || mongoose.model("WeatherSnapshot", weatherSnapshotSchema);
