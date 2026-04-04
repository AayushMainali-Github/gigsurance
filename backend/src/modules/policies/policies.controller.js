const { asyncHandler } = require("../../utils/asyncHandler");
const { enrollPrimaryPolicy, pauseCurrentPolicy, cancelCurrentPolicy } = require("./policies.service");
const { toPolicyDto } = require("../../utils/dto");

const enrollPolicyController = asyncHandler(async (req, res) => {
  const policy = await enrollPrimaryPolicy(req.auth.sub);
  res.status(201).json({ ok: true, data: toPolicyDto(policy) });
});

const pausePolicyController = asyncHandler(async (req, res) => {
  const policy = await pauseCurrentPolicy(req.auth.sub);
  res.json({ ok: true, data: toPolicyDto(policy) });
});

const cancelPolicyController = asyncHandler(async (req, res) => {
  const policy = await cancelCurrentPolicy(req.auth.sub);
  res.json({ ok: true, data: toPolicyDto(policy) });
});

module.exports = { enrollPolicyController, pausePolicyController, cancelPolicyController };
