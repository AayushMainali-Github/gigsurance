const { logger } = require("../config/logger");

function errorHandler(error, req, res, _next) {
  const statusCode = error.statusCode || 500;
  logger.error({ error, path: req.path, method: req.method }, "request failed");
  res.status(statusCode).json({
    ok: false,
    error: error.message || "Internal server error",
    details: error.details || null
  });
}

module.exports = { errorHandler };
