const { mongoose } = require("../db");

const pointSchema = new mongoose.Schema({
  type: String,
  coordinates: [Number]
}, { _id: false });

const historySchema = new mongoose.Schema({
  gigId: String,
  amountPaid: Number,
  startTimeUnix: Number,
  reachedTimeUnix: Number,
  pickup: pointSchema,
  drop: pointSchema,
  durationMinutes: Number,
  dateKey: String,
  weatherSeverityHint: Number,
  aqiBandHint: String
}, { _id: false });

const deliveryDriverSchema = new mongoose.Schema({
  platformName: String,
  platformDriverId: String,
  city: String,
  state: String,
  cityTier: String,
  joinedAt: Date,
  driverProfile: mongoose.Schema.Types.Mixed,
  history: [historySchema],
  historyCompacted: Boolean,
  bsonSizeBytes: Number
}, { collection: "deliverydrivers", versionKey: false });

module.exports = mongoose.models.ApiDeliveryDriver || mongoose.model("ApiDeliveryDriver", deliveryDriverSchema);
