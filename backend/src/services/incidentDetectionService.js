const ExternalWeatherSnapshot = require("../models/ExternalWeatherSnapshot");
const ExternalAqiSnapshot = require("../models/ExternalAqiSnapshot");
const IncidentWindow = require("../models/IncidentWindow");

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
    ExternalWeatherSnapshot.aggregate([
      { $match: { tsUnix: { $gte: startUnix, $lte: endUnix } } },
      {
        $group: {
          _id: { city: "$city", state: "$state" },
          avgWeatherSeverityScore: { $avg: "$weatherSeverityScore" },
          maxRainMm: { $max: "$rainMm" },
          maxHeatRisk: { $max: "$heatRisk" },
          maxStormRisk: { $max: "$stormRisk" }
        }
      }
    ]),
    ExternalAqiSnapshot.aggregate([
      { $match: { tsUnix: { $gte: startUnix, $lte: endUnix } } },
      {
        $group: {
          _id: { city: "$city", state: "$state" },
          avgAqiSeverityScore: { $avg: "$severityScore" },
          maxAqi: { $max: "$aqi" }
        }
      }
    ])
  ]);

  const aqiMap = new Map(aqiRows.map((row) => [`${row._id.city}|${row._id.state}`, row]));
  const incidents = [];

  for (const weather of weatherRows) {
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
