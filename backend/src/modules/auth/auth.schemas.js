const { z } = require("zod");

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

module.exports = { signupSchema, loginSchema };
