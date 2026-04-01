const { mongoose } = require("../utils/db");

const pointSchema = new mongoose.Schema({
  type: { type: String, enum: ["Point"], required: true },
  coordinates: {
    type: [Number],
    required: true,
    validate: {
      validator(value) {
        return Array.isArray(value) && value.length === 2;
      }
    }
  }
}, { _id: false });

const historySchema = new mongoose.Schema({
  gigId: { type: String, required: true },
  amountPaid: { type: Number, required: true },
  startTimeUnix: { type: Number, required: true },
  reachedTimeUnix: { type: Number, required: true },
  pickup: { type: pointSchema, required: true },
  drop: { type: pointSchema, required: true },
  durationMinutes: { type: Number, required: true },
  dateKey: { type: String, required: true },
  weatherSeverityHint: { type: Number, required: true },
  aqiBandHint: { type: String, required: true }
}, { _id: false });

const deliveryDriverSchema = new mongoose.Schema({
  platformName: { type: String, required: true },
  platformDriverId: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  cityTier: { type: String, required: true },
  joinedAt: { type: Date, required: true },
  driverProfile: {
    archetype: { type: String, required: true },
    experienceBucket: { type: String, required: true },
    hoursPreferenceMin: { type: Number, required: true },
    hoursPreferenceMax: { type: Number, required: true },
    weatherSensitivity: { type: String, required: true },
    preferredShift: { type: String, required: true },
    resilienceScore: { type: Number, required: true },
    attendanceDiscipline: { type: Number, required: true },
    preferredHubIds: { type: [String], default: [] },
    platformLoyaltyScore: { type: Number, required: true }
  },
  history: { type: [historySchema], default: [] },
  historyCompacted: { type: Boolean, default: false },
  bsonSizeBytes: { type: Number, required: true }
}, { collection: "deliverydrivers", versionKey: false });

deliveryDriverSchema.index({ platformName: 1, platformDriverId: 1 }, { unique: true });
deliveryDriverSchema.index({ city: 1 });
deliveryDriverSchema.index({ cityTier: 1 });
deliveryDriverSchema.index({ "history.dateKey": 1 });

module.exports = mongoose.models.DeliveryDriver || mongoose.model("DeliveryDriver", deliveryDriverSchema);
