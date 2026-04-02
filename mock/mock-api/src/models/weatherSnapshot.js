const { mongoose } = require("../db");

const weatherSnapshotSchema = new mongoose.Schema({
  city: String,
  state: String,
  tsUnix: Number,
  tempC: Number,
  feelsLikeC: Number,
  humidity: Number,
  windKph: Number,
  rainMm: Number,
  cloudPct: Number,
  conditionMain: String,
  conditionDetail: String,
  visibilityKm: Number,
  pressureMb: Number,
  weatherSeverityScore: Number,
  heatRisk: Number,
  stormRisk: Number
}, { collection: "weather_snapshots", versionKey: false });

module.exports = mongoose.models.ApiWeatherSnapshot || mongoose.model("ApiWeatherSnapshot", weatherSnapshotSchema);
