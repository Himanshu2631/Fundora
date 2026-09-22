/**
 * Server-Side Scheduled Automation Trigger for 48-Hour Campaign Viability Assessments.
 * Phase 4.3 Steps 4 & 5.
 *
 * ARCHITECTURAL CONSTRAINTS:
 * - This module does NOT contain ML logic.
 * - This module does NOT directly call FastAPI.
 * - This module does NOT construct ML feature payloads.
 * - This module does NOT duplicate eligibility validation.
 * - This module does NOT directly insert assessment database records.
 *
 * RESPONSIBILITIES:
 * 1. Discover candidate campaigns that have passed approximately 48 hours from launch.
 * 2. Invoke the existing orchestrator: runCampaignViabilityAssessment(campaignId, options).
 * 3. Classify errors into permanent (non-retryable) vs transient (retryable).
 * 4. Apply a conservative, bounded retry policy with exponential backoff.
 * 5. Safely isolate per-campaign errors so a failure in one campaign does not halt the batch.
 * 6. Record and return clean, safe operational metrics and execution results.
 *
 * SECURITY:
 * Server-side execution only. Never import into client components.
 */

import { runCampaignViabilityAssessment } from "./assessmentRunner.js";
import {
  classifyAssessmentFailure,
  FAILURE_CATEGORIES,
} from "./failureClassifier.js";

/**
 * Conservative default batch size per scheduled invocation to prevent serverless
 * timeout and control downstream API load.
 */
export const DEFAULT_BATCH_SIZE = 25;

/**
 * Default maximum retry attempts for transient/retryable failures during a single execution.
 */
export const DEFAULT_MAX_RETRIES = 2;

/**
 * Default initial backoff delay in milliseconds for retrying transient errors.
 */
export const DEFAULT_INITIAL_BACKOFF_MS = 200;

/**
 * Default maximum backoff delay in milliseconds to prevent serverless timeout.
 */
export const DEFAULT_MAX_BACKOFF_MS = 1000;

/**
 * Resolves the active assessment batch size from server-side configuration,
 * defaulting to DEFAULT_BATCH_SIZE.
 *
 * @returns {number}
 */
export function getAssessmentBatchSize() {
  const envVal = process.env.ML_ASSESSMENT_BATCH_SIZE;
  if (envVal) {
    const parsed = parseInt(envVal, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return DEFAULT_BATCH_SIZE;
}

/**
 * Resolves the maximum retry count from server-side configuration,
 * defaulting to DEFAULT_MAX_RETRIES.
 *
 * @returns {number}
 */
export function getMaxRetries() {
  const envVal = process.env.ML_ASSESSMENT_MAX_RETRIES;
  if (envVal !== undefined && envVal !== null && envVal !== "") {
    const parsed = parseInt(envVal, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return DEFAULT_MAX_RETRIES;
}

/**
 * Calculates exponential backoff delay in milliseconds for a retry attempt.
 *
 * @param {number} attempt - Current 1-indexed attempt number.
 * @param {number} [initialMs=DEFAULT_INITIAL_BACKOFF_MS] - Base backoff.
 * @param {number} [maxMs=DEFAULT_MAX_BACKOFF_MS] - Upper bound cap.
 * @returns {number} Delay in milliseconds.
 */
export function calculateBackoffMs(
  attempt,
  initialMs = DEFAULT_INITIAL_BACKOFF_MS,
  maxMs = DEFAULT_MAX_BACKOFF_MS
) {
  if (initialMs <= 0) return 0;
  const delay = initialMs * Math.pow(2, attempt - 1);
  return Math.min(delay, maxMs);
}

/**
 * Validates that an incoming scheduled trigger request contains valid cron authorization.
 *
 * Checks Authorization header against CRON_SECRET using standard Bearer token scheme:
 *   Authorization: Bearer <CRON_SECRET>
 *
 * @param {Request|Object} request - Incoming HTTP request (or mock request).
 * @returns {{ authorized: boolean, reason?: string }}
 */
export function verifyCronAuthorization(request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || typeof cronSecret !== "string" || !cronSecret.trim()) {
    // Fail-safe: If CRON_SECRET is not configured on the server, refuse all invocations
    return {
      authorized: false,
      reason: "Server misconfiguration: CRON_SECRET is not set.",
    };
  }

  const authHeader =
    typeof request?.headers?.get === "function"
      ? request.headers.get("authorization")
      : request?.headers?.authorization;

  if (!authHeader) {
    return {
      authorized: false,
      reason: "Missing Authorization header.",
    };
  }

  const expectedToken = `Bearer ${cronSecret.trim()}`;
  if (authHeader !== expectedToken) {
    return {
      authorized: false,
      reason: "Invalid Authorization Bearer token.",
    };
  }

  return { authorized: true };
}

/**
 * Broad candidate discovery for campaigns that may be ready for their initial
 * 48-hour viability assessment.
 *
 * IMPORTANT:
 * The eligibility service (isCampaignViabilityAssessmentEligible) remains the
 * authoritative source of truth. This query acts only as a high-level candidate
 * discovery filter to reduce unnecessary full fetches.
 *
 * @param {Object} supabaseClient - Supabase server client.
 * @param {Object} [options] - Configuration overrides.
 * @param {Date|string|number} [options.now] - Current server-time override.
 * @param {number} [options.batchSize] - Maximum candidate batch limit.
 * @param {Array<Object>} [options.candidateCampaigns] - Direct campaign candidates list (test override).
 * @returns {Promise<Array<Object>>} Candidate campaign records.
 */
export async function findCandidateCampaigns(supabaseClient, options = {}) {
  const batchSize =
    options.batchSize !== undefined
      ? Number(options.batchSize)
      : getAssessmentBatchSize();

  // Test override: if candidate list is explicitly provided
  if (Array.isArray(options.candidateCampaigns)) {
    return options.candidateCampaigns.slice(0, batchSize);
  }

  if (!supabaseClient || typeof supabaseClient.from !== "function") {
    throw new Error("A valid Supabase client is required for candidate discovery.");
  }

  const nowMs =
    options.now !== undefined ? new Date(options.now).getTime() : Date.now();
  const cutoffIso = new Date(nowMs - 48 * 3600 * 1000).toISOString();

  // Query campaigns created at or before the 48-hour boundary cutoff
  let query = supabaseClient.from("charities").select("id, name, created_at, status");

  if (typeof query.lte === "function") {
    query = query.lte("created_at", cutoffIso);
  }
  if (typeof query.order === "function") {
    query = query.order("created_at", { ascending: true });
  }
  if (typeof query.limit === "function") {
    query = query.limit(batchSize);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Candidate discovery query failed: ${error.message}`);
  }

  let candidates = Array.isArray(data) ? data : [];

  // Temporal cutoff safety filter (in case client lacks .lte)
  candidates = candidates.filter((c) => {
    if (!c || !c.created_at) return false;
    const cTime = new Date(c.created_at).getTime();
    return !isNaN(cTime) && cTime <= new Date(cutoffIso).getTime();
  });

  // Soft exclusion of inactive/cancelled statuses if present
  candidates = candidates.filter((c) => {
    if (c.status && typeof c.status === "string") {
      const s = c.status.toLowerCase().trim();
      if (["draft", "cancelled", "canceled", "inactive", "suspended"].includes(s)) {
        return false;
      }
    }
    return true;
  });

  if (candidates.length > batchSize) {
    candidates = candidates.slice(0, batchSize);
  }

  return candidates;
}

/**
 * Orchestrates a scheduled execution run of the 48-hour viability assessment automation
 * with safe failure handling, failure classification, and controlled retry behavior.
 *
 * Iterates through candidate campaigns and invokes runCampaignViabilityAssessment()
 * for each. Transient failures are retried with backoff up to maxRetries. Permanent
 * failures (e.g., validation errors) are not retried. Per-campaign exceptions are
 * safely caught so one failure does not halt processing of the remaining batch.
 *
 * @param {Object} [options] - Configuration and context overrides.
 * @param {Object} [options.supabaseClient] - Optional Supabase server client.
 * @param {Date|string|number} [options.now] - Current server-time override.
 * @param {number} [options.batchSize] - Batch size limit override.
 * @param {number} [options.maxRetries] - Max retries limit override.
 * @param {number} [options.initialBackoffMs] - Initial backoff delay in ms override.
 * @param {Array<Object>} [options.candidateCampaigns] - Candidate list override (for testing).
 * @param {number} [options.targetGoal] - Target goal fallback.
 * @param {string} [options.country] - Default country code fallback.
 * @returns {Promise<Object>} Execution summary report.
 */
export async function runScheduledViabilityAssessments(options = {}) {
  const startTime = Date.now();
  const batchSize =
    options.batchSize !== undefined
      ? Number(options.batchSize)
      : getAssessmentBatchSize();
  const maxRetries =
    options.maxRetries !== undefined
      ? Number(options.maxRetries)
      : getMaxRetries();
  const maxAttempts = maxRetries + 1;
  const initialBackoffMs =
    options.initialBackoffMs !== undefined
      ? Number(options.initialBackoffMs)
      : DEFAULT_INITIAL_BACKOFF_MS;

  // 1. Resolve Supabase client
  let supabase = options.supabaseClient ?? null;
  if (!supabase) {
    try {
      const { createServer } = await import("../supabase-server.js");
      supabase = await createServer();
    } catch {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        error: "Failed to initialize Supabase server client for scheduled trigger.",
        candidatesFound: 0,
        processed: 0,
        succeeded: 0,
        skipped: 0,
        failed: 0,
        results: [],
      };
    }
  }

  // 2. Discover candidates
  let candidates = [];
  try {
    candidates = await findCandidateCampaigns(supabase, {
      ...options,
      batchSize,
    });
  } catch (err) {
    return {
      success: false,
      timestamp: new Date().toISOString(),
      error: `Candidate discovery failed: ${err.message}`,
      candidatesFound: 0,
      processed: 0,
      succeeded: 0,
      skipped: 0,
      failed: 0,
      results: [],
    };
  }

  const results = [];
  let succeededCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  // 3. Process candidate campaigns with failure handling and controlled retries
  for (const candidate of candidates) {
    const campaignId = candidate?.id ? String(candidate.id) : null;
    if (!campaignId) {
      continue;
    }

    let attempt = 0;
    let finalResult = null;

    while (attempt < maxAttempts) {
      attempt++;

      try {
        const runResult = await runCampaignViabilityAssessment(campaignId, {
          supabaseClient: supabase,
          now: options.now,
          targetGoal: options.targetGoal,
          country: options.country,
        });

        if (runResult.skipped) {
          // Success (clean skip due to ineligibility or already assessed)
          skippedCount++;
          console.log(
            `[ML Viability Scheduler] Campaign ${campaignId} (Attempt ${attempt}/${maxAttempts}): SKIPPED (${runResult.reason})`
          );
          finalResult = {
            campaignId,
            status: "skipped",
            reason: runResult.reason,
            attempts: attempt,
          };
          break; // Skips must not be retried
        }

        if (runResult.success) {
          // Success (assessment persisted in Supabase)
          succeededCount++;
          console.log(
            `[ML Viability Scheduler] Campaign ${campaignId} (Attempt ${attempt}/${maxAttempts}): SUCCESS (Assessment ID: ${
              runResult.assessmentId || "persisted"
            })`
          );
          finalResult = {
            campaignId,
            status: "success",
            assessmentId: runResult.assessmentId || null,
            attempts: attempt,
          };
          break; // Assessment succeeded, exit retry loop
        }

        // Assessment runner returned structured failure
        const failureClass = classifyAssessmentFailure(runResult.reason, {
          retryable: runResult.retryable,
          category: runResult.errorCategory,
        });

        const isRetryable = failureClass.isRetryable;
        const category = failureClass.category;

        console.warn(
          `[ML Viability Scheduler] Campaign ${campaignId} (Attempt ${attempt}/${maxAttempts}): FAILED | Category: ${category} | Retryable: ${isRetryable} | Reason: ${runResult.reason}`
        );

        if (!isRetryable || attempt >= maxAttempts) {
          // Permanent failure or retry budget exhausted
          failedCount++;
          finalResult = {
            campaignId,
            status: "failed",
            retryable: isRetryable,
            category,
            reason: runResult.reason,
            attempts: attempt,
          };
          break;
        }

        // Retryable failure within retry limit: calculate backoff and wait
        const backoffMs = calculateBackoffMs(attempt, initialBackoffMs);
        if (backoffMs > 0) {
          await new Promise((res) => setTimeout(res, backoffMs));
        }
      } catch (campaignErr) {
        // PROCESSING SAFETY:
        // An unexpected exception for one campaign must NEVER terminate the batch.
        const safeReason =
          campaignErr && typeof campaignErr.message === "string"
            ? campaignErr.message
            : "Unexpected error during campaign assessment execution.";

        const failureClass = classifyAssessmentFailure(safeReason);
        const isRetryable = failureClass.isRetryable;
        const category = failureClass.category;

        console.error(
          `[ML Viability Scheduler] Campaign ${campaignId} (Attempt ${attempt}/${maxAttempts}): EXCEPTION | Category: ${category} | Retryable: ${isRetryable} | Reason: ${safeReason}`
        );

        if (!isRetryable || attempt >= maxAttempts) {
          failedCount++;
          finalResult = {
            campaignId,
            status: "failed",
            retryable: isRetryable,
            category,
            reason: safeReason,
            attempts: attempt,
          };
          break;
        }

        const backoffMs = calculateBackoffMs(attempt, initialBackoffMs);
        if (backoffMs > 0) {
          await new Promise((res) => setTimeout(res, backoffMs));
        }
      }
    }

    if (finalResult) {
      results.push(finalResult);
    }
  }

  const durationMs = Date.now() - startTime;

  return {
    success: true,
    timestamp: new Date().toISOString(),
    durationMs,
    batchSize,
    maxRetries,
    candidatesFound: candidates.length,
    processed: results.length,
    succeeded: succeededCount,
    skipped: skippedCount,
    failed: failedCount,
    results,
  };
}
