function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parsePagination(query) {
  const limit = Math.max(1, Math.min(200, toNumber(query.limit, 25)));
  const page = Math.max(1, toNumber(query.page, 1));
  const skip = (page - 1) * limit;
  return { limit, page, skip };
}

function parseSort(query, allowed, fallback) {
  const sortBy = allowed.includes(query.sortBy) ? query.sortBy : fallback;
  const order = query.order === "asc" ? 1 : -1;
  return { [sortBy]: order };
}

module.exports = { toNumber, parsePagination, parseSort };
