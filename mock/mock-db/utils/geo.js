const EARTH_RADIUS_KM = 6371;

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function distanceKm(aLat, aLng, bLat, bLng) {
  const dLat = toRadians(bLat - aLat);
  const dLng = toRadians(bLng - aLng);
  const lat1 = toRadians(aLat);
  const lat2 = toRadians(bLat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

function randomPointWithinRadius(city, rng, bias = 1) {
  const radius = city.radiusKm * Math.sqrt(rng.next()) * bias;
  const angle = rng.float(0, Math.PI * 2);
  const dx = radius * Math.cos(angle);
  const dy = radius * Math.sin(angle);
  const lat = city.centerLat + dy / 111;
  const lng = city.centerLng + dx / (111 * Math.cos(toRadians(city.centerLat)));
  return { lat, lng };
}

function makePoint(point) {
  return { type: "Point", coordinates: [Number(point.lng.toFixed(6)), Number(point.lat.toFixed(6))] };
}

function withinCity(point, city) {
  return distanceKm(point.lat, point.lng, city.centerLat, city.centerLng) <= city.radiusKm * 1.02;
}

module.exports = { distanceKm, randomPointWithinRadius, makePoint, withinCity };
