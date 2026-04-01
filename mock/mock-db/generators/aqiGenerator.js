const AqiSnapshot = require("../models/aqiSnapshot");
const { cities } = require("../config/cities");
const { monthsAgoStart, dayjs } = require("../utils/time");
const { createRng } = require("../utils/rng");

function getAqiCategory(aqi) {
  if (aqi <= 50) return "good";
  if (aqi <= 100) return "satisfactory";
  if (aqi <= 200) return "moderate";
  if (aqi <= 300) return "poor";
  if (aqi <= 400) return "very_poor";
  return "severe";
}

function regionalAqiBaseline(city, month) {
  let base = city.tier === "tier1" ? 110 : city.tier === "tier2" ? 92 : 80;
  if (city.region === "north") base += 45;
  if (city.region === "east") base += 18;
  if (city.coastal) base -= 10;
  if ([11, 12, 1].includes(month)) base += 60 * city.northIntensity;
  if ([6, 7, 8, 9].includes(month)) base -= 18;
  return base;
}

async function seedAqi({ seed, envMonths, batchSize, clearExisting, cityFilter, dryRun }) {
  const start = monthsAgoStart(envMonths);
  const end = dayjs.utc().startOf("hour");
  const selectedCities = cityFilter ? cities.filter((city) => city.city === cityFilter) : cities;
  let batch = [];
  let inserted = 0;

  if (clearExisting && !dryRun) await AqiSnapshot.deleteMany(cityFilter ? { city: cityFilter } : {});

  for (const city of selectedCities) {
    const rng = createRng(`${seed}:aqi:${city.city}`);
    let spikeHours = 0;
    let cursor = start.clone().startOf("day");

    while (cursor.isBefore(end) || cursor.isSame(end)) {
      const month = cursor.month() + 1;
      if (rng.bool(0.01 + city.northIntensity * 0.03)) spikeHours = rng.int(6, 30);
      const base = regionalAqiBaseline(city, month);
      const spike = spikeHours > 0 ? rng.int(70, 260) : 0;
      const aqi = Math.max(18, Math.round(base + spike + rng.normal(0, 22)));
      const doc = {
        city: city.city,
        state: city.state,
        tsUnix: cursor.valueOf(),
        aqi,
        category: getAqiCategory(aqi),
        pm25: Number((aqi * rng.float(0.34, 0.5)).toFixed(1)),
        pm10: Number((aqi * rng.float(0.52, 0.8)).toFixed(1)),
        no2: Number((aqi * rng.float(0.06, 0.14)).toFixed(1)),
        so2: Number((aqi * rng.float(0.03, 0.08)).toFixed(1)),
        o3: Number((aqi * rng.float(0.04, 0.12)).toFixed(1)),
        co: Number((aqi * rng.float(0.01, 0.03)).toFixed(2)),
        severityScore: Number(Math.min(1, aqi / 500).toFixed(3))
      };
      batch.push({ updateOne: { filter: { city: doc.city, tsUnix: doc.tsUnix }, update: { $set: doc }, upsert: true } });
      if (batch.length >= batchSize) {
        if (!dryRun) await AqiSnapshot.bulkWrite(batch, { ordered: false });
        inserted += batch.length;
        batch = [];
      }
      if (spikeHours > 0) spikeHours -= 6;
      cursor = cursor.add(6, "hour");
    }
    console.log(`[aqi] processed ${city.city}`);
  }

  if (batch.length) {
    if (!dryRun) await AqiSnapshot.bulkWrite(batch, { ordered: false });
    inserted += batch.length;
  }
  return { inserted, cities: selectedCities.length };
}

module.exports = { seedAqi, getAqiCategory };
