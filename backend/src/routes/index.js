const express = require("express");

const { requireAuth } = require("../middleware/requireAuth");
const { requireAdmin } = require("../middleware/requireAdmin");
const { authRouter } = require("../modules/auth/auth.routes");
const { usersRouter } = require("../modules/users/users.routes");
const { workersRouter } = require("../modules/workers/workers.routes");
const { policiesRouter } = require("../modules/policies/policies.routes");
const { billingRouter } = require("../modules/billing/billing.routes");
const { payoutsRouter } = require("../modules/payouts/payouts.routes");
const { fraudRouter } = require("../modules/fraud/fraud.routes");
const { adminRouter } = require("../modules/admin/admin.routes");
const { mlRouter } = require("../modules/ml/ml.routes");
const { auditRouter } = require("../modules/audit/audit.routes");
const { financeRouter } = require("../modules/finance/finance.routes");
const { mongoose } = require("../config/db");

const apiRouter = express.Router();

apiRouter.get("/health", (_req, res) => {
  res.json({ ok: true, service: "backend", status: "ok" });
});

apiRouter.get("/ready", (_req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  res.status(dbReady ? 200 : 503).json({
    ok: dbReady,
    service: "backend",
    dbReady
  });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/users", requireAuth, usersRouter);
apiRouter.use("/workers", requireAuth, workersRouter);
apiRouter.use("/policies", requireAuth, policiesRouter);
apiRouter.use("/billing", requireAuth, billingRouter);
apiRouter.use("/payouts", requireAuth, payoutsRouter);
apiRouter.use("/fraud", requireAuth, requireAdmin, fraudRouter);
apiRouter.use("/admin", requireAuth, requireAdmin, adminRouter);
apiRouter.use("/ml", requireAuth, requireAdmin, mlRouter);
apiRouter.use("/audit", requireAuth, requireAdmin, auditRouter);
apiRouter.use("/finance", requireAuth, requireAdmin, financeRouter);

module.exports = { apiRouter };
