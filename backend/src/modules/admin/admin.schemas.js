const { z } = require("zod");

const adminUserActionSchema = z.object({
  reason: z.string().trim().min(3).max(500)
});

const adminAnnotationSchema = z.object({
  note: z.string().trim().min(3).max(2000)
});

const adminPremiumOverrideSchema = z.object({
  finalPremiumInr: z.number().positive(),
  reason: z.string().trim().min(3).max(500)
});

const adminPayoutOverrideSchema = z.object({
  finalPayoutInr: z.number().min(0),
  status: z.enum(["approved", "held", "failed"]).optional(),
  reason: z.string().trim().min(3).max(500)
});

module.exports = {
  adminUserActionSchema,
  adminAnnotationSchema,
  adminPremiumOverrideSchema,
  adminPayoutOverrideSchema
};
