const axios = require("axios");
const { config } = require("../config/env");
const { logger } = require("../config/logger");
const { ApiError } = require("../utils/ApiError");
const { normalizeQuoteResponse, normalizePayoutResponse } = require("./mlNormalizers");

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_RETRIES = 2;

const mlApi = axios.create({
  baseURL: config.mlApiBaseUrl,
  timeout: DEFAULT_TIMEOUT_MS
});

function archivePayload({ endpoint, requestPayload, rawResponse, normalized, fallbackUsed = false }) {
  return {
    version: normalized.version,
    endpoint,
    requestedAt: new Date().toISOString(),
    requestPayload,
    fallbackUsed,
    rawResponse,
    normalized
  };
}

async function withRetry(operationName, executor, retries = DEFAULT_RETRIES) {
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await executor();
    } catch (error) {
      lastError = error;
      logger.warn({ operationName, attempt, error: error.message }, "ml request attempt failed");
      if (attempt === retries) break;
    }
  }
  throw lastError;
}

function makeUnavailableFallback(version, requestPayload, reason) {
  return {
    version,
    unavailable: true,
    reason,
    requestPayload,
    raw: null
  };
}

async function requestMl({ endpoint, payload, normalizer, version, fallbackLabel }) {
  try {
    const response = await withRetry(endpoint, () => mlApi.post(endpoint, payload));
    const normalized = normalizer(response.data);
    return {
      ok: true,
      normalized,
      archive: archivePayload({
        endpoint,
        requestPayload: payload,
        rawResponse: response.data,
        normalized
      })
    };
  } catch (error) {
    logger.error({ endpoint, error: error.message }, "ml request failed after retries");
    const fallback = makeUnavailableFallback(version, payload, fallbackLabel);
    return {
      ok: false,
      normalized: fallback,
      archive: archivePayload({
        endpoint,
        requestPayload: payload,
        rawResponse: null,
        normalized: fallback,
        fallbackUsed: true
      }),
      error: new ApiError(503, `ML service unavailable for ${endpoint}`)
    };
  }
}

async function healthcheck() {
  const response = await mlApi.get("/health");
  return response.data;
}

async function quoteWorker(payload) {
  return requestMl({
    endpoint: "/quote",
    payload,
    normalizer: normalizeQuoteResponse,
    version: "ml.quote.v1",
    fallbackLabel: "quote_unavailable"
  });
}

async function quoteBatch(payload) {
  try {
    const response = await withRetry("/quote/batch", () => mlApi.post("/quote/batch", payload));
    const results = (response.data.results || []).map(normalizeQuoteResponse);
    return {
      ok: true,
      normalized: {
        version: "ml.quote.batch.v1",
        requestedCount: response.data.requested_count || payload.items?.length || 0,
        quotedCount: response.data.quoted_count || results.length,
        errorCount: response.data.error_count || 0,
        results,
        errors: response.data.errors || []
      },
      archive: {
        version: "ml.quote.batch.v1",
        endpoint: "/quote/batch",
        requestedAt: new Date().toISOString(),
        requestPayload: payload,
        fallbackUsed: false,
        rawResponse: response.data,
        normalizedResults: results
      }
    };
  } catch (error) {
    logger.error({ endpoint: "/quote/batch", error: error.message }, "ml batch quote request failed after retries");
    return {
      ok: false,
      normalized: {
        version: "ml.quote.batch.v1",
        unavailable: true,
        requestedCount: payload.items?.length || 0,
        quotedCount: 0,
        errorCount: payload.items?.length || 0,
        results: [],
        errors: [{ error: "quote_batch_unavailable" }]
      },
      archive: {
        version: "ml.quote.batch.v1",
        endpoint: "/quote/batch",
        requestedAt: new Date().toISOString(),
        requestPayload: payload,
        fallbackUsed: true,
        rawResponse: null,
        normalizedResults: []
      },
      error: new ApiError(503, "ML service unavailable for batch quote")
    };
  }
}

async function assessPayout(payload) {
  return requestMl({
    endpoint: "/payout",
    payload,
    normalizer: normalizePayoutResponse,
    version: "ml.payout.v1",
    fallbackLabel: "payout_unavailable"
  });
}

async function assessPayoutBatch(payload) {
  try {
    const response = await withRetry("/payout/batch", () => mlApi.post("/payout/batch", payload));
    const results = (response.data.results || []).map(normalizePayoutResponse);
    return {
      ok: true,
      normalized: {
        version: "ml.payout.batch.v1",
        requestedCount: response.data.requested_count || payload.items?.length || 0,
        assessedCount: response.data.assessed_count || results.length,
        errorCount: response.data.error_count || 0,
        results,
        errors: response.data.errors || []
      },
      archive: {
        version: "ml.payout.batch.v1",
        endpoint: "/payout/batch",
        requestedAt: new Date().toISOString(),
        requestPayload: payload,
        fallbackUsed: false,
        rawResponse: response.data,
        normalizedResults: results
      }
    };
  } catch (error) {
    logger.error({ endpoint: "/payout/batch", error: error.message }, "ml batch payout request failed after retries");
    return {
      ok: false,
      normalized: {
        version: "ml.payout.batch.v1",
        unavailable: true,
        requestedCount: payload.items?.length || 0,
        assessedCount: 0,
        errorCount: payload.items?.length || 0,
        results: [],
        errors: [{ error: "payout_batch_unavailable" }]
      },
      archive: {
        version: "ml.payout.batch.v1",
        endpoint: "/payout/batch",
        requestedAt: new Date().toISOString(),
        requestPayload: payload,
        fallbackUsed: true,
        rawResponse: null,
        normalizedResults: []
      },
      error: new ApiError(503, "ML service unavailable for batch payout")
    };
  }
}

module.exports = {
  mlApi,
  healthcheck,
  quoteWorker,
  quoteBatch,
  assessPayout,
  assessPayoutBatch,
  archivePayload
};
