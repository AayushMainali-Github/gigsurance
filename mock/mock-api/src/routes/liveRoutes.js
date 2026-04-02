const express = require("express");
const DeliveryDriver = require("../models/deliveryDriver");
const { toNumber } = require("../utils/query");

const router = express.Router();

function buildLiveMatch(req) {
  const now = Date.now();
  const recentWindowMs = Math.max(5 * 60 * 1000, Math.min(6 * 60 * 60 * 1000, toNumber(req.query.windowMs, 2 * 60 * 60 * 1000)));
  const match = {
    "history.startTimeUnix": { $lte: now },
    "history.reachedTimeUnix": { $gte: now - recentWindowMs }
  };
  if (req.query.city) match.city = req.query.city;
  if (req.query.platformName) match.platformName = req.query.platformName;
  if (req.query.state) match.state = req.query.state;
  return { now, recentWindowMs, match };
}

function liveStatusExpression(now) {
  return {
    $switch: {
      branches: [
        {
          case: {
            $and: [
              { $lte: ["$history.startTimeUnix", now] },
              { $gte: ["$history.reachedTimeUnix", now] }
            ]
          },
          then: "in_transit"
        },
        {
          case: {
            $and: [
              { $lt: ["$history.reachedTimeUnix", now] },
              { $gte: ["$history.reachedTimeUnix", now - 30 * 60 * 1000] }
            ]
          },
          then: "recently_delivered"
        }
      ],
      default: "recent_pickup"
    }
  };
}

router.get("/orders", async (req, res, next) => {
  try {
    const { now, match } = buildLiveMatch(req);
    const limit = Math.max(1, Math.min(300, toNumber(req.query.limit, 100)));
    const items = await DeliveryDriver.aggregate([
      { $match: match },
      { $unwind: "$history" },
      {
        $match: {
          "history.startTimeUnix": { $lte: now },
          "history.reachedTimeUnix": { $gte: now - Math.max(5 * 60 * 1000, Math.min(6 * 60 * 60 * 1000, toNumber(req.query.windowMs, 2 * 60 * 60 * 1000))) }
        }
      },
      {
        $addFields: {
          liveStatus: liveStatusExpression(now),
          etaMinutes: {
            $max: [
              0,
              { $round: [{ $divide: [{ $subtract: ["$history.reachedTimeUnix", now] }, 60000] }, 0] }
            ]
          }
        }
      },
      {
        $project: {
          _id: 0,
          platformName: 1,
          platformDriverId: 1,
          city: 1,
          state: 1,
          cityTier: 1,
          liveStatus: 1,
          etaMinutes: 1,
          gig: "$history"
        }
      },
      { $sort: { "gig.startTimeUnix": -1 } },
      { $limit: limit }
    ]);

    res.json({ ok: true, nowUnix: now, count: items.length, data: items });
  } catch (error) {
    next(error);
  }
});

router.get("/metrics", async (req, res, next) => {
  try {
    const { now, match } = buildLiveMatch(req);
    const rows = await DeliveryDriver.aggregate([
      { $match: match },
      { $unwind: "$history" },
      {
        $match: {
          "history.startTimeUnix": { $lte: now },
          "history.reachedTimeUnix": { $gte: now - Math.max(5 * 60 * 1000, Math.min(6 * 60 * 60 * 1000, toNumber(req.query.windowMs, 2 * 60 * 60 * 1000))) }
        }
      },
      { $addFields: { liveStatus: liveStatusExpression(now) } },
      {
        $group: {
          _id: null,
          activeOrders: {
            $sum: {
              $cond: [{ $eq: ["$liveStatus", "in_transit"] }, 1, 0]
            }
          },
          recentlyDelivered: {
            $sum: {
              $cond: [{ $eq: ["$liveStatus", "recently_delivered"] }, 1, 0]
            }
          },
          recentPickups: {
            $sum: {
              $cond: [{ $eq: ["$liveStatus", "recent_pickup"] }, 1, 0]
            }
          },
          avgPay: { $avg: "$history.amountPaid" },
          avgDuration: { $avg: "$history.durationMinutes" }
        }
      }
    ]);

    const cityBreakdown = await DeliveryDriver.aggregate([
      { $match: match },
      { $unwind: "$history" },
      {
        $match: {
          "history.startTimeUnix": { $lte: now },
          "history.reachedTimeUnix": { $gte: now - Math.max(5 * 60 * 1000, Math.min(6 * 60 * 60 * 1000, toNumber(req.query.windowMs, 2 * 60 * 60 * 1000))) }
        }
      },
      { $group: { _id: "$city", liveOrders: { $sum: 1 } } },
      { $sort: { liveOrders: -1 } },
      { $limit: 12 }
    ]);

    const platformBreakdown = await DeliveryDriver.aggregate([
      { $match: match },
      { $unwind: "$history" },
      {
        $match: {
          "history.startTimeUnix": { $lte: now },
          "history.reachedTimeUnix": { $gte: now - Math.max(5 * 60 * 1000, Math.min(6 * 60 * 60 * 1000, toNumber(req.query.windowMs, 2 * 60 * 60 * 1000))) }
        }
      },
      { $group: { _id: "$platformName", liveOrders: { $sum: 1 } } },
      { $sort: { liveOrders: -1 } }
    ]);

    res.json({
      ok: true,
      nowUnix: now,
      data: {
        summary: rows[0] || { activeOrders: 0, recentlyDelivered: 0, recentPickups: 0, avgPay: 0, avgDuration: 0 },
        cityBreakdown,
        platformBreakdown
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
