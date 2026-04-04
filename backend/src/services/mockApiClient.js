const axios = require("axios");
const { config } = require("../config/env");
const { ApiError } = require("../utils/ApiError");

const mockApi = axios.create({
  baseURL: config.mockApiBaseUrl,
  timeout: 15000
});

async function getDriverByPlatformId(platformName, platformDriverId) {
  try {
    const response = await mockApi.get(`/api/delivery/drivers/${encodeURIComponent(platformName)}/${encodeURIComponent(platformDriverId)}`);
    return response.data?.data || null;
  } catch (error) {
    if (error.response?.status === 404) return null;
    throw new ApiError(503, "Mock API unavailable for delivery driver lookup");
  }
}

async function paginatedFetch(path, params = {}, pageSize = 1000) {
  const items = [];
  let page = 1;

  while (true) {
    let response;
    try {
      response = await mockApi.get(path, {
        params: {
          ...params,
          page,
          limit: pageSize
        }
      });
    } catch (_error) {
      throw new ApiError(503, `Mock API unavailable for ${path}`);
    }

    const data = response.data?.data;
    const pageItems = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    items.push(...pageItems);

    const total = Number(data?.pagination?.total || 0);
    if (!pageItems.length || (total && items.length >= total) || pageItems.length < pageSize) break;
    page += 1;
  }

  return items;
}

async function listWeatherSnapshots(params) {
  return paginatedFetch("/api/weather/snapshots", params, 1000);
}

async function listAqiSnapshots(params) {
  return paginatedFetch("/api/aqi/snapshots", params, 1000);
}

module.exports = {
  getDriverByPlatformId,
  listWeatherSnapshots,
  listAqiSnapshots
};
