const { calculateObjectSize } = require("bson");
const DeliveryDriver = require("../models/deliveryDriver");
const { cities } = require("../config/cities");
const { PLATFORMS, PLATFORM_MIX_BY_TIER, isFood, isLogistics, isQuickCommerce } = require("../config/platforms");
const { dateKey, monthsAgoExact, nowUtc, dayjs } = require("../utils/time");
const { createRng } = require("../utils/rng");
const { allocateExactCount } = require("../utils/allocation");
const { buildCityAssets } = require("../utils/city-assets");
const { randomPointWithinRadius, makePoint, withinCity } = require("../utils/geo");
const { loadDisruptionStore, fallbackDisruption } = require("./disruptionStore");

const MAX_SAFE_DOC_BYTES = 12 * 1024 * 1024;
const DEFAULT_DELIVERY_BATCH_LIMIT = 25;
const MAX_DELIVERY_BATCH_BYTES = 32 * 1024 * 1024;

function allocateDriversByCity(totalDrivers, selectedCities) {
  return allocateExactCount(selectedCities, totalDrivers, (city) => city.weight);
}

function getJoinedAt(rng, deliveryMonths) {
  const distribution = deliveryMonths <= 24
    ? [
        [rng.float(0.2, 3), 18],
        [rng.float(3, 12), 34],
        [rng.float(12, 24), 48]
      ]
    : [
        [rng.float(0.2, 3), 18],
        [rng.float(3, 12), 34],
        [rng.float(12, 24), 28],
        [rng.float(24, 36), 15],
        [rng.float(36, Math.max(36.2, deliveryMonths)), 5]
      ];
  const monthsBack = Number(rng.weightedPick(distribution));
  return dayjs.utc().subtract(monthsBack, "month").subtract(rng.int(0, 27), "day").toDate();
}

function buildDriverProfile(city, platformName, assets, rng) {
  const archetype = rng.weightedPick({ full_time: 45, part_time: 30, peak_only: 15, weekend_only: 10 });
  const weatherSensitivity = rng.weightedPick({ low: 28, medium: 47, high: 25 });
  const preferredShift = rng.weightedPick({ breakfast: 10, lunch: 22, evening: 30, night: 12, mixed: 26 });
  const experienceBucket = rng.weightedPick({ new: 22, regular: 51, veteran: 27 });
  const hoursByArchetype = { full_time: [8, 14], part_time: [3, 7], peak_only: [3, 6], weekend_only: [2, 7] };
  const [minHours, maxHours] = hoursByArchetype[archetype];
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
  if (disruption.strikeFlag) base *= 0.35;
  if (disruption.shutdownFlag) base *= 0.08;
  return Math.max(0.01, Math.min(0.96, base));
}

function dayHours(profile, platformName, disruption, rng, weekday) {
  const weekend = weekday === 0 || weekday === 6;
  let hours = rng.float(profile.hoursPreferenceMin, profile.hoursPreferenceMax);
  if (isFood(platformName) && weekend) hours += rng.float(0.3, 1.2);
  if (profile.archetype === "peak_only") hours *= rng.float(0.85, 1.1);
  hours *= 1 - disruption.weatherImpactScore * 0.18 - disruption.aqiImpactScore * 0.12;
  if (disruption.strikeFlag) hours *= 0.55;
  if (disruption.shutdownFlag) hours *= 0.18;
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

function pickupPointForPlatform(platformName, assets, profile, rng) {
  if (isQuickCommerce(platformName)) {
    const pool = assets.hubs.filter((hub) => profile.preferredHubIds.includes(hub.id));
    return rng.pick(pool.length ? pool : assets.hubs);
  }
  if (isFood(platformName)) return rng.pick(assets.restaurants);
  return rng.pick(assets.porterPool);
}

function compactHistory(doc) {
  let history = [...doc.history];
  let compacted = false;
  while (calculateObjectSize({ ...doc, history, bsonSizeBytes: 0 }) > MAX_SAFE_DOC_BYTES && history.length > 100) {
    const newerHalfStart = Math.floor(history.length * 0.6);
    history = [...history.slice(0, newerHalfStart).filter((_, idx) => idx % 2 === 0), ...history.slice(newerHalfStart)];
    compacted = true;
  }
  return { history, compacted };
}

function validateDriverDocument(doc, city) {
  for (let i = 0; i < doc.history.length; i += 1) {
    const item = doc.history[i];
    if (item.reachedTimeUnix <= item.startTimeUnix) {
      return { ok: false, reason: `reached before start at history[${i}]` };
    }
    if (item.durationMinutes < 0) {
      return { ok: false, reason: `negative duration at history[${i}]` };
    }
    const pickup = { lng: item.pickup.coordinates[0], lat: item.pickup.coordinates[1] };
    const drop = { lng: item.drop.coordinates[0], lat: item.drop.coordinates[1] };
    if (!withinCity(pickup, city)) {
      return { ok: false, reason: `pickup outside city at history[${i}]` };
    }
    if (!withinCity(drop, city)) {
      return { ok: false, reason: `drop outside city at history[${i}]` };
    }
    if (i > 0 && item.startTimeUnix < doc.history[i - 1].startTimeUnix) {
      return { ok: false, reason: `history not sorted at history[${i}]` };
    }
  }
  return { ok: true };
}

async function seedDelivery({ seed, driverCount, deliveryMonths, batchSize, clearExisting, cityFilter, dryRun, limit }) {
  const end = nowUtc();
  const start = monthsAgoExact(deliveryMonths, end);
  const selectedCities = cityFilter ? cities.filter((city) => city.city === cityFilter) : cities;
  const targetCount = limit ? Math.min(Number(limit), driverCount) : driverCount;
  const driversByCity = allocateDriversByCity(targetCount, selectedCities);
  const disruptionStore = await loadDisruptionStore(seed, Math.min(24, deliveryMonths), cityFilter);
  const cityAssets = new Map(selectedCities.map((city) => [city.city, buildCityAssets(city, createRng(`${seed}:assets:${city.city}`))]));
  const recentStart = monthsAgoExact(Math.min(24, deliveryMonths), end);

  if (clearExisting && !dryRun) await DeliveryDriver.deleteMany(cityFilter ? { city: cityFilter } : {});

  const validationStats = { totalDrivers: 0, driversByCity: {}, driversByPlatform: {}, normalNoWork: { days: 0, noWork: 0 }, disruptedNoWork: { days: 0, noWork: 0 }, preventedOversized: 0 };
  const platformCounters = Object.fromEntries(PLATFORMS.map((platform) => [platform, 0]));
  let batch = [];
  let batchBytes = 0;
  const effectiveBatchSize = Math.min(Number(batchSize) || DEFAULT_DELIVERY_BATCH_LIMIT, DEFAULT_DELIVERY_BATCH_LIMIT);

  for (const city of selectedCities) {
    const cityCount = driversByCity.get(city.city) || 0;
    const assets = cityAssets.get(city.city);
    validationStats.driversByCity[city.city] = cityCount;

    for (let index = 0; index < cityCount; index += 1) {
      const rng = createRng(`${seed}:driver:${city.city}:${index}`);
      const platformName = choosePlatform(city, rng);
      platformCounters[platformName] += 1;
      const platformDriverId = `${platformName.toUpperCase()}-${city.city.slice(0, 3).toUpperCase()}-${String(platformCounters[platformName]).padStart(8, "0")}`;
      const joinedAt = getJoinedAt(rng, deliveryMonths);
      const profile = buildDriverProfile(city, platformName, assets, rng);
      const history = [];
      let cursor = dayjs.utc(joinedAt);
      let gigCounter = 0;

      while (cursor.isBefore(end)) {
        const key = dateKey(cursor);
        const disruption = cursor.isAfter(recentStart.subtract(1, "day")) ? disruptionStore.get(city.city, key) || fallbackDisruption(city, cursor, seed) : fallbackDisruption(city, cursor, seed);
        const weekday = cursor.day();
        const workProbability = dayWorkProbability(profile, platformName, disruption, weekday);
        const works = rng.bool(workProbability);

        if (disruption.combinedDisruptionScore >= 0.35) validationStats.disruptedNoWork.days += 1;
        else validationStats.normalNoWork.days += 1;

        if (!works) {
          if (disruption.combinedDisruptionScore >= 0.35) validationStats.disruptedNoWork.noWork += 1;
          else validationStats.normalNoWork.noWork += 1;
          cursor = cursor.add(1, "day");
          continue;
        }

        const activeHours = dayHours(profile, platformName, disruption, rng, weekday);
        let nextTime = cursor.add(pickShiftWindow(profile, rng), "hour").add(rng.int(0, 20), "minute");
        const stopTime = nextTime.add(activeHours, "hour");

        while (nextTime.isBefore(stopTime)) {
          const cycle = cycleMinutes(platformName, disruption, rng);
          const startTime = nextTime.valueOf();
          const gigDate = dateKey(startTime);
          const reachMinutes = isQuickCommerce(platformName) ? rng.float(5, 12) * (1 + disruption.weatherImpactScore * 0.25) : isFood(platformName) ? rng.float(20, 60) * (1 + disruption.weatherImpactScore * 0.28) : rng.float(25, 80) * (1 + disruption.weatherImpactScore * 0.3);
          const endTime = nextTime.add(cycle, "minute").valueOf();
          if (endTime > stopTime.valueOf()) break;

          const pickupSource = pickupPointForPlatform(platformName, assets, profile, rng);
          const dropPoint = isLogistics(platformName) ? randomPointWithinRadius(city, rng.child(`drop:${gigCounter}`), 1) : randomPointWithinRadius(city, rng.child(`drop:${gigCounter}`), 0.95);
          const durationMinutes = Math.round((endTime - startTime) / 60000);
          history.push({
            gigId: `${platformName.slice(0, 3).toUpperCase()}-${city.city.slice(0, 3).toUpperCase()}-${String(index + 1).padStart(6, "0")}-${String(++gigCounter).padStart(5, "0")}`,
            amountPaid: gigPay(platformName, durationMinutes, city, disruption, rng, startTime),
            startTimeUnix: startTime,
            reachedTimeUnix: startTime + Math.round(reachMinutes * 60000),
            pickup: makePoint(pickupSource),
            drop: makePoint(dropPoint),
            durationMinutes,
            dateKey: gigDate,
            weatherSeverityHint: disruption.weatherSeverityHint ?? disruption.weatherImpactScore,
            aqiBandHint: disruption.aqiBandHint
          });
          nextTime = dayjs.utc(endTime).add(rng.int(3, 18), "minute");
        }
        cursor = cursor.add(1, "day");
      }

      const doc = { platformName, platformDriverId, city: city.city, state: city.state, cityTier: city.tier, joinedAt, driverProfile: profile, history, historyCompacted: false, bsonSizeBytes: 0 };
      doc.history.sort((a, b) => a.startTimeUnix - b.startTimeUnix || a.reachedTimeUnix - b.reachedTimeUnix);
      const compacted = compactHistory(doc);
      doc.history = compacted.history;
      doc.historyCompacted = compacted.compacted;
      doc.bsonSizeBytes = calculateObjectSize({ ...doc });
      if (doc.historyCompacted) validationStats.preventedOversized += 1;
      if (doc.bsonSizeBytes >= MAX_SAFE_DOC_BYTES) throw new Error(`BSON guard failed for ${doc.platformDriverId}`);
      const validation = validateDriverDocument(doc, city);
      if (!validation.ok) throw new Error(`Driver validation failed for ${doc.platformDriverId}: ${validation.reason}`);

      batch.push({ updateOne: { filter: { platformName: doc.platformName, platformDriverId: doc.platformDriverId }, update: { $set: doc }, upsert: true } });
      batchBytes += doc.bsonSizeBytes;
      validationStats.totalDrivers += 1;
      validationStats.driversByPlatform[platformName] = (validationStats.driversByPlatform[platformName] || 0) + 1;

      if (batch.length >= effectiveBatchSize || batchBytes >= MAX_DELIVERY_BATCH_BYTES) {
        if (!dryRun) await DeliveryDriver.bulkWrite(batch, { ordered: false });
        console.log(`[delivery] processed ${validationStats.totalDrivers}/${targetCount}`);
        batch = [];
        batchBytes = 0;
      }
    }
  }

  if (batch.length) {
    if (!dryRun) await DeliveryDriver.bulkWrite(batch, { ordered: false });
    batchBytes = 0;
  }

  console.log("[delivery] no-work normal pct:", Number((validationStats.normalNoWork.noWork / Math.max(validationStats.normalNoWork.days, 1)).toFixed(3)));
  console.log("[delivery] no-work disrupted pct:", Number((validationStats.disruptedNoWork.noWork / Math.max(validationStats.disruptedNoWork.days, 1)).toFixed(3)));
  console.log("[delivery] top disrupted city-days:", disruptionStore.topDisrupted);
  return validationStats;
}

module.exports = { seedDelivery };

