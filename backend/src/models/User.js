const { mongoose } = require("../config/db");
const { ROLES } = require("../constants/roles");

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: Object.values(ROLES), default: ROLES.USER, index: true },
  status: { type: String, enum: ["pending_verification", "active", "suspended"], default: "active", index: true },
  linkedWorkers: [{ type: mongoose.Schema.Types.ObjectId, ref: "LinkedWorker" }],
  linkedWorkerId: { type: mongoose.Schema.Types.ObjectId, ref: "LinkedWorker", default: null },
  currentPolicyId: { type: mongoose.Schema.Types.ObjectId, ref: "Policy", default: null },
  lastLoginAt: { type: Date, default: null }
}, { collection: "users", timestamps: true, versionKey: false });

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
