const { mongoose } = require("../config/db");

const externalWeatherSnapshotSchema = new mongoose.Schema({
  city: String,
  state: String,
  tsUnix: Number,
  weatherSeverityScore: Number,
  rainMm: Number,
  heatRisk: Number,
  stormRisk: Number,
  conditionMain: String
}, { collection: "weather_snapshots", versionKey: false });

module.exports = mongoose.models.ExternalWeatherSnapshot || mongoose.model("ExternalWeatherSnapshot", externalWeatherSnapshotSchema);
