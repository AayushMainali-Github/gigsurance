const { DeliveryDriver, WeatherSnapshot, AqiSnapshot } = require("./models");
const {
  cities, PLATFORM_MIX_BY_TIER, isFood, isLogistics, isQuickCommerce,
  createRng, dateKey, nowUtc, floorToStep, randomPointWithinRadius, makePoint, categoryFromAqi, calculateObjectSize, dayjs
} = require("./shared");

const MAX_DOC_BYTES = 12 * 1024 * 1024;
const jobState = { weather: false, aqi: false, delivery: false };

function cityByName(name) { return cities.find((c) => c.city === name); }
function weatherDoc(city, ts, seed) {
  const rng = createRng(`${seed}:weather:${city.city}:${ts}`);
  const month = dayjs.utc(ts).month() + 1;
  const hour = dayjs.utc(ts).hour();
  const rainProb = [6, 7, 8, 9].includes(month) ? (city.monsoon === "heavy" ? 0.24 : city.monsoon === "moderate" ? 0.15 : 0.08) : 0.03;
  const rainMm = rng.bool(rainProb) ? Math.max(0, rng.normal(city.monsoon === "heavy" ? 6.5 : 3.2, 2.4)) : 0;
  const stormRisk = rainMm > 6 ? Math.min(1, 0.55 + rng.float(0, 0.35)) : rng.float(0, 0.3);
  const base = 26 + ([12,1,2].includes(month) ? -8 * city.northIntensity : 0) + ([4,5,6].includes(month) ? 8 * city.heatIntensity : 0) + (city.coastal ? -1.5 : 0);
  const tempC = base + Math.sin(((hour - 5) / 24) * Math.PI * 2) * 5 + rng.normal(0, 2) - Math.min(rainMm * 0.2, 3);
  const humidity = Math.max(18, Math.min(100, (city.coastal ? 68 : 50) + rainMm * 2 + rng.normal(0, 10)));
  const feelsLikeC = tempC + Math.max(0, (humidity - 55) * 0.05) + stormRisk * 0.7;
  const heatRisk = Math.max(0, Math.min(1, (feelsLikeC - 30) / 14));
  const weatherSeverityScore = Math.max(0, Math.min(1, rainMm / 20 + stormRisk * 0.55 + heatRisk * 0.35));
  return {
    city: city.city, state: city.state, tsUnix: ts,
    tempC: Number(tempC.toFixed(1)), feelsLikeC: Number(feelsLikeC.toFixed(1)), humidity: Number(humidity.toFixed(1)),
    windKph: Number(Math.max(3, Math.min(58, rng.normal(12 + stormRisk * 18, 5))).toFixed(1)),
    rainMm: Number(rainMm.toFixed(1)), cloudPct: rainMm > 0 ? rng.int(72, 100) : rng.int(5, 78),
    conditionMain: stormRisk > 0.84 ? "Thunderstorm" : rainMm > 2 ? "Rain" : heatRisk > 0.85 ? "Haze" : "Clear",
    conditionDetail: stormRisk > 0.84 ? "Severe thunderstorm" : rainMm > 12 ? "Heavy rain" : rainMm > 2 ? "Moderate rain" : "Clear sky",
    visibilityKm: Number(Math.max(0.8, Math.min(14, 10 - rainMm * 0.25 - stormRisk * 4 + rng.normal(0, 1))).toFixed(1)),
    pressureMb: Number(Math.max(988, Math.min(1030, 1008 - stormRisk * 10 + rng.normal(0, 4))).toFixed(1)),
    weatherSeverityScore: Number(weatherSeverityScore.toFixed(3)), heatRisk: Number(heatRisk.toFixed(3)), stormRisk: Number(stormRisk.toFixed(3))
  };
}
function aqiDoc(city, ts, seed) {
  const rng = createRng(`${seed}:aqi:${city.city}:${ts}`);
  const month = dayjs.utc(ts).month() + 1;
  let base = city.tier === "tier1" ? 110 : city.tier === "tier2" ? 92 : 80;
  if (city.region === "north") base += 45;
  if (city.region === "east") base += 18;
  if (city.coastal) base -= 10;
  if ([11, 12, 1].includes(month)) base += 60 * city.northIntensity;
  if ([6, 7, 8, 9].includes(month)) base -= 18;
  const spike = rng.bool(0.012 + city.northIntensity * 0.02) ? rng.int(70, 250) : 0;
  const aqi = Math.max(18, Math.round(base + spike + rng.normal(0, 22)));
  return {
    city: city.city, state: city.state, tsUnix: ts, aqi, category: categoryFromAqi(aqi),
    pm25: Number((aqi * rng.float(0.34, 0.5)).toFixed(1)), pm10: Number((aqi * rng.float(0.52, 0.8)).toFixed(1)),
    no2: Number((aqi * rng.float(0.06, 0.14)).toFixed(1)), so2: Number((aqi * rng.float(0.03, 0.08)).toFixed(1)),
    o3: Number((aqi * rng.float(0.04, 0.12)).toFixed(1)), co: Number((aqi * rng.float(0.01, 0.03)).toFixed(2)),
    severityScore: Number(Math.min(1, aqi / 500).toFixed(3))
  };
}

async function runWeatherJob() {
  if (jobState.weather) return;
  jobState.weather = true;
  try {
    const now = floorToStep(nowUtc(), 30);
    for (const city of cities) {
      const latest = await WeatherSnapshot.findOne({ city: city.city }).sort({ tsUnix: -1 }).lean();
      let cursor = latest ? dayjs.utc(latest.tsUnix).add(30, "minute") : now.clone().subtract(2, "hour");
      const ops = [];
      while (cursor.isBefore(now) || cursor.isSame(now)) {
        const doc = weatherDoc(city, cursor.valueOf(), process.env.SEED || 42);
        ops.push({ updateOne: { filter: { city: doc.city, tsUnix: doc.tsUnix }, update: { $set: doc }, upsert: true } });
        cursor = cursor.add(30, "minute");
      }
      if (ops.length) await WeatherSnapshot.bulkWrite(ops, { ordered: false });
    }
    console.log("[mock-corn] weather tick complete");
  } finally { jobState.weather = false; }
}

async function runAqiJob() {
  if (jobState.aqi) return;
  jobState.aqi = true;
  try {
    const now = floorToStep(nowUtc(), 360);
    for (const city of cities) {
      const latest = await AqiSnapshot.findOne({ city: city.city }).sort({ tsUnix: -1 }).lean();
      let cursor = latest ? dayjs.utc(latest.tsUnix).add(6, "hour") : now.clone().subtract(24, "hour");
      const ops = [];
      while (cursor.isBefore(now) || cursor.isSame(now)) {
        const doc = aqiDoc(city, cursor.valueOf(), process.env.SEED || 42);
        ops.push({ updateOne: { filter: { city: doc.city, tsUnix: doc.tsUnix }, update: { $set: doc }, upsert: true } });
        cursor = cursor.add(6, "hour");
      }
      if (ops.length) await AqiSnapshot.bulkWrite(ops, { ordered: false });
    }
    console.log("[mock-corn] aqi tick complete");
  } finally { jobState.aqi = false; }
}

function buildDriverProfile(city, platformName, rng) {
  const archetype = rng.weightedPick({ full_time: 45, part_time: 30, peak_only: 15, weekend_only: 10 });
  const hours = archetype === "full_time" ? [8, 14] : archetype === "part_time" ? [3, 7] : archetype === "peak_only" ? [3, 6] : [2, 7];
  return {
    archetype,
    experienceBucket: "new",
    hoursPreferenceMin: hours[0],
    hoursPreferenceMax: hours[1],
    weatherSensitivity: rng.weightedPick({ low: 28, medium: 47, high: 25 }),
    preferredShift: rng.weightedPick({ breakfast: 10, lunch: 22, evening: 30, night: 12, mixed: 26 }),
    resilienceScore: Number(Math.max(0.05, Math.min(1, rng.normal(0.62, 0.18))).toFixed(3)),
    attendanceDiscipline: Number(Math.max(0.08, Math.min(1, rng.normal(0.71, 0.16))).toFixed(3)),
    preferredHubIds: [],
    platformLoyaltyScore: Number(Math.max(0.1, Math.min(1, rng.normal(isQuickCommerce(platformName) ? 0.76 : 0.62, 0.14))).toFixed(3))
  };
}
async function addNewDrivers(count) {
  const rng = createRng(`${process.env.SEED || 42}:newDrivers:${Date.now()}`);
  const totalWeight = cities.reduce((s, c) => s + c.weight, 0);
  for (let i = 0; i < count; i += 1) {
    let roll = rng.float(0, totalWeight);
    let city = cities[0];
    for (const c of cities) { roll -= c.weight; if (roll <= 0) { city = c; break; } }
    const platformName = rng.weightedPick(PLATFORM_MIX_BY_TIER[city.tier]);
    const last = await DeliveryDriver.findOne({ platformName, city: city.city }).sort({ platformDriverId: -1 }).select("platformDriverId").lean();
    const nextNum = last ? Number((last.platformDriverId.match(/(\d+)$/) || [0, 0])[1]) + 1 : 1;
    const doc = {
      platformName,
      platformDriverId: `${platformName.toUpperCase()}-${city.city.slice(0,3).toUpperCase()}-${String(nextNum).padStart(8, "0")}`,
      city: city.city,
      state: city.state,
      cityTier: city.tier,
      joinedAt: nowUtc().subtract(rng.int(0, 10), "day").toDate(),
      driverProfile: buildDriverProfile(city, platformName, rng),
      history: [],
      historyCompacted: false,
      bsonSizeBytes: 512
    };
    await DeliveryDriver.updateOne({ platformName: doc.platformName, platformDriverId: doc.platformDriverId }, { $setOnInsert: doc }, { upsert: true });
  }
}

function latestSignals(weather, aqi) {
  const weatherSeverityHint = weather?.weatherSeverityScore || 0;
  const aqiBandHint = !aqi ? "clean" : aqi.aqi <= 100 ? "clean" : aqi.aqi <= 200 ? "elevated" : aqi.aqi <= 300 ? "poor" : aqi.aqi <= 400 ? "very_poor" : "severe";
  const disruption = weatherSeverityHint * 0.58 + (aqi?.severityScore || 0) * 0.32;
  return { weatherSeverityHint, aqiBandHint, disruption };
}

async function appendGigsToDriver(driver) {
  const city = cityByName(driver.city);
  if (!city) return;
  const now = nowUtc();
  const weather = await WeatherSnapshot.findOne({ city: driver.city }).sort({ tsUnix: -1 }).lean();
  const aqi = await AqiSnapshot.findOne({ city: driver.city }).sort({ tsUnix: -1 }).lean();
  const { weatherSeverityHint, aqiBandHint, disruption } = latestSignals(weather, aqi);
  const rng = createRng(`${process.env.SEED || 42}:live:${driver.platformName}:${driver.platformDriverId}:${dateKey(now.valueOf())}`);
  const history = [...(driver.history || [])];
  let nextTime = history.length ? dayjs.utc(history[history.length - 1].reachedTimeUnix).add(rng.int(4, 20), "minute") : now.startOf("day").add(rng.int(7, 11), "hour");
  if (nextTime.isAfter(now)) return;
  const extraGigLimit = rng.int(2, 8);
  let gigsAdded = 0;
  while (nextTime.isBefore(now) && gigsAdded < extraGigLimit) {
    const cycle = isQuickCommerce(driver.platformName) ? rng.int(15, 30) : isFood(driver.platformName) ? rng.int(25, 70) : rng.int(30, 90);
    const reach = isQuickCommerce(driver.platformName) ? rng.int(5, 12) : isFood(driver.platformName) ? rng.int(20, 60) : rng.int(25, 80);
    const startTime = nextTime.valueOf();
    const endTime = nextTime.add(Math.round(cycle * (1 + disruption * 0.25)), "minute").valueOf();
    if (endTime > now.valueOf()) break;
    const pickup = randomPointWithinRadius(city, rng, isLogistics(driver.platformName) ? 0.88 : 0.76);
    const drop = randomPointWithinRadius(city, rng, 0.82);
    const payBase = isQuickCommerce(driver.platformName) ? 12 : isFood(driver.platformName) ? 18 : 22;
    history.push({
      gigId: `${driver.platformName.slice(0,3).toUpperCase()}-${driver.city.slice(0,3).toUpperCase()}-LIVE-${String(history.length + 1).padStart(6, "0")}`,
      amountPaid: Math.max(10, Math.min(50, Number((payBase + cycle * 0.35 + disruption * rng.float(1, 5)).toFixed(2)))),
      startTimeUnix: startTime,
      reachedTimeUnix: startTime + reach * 60000,
      pickup: makePoint(pickup),
      drop: makePoint(drop),
      durationMinutes: Math.round((endTime - startTime) / 60000),
      dateKey: dateKey(startTime),
      weatherSeverityHint,
      aqiBandHint
    });
    nextTime = dayjs.utc(endTime).add(rng.int(3, 18), "minute");
    gigsAdded += 1;
  }
  history.sort((a, b) => a.startTimeUnix - b.startTimeUnix);
  const bsonSizeBytes = calculateObjectSize({ ...driver, history, bsonSizeBytes: 0 });
  if (bsonSizeBytes >= MAX_DOC_BYTES) return;
  await DeliveryDriver.updateOne({ _id: driver._id }, { $set: { history, bsonSizeBytes } });
}

async function runDeliveryJob() {
  if (jobState.delivery) return;
  jobState.delivery = true;
  try {
    await addNewDrivers(Number(process.env.NEW_DRIVERS_PER_CYCLE || 25));
    const sampleSize = Number(process.env.DELIVERY_DRIVER_SAMPLE || 300);
    const drivers = await DeliveryDriver.aggregate([{ $sample: { size: sampleSize } }]);
    for (const driver of drivers) {
      await appendGigsToDriver(driver);
    }
    console.log("[mock-corn] delivery tick complete");
  } finally { jobState.delivery = false; }
}

async function runAllJobs() {
  await runWeatherJob();
  await runAqiJob();
  await runDeliveryJob();
}
function startSchedulers() {
  setInterval(() => void runWeatherJob(), Number(process.env.WEATHER_INTERVAL_MS || 60000));
  setInterval(() => void runAqiJob(), Number(process.env.AQI_INTERVAL_MS || 90000));
  setInterval(() => void runDeliveryJob(), Number(process.env.DELIVERY_INTERVAL_MS || 120000));
  console.log("[mock-corn] schedulers started");
}

module.exports = { runAllJobs, startSchedulers };
