const express = require("express");
const User = require("../../models/User");
const LinkedWorker = require("../../models/LinkedWorker");
const Policy = require("../../models/Policy");
const { asyncHandler } = require("../../utils/asyncHandler");
const { toLinkedWorkerDto, toPolicyDto, toUserDto } = require("../../utils/dto");

const router = express.Router();

router.get("/me", asyncHandler(async (req, res) => {
  const user = await User.findById(req.auth.sub).lean();
  const linkedWorker = user?.linkedWorkerId ? await LinkedWorker.findById(user.linkedWorkerId).lean() : null;
  const currentPolicy = user?.currentPolicyId ? await Policy.findById(user.currentPolicyId).lean() : null;
  res.json({
    ok: true,
    data: {
      ...toUserDto(user || { _id: req.auth.sub, email: req.auth.email, role: req.auth.role }),
      linkedWorker: toLinkedWorkerDto(linkedWorker),
      currentPolicy: toPolicyDto(currentPolicy)
    }
  });
}));

module.exports = { usersRouter: router };
