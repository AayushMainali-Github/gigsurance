const { mongoose } = require("../config/db");

const scheduledJobRunSchema = new mongoose.Schema({
  jobName: { type: String, required: true, index: true },
  scheduledFor: { type: Date, required: true, index: true },
  startedAt: { type: Date, required: true },
  completedAt: { type: Date, default: null },
  status: { type: String, enum: ["running", "completed", "failed", "skipped"], default: "running", index: true },
  processedCount: { type: Number, default: 0 },
  successCount: { type: Number, default: 0 },
  failureCount: { type: Number, default: 0 },
  errorSummary: { type: String, default: null },
  cursor: { type: mongoose.Schema.Types.Mixed, default: null },
  attemptCount: { type: Number, default: 1 },
  lastHeartbeatAt: { type: Date, default: Date.now, index: true },
  lockToken: { type: String, default: null, index: true },
  idempotencyKey: { type: String, required: true, unique: true }
}, { collection: "scheduled_job_runs", timestamps: true, versionKey: false });

scheduledJobRunSchema.index({ jobName: 1, scheduledFor: 1 }, { unique: true });

module.exports = mongoose.models.ScheduledJobRun || mongoose.model("ScheduledJobRun", scheduledJobRunSchema);
