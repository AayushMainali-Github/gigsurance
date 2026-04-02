const { mongoose } = require("./db");

const pointSchema = new mongoose.Schema({ type: String, coordinates: [Number] }, { _id: false });
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

const DeliveryDriver = mongoose.models.CornDeliveryDriver || mongoose.model("CornDeliveryDriver", new mongoose.Schema({
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
}, { collection: "deliverydrivers", versionKey: false }));

const WeatherSnapshot = mongoose.models.CornWeatherSnapshot || mongoose.model("CornWeatherSnapshot", new mongoose.Schema({
  city: String, state: String, tsUnix: Number, tempC: Number, feelsLikeC: Number, humidity: Number,
  windKph: Number, rainMm: Number, cloudPct: Number, conditionMain: String, conditionDetail: String,
  visibilityKm: Number, pressureMb: Number, weatherSeverityScore: Number, heatRisk: Number, stormRisk: Number
}, { collection: "weather_snapshots", versionKey: false }));

const AqiSnapshot = mongoose.models.CornAqiSnapshot || mongoose.model("CornAqiSnapshot", new mongoose.Schema({
  city: String, state: String, tsUnix: Number, aqi: Number, category: String, pm25: Number, pm10: Number,
  no2: Number, so2: Number, o3: Number, co: Number, severityScore: Number
}, { collection: "aqi_snapshots", versionKey: false }));

module.exports = { DeliveryDriver, WeatherSnapshot, AqiSnapshot };
