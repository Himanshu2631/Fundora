/**
 * Server-side client for communicating with the FastAPI ML service.
 */

/**
 * Predicts campaign viability by sending campaign metadata and activity metrics
 * to the FastAPI ML prediction service.
 *
 * @param {Object} payload - Campaign payload matching the FastAPI ViabilityPredictionRequest schema.
 * @returns {Promise<Object>} Parsed JSON response containing prediction results.
 * @throws {Error} If ML_API_URL is missing or the request returns a non-2xx status.
 */
export async function predictCampaignViability(payload) {
  const mlApiUrl = process.env.ML_API_URL;

  if (!mlApiUrl) {
    throw new Error("ML_API_URL environment variable is not configured.");
  }

  const endpoint = `${mlApiUrl.replace(/\/+$/, "")}/predict/viability`;
  const timeoutMs = parseInt(process.env.ML_REQUEST_TIMEOUT_MS || "10000", 10);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    let errorMessage = `ML service request failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData && typeof errorData === "object") {
        if (typeof errorData.detail === "string") {
          errorMessage = `ML service error: ${errorData.detail}`;
        } else if (Array.isArray(errorData.detail) && errorData.detail.length > 0) {
          const validationDetails = errorData.detail
            .map((err) => (err && err.msg ? `${err.loc ? err.loc.join(".") + ": " : ""}${err.msg}` : JSON.stringify(err)))
            .join("; ");
          errorMessage = `ML service validation error: ${validationDetails}`;
        } else if (errorData.message) {
          errorMessage = `ML service error: ${errorData.message}`;
        }
      }
    } catch {
      try {
        const textBody = await response.text();
        if (textBody) {
          errorMessage = `ML service error: ${textBody.slice(0, 200)}`;
        }
      } catch {
        // Fall back to default status-based error message
      }
    }

    throw new Error(errorMessage);
  }

  return await response.json();
}

/**
 * Checks the operational liveness and readiness of the FastAPI ML inference service.
 * Performs a safe, read-only GET /health probe.
 *
 * @param {Object} [options]
 * @param {number} [options.timeoutMs=5000] - Probe timeout in milliseconds.
 * @returns {Promise<{ healthy: boolean, status?: string, error?: string }>}
 */
export async function checkFastApiHealth(options = {}) {
  const mlApiUrl = process.env.ML_API_URL;
  if (!mlApiUrl) {
    return { healthy: false, error: "ML_API_URL environment variable is not configured." };
  }

  const endpoint = `${mlApiUrl.replace(/\/+$/, "")}/health`;
  const timeoutMs = options.timeoutMs || 5000;

  try {
    const res = await fetch(endpoint, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      return { healthy: false, error: `Health probe returned HTTP ${res.status}` };
    }

    const data = await res.json();
    return { healthy: data?.status === "ok", status: data?.status || "unknown" };
  } catch (err) {
    return { healthy: false, error: err.message || "Failed to reach FastAPI ML service." };
  }
}
