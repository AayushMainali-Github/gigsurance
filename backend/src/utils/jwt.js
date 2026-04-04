const jwt = require("jsonwebtoken");
const { config } = require("../config/env");

function signAccessToken(payload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

function verifyAccessToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

module.exports = { signAccessToken, verifyAccessToken };
