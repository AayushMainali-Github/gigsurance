const { asyncHandler } = require("../../utils/asyncHandler");
const { linkWorkerToUser } = require("./workers.service");
const { toLinkedWorkerDto } = require("../../utils/dto");

const linkWorkerController = asyncHandler(async (req, res) => {
  const linkedWorker = await linkWorkerToUser(req.auth.sub, req.body);
  res.status(201).json({ ok: true, data: toLinkedWorkerDto(linkedWorker) });
});

module.exports = { linkWorkerController };
