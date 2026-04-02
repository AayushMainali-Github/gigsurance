const { calculateObjectSize } = require("bson");
const seedrandom = require("seedrandom");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
dayjs.extend(utc);

const { cities } = require("../../mock-db/config/cities");
const { PLATFORM_MIX_BY_TIER, PLATFORMS, isFood, isLogistics, isQuickCommerce } = require("../../mock-db/config/platforms");

function createRng(seed) {
  const r = seedrandom(String(seed));
  return {
    next: () => r(),
    int: (a, b) => Math.floor(r() * (b - a + 1)) + a,
    float: (a, b) => r() * (b - a) + a,
    bool: (p = 0.5) => r() < p,
    pick: (items) => items[Math.floor(r() * items.length)],
    weightedPick(map) {
      const entries = Array.isArray(map) ? map : Object.entries(map);
      let sum = entries.reduce((s, [, w]) => s + w, 0);
      let roll = r() * sum;
      for (const [v, w] of entries) {
        roll -= w;
        if (roll <= 0) return v;
      }
      return entries[entries.length - 1][0];
    },
    normal(mean, std) {
      let u = 0, v = 0;
      while (!u) u = r();
      while (!v) v = r();
      return mean + Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * std;
    }
  };
}

function dateKey(ts) { return dayjs.utc(ts).format("YYYY-MM-DD"); }
function nowUtc() { return dayjs.utc(); }
function floorToStep(ts, minutes) {
  const d = dayjs.utc(ts);
  const floored = d.minute(Math.floor(d.minute() / minutes) * minutes).second(0).millisecond(0);
  return floored;
}

function randomPointWithinRadius(city, rng, bias = 0.82) {
  const angle = rng.float(0, Math.PI * 2);
  const radius = city.radiusKm * Math.sqrt(rng.next()) * bias;
  const lat = city.centerLat + (radius * Math.sin(angle)) / 111;
  const lng = city.centerLng + (radius * Math.cos(angle)) / (111 * Math.cos((city.centerLat * Math.PI) / 180));
  return { lat, lng };
}
function makePoint(p) { return { type: "Point", coordinates: [Number(p.lng.toFixed(6)), Number(p.lat.toFixed(6))] }; }
function categoryFromAqi(aqi) {
  if (aqi <= 50) return "good";
  if (aqi <= 100) return "satisfactory";
  if (aqi <= 200) return "moderate";
  if (aqi <= 300) return "poor";
  if (aqi <= 400) return "very_poor";
  return "severe";
}

module.exports = {
  cities, PLATFORMS, PLATFORM_MIX_BY_TIER, isFood, isLogistics, isQuickCommerce,
  createRng, dateKey, nowUtc, floorToStep, randomPointWithinRadius, makePoint, categoryFromAqi, calculateObjectSize, dayjs
};
