const User = require("../../models/User");
const LinkedWorker = require("../../models/LinkedWorker");
const { ApiError } = require("../../utils/ApiError");
const { getDriverByPlatformId } = require("../../services/mockApiClient");

async function findExternalWorker(platformName, platformDriverId) {
  const worker = await getDriverByPlatformId(platformName, platformDriverId);
  if (!worker) {
    throw new ApiError(404, "Worker not found in mock operational api");
  }
  return worker;
}

async function linkWorkerToUser(userId, { platformName, platformDriverId }) {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const existingPrimary = user.linkedWorkerId
    ? await LinkedWorker.findById(user.linkedWorkerId).lean()
    : null;

  if (existingPrimary && (existingPrimary.platformName !== platformName || existingPrimary.platformDriverId !== platformDriverId)) {
    throw new ApiError(409, "Primary worker already linked for this user");
  }

  const taken = await LinkedWorker.findOne({ platformName, platformDriverId }).lean();
  if (taken && String(taken.userId) !== String(userId)) {
    throw new ApiError(409, "Worker already linked to another user");
  }

  const externalWorker = await findExternalWorker(platformName, platformDriverId);
  const snapshot = {
    platformName: externalWorker.platformName,
    platformDriverId: externalWorker.platformDriverId,
    city: externalWorker.city,
    state: externalWorker.state,
    cityTier: externalWorker.cityTier,
    joinedAt: externalWorker.joinedAt,
    driverProfile: externalWorker.driverProfile
  };

  const linkedWorker = await LinkedWorker.findOneAndUpdate(
    { platformName, platformDriverId },
    {
      $set: {
        userId,
        city: externalWorker.city,
        state: externalWorker.state,
        cityTier: externalWorker.cityTier,
        enrollmentStatus: "linked",
        workerSnapshotCache: snapshot
      },
      $setOnInsert: {
        linkedAt: new Date()
      }
    },
    { upsert: true, new: true }
  );

  user.linkedWorkerId = linkedWorker._id;
  user.linkedWorkers = Array.from(new Set([...(user.linkedWorkers || []).map(String), String(linkedWorker._id)])).map((id) => id);
  await user.save();

  return linkedWorker;
}

module.exports = { linkWorkerToUser };
