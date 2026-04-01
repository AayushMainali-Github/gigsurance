const WeatherSnapshot = require("../models/weatherSnapshot");
const { cities } = require("../config/cities");
const { monthsAgoExact, nowUtc } = require("../utils/time");
const { createRng } = require("../utils/rng");

function monthTemperatureBaseline(city, month) {
  const northWinter = [12, 1, 2].includes(month) ? -8 * city.northIntensity : 0;
  const preSummer = [4, 5, 6].includes(month) ? 8 * city.heatIntensity : 0;
  const monsoonCool = [6, 7, 8, 9].includes(month) ? -2 : 0;
  const coastalSoftener = city.coastal ? -1.5 : 0;
  return 26 + northWinter + preSummer + monsoonCool + coastalSoftener;
}

function monsoonProbability(city, month) {
  const heavy = city.monsoon === "heavy" ? 0.22 : city.monsoon === "moderate" ? 0.14 : 0.07;
  if ([6, 7, 8, 9].includes(month)) return heavy;
  if ([10, 11].includes(month) && city.state === "Tamil Nadu") return 0.2;
  return heavy * 0.18;
}

function buildWeatherCondition(snapshot) {
  if (snapshot.stormRisk > 0.84) return ["Thunderstorm", "Severe thunderstorm"];
  if (snapshot.rainMm > 12) return ["Rain", "Heavy rain"];
  if (snapshot.rainMm > 2) return ["Rain", "Moderate rain"];
  if (snapshot.cloudPct > 85) return ["Clouds", "Overcast clouds"];
  if (snapshot.heatRisk > 0.85) return ["Haze", "Dry heat haze"];
  if (snapshot.visibilityKm < 3.5) return ["Mist", "Low visibility"];
  return ["Clear", "Clear sky"];
}

async function seedWeather({ seed, envMonths, batchSize, clearExisting, cityFilter, dryRun }) {
  const end = nowUtc();
  const start = monthsAgoExact(envMonths, end);
  const selectedCities = cityFilter ? cities.filter((city) => city.city === cityFilter) : cities;
  let batch = [];
  let inserted = 0;

  if (clearExisting && !dryRun) await WeatherSnapshot.deleteMany(cityFilter ? { city: cityFilter } : {});

  for (const city of selectedCities) {
    const rng = createRng(`${seed}:weather:${city.city}`);
    let rainCluster = 0;
    let stormCluster = 0;
    let cursor = start.clone();

    while (cursor.isBefore(end) || cursor.isSame(end)) {
      const month = cursor.month() + 1;
      const hour = cursor.hour();
      const diurnal = Math.sin(((hour - 5) / 24) * Math.PI * 2) * 5.4;
      const seasonal = monthTemperatureBaseline(city, month);

      if (rng.bool(monsoonProbability(city, month))) rainCluster = rng.int(2, 18);
      if (rng.bool(0.004 + monsoonProbability(city, month) * 0.08)) stormCluster = rng.int(1, 8);

      const rainMm = rainCluster > 0 ? Math.max(0, rng.normal(city.monsoon === "heavy" ? 6.5 : 3.5, 2.2)) : 0;
      const stormRisk = stormCluster > 0 ? Math.min(1, 0.55 + rng.float(0.1, 0.42)) : rng.float(0, 0.35);
      const tempC = seasonal + diurnal + rng.normal(0, 2.1) - Math.min(rainMm * 0.2, 3.5);
      const humidity = Math.max(18, Math.min(100, (city.coastal ? 68 : 50) + rainMm * 2 + rng.normal(0, 10)));
      const windKph = Math.max(3, Math.min(58, rng.normal(12 + stormRisk * 18, 5)));
      const cloudPct = Math.max(0, Math.min(100, rainCluster > 0 ? rng.int(72, 100) : rng.int(5, 78)));
      const visibilityKm = Math.max(0.8, Math.min(14, 10 - rainMm * 0.25 - stormRisk * 4 + rng.normal(0, 1)));
      const pressureMb = Math.max(988, Math.min(1030, 1008 - stormRisk * 10 + rng.normal(0, 4)));
      const feelsLikeC = tempC + Math.max(0, (humidity - 55) * 0.05) + stormRisk * 0.7;
      const heatRisk = Math.max(0, Math.min(1, (feelsLikeC - 30) / 14));
      const weatherSeverityScore = Math.max(0, Math.min(1, rainMm / 20 + stormRisk * 0.55 + heatRisk * 0.35));
      const [conditionMain, conditionDetail] = buildWeatherCondition({ rainMm, stormRisk, cloudPct, heatRisk, visibilityKm });
      const doc = {
        city: city.city,
        state: city.state,
        tsUnix: cursor.valueOf(),
        tempC: Number(tempC.toFixed(1)),
        feelsLikeC: Number(feelsLikeC.toFixed(1)),
        humidity: Number(humidity.toFixed(1)),
        windKph: Number(windKph.toFixed(1)),
        rainMm: Number(rainMm.toFixed(1)),
        cloudPct,
        conditionMain,
        conditionDetail,
        visibilityKm: Number(visibilityKm.toFixed(1)),
        pressureMb: Number(pressureMb.toFixed(1)),
        weatherSeverityScore: Number(weatherSeverityScore.toFixed(3)),
        heatRisk: Number(heatRisk.toFixed(3)),
        stormRisk: Number(stormRisk.toFixed(3))
      };

      batch.push({ updateOne: { filter: { city: doc.city, tsUnix: doc.tsUnix }, update: { $set: doc }, upsert: true } });
      if (batch.length >= batchSize) {
        if (!dryRun) await WeatherSnapshot.bulkWrite(batch, { ordered: false });
        inserted += batch.length;
        batch = [];
      }
      if (rainCluster > 0) rainCluster -= 1;
      if (stormCluster > 0) stormCluster -= 1;
      cursor = cursor.add(30, "minute");
    }
    console.log(`[weather] processed ${city.city}`);
  }

  if (batch.length) {
    if (!dryRun) await WeatherSnapshot.bulkWrite(batch, { ordered: false });
    inserted += batch.length;
  }
  return { inserted, cities: selectedCities.length };
}

module.exports = { seedWeather };
