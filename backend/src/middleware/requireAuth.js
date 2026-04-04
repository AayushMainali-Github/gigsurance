const { verifyAccessToken } = require("../utils/jwt");
const { ApiError } = require("../utils/ApiError");

function requireAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(new ApiError(401, "Authentication required"));
  }

  try {
    req.auth = verifyAccessToken(token);
    return next();
  } catch (_error) {
    return next(new ApiError(401, "Invalid or expired token"));
  }
}

module.exports = { requireAuth };
