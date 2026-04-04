const express = require("express");
const { validate } = require("../../middleware/validate");
const { requireAuth } = require("../../middleware/requireAuth");
const { signupSchema, loginSchema } = require("./auth.schemas");
const { signupController, loginController, refreshController, logoutController } = require("./auth.controller");

const router = express.Router();

router.post("/signup", validate(signupSchema), signupController);
router.post("/login", validate(loginSchema), loginController);
router.post("/refresh", requireAuth, refreshController);
router.post("/logout", requireAuth, logoutController);

module.exports = { authRouter: router };
