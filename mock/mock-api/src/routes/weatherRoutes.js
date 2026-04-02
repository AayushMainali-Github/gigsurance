const express = require("express");
const WeatherSnapshot = require("../models/weatherSnapshot");
const { parsePagination, parseSort, toNumber } = require("../utils/query");

const router = express.Router();

router.get("/snapshots", async (req, res, next) => {
  try {
    const { limit, page, skip } = parsePagination(req.query);
    const filter = {};
    if (req.query.city) filter.city = req.query.city;
    if (req.query.state) filter.state = req.query.state;
    if (req.query.conditionMain) filter.conditionMain = req.query.conditionMain;
    if (req.query.tsFrom || req.query.tsTo) {
      filter.tsUnix = {};
      if (req.query.tsFrom) filter.tsUnix.$gte = toNumber(req.query.tsFrom, 0);
      if (req.query.tsTo) filter.tsUnix.$lte = toNumber(req.query.tsTo, Number.MAX_SAFE_INTEGER);
    }

    const [items, total] = await Promise.all([
      WeatherSnapshot.find(filter)
        .sort(parseSort(req.query, ["tsUnix", "tempC", "weatherSeverityScore"], "tsUnix"))
        .skip(skip)
        .limit(limit)
        .lean(),
      WeatherSnapshot.countDocuments(filter)
    ]);

    res.json({ ok: true, page, limit, total, data: items });
  } catch (error) {
    next(error);
  }
});

router.get("/latest", async (req, res, next) => {
  try {
    if (req.query.city) {
      const item = await WeatherSnapshot.findOne({ city: req.query.city }).sort({ tsUnix: -1 }).lean();
      return res.json({ ok: true, data: item });
    }

    const items = await WeatherSnapshot.aggregate([
      { $sort: { city: 1, tsUnix: -1 } },
      { $group: { _id: "$city", doc: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$doc" } },
      { $sort: { weatherSeverityScore: -1, city: 1 } }
    ]);
    return res.json({ ok: true, count: items.length, data: items });
  } catch (error) {
    return next(error);
  }
});

router.get("/cities/:city/timeseries", async (req, res, next) => {
  try {
    const limit = Math.max(1, Math.min(5000, toNumber(req.query.limit, 336)));
    const filter = { city: req.params.city };
    if (req.query.tsFrom || req.query.tsTo) {
      filter.tsUnix = {};
      if (req.query.tsFrom) filter.tsUnix.$gte = toNumber(req.query.tsFrom, 0);
      if (req.query.tsTo) filter.tsUnix.$lte = toNumber(req.query.tsTo, Number.MAX_SAFE_INTEGER);
    }

    const items = await WeatherSnapshot.find(filter).sort({ tsUnix: -1 }).limit(limit).lean();
    res.json({ ok: true, count: items.length, data: items.reverse() });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
