const { DeliveryDriver, WeatherSnapshot, AqiSnapshot, CornState } = require("./models");
const {
  cities, PLATFORM_MIX_BY_TIER, isFood, isLogistics, isQuickCommerce,
  createRng, dateKey, nowUtc, floorToStep, randomPointWithinRadius, makePoint, categoryFromAqi, calculateObjectSize, dayjs, buildCityAssets
} = require("./shared");

const MAX_DOC_BYTES = 12 * 1024 * 1024;
const WEATHER_INTERVAL_MS = 30 * 60 * 1000;
const AQI_INTERVAL_MS = 6 * 60 * 60 * 1000;
const DELIVERY_INTERVAL_MS = 60 * 60 * 1000;
const jobState = { weather: false, aqi: false, delivery: false };
const cityAssets = new Map(cities.map((city) => [city.city, buildCityAssets(city, createRng(`${process.env.SEED || 42}:assets:${city.city}`))]));

function cityByName(name) {
  return cities.find((c) => c.city === name);
}

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

function regionalAqiBaseline(city, month) {
  let base = city.tier === "tier1" ? 110 : city.tier === "tier2" ? 92 : 80;
  if (city.region === "north") base += 45;
  if (city.region === "east") base += 18;
  if (city.coastal) base -= 10;
  if ([11, 12, 1].includes(month)) base += 60 * city.northIntensity;
  if ([6, 7, 8, 9].includes(month)) base -= 18;
  return base;
}

function weatherDoc(city, ts, seed) {
  const rng = createRng(`${seed}:weather:${city.city}:${ts}`);
  const month = dayjs.utc(ts).month() + 1;
  const hour = dayjs.utc(ts).hour();
  const diurnal = Math.sin(((hour - 5) / 24) * Math.PI * 2) * 5.4;
  const seasonal = monthTemperatureBaseline(city, month);
  const rainMm = rng.bool(monsoonProbability(city, month)) ? Math.max(0, rng.normal(city.monsoon === "heavy" ? 6.5 : 3.5, 2.2)) : 0;
  const stormRisk = rng.bool(0.004 + monsoonProbability(city, month) * 0.08) ? Math.min(1, 0.55 + rng.float(0.1, 0.42)) : rng.float(0, 0.35);
  const tempC = seasonal + diurnal + rng.normal(0, 2.1) - Math.min(rainMm * 0.2, 3.5);
  const humidity = Math.max(18, Math.min(100, (city.coastal ? 68 : 50) + rainMm * 2 + rng.normal(0, 10)));
  const windKph = Math.max(3, Math.min(58, rng.normal(12 + stormRisk * 18, 5)));
  const cloudPct = Math.max(0, Math.min(100, rainMm > 0 ? rng.int(72, 100) : rng.int(5, 78)));
  const visibilityKm = Math.max(0.8, Math.min(14, 10 - rainMm * 0.25 - stormRisk * 4 + rng.normal(0, 1)));
  const pressureMb = Math.max(988, Math.min(1030, 1008 - stormRisk * 10 + rng.normal(0, 4)));
  const feelsLikeC = tempC + Math.max(0, (humidity - 55) * 0.05) + stormRisk * 0.7;
  const heatRisk = Math.max(0, Math.min(1, (feelsLikeC - 30) / 14));
  const weatherSeverityScore = Math.max(0, Math.min(1, rainMm / 20 + stormRisk * 0.55 + heatRisk * 0.35));
  const [conditionMain, conditionDetail] = buildWeatherCondition({ rainMm, stormRisk, cloudPct, heatRisk, visibilityKm });
  return {
    city: city.city,
    state: city.state,
    tsUnix: ts,
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
}

function aqiDoc(city, ts, seed) {
  const rng = createRng(`${seed}:aqi:${city.city}:${ts}`);
  const month = dayjs.utc(ts).month() + 1;
  const base = regionalAqiBaseline(city, month);
  const spike = rng.bool(0.01 + city.northIntensity * 0.03) ? rng.int(70, 260) : 0;
  const aqi = Math.max(18, Math.round(base + spike + rng.normal(0, 22)));
  return {
    city: city.city,
    state: city.state,
    tsUnix: ts,
    aqi,
    category: categoryFromAqi(aqi),
    pm25: Number((aqi * rng.float(0.34, 0.5)).toFixed(1)),
    pm10: Number((aqi * rng.float(0.52, 0.8)).toFixed(1)),
    no2: Number((aqi * rng.float(0.06, 0.14)).toFixed(1)),
    so2: Number((aqi * rng.float(0.03, 0.08)).toFixed(1)),
    o3: Number((aqi * rng.float(0.04, 0.12)).toFixed(1)),
    co: Number((aqi * rng.float(0.01, 0.03)).toFixed(2)),
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
  } finally {
    jobState.weather = false;
  }
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
  } finally {
    jobState.aqi = false;
  }
}

function buildDriverProfile(city, platformName, rng) {
  const archetype = rng.weightedPick({ full_time: 45, part_time: 30, peak_only: 15, weekend_only: 10 });
  const weatherSensitivity = rng.weightedPick({ low: 28, medium: 47, high: 25 });
  const preferredShift = rng.weightedPick({ breakfast: 10, lunch: 22, evening: 30, night: 12, mixed: 26 });
  const experienceBucket = rng.weightedPick({ new: 22, regular: 51, veteran: 27 });
  const hoursByArchetype = { full_time: [8, 14], part_time: [3, 7], peak_only: [3, 6], weekend_only: [2, 7] };
  const [minHours, maxHours] = hoursByArchetype[archetype];
  const assets = cityAssets.get(city.city);
  const preferredHubIds = isQuickCommerce(platformName)
    ? Array.from(new Set(Array.from({ length: rng.int(1, Math.min(4, assets.hubs.length)) }, () => rng.pick(assets.hubs).id)))
    : [];
  return {
    archetype,
    experienceBucket,
    hoursPreferenceMin: minHours,
    hoursPreferenceMax: maxHours,
    weatherSensitivity,
    preferredShift,
    resilienceScore: Number(Math.max(0.05, Math.min(1, rng.normal(0.62, 0.18))).toFixed(3)),
    attendanceDiscipline: Number(Math.max(0.08, Math.min(1, rng.normal(0.71, 0.16))).toFixed(3)),
    preferredHubIds,
    platformLoyaltyScore: Number(Math.max(0.1, Math.min(1, rng.normal(isQuickCommerce(platformName) ? 0.76 : 0.62, 0.14))).toFixed(3))
  };
}

function choosePlatform(city, rng) {
  return rng.weightedPick(PLATFORM_MIX_BY_TIER[city.tier]);
}

async function nextPlatformDriverId(platformName, cityCode) {
  const prefix = `${platformName.toUpperCase()}-${cityCode}-`;
  const last = await DeliveryDriver.findOne({ platformName, platformDriverId: new RegExp(`^${prefix}`) }).sort({ platformDriverId: -1 }).select("platformDriverId").lean();
  const nextNum = last ? Number((last.platformDriverId.match(/(\d+)$/) || [0, 0])[1]) + 1 : 1;
  return `${prefix}${String(nextNum).padStart(8, "0")}`;
}

async function addDailyDriversForCity(city, dayKey) {
  const stateKey = `newDrivers:${city.city}:${dayKey}`;
  if (await CornState.findOne({ key: stateKey }).lean()) return;
  const rng = createRng(`${process.env.SEED || 42}:newDrivers:${city.city}:${dayKey}`);
  const targetCount = city.tier === "tier1" ? rng.int(4, 5) : city.tier === "tier2" ? rng.int(2, 3) : 1;
  for (let i = 0; i < targetCount; i += 1) {
    const platformName = choosePlatform(city, rng);
    const platformDriverId = await nextPlatformDriverId(platformName, city.city.slice(0, 3).toUpperCase());
    const joinedAt = dayjs.utc(dayKey).add(rng.int(7, 22), "hour").add(rng.int(0, 59), "minute").toDate();
    const doc = {
      platformName,
      platformDriverId,
      city: city.city,
      state: city.state,
      cityTier: city.tier,
      joinedAt,
      driverProfile: buildDriverProfile(city, platformName, rng),
      history: [],
      historyCompacted: false,
      bsonSizeBytes: 512
    };
    await DeliveryDriver.updateOne({ platformName: doc.platformName, platformDriverId: doc.platformDriverId }, { $setOnInsert: doc }, { upsert: true });
  }
  await CornState.updateOne({ key: stateKey }, { $set: { value: { city: city.city, dayKey, targetCount }, updatedAt: new Date() } }, { upsert: true });
}

async function ensureDailyNewDrivers() {
  const todayKey = dateKey(nowUtc().valueOf());
  for (const city of cities) {
    await addDailyDriversForCity(city, todayKey);
  }
}

function latestSignals(weather, aqi) {
  const weatherSeverityHint = weather?.weatherSeverityScore || 0;
  const aqiBandHint = !aqi ? "clean" : aqi.aqi <= 100 ? "clean" : aqi.aqi <= 200 ? "elevated" : aqi.aqi <= 300 ? "poor" : aqi.aqi <= 400 ? "very_poor" : "severe";
  const weatherImpactScore = weather?.weatherSeverityScore || 0;
  const aqiImpactScore = aqi?.severityScore || 0;
  const combinedDisruptionScore = Math.min(1, weatherImpactScore * 0.58 + aqiImpactScore * 0.32);
  return { weatherSeverityHint, aqiBandHint, weatherImpactScore, aqiImpactScore, combinedDisruptionScore, strikeFlag: false, shutdownFlag: false };
}

function dayWorkProbability(profile, platformName, disruption, weekday) {
  const weekend = weekday === 0 || weekday === 6;
  let base = profile.archetype === "full_time" ? 0.82 : profile.archetype === "part_time" ? 0.56 : profile.archetype === "peak_only" ? 0.48 : weekend ? 0.72 : 0.18;
  base += (profile.attendanceDiscipline - 0.5) * 0.25;
  if (weekend && isFood(platformName)) base += 0.08;
  if (weekend && profile.archetype === "weekend_only") base += 0.16;
  if (profile.weatherSensitivity === "high") base -= disruption.weatherImpactScore * 0.35;
  if (profile.weatherSensitivity === "medium") base -= disruption.weatherImpactScore * 0.22;
  if (profile.weatherSensitivity === "low") base -= disruption.weatherImpactScore * 0.12;
  base -= disruption.aqiImpactScore * (profile.weatherSensitivity === "high" ? 0.18 : 0.08);
  base -= disruption.combinedDisruptionScore * 0.18;
  return Math.max(0.01, Math.min(0.96, base));
}

function dayHours(profile, platformName, disruption, rng, weekday) {
  const weekend = weekday === 0 || weekday === 6;
  let hours = rng.float(profile.hoursPreferenceMin, profile.hoursPreferenceMax);
  if (isFood(platformName) && weekend) hours += rng.float(0.3, 1.2);
  if (profile.archetype === "peak_only") hours *= rng.float(0.85, 1.1);
  hours *= 1 - disruption.weatherImpactScore * 0.18 - disruption.aqiImpactScore * 0.12;
  return Math.max(0.8, Number(hours.toFixed(2)));
}

function cycleMinutes(platformName, disruption, rng) {
  let base;
  if (isQuickCommerce(platformName)) base = rng.normal(23, 5);
  else if (isFood(platformName)) base = rng.normal(42, 11);
  else base = rng.normal(58, 14);
  return Math.max(12, Math.min(95, base * (1 + disruption.weatherImpactScore * 0.34 + disruption.combinedDisruptionScore * 0.18)));
}

function gigPay(platformName, durationMinutes, city, disruption, rng, ts) {
  const hour = dayjs.utc(ts).hour();
  const weekend = [0, 6].includes(dayjs.utc(ts).day());
  const base = isQuickCommerce(platformName) ? 12 : isFood(platformName) ? 18 : 22;
  const durationFactor = durationMinutes * (isQuickCommerce(platformName) ? 0.42 : isFood(platformName) ? 0.38 : 0.33);
  const cityLift = city.tier === "tier1" ? 1.8 : city.tier === "tier2" ? 1 : 0.4;
  const busyLift = ([12, 13, 19, 20, 21].includes(hour) ? 1.4 : 0) + (weekend && isFood(platformName) ? 1.6 : 0);
  const surge = disruption.combinedDisruptionScore * rng.float(1.2, 5.8);
  return Math.max(10, Math.min(50, Number((base + durationFactor + cityLift + busyLift + surge + rng.float(-2, 2)).toFixed(2))));
}

function pickShiftWindow(profile, rng) {
  const windows = { breakfast: [7, 11], lunch: [11, 15], evening: [17, 22], night: [20, 24], mixed: [8, 23] };
  const [start, end] = windows[profile.preferredShift];
  return rng.float(start, Math.max(start + 0.5, end - 2.5));
}

function pickupPointForPlatform(platformName, city, profile, rng) {
  const assets = cityAssets.get(city.city);
  if (isQuickCommerce(platformName)) {
    const pool = assets.hubs.filter((hub) => profile.preferredHubIds.includes(hub.id));
    return rng.pick(pool.length ? pool : assets.hubs);
  }
  if (isFood(platformName)) return rng.pick(assets.restaurants);
  return rng.pick(assets.porterPool);
}

async function appendGigsToDriver(driver) {
  const city = cityByName(driver.city);
  if (!city) return;
  const now = nowUtc();
  const weather = await WeatherSnapshot.findOne({ city: driver.city }).sort({ tsUnix: -1 }).lean();
  const aqi = await AqiSnapshot.findOne({ city: driver.city }).sort({ tsUnix: -1 }).lean();
  const disruption = latestSignals(weather, aqi);
  const rng = createRng(`${process.env.SEED || 42}:live:${driver.platformName}:${driver.platformDriverId}:${dateKey(now.valueOf())}`);
  const history = [...(driver.history || [])];
  const dayStart = now.startOf("day");
  const weekday = dayStart.day();
  if (!rng.bool(dayWorkProbability(driver.driverProfile, driver.platformName, disruption, weekday))) return;
  const shiftStart = dayStart.add(pickShiftWindow(driver.driverProfile, rng), "hour").add(rng.int(0, 20), "minute");
  const shiftEnd = shiftStart.add(dayHours(driver.driverProfile, driver.platformName, disruption, rng, weekday), "hour");
  let nextTime = history.length ? dayjs.utc(history[history.length - 1].reachedTimeUnix).add(rng.int(4, 20), "minute") : shiftStart;
  if (nextTime.isBefore(shiftStart)) nextTime = shiftStart;
  if (nextTime.isAfter(now) || nextTime.isAfter(shiftEnd)) return;
  let gigsAdded = 0;
  while (nextTime.isBefore(now) && nextTime.isBefore(shiftEnd) && gigsAdded < 18) {
    const cycle = cycleMinutes(driver.platformName, disruption, rng);
    const startTime = nextTime.valueOf();
    const reachMinutes = isQuickCommerce(driver.platformName)
      ? rng.float(5, 12) * (1 + disruption.weatherImpactScore * 0.25)
      : isFood(driver.platformName)
        ? rng.float(20, 60) * (1 + disruption.weatherImpactScore * 0.28)
        : rng.float(25, 80) * (1 + disruption.weatherImpactScore * 0.3);
    const endTime = nextTime.add(cycle, "minute").valueOf();
    if (endTime > now.valueOf() || endTime > shiftEnd.valueOf()) break;
    const pickup = pickupPointForPlatform(driver.platformName, city, driver.driverProfile, rng);
    const drop = isLogistics(driver.platformName) ? randomPointWithinRadius(city, rng.child(`drop:${gigsAdded}`), 0.9) : randomPointWithinRadius(city, rng.child(`drop:${gigsAdded}`), 0.82);
    const durationMinutes = Math.round((endTime - startTime) / 60000);
    history.push({
      gigId: `${driver.platformName.slice(0, 3).toUpperCase()}-${driver.city.slice(0, 3).toUpperCase()}-LIVE-${String(history.length + 1).padStart(6, "0")}`,
      amountPaid: gigPay(driver.platformName, durationMinutes, city, disruption, rng, startTime),
      startTimeUnix: startTime,
      reachedTimeUnix: startTime + Math.round(reachMinutes * 60000),
      pickup: makePoint(pickup),
      drop: makePoint(drop),
      durationMinutes,
      dateKey: dateKey(startTime),
      weatherSeverityHint: disruption.weatherSeverityHint,
      aqiBandHint: disruption.aqiBandHint
    });
    nextTime = dayjs.utc(endTime).add(rng.int(3, 18), "minute");
    gigsAdded += 1;
  }
  history.sort((a, b) => a.startTimeUnix - b.startTimeUnix || a.reachedTimeUnix - b.reachedTimeUnix);
  let nextHistory = history;
  while (calculateObjectSize({ ...driver, history: nextHistory, bsonSizeBytes: 0 }) >= MAX_DOC_BYTES && nextHistory.length > 100) {
    const newerHalfStart = Math.floor(nextHistory.length * 0.6);
    nextHistory = [...nextHistory.slice(0, newerHalfStart).filter((_, idx) => idx % 2 === 0), ...nextHistory.slice(newerHalfStart)];
  }
  const bsonSizeBytes = calculateObjectSize({ ...driver, history: nextHistory, bsonSizeBytes: 0 });
  if (bsonSizeBytes >= MAX_DOC_BYTES) return;
  await DeliveryDriver.updateOne({ _id: driver._id }, { $set: { history: nextHistory, bsonSizeBytes, historyCompacted: nextHistory.length !== history.length } });
}

async function runDeliveryJob() {
  if (jobState.delivery) return;
  jobState.delivery = true;
  try {
    await ensureDailyNewDrivers();
    const sampleSize = Number(process.env.DELIVERY_DRIVER_SAMPLE || 300);
    const drivers = await DeliveryDriver.aggregate([{ $sample: { size: sampleSize } }]);
    for (const driver of drivers) {
      await appendGigsToDriver(driver);
    }
    console.log("[mock-corn] delivery tick complete");
  } finally {
    jobState.delivery = false;
  }
}

async function runAllJobs() {
  await runWeatherJob();
  await runAqiJob();
  await runDeliveryJob();
}

function startSchedulers() {
  setInterval(() => void runWeatherJob(), WEATHER_INTERVAL_MS);
  setInterval(() => void runAqiJob(), AQI_INTERVAL_MS);
  setInterval(() => void runDeliveryJob(), DELIVERY_INTERVAL_MS);
  console.log("[mock-corn] schedulers started");
}

module.exports = { runAllJobs, startSchedulers };
