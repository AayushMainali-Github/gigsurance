const { faker } = require("@faker-js/faker");
const { randomPointWithinRadius } = require("./geo");

function buildCityAssets(city, rng) {
  const hubCount = Math.max(3, Math.min(25, Math.round(city.weight * 2.6)));
  const restaurantCount = Math.max(30, Math.min(500, Math.round(city.weight * 34)));
  const porterCount = Math.max(18, Math.min(160, Math.round(city.weight * 12)));
  faker.seed(Math.floor(rng.float(1, 1000000)));

  const hubs = Array.from({ length: hubCount }, (_, index) => {
    const point = randomPointWithinRadius(city, rng.child(`hub:${index}`), 0.85);
    return {
      id: `${city.city.toLowerCase().replace(/\s+/g, "-")}-hub-${String(index + 1).padStart(2, "0")}`,
      name: `${city.city} Hub ${index + 1}`,
      lat: point.lat,
      lng: point.lng
    };
  });

  const restaurants = Array.from({ length: restaurantCount }, (_, index) => {
    const point = randomPointWithinRadius(city, rng.child(`rest:${index}`), 0.92);
    return {
      id: `${city.city.toLowerCase().replace(/\s+/g, "-")}-rest-${String(index + 1).padStart(3, "0")}`,
      name: `${faker.company.name()} Kitchen`,
      lat: point.lat,
      lng: point.lng
    };
  });

  const porterPool = Array.from({ length: porterCount }, (_, index) => {
    const point = randomPointWithinRadius(city, rng.child(`porter:${index}`), 1);
    return {
      id: `${city.city.toLowerCase().replace(/\s+/g, "-")}-biz-${String(index + 1).padStart(3, "0")}`,
      name: `${city.city} Business Zone ${index + 1}`,
      lat: point.lat,
      lng: point.lng
    };
  });

  return { hubs, restaurants, porterPool };
}

module.exports = { buildCityAssets };
