const axios = require("axios");
const { config } = require("../config/env");
const { logger } = require("../config/logger");
const { ApiError } = require("../utils/ApiError");
const { normalizeQuoteResponse, normalizePayoutResponse } = require("./mlNormalizers");

const DEFAULT_TIMEOUT_MS = 120000;
const DEFAULT_RETRIES = 2;
const DEFAULT_BATCH_SIZE = 20;

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
  const items = Array.isArray(payload.items) ? payload.items : [];
  const chunks = [];
  for (let index = 0; index < items.length; index += DEFAULT_BATCH_SIZE) {
    chunks.push(items.slice(index, index + DEFAULT_BATCH_SIZE));
  }

  const allResults = [];
  const allErrors = [];
  const rawResponses = [];

  try {
    for (const chunk of chunks) {
      try {
        const response = await withRetry("/quote/batch", () => mlApi.post("/quote/batch", {
          ...payload,
          items: chunk
        }));
        rawResponses.push(response.data);
        allResults.push(...(response.data.results || []).map(normalizeQuoteResponse));
        allErrors.push(...(response.data.errors || []));
      } catch (chunkError) {
        logger.warn({ endpoint: "/quote/batch", chunkSize: chunk.length, error: chunkError.message }, "ml batch quote chunk failed, falling back to per-worker quoting");
        for (const item of chunk) {
          const single = await quoteWorker({
            worker_id: item.worker_id,
            platform_name: item.platform_name,
            horizon_days: item.horizon_days ?? payload.horizon_days,
            no_claim_weeks: item.no_claim_weeks ?? payload.no_claim_weeks,
            forecast_overrides: item.forecast_overrides ?? payload.forecast_overrides ?? {}
          });
          if (single.ok && !single.normalized.unavailable) {
            allResults.push(single.normalized);
            rawResponses.push(single.archive.rawResponse);
          } else {
            allErrors.push({
              worker_id: item.worker_id,
              platform_name: item.platform_name,
              error: single.error?.message || "quote_unavailable"
            });
          }
        }
      }
    }

    return {
      ok: true,
      normalized: {
        version: "ml.quote.batch.v1",
        requestedCount: items.length,
        quotedCount: allResults.length,
        errorCount: allErrors.length,
        results: allResults,
        errors: allErrors
      },
      archive: {
        version: "ml.quote.batch.v1",
        endpoint: "/quote/batch",
        requestedAt: new Date().toISOString(),
        requestPayload: payload,
        fallbackUsed: false,
        rawResponse: rawResponses,
        normalizedResults: allResults
      }
    };
  } catch (error) {
    logger.error({ endpoint: "/quote/batch", error: error.message }, "ml batch quote request failed after retries");
    return {
      ok: false,
      normalized: {
        version: "ml.quote.batch.v1",
        unavailable: true,
        requestedCount: items.length,
        quotedCount: allResults.length,
        errorCount: Math.max(1, items.length - allResults.length),
        results: allResults,
        errors: allErrors.length ? allErrors : [{ error: "quote_batch_unavailable" }]
      },
      archive: {
        version: "ml.quote.batch.v1",
        endpoint: "/quote/batch",
        requestedAt: new Date().toISOString(),
        requestPayload: payload,
        fallbackUsed: true,
        rawResponse: rawResponses,
        normalizedResults: allResults
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
  const items = Array.isArray(payload.items) ? payload.items : [];
  const chunks = [];
  for (let index = 0; index < items.length; index += DEFAULT_BATCH_SIZE) {
    chunks.push(items.slice(index, index + DEFAULT_BATCH_SIZE));
  }

  const allResults = [];
  const allErrors = [];
  const rawResponses = [];

  try {
    for (const chunk of chunks) {
      try {
        const response = await withRetry("/payout/batch", () => mlApi.post("/payout/batch", {
          ...payload,
          items: chunk
        }));
        rawResponses.push(response.data);
        allResults.push(...(response.data.results || []).map(normalizePayoutResponse));
        allErrors.push(...(response.data.errors || []));
      } catch (chunkError) {
        logger.warn({ endpoint: "/payout/batch", chunkSize: chunk.length, error: chunkError.message }, "ml batch payout chunk failed, falling back to per-worker payout assessment");
        for (const item of chunk) {
          const single = await assessPayout({
            worker_id: item.worker_id,
            platform_name: item.platform_name,
            horizon_days: item.horizon_days ?? payload.horizon_days,
            affected_days: item.affected_days ?? payload.affected_days,
            incident_city: item.incident_city ?? payload.incident_city,
            incident_state: item.incident_state ?? payload.incident_state,
            days_since_enrollment: item.days_since_enrollment ?? payload.days_since_enrollment,
            no_claim_weeks: item.no_claim_weeks ?? payload.no_claim_weeks,
            verified_incident: item.verified_incident ?? payload.verified_incident,
            loss_ratio_override: item.loss_ratio_override ?? payload.loss_ratio_override,
            forecast_overrides: item.forecast_overrides ?? payload.forecast_overrides ?? {}
          });
          if (single.ok && !single.normalized.unavailable) {
            allResults.push(single.normalized);
            rawResponses.push(single.archive.rawResponse);
          } else {
            allErrors.push({
              worker_id: item.worker_id,
              platform_name: item.platform_name,
              error: single.error?.message || "payout_unavailable"
            });
          }
        }
      }
    }

    return {
      ok: true,
      normalized: {
        version: "ml.payout.batch.v1",
        requestedCount: items.length,
        assessedCount: allResults.length,
        errorCount: allErrors.length,
        results: allResults,
        errors: allErrors
      },
      archive: {
        version: "ml.payout.batch.v1",
        endpoint: "/payout/batch",
        requestedAt: new Date().toISOString(),
        requestPayload: payload,
        fallbackUsed: false,
        rawResponse: rawResponses,
        normalizedResults: allResults
      }
    };
  } catch (error) {
    logger.error({ endpoint: "/payout/batch", error: error.message }, "ml batch payout request failed after retries");
    return {
      ok: false,
      normalized: {
        version: "ml.payout.batch.v1",
        unavailable: true,
        requestedCount: items.length,
        assessedCount: allResults.length,
        errorCount: Math.max(1, items.length - allResults.length),
        results: allResults,
        errors: allErrors.length ? allErrors : [{ error: "payout_batch_unavailable" }]
      },
      archive: {
        version: "ml.payout.batch.v1",
        endpoint: "/payout/batch",
        requestedAt: new Date().toISOString(),
        requestPayload: payload,
        fallbackUsed: true,
        rawResponse: rawResponses,
        normalizedResults: allResults
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
