const { asyncHandler } = require("../../utils/asyncHandler");
const { listRiskReviewCases, getRiskReviewCase, applyReviewAction } = require("../../services/riskReviewService");

const listReviewCasesController = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.source) filter.source = req.query.source;
  const items = await listRiskReviewCases(filter);
  res.json({ ok: true, data: items });
});

const getReviewCaseController = asyncHandler(async (req, res) => {
  const item = await getRiskReviewCase(req.params.caseId);
  res.json({ ok: true, data: item });
});

const applyReviewActionController = asyncHandler(async (req, res) => {
  const item = await applyReviewAction({
    caseId: req.params.caseId,
    adminUserId: req.auth.sub,
    action: req.body.action,
    notes: req.body.notes
  });
  res.json({ ok: true, data: item });
});

module.exports = {
  listReviewCasesController,
  getReviewCaseController,
  applyReviewActionController
};
