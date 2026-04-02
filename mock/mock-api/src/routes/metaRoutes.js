const express = require("express");
const DeliveryDriver = require("../models/deliveryDriver");
const WeatherSnapshot = require("../models/weatherSnapshot");
const AqiSnapshot = require("../models/aqiSnapshot");

const router = express.Router();

router.get("/platforms", async (_req, res, next) => {
  try {
    const platforms = await DeliveryDriver.distinct("platformName");
    res.json({ ok: true, data: platforms.sort() });
  } catch (error) {
    next(error);
  }
});

router.get("/cities", async (_req, res, next) => {
  try {
    const cities = await DeliveryDriver.aggregate([
      { $group: { _id: { city: "$city", state: "$state", cityTier: "$cityTier" }, drivers: { $sum: 1 } } },
      { $sort: { drivers: -1, "_id.city": 1 } }
    ]);
    res.json({ ok: true, count: cities.length, data: cities.map((item) => ({ ...item._id, drivers: item.drivers })) });
  } catch (error) {
    next(error);
  }
});

router.get("/overview", async (_req, res, next) => {
  try {
    const [drivers, weather, aqi] = await Promise.all([
      DeliveryDriver.countDocuments(),
      WeatherSnapshot.countDocuments(),
      AqiSnapshot.countDocuments()
    ]);
    res.json({ ok: true, data: { drivers, weatherSnapshots: weather, aqiSnapshots: aqi } });
  } catch (error) {
    next(error);
  }
});

router.get("/cities/:city/dashboard", async (req, res, next) => {
  try {
    const city = req.params.city;
    const [driverCount, latestWeather, latestAqi, platformMix] = await Promise.all([
      DeliveryDriver.countDocuments({ city }),
      WeatherSnapshot.findOne({ city }).sort({ tsUnix: -1 }).lean(),
      AqiSnapshot.findOne({ city }).sort({ tsUnix: -1 }).lean(),
      DeliveryDriver.aggregate([
        { $match: { city } },
        { $group: { _id: "$platformName", drivers: { $sum: 1 } } },
        { $sort: { drivers: -1 } }
      ])
    ]);
    res.json({ ok: true, data: { city, driverCount, latestWeather, latestAqi, platformMix } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
