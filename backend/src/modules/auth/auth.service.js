const bcrypt = require("bcryptjs");
const User = require("../../models/User");
const { ApiError } = require("../../utils/ApiError");
const { signAccessToken } = require("../../utils/jwt");
const { linkWorkerToUser } = require("../workers/workers.service");
const { enrollPrimaryPolicy } = require("../policies/policies.service");
const { ensureCurrentWeekPremiumForPolicy } = require("../../services/weeklyPremiumService");

async function signup({ email, password, platformName, platformDriverId }) {
  const existing = await User.findOne({ email }).lean();
  if (existing) {
    throw new ApiError(409, "User already exists");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const createdUser = await User.create({ email, passwordHash });
  await linkWorkerToUser(createdUser._id, { platformName, platformDriverId });
  const policy = await enrollPrimaryPolicy(createdUser._id);
  await ensureCurrentWeekPremiumForPolicy(policy._id);
  const user = await User.findById(createdUser._id);
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
  if (user.currentPolicyId) {
    await ensureCurrentWeekPremiumForPolicy(user.currentPolicyId);
  }

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
  if (user.currentPolicyId) {
    await ensureCurrentWeekPremiumForPolicy(user.currentPolicyId);
  }
  return {
    user,
    accessToken: signAccessToken({ sub: String(user._id), role: user.role, email: user.email })
  };
}

module.exports = { signup, login, refreshSession };
