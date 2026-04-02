const express = require("express");
const DeliveryDriver = require("../models/deliveryDriver");
const { toNumber } = require("../utils/query");

const router = express.Router();

function buildBaseMatch(query) {
  const match = {};
  if (query.city) match.city = query.city;
  if (query.state) match.state = query.state;
  if (query.platformName) match.platformName = query.platformName;
  return match;
}

function buildDayMatch(query) {
  const days = Math.max(7, Math.min(180, toNumber(query.days, 60)));
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const cutoffKey = cutoff.toISOString().slice(0, 10);
  return { days, cutoffKey };
}

function cityDayPipeline(query) {
  const baseMatch = buildBaseMatch(query);
  const { cutoffKey } = buildDayMatch(query);
  const limit = Math.max(1, Math.min(500, toNumber(query.limit, 120)));

  return [
    { $match: baseMatch },
    { $unwind: "$history" },
    { $match: { "history.dateKey": { $gte: cutoffKey } } },
    {
      $group: {
        _id: {
          city: "$city",
          state: "$state",
          platformName: "$platformName",
          dateKey: "$history.dateKey"
        },
        gigs: { $sum: 1 },
        avgAmountPaid: { $avg: "$history.amountPaid" },
        avgDurationMinutes: { $avg: "$history.durationMinutes" },
        avgWeatherSeverityHint: { $avg: "$history.weatherSeverityHint" },
        driversActive: { $addToSet: "$platformDriverId" }
      }
    },
    {
      $project: {
        _id: 0,
        city: "$_id.city",
        state: "$_id.state",
        platformName: "$_id.platformName",
        dateKey: "$_id.dateKey",
        gigs: 1,
        avgAmountPaid: { $round: ["$avgAmountPaid", 2] },
        avgDurationMinutes: { $round: ["$avgDurationMinutes", 2] },
        avgWeatherSeverityHint: { $round: ["$avgWeatherSeverityHint", 3] },
        activeDrivers: { $size: "$driversActive" }
      }
    },
    {
      $lookup: {
        from: "weather_snapshots",
        let: { city: "$city", dateKey: "$dateKey" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$city", "$$city"] },
                  {
                    $eq: [
                      { $dateToString: { format: "%Y-%m-%d", date: { $toDate: "$tsUnix" }, timezone: "UTC" } },
                      "$$dateKey"
                    ]
                  }
                ]
              }
            }
          },
          {
            $group: {
              _id: null,
              avgWeatherSeverityScore: { $avg: "$weatherSeverityScore" },
              avgRainMm: { $avg: "$rainMm" },
              maxStormRisk: { $max: "$stormRisk" },
              maxHeatRisk: { $max: "$heatRisk" }
            }
          }
        ],
        as: "weather"
      }
    },
    {
      $lookup: {
        from: "aqi_snapshots",
        let: { city: "$city", dateKey: "$dateKey" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$city", "$$city"] },
                  {
                    $eq: [
                      { $dateToString: { format: "%Y-%m-%d", date: { $toDate: "$tsUnix" }, timezone: "UTC" } },
                      "$$dateKey"
                    ]
                  }
                ]
              }
            }
          },
          {
            $group: {
              _id: null,
              avgAqi: { $avg: "$aqi" },
              avgAqiSeverityScore: { $avg: "$severityScore" },
              maxAqi: { $max: "$aqi" }
            }
          }
        ],
        as: "aqi"
      }
    },
    {
      $addFields: {
        weather: { $ifNull: [{ $arrayElemAt: ["$weather", 0] }, {}] },
        aqi: { $ifNull: [{ $arrayElemAt: ["$aqi", 0] }, {}] }
      }
    },
    {
      $project: {
        city: 1,
        state: 1,
        platformName: 1,
        dateKey: 1,
        gigs: 1,
        activeDrivers: 1,
        avgAmountPaid: 1,
        avgDurationMinutes: 1,
        avgWeatherSeverityHint: 1,
        weatherSeverityScore: { $round: [{ $ifNull: ["$weather.avgWeatherSeverityScore", 0] }, 3] },
        rainMm: { $round: [{ $ifNull: ["$weather.avgRainMm", 0] }, 2] },
        stormRisk: { $round: [{ $ifNull: ["$weather.maxStormRisk", 0] }, 3] },
        heatRisk: { $round: [{ $ifNull: ["$weather.maxHeatRisk", 0] }, 3] },
        aqi: { $round: [{ $ifNull: ["$aqi.avgAqi", 0] }, 0] },
        aqiSeverityScore: { $round: [{ $ifNull: ["$aqi.avgAqiSeverityScore", 0] }, 3] },
        disruptionScore: {
          $round: [
            {
              $add: [
                { $multiply: [{ $ifNull: ["$weather.avgWeatherSeverityScore", 0] }, 0.45] },
                { $multiply: [{ $ifNull: ["$aqi.avgAqiSeverityScore", 0] }, 0.35] },
                { $multiply: ["$avgWeatherSeverityHint", 0.2] }
              ]
            },
            3
          ]
        }
      }
    },
    { $sort: { dateKey: -1, gigs: -1 } },
    { $limit: limit }
  ];
}

router.get("/city-day", async (req, res, next) => {
  try {
    const { days } = buildDayMatch(req.query);
    const items = await DeliveryDriver.aggregate(cityDayPipeline(req.query));
    res.json({ ok: true, days, count: items.length, data: items });
  } catch (error) {
    next(error);
  }
});

router.get("/correlations", async (req, res, next) => {
  try {
    const { days } = buildDayMatch(req.query);
    const items = await DeliveryDriver.aggregate(cityDayPipeline({ ...req.query, limit: Math.max(60, Math.min(1000, toNumber(req.query.limit, 300))) }));

    const count = items.length || 1;
    const totals = items.reduce((acc, item) => {
      acc.gigs += Number(item.gigs || 0);
      acc.avgDurationMinutes += Number(item.avgDurationMinutes || 0);
      acc.avgAmountPaid += Number(item.avgAmountPaid || 0);
      acc.weatherSeverityScore += Number(item.weatherSeverityScore || 0);
      acc.aqiSeverityScore += Number(item.aqiSeverityScore || 0);
      acc.disruptionScore += Number(item.disruptionScore || 0);
      if (Number(item.disruptionScore || 0) >= 0.75) acc.highDisruptionDays += 1;
      return acc;
    }, { gigs: 0, avgDurationMinutes: 0, avgAmountPaid: 0, weatherSeverityScore: 0, aqiSeverityScore: 0, disruptionScore: 0, highDisruptionDays: 0 });

    const ranked = [...items].sort((left, right) => Number(right.disruptionScore || 0) - Number(left.disruptionScore || 0));
    const topDisruptionDays = ranked.slice(0, 10);
    const topDurationDays = [...items]
      .sort((left, right) => Number(right.avgDurationMinutes || 0) - Number(left.avgDurationMinutes || 0))
      .slice(0, 10);

    const cityRollupMap = new Map();
    for (const item of items) {
      const key = item.city;
      if (!cityRollupMap.has(key)) {
        cityRollupMap.set(key, { city: item.city, gigs: 0, avgDurationMinutes: 0, avgAmountPaid: 0, disruptionScore: 0, activeDrivers: 0, days: 0 });
      }
      const bucket = cityRollupMap.get(key);
      bucket.gigs += Number(item.gigs || 0);
      bucket.avgDurationMinutes += Number(item.avgDurationMinutes || 0);
      bucket.avgAmountPaid += Number(item.avgAmountPaid || 0);
      bucket.disruptionScore += Number(item.disruptionScore || 0);
      bucket.activeDrivers += Number(item.activeDrivers || 0);
      bucket.days += 1;
    }

    const cityRollups = Array.from(cityRollupMap.values())
      .map((item) => ({
        city: item.city,
        gigs: item.gigs,
        avgDurationMinutes: Number((item.avgDurationMinutes / item.days).toFixed(2)),
        avgAmountPaid: Number((item.avgAmountPaid / item.days).toFixed(2)),
        avgDisruptionScore: Number((item.disruptionScore / item.days).toFixed(3)),
        avgActiveDrivers: Number((item.activeDrivers / item.days).toFixed(2))
      }))
      .sort((left, right) => right.gigs - left.gigs)
      .slice(0, 12);

    res.json({
      ok: true,
      days,
      data: {
        summary: {
          rowsAnalyzed: items.length,
          totalGigs: totals.gigs,
          avgDurationMinutes: Number((totals.avgDurationMinutes / count).toFixed(2)),
          avgAmountPaid: Number((totals.avgAmountPaid / count).toFixed(2)),
          avgWeatherSeverityScore: Number((totals.weatherSeverityScore / count).toFixed(3)),
          avgAqiSeverityScore: Number((totals.aqiSeverityScore / count).toFixed(3)),
          avgDisruptionScore: Number((totals.disruptionScore / count).toFixed(3)),
          highDisruptionDays: totals.highDisruptionDays
        },
        topDisruptionDays,
        topDurationDays,
        cityRollups
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
