const { mongoose } = require("../config/db");

const externalAqiSnapshotSchema = new mongoose.Schema({
  city: String,
  state: String,
  tsUnix: Number,
  aqi: Number,
  category: String,
  severityScore: Number
}, { collection: "aqi_snapshots", versionKey: false });

module.exports = mongoose.models.ExternalAqiSnapshot || mongoose.model("ExternalAqiSnapshot", externalAqiSnapshotSchema);
