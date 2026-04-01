const seedrandom = require("seedrandom");

function createRng(seed) {
  const rng = seedrandom(String(seed));

  return {
    next: () => rng(),
    int(min, max) {
      return Math.floor(rng() * (max - min + 1)) + min;
    },
    float(min, max) {
      return rng() * (max - min) + min;
    },
    bool(probability = 0.5) {
      return rng() < probability;
    },
    pick(items) {
      return items[this.int(0, items.length - 1)];
    },
    weightedPick(weightMap) {
      const entries = Array.isArray(weightMap) ? weightMap : Object.entries(weightMap);
      const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
      let roll = rng() * total;
      for (const [value, weight] of entries) {
        roll -= weight;
        if (roll <= 0) return value;
      }
      return entries[entries.length - 1][0];
    },
    normal(mean, stdDev) {
      let u = 0;
      let v = 0;
      while (u === 0) u = rng();
      while (v === 0) v = rng();
      const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
      return mean + z * stdDev;
    },
    child(label) {
      return createRng(`${seed}:${label}`);
    }
  };
}

module.exports = { createRng };
