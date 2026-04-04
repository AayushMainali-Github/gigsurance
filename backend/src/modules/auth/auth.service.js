const bcrypt = require("bcryptjs");
const User = require("../../models/User");
const { ApiError } = require("../../utils/ApiError");
const { signAccessToken } = require("../../utils/jwt");

async function signup({ email, password }) {
  const existing = await User.findOne({ email }).lean();
  if (existing) {
    throw new ApiError(409, "User already exists");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, passwordHash });
  return {
    user,
    accessToken: signAccessToken({ sub: String(user._id), role: user.role, email: user.email })
  };
}

async function login({ email, password }) {
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(401, "Invalid credentials");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new ApiError(401, "Invalid credentials");
  }

  user.lastLoginAt = new Date();
  await user.save();

  return {
    user,
    accessToken: signAccessToken({ sub: String(user._id), role: user.role, email: user.email })
  };
}

async function refreshSession(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  if (user.status !== "active") {
    throw new ApiError(403, "User is not active");
  }
  return {
    user,
    accessToken: signAccessToken({ sub: String(user._id), role: user.role, email: user.email })
  };
}

module.exports = { signup, login, refreshSession };
