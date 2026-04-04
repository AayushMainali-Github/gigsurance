const { z } = require("zod");

const reviewActionSchema = z.object({
  action: z.enum([
    "clear_case",
    "confirm_penalty",
    "suspend_user",
    "override_premium",
    "override_payout",
    "mark_false_positive"
  ]),
  notes: z.string().max(1000).optional()
});

module.exports = { reviewActionSchema };
