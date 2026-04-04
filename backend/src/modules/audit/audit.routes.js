const express = require("express");
const { asyncHandler } = require("../../utils/asyncHandler");
const { listAuditLogs } = require("../../services/adminService");

const router = express.Router();

router.get("/", asyncHandler(async (req, res) => {
  const data = await listAuditLogs(req.query);
  res.json({ ok: true, data });
}));

module.exports = { auditRouter: router };
