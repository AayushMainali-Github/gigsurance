function parsePagination(query) {
  const limit = Math.max(1, Math.min(5000, Number(query.limit) || 100));
  const page = Math.max(1, Number(query.page) || 1);
  const skip = (page - 1) * limit;
  return { limit, page, skip };
}

module.exports = { parsePagination };
