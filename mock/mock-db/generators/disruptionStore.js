const WeatherSnapshot = require("../models/weatherSnapshot");
const AqiSnapshot = require("../models/aqiSnapshot");
const { cities } = require("../config/cities");
const { dateKey, monthsAgoStart, dayjs } = require("../utils/time");
const { createRng } = require("../utils/rng");

function aqiBandFromCategory(category) {
  if (["good", "satisfactory"].includes(category)) return "clean";
  if (category === "moderate") return "elevated";
  if (category === "poor") return "poor";
  if (category === "very_poor") return "very_poor";
  return "severe";
}

function fallbackDisruption(city, day, seed) {
  const month = day.month() + 1;
  const rng = createRng(`${seed}:fallback:${city.city}:${dateKey(day)}`);
  const seasonalRain = [6, 7, 8, 9].includes(month) ? rng.float(0.08, 0.38) : rng.float(0, 0.18);
  const weatherImpactScore = Number(Math.min(1, seasonalRain + rng.float(0, 0.18)).toFixed(3));
  const winterNorth = [11, 12, 1].includes(month) ? city.northIntensity * rng.float(0.18, 0.52) : rng.float(0.02, 0.18);
  const aqiImpactScore = Number(Math.min(1, winterNorth).toFixed(3));
  const strikeFlag = rng.bool(0.0025);
  const shutdownFlag = !strikeFlag && rng.bool(0.0008);
  const combinedDisruptionScore = Number(Math.min(1, weatherImpactScore * 0.55 + aqiImpactScore * 0.45 + (strikeFlag ? 0.5 : 0) + (shutdownFlag ? 0.8 : 0)).toFixed(3));
  return {
    city: city.city,
    state: city.state,
    dateKey: dateKey(day),
    weatherImpactScore,
    aqiImpactScore,
    combinedDisruptionScore,
    strikeFlag,
    shutdownFlag,
    weatherSeverityHint: weatherImpactScore,
    aqiBandHint: aqiImpactScore > 0.7 ? "severe" : aqiImpactScore > 0.45 ? "very_poor" : aqiImpactScore > 0.28 ? "poor" : "clean"
  };
}

async function loadDisruptionStore(seed, envMonths, cityFilter) {
  const start = monthsAgoStart(envMonths);
  const selectedCities = cityFilter ? cities.filter((city) => city.city === cityFilter) : cities;
  const citySet = selectedCities.map((city) => city.city);
  const weatherAgg = await WeatherSnapshot.aggregate([
    { $match: { city: { $in: citySet }, tsUnix: { $gte: start.valueOf() } } },
    { $group: { _id: { city: "$city", state: "$state", day: { $dateToString: { format: "%Y-%m-%d", date: { $toDate: "$tsUnix" }, timezone: "UTC" } } }, avgSeverity: { $avg: "$weatherSeverityScore" }, maxStorm: { $max: "$stormRisk" }, maxRain: { $max: "$rainMm" }, maxHeat: { $max: "$heatRisk" } } }
  ]);
  const aqiAgg = await AqiSnapshot.aggregate([
    { $match: { city: { $in: citySet }, tsUnix: { $gte: start.valueOf() } } },
    { $group: { _id: { city: "$city", state: "$state", day: { $dateToString: { format: "%Y-%m-%d", date: { $toDate: "$tsUnix" }, timezone: "UTC" } } }, avgSeverity: { $avg: "$severityScore" }, maxAqi: { $max: "$aqi" }, worstCategory: { $max: "$category" } } }
  ]);

  const weatherMap = new Map(weatherAgg.map((entry) => [`${entry._id.city}|${entry._id.day}`, { weatherImpactScore: Number(Math.min(1, entry.avgSeverity * 0.8 + Math.min(entry.maxStorm, 1) * 0.15 + Math.min(entry.maxRain / 25, 0.2)).toFixed(3)), weatherSeverityHint: Number(Math.min(1, entry.avgSeverity * 0.75 + entry.maxHeat * 0.1 + entry.maxStorm * 0.15).toFixed(3)) }]));
  const aqiMap = new Map(aqiAgg.map((entry) => [`${entry._id.city}|${entry._id.day}`, { aqiImpactScore: Number(Math.min(1, entry.avgSeverity * 0.7 + Math.min(entry.maxAqi / 500, 0.3)).toFixed(3)), aqiBandHint: aqiBandFromCategory(entry.worstCategory) }]));

  const store = new Map();
  const topDisrupted = [];
  for (const city of selectedCities) {
    let cursor = start.clone().startOf("day");
    const end = dayjs.utc().startOf("day");
    while (cursor.isBefore(end) || cursor.isSame(end)) {
      const key = `${city.city}|${dateKey(cursor)}`;
      const weather = weatherMap.get(key);
      const aqi = aqiMap.get(key);
      const base = weather || aqi ? { city: city.city, state: city.state, dateKey: dateKey(cursor), weatherImpactScore: weather ? weather.weatherImpactScore : 0, aqiImpactScore: aqi ? aqi.aqiImpactScore : 0, weatherSeverityHint: weather ? weather.weatherSeverityHint : 0, aqiBandHint: aqi ? aqi.aqiBandHint : "clean" } : fallbackDisruption(city, cursor, seed);
      const rng = createRng(`${seed}:disruption:${city.city}:${base.dateKey}`);
      const strikeFlag = rng.bool(0.002 + base.aqiImpactScore * 0.002);
      const shutdownFlag = !strikeFlag && rng.bool(0.0008 + base.weatherImpactScore * 0.003);
      const combinedDisruptionScore = Number(Math.min(1, base.weatherImpactScore * 0.58 + base.aqiImpactScore * 0.32 + (strikeFlag ? 0.45 : 0) + (shutdownFlag ? 0.8 : 0)).toFixed(3));
      const item = { ...base, strikeFlag, shutdownFlag, combinedDisruptionScore };
      store.set(key, item);
      topDisrupted.push(item);
      cursor = cursor.add(1, "day");
    }
  }
  topDisrupted.sort((a, b) => b.combinedDisruptionScore - a.combinedDisruptionScore);
  return { get(cityName, key) { return store.get(`${cityName}|${key}`); }, topDisrupted: topDisrupted.slice(0, 10), size: store.size };
}

module.exports = { loadDisruptionStore, fallbackDisruption };
