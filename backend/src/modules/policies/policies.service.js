const User = require("../../models/User");
const LinkedWorker = require("../../models/LinkedWorker");
const Policy = require("../../models/Policy");
const { ApiError } = require("../../utils/ApiError");

async function enrollPrimaryPolicy(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (!user.linkedWorkerId) {
    throw new ApiError(400, "Link a worker before enrolling a policy");
  }

  const linkedWorker = await LinkedWorker.findOne({ _id: user.linkedWorkerId, userId });
  if (!linkedWorker) {
    throw new ApiError(404, "Linked worker not found");
  }

  const activePolicy = await Policy.findOne({ userId, linkedWorkerId: linkedWorker._id, status: { $in: ["active", "pending"] } }).lean();
  if (activePolicy) {
    throw new ApiError(409, "Active policy already exists for this worker");
  }

  const policy = await Policy.create({
    userId,
    linkedWorkerId: linkedWorker._id,
    status: "active",
    startedAt: new Date(),
    currentWeeklyPremiumInr: 0,
    noClaimWeeks: 0,
    fraudMultiplier: 1,
    payoutReductionMultiplier: 1,
    latestQuoteMeta: {
      source: "phase-2-enrollment-shell",
      note: "Premium will be populated by weekly pricing job"
    },
    latestPayoutMeta: null
  });

  linkedWorker.enrollmentStatus = "enrolled";
  await linkedWorker.save();

  user.currentPolicyId = policy._id;
  await user.save();

  return policy;
}

async function pauseCurrentPolicy(userId) {
  const user = await User.findById(userId);
  if (!user?.currentPolicyId) throw new ApiError(404, "No current policy found");
  const policy = await Policy.findByIdAndUpdate(user.currentPolicyId, { $set: { status: "paused" } }, { new: true });
  return policy;
}

async function cancelCurrentPolicy(userId) {
  const user = await User.findById(userId);
  if (!user?.currentPolicyId) throw new ApiError(404, "No current policy found");
  const policy = await Policy.findByIdAndUpdate(
    user.currentPolicyId,
    { $set: { status: "cancelled", endedAt: new Date() } },
    { new: true }
  );
  return policy;
}

module.exports = { enrollPrimaryPolicy, pauseCurrentPolicy, cancelCurrentPolicy };
