const { mongoose } = require("../config/db");

const linkedWorkerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  platformName: { type: String, required: true, lowercase: true, trim: true, index: true },
  platformDriverId: { type: String, required: true, trim: true, index: true },
  city: { type: String, required: true, trim: true, index: true },
  state: { type: String, required: true, trim: true, index: true },
  cityTier: { type: String, required: true, trim: true, index: true },
  linkedAt: { type: Date, required: true, default: Date.now },
  enrollmentStatus: { type: String, enum: ["linked", "enrolled", "inactive"], default: "linked", index: true },
  workerSnapshotCache: { type: mongoose.Schema.Types.Mixed, required: true }
}, { collection: "linked_workers", timestamps: true, versionKey: false });

linkedWorkerSchema.index({ userId: 1, platformName: 1, platformDriverId: 1 }, { unique: true });
linkedWorkerSchema.index({ platformName: 1, platformDriverId: 1 }, { unique: true });

module.exports = mongoose.models.LinkedWorker || mongoose.model("LinkedWorker", linkedWorkerSchema);
