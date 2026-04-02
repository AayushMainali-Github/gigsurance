const express = require("express");
const DeliveryDriver = require("../models/deliveryDriver");
const { parsePagination, parseSort, toNumber } = require("../utils/query");

const router = express.Router();

router.get("/drivers", async (req, res, next) => {
  try {
    const { limit, page, skip } = parsePagination(req.query);
    const filter = {};
    if (req.query.city) filter.city = req.query.city;
    if (req.query.state) filter.state = req.query.state;
    if (req.query.platformName) filter.platformName = req.query.platformName;
    if (req.query.cityTier) filter.cityTier = req.query.cityTier;
    if (req.query.archetype) filter["driverProfile.archetype"] = req.query.archetype;
    if (req.query.experienceBucket) filter["driverProfile.experienceBucket"] = req.query.experienceBucket;
    if (req.query.weatherSensitivity) filter["driverProfile.weatherSensitivity"] = req.query.weatherSensitivity;

    const [items, total] = await Promise.all([
      DeliveryDriver.find(filter)
        .select("platformName platformDriverId city state cityTier joinedAt driverProfile historyCompacted bsonSizeBytes")
        .sort(parseSort(req.query, ["joinedAt", "city", "platformName"], "joinedAt"))
        .skip(skip)
        .limit(limit)
        .lean(),
      DeliveryDriver.countDocuments(filter)
    ]);

    res.json({ ok: true, page, limit, total, data: items });
  } catch (error) {
    next(error);
  }
});

router.get("/drivers/:platformName/:platformDriverId", async (req, res, next) => {
  try {
    const historyLimit = Math.max(1, Math.min(5000, toNumber(req.query.historyLimit, 250)));
    const driver = await DeliveryDriver.findOne({
      platformName: req.params.platformName,
      platformDriverId: req.params.platformDriverId
    }).lean();

    if (!driver) {
      return res.status(404).json({ ok: false, error: "Driver not found" });
    }

    driver.history = (driver.history || []).slice(-historyLimit);
    return res.json({ ok: true, data: driver });
  } catch (error) {
    return next(error);
  }
});

router.get("/summary", async (req, res, next) => {
  try {
    const match = {};
    if (req.query.city) match.city = req.query.city;
    if (req.query.platformName) match.platformName = req.query.platformName;

    const [driverCounts, historyStats] = await Promise.all([
      DeliveryDriver.aggregate([
        { $match: match },
        { $group: { _id: "$platformName", drivers: { $sum: 1 } } },
        { $sort: { drivers: -1 } }
      ]),
      DeliveryDriver.aggregate([
        { $match: match },
        { $unwind: "$history" },
        { $group: { _id: "$platformName", avgAmountPaid: { $avg: "$history.amountPaid" }, avgDurationMinutes: { $avg: "$history.durationMinutes" }, gigs: { $sum: 1 } } },
        { $sort: { gigs: -1 } }
      ])
    ]);

    res.json({ ok: true, data: { driverCounts, historyStats } });
  } catch (error) {
    next(error);
  }
});

router.get("/cities/:city/summary", async (req, res, next) => {
  try {
    const city = req.params.city;
    const [drivers, platformMix, gigStats] = await Promise.all([
      DeliveryDriver.countDocuments({ city }),
      DeliveryDriver.aggregate([
        { $match: { city } },
        { $group: { _id: "$platformName", drivers: { $sum: 1 } } },
        { $sort: { drivers: -1 } }
      ]),
      DeliveryDriver.aggregate([
        { $match: { city } },
        { $unwind: "$history" },
        { $group: { _id: null, gigs: { $sum: 1 }, avgAmountPaid: { $avg: "$history.amountPaid" }, avgDurationMinutes: { $avg: "$history.durationMinutes" } } }
      ])
    ]);

    res.json({ ok: true, data: { city, drivers, platformMix, gigStats: gigStats[0] || null } });
  } catch (error) {
    next(error);
  }
});

router.get("/platforms/:platformName/summary", async (req, res, next) => {
  try {
    const platformName = req.params.platformName;
    const [drivers, cityBreakdown, gigStats] = await Promise.all([
      DeliveryDriver.countDocuments({ platformName }),
      DeliveryDriver.aggregate([
        { $match: { platformName } },
        { $group: { _id: "$city", drivers: { $sum: 1 } } },
        { $sort: { drivers: -1 } },
        { $limit: 20 }
      ]),
      DeliveryDriver.aggregate([
        { $match: { platformName } },
        { $unwind: "$history" },
        { $group: { _id: null, gigs: { $sum: 1 }, avgAmountPaid: { $avg: "$history.amountPaid" }, avgDurationMinutes: { $avg: "$history.durationMinutes" } } }
      ])
    ]);

    res.json({ ok: true, data: { platformName, drivers, cityBreakdown, gigStats: gigStats[0] || null } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
