function allocateExactCount(items, total, weightSelector) {
  const weighted = items.map((item) => {
    const exact = weightSelector(item);
    return { item, raw: exact, floor: 0, frac: 0 };
  });
  const totalWeight = weighted.reduce((sum, entry) => sum + entry.raw, 0);
  let allocated = 0;

  for (const entry of weighted) {
    const exact = (entry.raw / totalWeight) * total;
    entry.floor = Math.floor(exact);
    entry.frac = exact - entry.floor;
    allocated += entry.floor;
  }

  weighted.sort((a, b) => b.frac - a.frac);
  for (let i = 0; i < total - allocated; i += 1) {
    weighted[i % weighted.length].floor += 1;
  }

  const result = new Map();
  for (const entry of weighted) {
    result.set(entry.item.city || entry.item, entry.floor);
  }
  return result;
}

module.exports = { allocateExactCount };
