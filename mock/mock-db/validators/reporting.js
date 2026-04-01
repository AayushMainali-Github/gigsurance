const DeliveryDriver = require("../models/deliveryDriver");
const WeatherSnapshot = require("../models/weatherSnapshot");
const AqiSnapshot = require("../models/aqiSnapshot");

async function reportDeliveryValidation(expectedCount) {
  const [totalDrivers, byCity, byPlatform, compactedCount] = await Promise.all([
    DeliveryDriver.countDocuments(),
    DeliveryDriver.aggregate([{ $group: { _id: "$city", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 20 }]),
    DeliveryDriver.aggregate([{ $group: { _id: "$platformName", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    DeliveryDriver.countDocuments({ historyCompacted: true })
  ]);

  const platformStats = await DeliveryDriver.aggregate([
    { $unwind: "$history" },
    { $group: { _id: "$platformName", avgAmountPaid: { $avg: "$history.amountPaid" }, avgDurationMinutes: { $avg: "$history.durationMinutes" }, gigs: { $sum: 1 }, activeDays: { $addToSet: "$history.dateKey" }, tenureDays: { $avg: { $divide: [{ $subtract: [new Date(), "$joinedAt"] }, 1000 * 60 * 60 * 24] } } } }
  ]);

  console.log("[delivery] total drivers:", totalDrivers, "expected:", expectedCount);
  console.log("[delivery] top cities:", byCity.slice(0, 10));
  console.log("[delivery] by platform:", byPlatform);
  console.log("[delivery] platform stats:", platformStats.map((item) => ({ platform: item._id, avgTenureDays: Number(item.tenureDays.toFixed(1)), avgGigsPerDay: Number((item.gigs / Math.max(item.activeDays.length, 1)).toFixed(2)), avgAmountPaid: Number(item.avgAmountPaid.toFixed(2)), avgDurationMinutes: Number(item.avgDurationMinutes.toFixed(2)) })));
  console.log("[delivery] oversized prevented:", compactedCount);
}

async function reportUniquenessValidation() {
  const [weatherDuplicates, aqiDuplicates] = await Promise.all([
    WeatherSnapshot.aggregate([{ $group: { _id: { city: "$city", tsUnix: "$tsUnix" }, count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }, { $count: "count" }]),
    AqiSnapshot.aggregate([{ $group: { _id: { city: "$city", tsUnix: "$tsUnix" }, count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }, { $count: "count" }])
  ]);
  console.log("[env] weather duplicate slots:", weatherDuplicates[0]?.count || 0);
  console.log("[env] aqi duplicate slots:", aqiDuplicates[0]?.count || 0);
}

module.exports = { reportDeliveryValidation, reportUniquenessValidation };
