const express = require("express");
const { validate } = require("../../middleware/validate");
const { reviewActionSchema } = require("./fraud.schemas");
const {
  listReviewCasesController,
  getReviewCaseController,
  applyReviewActionController
} = require("./fraud.controller");

const router = express.Router();

router.get("/", listReviewCasesController);
router.get("/:caseId", getReviewCaseController);
router.post("/:caseId/actions", validate(reviewActionSchema), applyReviewActionController);

module.exports = { fraudRouter: router };
