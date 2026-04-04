const express = require("express");
const { validate } = require("../../middleware/validate");
const { linkWorkerSchema } = require("./workers.schemas");
const { linkWorkerController } = require("./workers.controller");
const User = require("../../models/User");
const LinkedWorker = require("../../models/LinkedWorker");
const { asyncHandler } = require("../../utils/asyncHandler");
const { toLinkedWorkerDto } = require("../../utils/dto");

const router = express.Router();

router.get("/", asyncHandler(async (req, res) => {
  const user = await User.findById(req.auth.sub).lean();
  const items = await LinkedWorker.find({ _id: { $in: user?.linkedWorkers || [] } }).sort({ linkedAt: -1 }).lean();
  res.json({ ok: true, data: items.map(toLinkedWorkerDto) });
}));
router.get("/primary", asyncHandler(async (req, res) => {
  const user = await User.findById(req.auth.sub).lean();
  const worker = user?.linkedWorkerId ? await LinkedWorker.findById(user.linkedWorkerId).lean() : null;
  res.json({ ok: true, data: toLinkedWorkerDto(worker) });
}));
router.post("/link", validate(linkWorkerSchema), linkWorkerController);

module.exports = { workersRouter: router };
