const { mongoose } = require("../config/db");

const auditLogSchema = new mongoose.Schema({
  actorType: { type: String, required: true, index: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
  action: { type: String, required: true, index: true },
  entityType: { type: String, required: true, index: true },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  payload: { type: mongoose.Schema.Types.Mixed, default: null },
  explanationSummary: { type: String, default: null },
  requestPayload: { type: mongoose.Schema.Types.Mixed, default: null },
  responsePayload: { type: mongoose.Schema.Types.Mixed, default: null }
}, { collection: "audit_logs", timestamps: true, versionKey: false });

module.exports = mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);
