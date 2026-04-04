const { z } = require("zod");

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  platformName: z.string().min(2).max(32).transform((value) => value.trim().toLowerCase()),
  platformDriverId: z.string().min(3).max(64).transform((value) => value.trim())
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

module.exports = { signupSchema, loginSchema };
