const AuditLog = require("../models/AuditLog");

async function writeAuditLog({ actorType, actorId, action, entityType, entityId, payload, explanationSummary, requestPayload, responsePayload }) {
  return AuditLog.create({
    actorType,
    actorId,
    action,
    entityType,
    entityId,
    payload,
    explanationSummary: explanationSummary || null,
    requestPayload: requestPayload || null,
    responsePayload: responsePayload || null
  });
}

module.exports = { writeAuditLog };
