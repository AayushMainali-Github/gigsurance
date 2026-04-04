const { mongoose } = require("../config/db");

const externalDeliveryDriverSchema = new mongoose.Schema({
  platformName: String,
  platformDriverId: String,
  city: String,
  state: String,
  cityTier: String,
  joinedAt: Date,
  driverProfile: mongoose.Schema.Types.Mixed,
  historyCompacted: Boolean,
  bsonSizeBytes: Number
}, { collection: "deliverydrivers", versionKey: false });

module.exports = mongoose.models.ExternalDeliveryDriver || mongoose.model("ExternalDeliveryDriver", externalDeliveryDriverSchema);
