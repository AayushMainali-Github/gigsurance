const IncidentWindow = require("../models/IncidentWindow");
const { listWeatherSnapshots, listAqiSnapshots } = require("./mockApiClient");

function dayBounds(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(start);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
}

function previousDay(date = new Date()) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() - 1);
  return d;
}

function classifyTrigger({ weatherSeverityScore, maxRainMm, maxHeatRisk, maxAqi }) {
  if (maxRainMm >= 18) return "heavy_rain";
  if (maxAqi >= 280) return "severe_aqi";
  if (maxHeatRisk >= 0.7) return "extreme_heat";
  if (weatherSeverityScore >= 0.58) return "combined_disruption";
  return "monitor";
}

async function detectIncidentsForDate(date = previousDay()) {
  const { start, end } = dayBounds(date);
  const startUnix = start.getTime();
  const endUnix = end.getTime();

  const [weatherRows, aqiRows] = await Promise.all([
    listWeatherSnapshots({ tsFrom: startUnix, tsTo: endUnix, sortBy: "tsUnix", order: "asc" }),
    listAqiSnapshots({ tsFrom: startUnix, tsTo: endUnix, sortBy: "tsUnix", order: "asc" })
  ]);

  const weatherGrouped = new Map();
  for (const row of weatherRows) {
    const key = `${row.city}|${row.state}`;
    const current = weatherGrouped.get(key) || {
      _id: { city: row.city, state: row.state },
      count: 0,
      severitySum: 0,
      maxRainMm: 0,
      maxHeatRisk: 0,
      maxStormRisk: 0
    };
    current.count += 1;
    current.severitySum += Number(row.weatherSeverityScore || 0);
    current.maxRainMm = Math.max(current.maxRainMm, Number(row.rainMm || 0));
    current.maxHeatRisk = Math.max(current.maxHeatRisk, Number(row.heatRisk || 0));
    current.maxStormRisk = Math.max(current.maxStormRisk, Number(row.stormRisk || 0));
    weatherGrouped.set(key, current);
  }

  const aqiGrouped = new Map();
  for (const row of aqiRows) {
    const key = `${row.city}|${row.state}`;
    const current = aqiGrouped.get(key) || {
      _id: { city: row.city, state: row.state },
      count: 0,
      severitySum: 0,
      maxAqi: 0
    };
    current.count += 1;
    current.severitySum += Number(row.severityScore || 0);
    current.maxAqi = Math.max(current.maxAqi, Number(row.aqi || 0));
    aqiGrouped.set(key, current);
  }

  const aggregatedWeatherRows = Array.from(weatherGrouped.values()).map((item) => ({
    _id: item._id,
    avgWeatherSeverityScore: item.count ? item.severitySum / item.count : 0,
    maxRainMm: item.maxRainMm,
    maxHeatRisk: item.maxHeatRisk,
    maxStormRisk: item.maxStormRisk
  }));

  const aggregatedAqiRows = Array.from(aqiGrouped.values()).map((item) => ({
    _id: item._id,
    avgAqiSeverityScore: item.count ? item.severitySum / item.count : 0,
    maxAqi: item.maxAqi
  }));

  const aqiMap = new Map(aggregatedAqiRows.map((row) => [`${row._id.city}|${row._id.state}`, row]));
  const incidents = [];

  for (const weather of aggregatedWeatherRows) {
    const key = `${weather._id.city}|${weather._id.state}`;
    const aqi = aqiMap.get(key);
    const disruptionScore = Number((
      (Number(weather.avgWeatherSeverityScore || 0) * 0.6) +
      (Number(aqi?.avgAqiSeverityScore || 0) * 0.4)
    ).toFixed(3));

    const maxAqi = Number(aqi?.maxAqi || 0);
    const maxRainMm = Number(weather.maxRainMm || 0);
    const maxHeatRisk = Number(weather.maxHeatRisk || 0);
    const verified = disruptionScore >= 0.58 || maxAqi >= 280 || maxRainMm >= 18 || maxHeatRisk >= 0.7;

    if (!verified) continue;

    incidents.push({
      date: start,
      city: weather._id.city,
      state: weather._id.state,
      disruptionScore,
      triggerType: classifyTrigger({
        weatherSeverityScore: Number(weather.avgWeatherSeverityScore || 0),
        maxRainMm,
        maxHeatRisk,
        maxAqi
      }),
      verified,
      sourceEvidence: {
        avgWeatherSeverityScore: Number((weather.avgWeatherSeverityScore || 0).toFixed(3)),
        avgAqiSeverityScore: Number((aqi?.avgAqiSeverityScore || 0).toFixed(3)),
        maxRainMm,
        maxHeatRisk,
        maxStormRisk: Number((weather.maxStormRisk || 0).toFixed(3)),
        maxAqi
      }
    });
  }

  const persisted = [];
  for (const incident of incidents) {
    const row = await IncidentWindow.findOneAndUpdate(
      { date: incident.date, city: incident.city },
      { $set: incident },
      { upsert: true, new: true }
    );
    persisted.push(row);
  }

  return persisted;
}

module.exports = { detectIncidentsForDate, previousDay };
