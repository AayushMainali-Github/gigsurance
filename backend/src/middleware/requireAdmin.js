const { ROLES } = require("../constants/roles");
const { ApiError } = require("../utils/ApiError");

function requireAdmin(req, _res, next) {
  if (!req.auth || req.auth.role !== ROLES.ADMIN) {
    return next(new ApiError(403, "Admin access required"));
  }
  return next();
}

module.exports = { requireAdmin };
