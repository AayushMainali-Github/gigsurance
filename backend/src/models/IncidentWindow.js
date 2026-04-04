const { mongoose } = require("../config/db");

const incidentWindowSchema = new mongoose.Schema({
  date: { type: Date, required: true, index: true },
  city: { type: String, required: true, index: true },
  state: { type: String, required: true, index: true },
  disruptionScore: { type: Number, required: true },
  triggerType: { type: String, required: true },
  verified: { type: Boolean, default: false, index: true },
  sourceEvidence: { type: mongoose.Schema.Types.Mixed, default: null }
}, { collection: "incident_windows", timestamps: true, versionKey: false });

incidentWindowSchema.index({ date: 1, city: 1 }, { unique: true });

module.exports = mongoose.models.IncidentWindow || mongoose.model("IncidentWindow", incidentWindowSchema);
