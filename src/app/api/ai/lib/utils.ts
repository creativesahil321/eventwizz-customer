import type { AiRuntimeConfig } from "./provider-config";

/**
 * Default model fallbacks in priority order (used when no dynamic config is
 * available — i.e. the legacy Groq path).
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

type ChatMessage = { role: string; content: string };

/**
 * Normalise the openai-style requestBody the routes build into whatever the
 * target provider expects. Both branches return a promise resolving to a
 * uniform `{ ok, status, content?, errorMessage?, errorCode? }` shape.
 */
async function callProvider(
  config: Pick<AiRuntimeConfig, "providerType" | "baseUrl" | "apiKey">,
  model: string,
  requestBody: Record<string, unknown>,
): Promise<{
  ok: boolean;
  status: number;
  content?: string;
  errorMessage?: string;
  errorCode?: string;
}> {
  const baseUrl = config.baseUrl.replace(/\/+$/, "");

  if (config.providerType === "anthropic") {
    const messages = Array.isArray(requestBody.messages)
      ? (requestBody.messages as ChatMessage[])
      : [];
    const system = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");
    const chat = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content }));

    const response = await fetch(`${baseUrl}/messages`, {
      method: "POST",
      headers: {
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens:
          typeof requestBody.max_tokens === "number"
            ? requestBody.max_tokens
            : 1024,
        ...(typeof requestBody.temperature === "number"
          ? { temperature: requestBody.temperature }
          : {}),
        ...(system ? { system } : {}),
        messages: chat,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const blocks = Array.isArray(data?.content) ? data.content : [];
      const content = blocks
        .filter((b: { type?: string }) => b?.type === "text")
        .map((b: { text?: string }) => b.text ?? "")
        .join("");
      return { ok: true, status: response.status, content };
    }

    const errorData = await response.json().catch(() => ({}));
    return {
      ok: false,
      status: response.status,
      errorMessage: errorData?.error?.message,
      errorCode: errorData?.error?.type,
    };
  }

  // OpenAI-compatible (Groq, OpenAI, xAI, Together, DeepSeek, Mistral, …)
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...requestBody, model }),
  });

  if (response.ok) {
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content ?? "";
    return { ok: true, status: response.status, content };
  }

  const errorData = await response.json().catch(() => ({}));
  return {
    ok: false,
    status: response.status,
    errorMessage: errorData?.error?.message,
    errorCode: errorData?.error?.code,
  };
}

/** Coerce the legacy `apiKey` string arg into a Groq runtime config. */
function toRuntimeConfig(
  input: string | AiRuntimeConfig,
): Pick<AiRuntimeConfig, "providerType" | "baseUrl" | "apiKey" | "models"> {
  if (typeof input === "string") {
    return {
      providerType: "openai_compatible",
      baseUrl: "https://api.groq.com/openai/v1",
      apiKey: input,
      models: [...MODEL_FALLBACKS],
    };
  }
  return {
    providerType: input.providerType,
    baseUrl: input.baseUrl,
    apiKey: input.apiKey,
    models: input.models.length > 0 ? input.models : [...MODEL_FALLBACKS],
  };
}

/**
 * Provider-agnostic model fallback. Tries each configured model in order and
 * skips to the next on rate-limit / capacity / availability errors.
 *
 * Accepts either a resolved {@link AiRuntimeConfig} (dynamic, multi-provider)
 * or a bare API key string (legacy Groq path) for backward compatibility.
 */
export async function tryModelsWithFallback(
  configOrApiKey: string | AiRuntimeConfig,
  requestBody: Record<string, unknown>
): Promise<FallbackResult> {
  const config = toRuntimeConfig(configOrApiKey);
  let lastError: unknown = null;
  const modelsTried: string[] = [];
  let lastStatus: number | undefined;
  let retryAfterMs: number | undefined;

  for (const model of config.models) {
    modelsTried.push(model);
    try {
      const result = await callProvider(config, model, requestBody);

      if (result.ok) {
        return {
          success: true,
          data: { choices: [{ message: { content: result.content ?? "" } }] },
          model,
          modelUsed: model,
          modelsTried,
        };
      }

      const errorMessage = result.errorMessage;
      const errorCode = result.errorCode;
      lastStatus = result.status;
      lastError = { message: errorMessage, code: errorCode, model };

      // Capture retry-after if the provider hints one (useful for TPD exhaustion).
      const parsedRetry = parseRetryAfterMsFromGroqMessage(errorMessage);
      if (typeof parsedRetry === "number") retryAfterMs = parsedRetry;

      if (errorCode === "model_decommissioned") {
        lastError = {
          type: "model_decommissioned",
          message: `Model ${model} has been decommissioned`,
          model,
        };
        continue; // Try next model
      }

      // Retry on the next model for rate-limit/capacity/model-availability errors.
      if (isFallbackWorthyGroqError(result.status, errorMessage, errorCode)) {
        lastError = {
          type:
            result.status === 413
              ? "request_too_large"
              : result.status === 429
                ? "rate_limit"
                : "model_unavailable",
          message: `AI provider error for model ${model}; trying next fallback`,
          model,
          status: result.status,
          details: errorMessage,
        };
        continue;
      }

      // Other API errors - return immediately
      return {
        success: false,
        error: errorMessage || "API error",
        status: result.status,
        model,
        lastError,
        modelsTried,
      };
    } catch (error) {
      lastError = {
        type: "network_error",
        message: error instanceof Error ? error.message : "Unknown error",
        model,
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
