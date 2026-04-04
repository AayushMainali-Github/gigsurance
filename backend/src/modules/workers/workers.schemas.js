const { z } = require("zod");

const linkWorkerSchema = z.object({
  platformName: z.string().min(2).max(32).transform((value) => value.trim().toLowerCase()),
  platformDriverId: z.string().min(3).max(64).transform((value) => value.trim())
});

module.exports = { linkWorkerSchema };
