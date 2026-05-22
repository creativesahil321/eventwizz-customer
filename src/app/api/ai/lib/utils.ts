/**
 * Groq model fallbacks in priority order.
 *
 * Notes:
 * - We prefer higher-quality / more capable models first, but we still want a reliable
 *   free-tier fallback for when paid-tier models hit TPD/TPM limits.
 * - The helper will automatically skip to the next model on rate-limit / capacity errors.
 */
export const MODEL_FALLBACKS = [
  "llama-3.3-70b-versatile",
  "mixtral-8x7b-32768",
  "gemma2-9b-it",
  "llama-3.1-8b-instant",
] as const;

type GroqModel = (typeof MODEL_FALLBACKS)[number];

// Define the fallback result type
export type FallbackResult = {
  success: boolean;
  data?: {
    choices: Array<{
      message: {
        content: string;
      };
    }>;
  };
  error?: string;
  status?: number;
  model?: string;
  modelUsed?: string;
  modelsTried?: string[];
  lastError?: unknown;
  /**
   * If all candidate models are rate-limited, Groq sometimes tells you how long to wait.
   * We parse and surface it so UI can show a friendly "try again in X".
   */
  retryAfterMs?: number;
  retryAfterHuman?: string;
};

function formatRetryAfter(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function parseRetryAfterMsFromGroqMessage(message: string | undefined): number | undefined {
  if (!message) return;
  // Example: "Please try again in 1h23m44.16s"
  const m = message.match(/try again in\s+(\d+)h(\d+)m(\d+(?:\.\d+)?)s/i);
  if (m) {
    const h = Number(m[1]);
    const min = Number(m[2]);
    const sec = Number(m[3]);
    if ([h, min, sec].every((n) => Number.isFinite(n))) {
      return Math.round((h * 3600 + min * 60 + sec) * 1000);
    }
  }
  // Example: "Please try again in 83m44s"
  const m2 = message.match(/try again in\s+(\d+)m(\d+(?:\.\d+)?)s/i);
  if (m2) {
    const min = Number(m2[1]);
    const sec = Number(m2[2]);
    if ([min, sec].every((n) => Number.isFinite(n))) {
      return Math.round((min * 60 + sec) * 1000);
    }
  }
  // Example: "Please try again in 12s"
  const m3 = message.match(/try again in\s+(\d+(?:\.\d+)?)s/i);
  if (m3) {
    const sec = Number(m3[1]);
    if (Number.isFinite(sec)) return Math.round(sec * 1000);
  }
}

function isFallbackWorthyGroqError(status: number, message: string | undefined, code?: string): boolean {
  const msg = (message || "").toLowerCase();
  // 429: TPM/TPD/rate limits. 503/529/524 variants sometimes occur under capacity pressure.
  if (status === 429 || status === 503 || status === 529 || status === 524) return true;
  // 413: request too large for a model context window.
  if (status === 413) return true;
  // Explicit model availability/decommissioning.
  if (code === "model_decommissioned" || code === "model_not_found") return true;
  if (msg.includes("model_decommissioned")) return true;
  if (msg.includes("model not found") || msg.includes("not found for model")) return true;
  if (msg.includes("currently unavailable") || msg.includes("capacity")) return true;
  // Rate limit / quota hints (TPM/TPD).
  if (msg.includes("rate limit")) return true;
  if (msg.includes("tokens per minute")) return true;
  if (msg.includes("tokens per day") || msg.includes("tpd")) return true;
  if (msg.includes("request too large")) return true;
  return false;
}

/**
 * Smart model fallback system that tries models in sequence
 * @param apiKey - GROQ API key
 * @param requestBody - Request body for the API call
 * @returns Promise with fallback result
 */
export async function tryModelsWithFallback(
  apiKey: string,
  requestBody: Record<string, unknown>
): Promise<FallbackResult> {
  let lastError: unknown = null;
  const modelsTried: string[] = [];
  let lastStatus: number | undefined;
  let retryAfterMs: number | undefined;

  for (const model of MODEL_FALLBACKS as readonly GroqModel[]) {
    modelsTried.push(model);
    try {
      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...requestBody,
            model: model,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          data: data,
          model: model,
          modelUsed: model,
          modelsTried,
        };
      }

      // Check if this is a model decommissioning error
      const errorData = await response.json().catch(() => ({}));
      const errorMessage: string | undefined = errorData?.error?.message;
      const errorCode: string | undefined = errorData?.error?.code;
      lastStatus = response.status;
      lastError = errorData;

      // Capture retry-after if Groq provides it (useful for TPD exhaustion).
      const parsedRetry = parseRetryAfterMsFromGroqMessage(errorMessage);
      if (typeof parsedRetry === "number") retryAfterMs = parsedRetry;

      if (errorCode === "model_decommissioned") {
        lastError = {
          type: "model_decommissioned",
          message: `Model ${model} has been decommissioned`,
          model: model,
        };
        continue; // Try next model
      }

      // Retry on the next model for rate-limit/capacity/model-availability errors.
      if (isFallbackWorthyGroqError(response.status, errorMessage, errorCode)) {
        lastError = {
          type:
            response.status === 413
              ? "request_too_large"
              : response.status === 429
                ? "rate_limit"
                : "model_unavailable",
          message: `Groq error for model ${model}; trying next fallback`,
          model,
          status: response.status,
          details: errorMessage,
        };
        continue;
      }

      // Other API errors - return immediately
      return {
        success: false,
        error: errorMessage || "API error",
        status: response.status,
        model: model,
        lastError: errorData,
        modelsTried,
      };
    } catch (error) {
      lastError = {
        type: "network_error",
        message: error instanceof Error ? error.message : "Unknown error",
        model: model,
      };
      continue; // Try next model
    }
  }

  // All models failed
  return {
    success: false,
    error: "All models failed. Please try again later.",
    status: lastStatus,
    lastError,
    modelsTried,
    retryAfterMs,
    retryAfterHuman:
      typeof retryAfterMs === "number" ? formatRetryAfter(retryAfterMs) : undefined,
  };
}
