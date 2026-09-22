/**
 * Failure Classification Service for Campaign Viability Assessments.
 * Phase 4.3 Step 5.
 *
 * Distinguishes between:
 * - Permanent/non-retryable failures: Validation errors, missing campaigns,
 *   unparseable timestamps, check constraint violations, ineligible statuses.
 * - Temporary/retryable failures: Network timeouts, connection drops,
 *   HTTP 5xx server errors, transient database connection blips.
 */

export const FAILURE_CATEGORIES = {
  NOT_FOUND: "not_found",
  INVALID_CAMPAIGN_DATA: "invalid_campaign_data",
  VALIDATION_ERROR: "validation_error",
  DATABASE_CONSTRAINT_VIOLATION: "database_constraint_violation",
  INELIGIBLE_STATUS: "ineligible_status",
  FASTAPI_UNAVAILABLE: "fastapi_unavailable",
  FASTAPI_SERVER_ERROR: "fastapi_server_error",
  FASTAPI_NETWORK_ERROR: "fastapi_network_error",
  DATABASE_TRANSIENT_ERROR: "database_transient_error",
  DATABASE_CLIENT_INIT_ERROR: "database_client_init_error",
  UNKNOWN_TRANSIENT_ERROR: "unknown_transient_error",
};

/**
 * Classifies an error reason or Error object as retryable (transient)
 * or non-retryable (permanent).
 *
 * @param {string|Error} reasonOrError - Error message string or Error object.
 * @param {Object} [metadata] - Optional additional classification metadata.
 * @param {number} [metadata.status] - HTTP status code if known.
 * @param {boolean} [metadata.retryable] - Explicit override if already determined.
 * @param {string} [metadata.category] - Explicit category override if already determined.
 * @returns {{ isRetryable: boolean, category: string, statusCode: number|null }}
 */
export function classifyAssessmentFailure(reasonOrError, metadata = {}) {
  // If caller explicitly provided classification
  if (metadata.retryable !== undefined && metadata.category) {
    return {
      isRetryable: Boolean(metadata.retryable),
      category: metadata.category,
      statusCode: metadata.status ?? null,
    };
  }

  const message =
    typeof reasonOrError === "string"
      ? reasonOrError
      : reasonOrError?.message || "";
  const msgLower = message.toLowerCase();

  const statusCode =
    metadata.status ??
    (typeof reasonOrError?.status === "number" ? reasonOrError.status : null);

  // -----------------------------------------------------------
  // 1. PERMANENT / NON-RETRYABLE FAILURES
  // -----------------------------------------------------------

  // 1A. Validation error (HTTP 422 / 400 or payload schema error)
  if (
    statusCode === 422 ||
    statusCode === 400 ||
    msgLower.includes("validation error") ||
    msgLower.includes("status 422") ||
    msgLower.includes("status 400") ||
    msgLower.includes("unprocessable entity") ||
    msgLower.includes("bad request") ||
    msgLower.includes("schema validation")
  ) {
    return {
      isRetryable: false,
      category: FAILURE_CATEGORIES.VALIDATION_ERROR,
      statusCode: statusCode || 422,
    };
  }

  // 1B. Campaign does not exist (HTTP 404 or DB lookup returned null)
  if (
    statusCode === 404 ||
    msgLower.includes("was not found") ||
    msgLower.includes("campaign not found") ||
    msgLower.includes("status 404")
  ) {
    return {
      isRetryable: false,
      category: FAILURE_CATEGORIES.NOT_FOUND,
      statusCode: statusCode || 404,
    };
  }

  // 1C. Invalid or missing campaign data
  if (
    msgLower.includes("invalid or missing campaignid") ||
    msgLower.includes("unparseable launch timestamp") ||
    msgLower.includes("missing a required launch timestamp") ||
    msgLower.includes("launch date is in the future") ||
    msgLower.includes("invalid campaign record")
  ) {
    return {
      isRetryable: false,
      category: FAILURE_CATEGORIES.INVALID_CAMPAIGN_DATA,
      statusCode,
    };
  }

  // 1D. Database check or foreign key constraint violation
  if (
    msgLower.includes("check constraint") ||
    msgLower.includes("violates check constraint") ||
    msgLower.includes("violates foreign key") ||
    msgLower.includes("foreign key constraint")
  ) {
    return {
      isRetryable: false,
      category: FAILURE_CATEGORIES.DATABASE_CONSTRAINT_VIOLATION,
      statusCode,
    };
  }

  // 1E. Ineligible status
  if (msgLower.includes("is not eligible for viability assessment")) {
    return {
      isRetryable: false,
      category: FAILURE_CATEGORIES.INELIGIBLE_STATUS,
      statusCode,
    };
  }

  // -----------------------------------------------------------
  // 2. TEMPORARY / RETRYABLE FAILURES
  // -----------------------------------------------------------

  // 2A. HTTP 5xx Server errors (Internal Server Error, Bad Gateway, etc.)
  if (
    (statusCode && statusCode >= 500 && statusCode <= 504) ||
    msgLower.includes("status 500") ||
    msgLower.includes("status 502") ||
    msgLower.includes("status 503") ||
    msgLower.includes("status 504") ||
    msgLower.includes("internal server error") ||
    msgLower.includes("bad gateway") ||
    msgLower.includes("gateway timeout") ||
    msgLower.includes("service unavailable")
  ) {
    return {
      isRetryable: true,
      category: FAILURE_CATEGORIES.FASTAPI_SERVER_ERROR,
      statusCode: statusCode || 500,
    };
  }

  // 2B. Network connection failure / timeout
  if (
    msgLower.includes("fetch failed") ||
    msgLower.includes("econnrefused") ||
    msgLower.includes("econnreset") ||
    msgLower.includes("etimedout") ||
    msgLower.includes("timeout") ||
    msgLower.includes("timed out") ||
    msgLower.includes("socket hang up") ||
    msgLower.includes("network error") ||
    msgLower.includes("undici") ||
    msgLower.includes("enotfound") ||
    msgLower.includes("networkrequestfailed")
  ) {
    return {
      isRetryable: true,
      category: FAILURE_CATEGORIES.FASTAPI_NETWORK_ERROR,
      statusCode,
    };
  }

  // 2C. Supabase client initialization failure
  if (msgLower.includes("failed to initialise supabase server client")) {
    return {
      isRetryable: true,
      category: FAILURE_CATEGORIES.DATABASE_CLIENT_INIT_ERROR,
      statusCode,
    };
  }

  // 2D. Transient Supabase / database connection failure
  if (
    msgLower.includes("failed to persist assessment in supabase") ||
    msgLower.includes("failed to load campaign record") ||
    msgLower.includes("database connection error") ||
    msgLower.includes("connection terminated") ||
    msgLower.includes("connection timeout") ||
    msgLower.includes("pool exhaustion") ||
    msgLower.includes("simulated database connection error")
  ) {
    return {
      isRetryable: true,
      category: FAILURE_CATEGORIES.DATABASE_TRANSIENT_ERROR,
      statusCode,
    };
  }

  // Default fallback for unspecified unexpected errors: treat as transient with conservative bound
  return {
    isRetryable: true,
    category: FAILURE_CATEGORIES.UNKNOWN_TRANSIENT_ERROR,
    statusCode,
  };
}
