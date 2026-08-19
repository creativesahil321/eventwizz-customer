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
  // Per-model completion caps (e.g. allam-2-7b = 4096 vs our 8192 request).
  if (
    msg.includes("max_completion_tokens") &&
    msg.includes("must be less than or equal")
  ) {
    return true;
  }
  return false;
}

/** Org/model TPM-TPD — further Groq models usually fail the same way if we keep firing. */
function isRateLimitStop(status: number, message: string | undefined): boolean {
  if (status === 429) return true;
  const msg = (message || "").toLowerCase();
  return (
    msg.includes("tokens per minute") ||
    msg.includes("tokens per day") ||
    (msg.includes("rate limit") && status === 413)
  );
}

/** 4k-context / tiny-TPM models cannot complete onboarding/event JSON. */
function isTooSmallForJsonJob(model: string): boolean {
  const id = model.toLowerCase();
  return id.includes("allam") || id.endsWith("compound-mini");
}

type ChatMessage = { role: string; content: string };

function coerceMessageText(value: unknown): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";
  return value
    .map((part) => {
      if (typeof part === "string") return part;
      if (!part || typeof part !== "object") return "";
      const record = part as Record<string, unknown>;
      if (typeof record.text === "string") return record.text;
      if (typeof record.content === "string") return record.content;
      return "";
    })
    .join("");
}

function visibleAssistantText(msg: Record<string, unknown>): string {
  const content = coerceMessageText(msg.content).trim();
  if (content) return content;
  return [msg.reasoning, msg.reasoning_content]
    .map(coerceMessageText)
    .join("\n")
    .trim();
}

/** Ceiling we request first. Some Groq models (e.g. allam-2-7b) cap lower — we retry from the 400. */
const GROQ_MAX_COMPLETION_TOKENS = 8192;

/**
 * Onboarding / event JSON. Groq reserves input + max_completion against TPM;
 * 8192 made a ~4k prompt request ~12k TPM and 413'd small fallbacks.
 */
export const AI_JSON_MAX_TOKENS = 4096;

function clampCompletionTokens(
  body: Record<string, unknown>,
  cap = GROQ_MAX_COMPLETION_TOKENS,
): Record<string, unknown> {
  const next = { ...body };
  if (typeof next.max_tokens === "number") {
    next.max_tokens = Math.min(next.max_tokens, cap);
  }
  if (typeof next.max_completion_tokens === "number") {
    next.max_completion_tokens = Math.min(next.max_completion_tokens, cap);
  } else if (typeof next.max_tokens === "number") {
    next.max_completion_tokens = next.max_tokens;
  }
  return next;
}

/** Groq: "`max_completion_tokens` must be less than or equal to `4096`" */
function parseMaxCompletionTokensCap(message: string | undefined): number | undefined {
  if (!message) return;
  const match = message.match(
    /max_completion_tokens[`'"]?\s*must be less than or equal to\s*[`'"]?(\d+)/i,
  );
  if (!match) return;
  const n = Number(match[1]);
  if (!Number.isFinite(n) || n < 1) return;
  return Math.min(Math.floor(n), GROQ_MAX_COMPLETION_TOKENS);
}

function stripUnsupportedChatParams(
  body: Record<string, unknown>,
): Record<string, unknown> {
  const {
    reasoning_format: _rf,
    reasoning_effort: _re,
    response_format: _fmt,
    ...rest
  } = body;
  return rest;
}

function hasUnsupportedChatParams(body: Record<string, unknown>): boolean {
  return (
    body.reasoning_format !== undefined ||
    body.reasoning_effort !== undefined ||
    body.response_format !== undefined
  );
}

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
  const postChat = async (
    body: Record<string, unknown>,
    tokenCap?: number,
  ): Promise<{
    ok: boolean;
    status: number;
    content?: string;
    errorMessage?: string;
    errorCode?: string;
  }> => {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(clampCompletionTokens(body, tokenCap)),
    });

    if (response.ok) {
      const data = await response.json();
      const msg = (data?.choices?.[0]?.message ?? {}) as Record<string, unknown>;
      return {
        ok: true,
        status: response.status,
        content: visibleAssistantText(msg),
      };
    }

    const errorData = await response.json().catch(() => ({}));
    return {
      ok: false,
      status: response.status,
      errorMessage: errorData?.error?.message,
      errorCode: errorData?.error?.code,
    };
  };

  const withTokenCapRetry = async (
    body: Record<string, unknown>,
    knownCap?: number,
  ) => {
    let result = await postChat(body, knownCap);
    if (result.ok || result.status !== 400) {
      return { result, cap: knownCap };
    }
    const cap = parseMaxCompletionTokensCap(result.errorMessage);
    if (!cap) return { result, cap: knownCap };
    return { result: await postChat(body, cap), cap };
  };

  let { result, cap: learnedCap } = await withTokenCapRetry({
    ...requestBody,
    model,
  });

  // Qwen/GPT-OSS accept reasoning_* / json_object; Llama etc. may 400 on them.
  if (
    !result.ok &&
    result.status === 400 &&
    hasUnsupportedChatParams(requestBody)
  ) {
    ({ result } = await withTokenCapRetry(
      { ...stripUnsupportedChatParams(requestBody), model },
      learnedCap,
    ));
  }

  return result;
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
  let stoppedForRateLimit = false;

  const maxTokens =
    typeof requestBody.max_tokens === "number"
      ? requestBody.max_tokens
      : typeof requestBody.max_completion_tokens === "number"
        ? requestBody.max_completion_tokens
        : 0;
  const jsonSizedJob = maxTokens >= 2048;

  for (const model of config.models) {
    if (jsonSizedJob && isTooSmallForJsonJob(model)) {
      continue;
    }
    modelsTried.push(model);
    try {
      const result = await callProvider(config, model, requestBody);

      if (result.ok) {
        const text = result.content?.trim() ?? "";
        if (!text) {
          lastError = {
            type: "empty_content",
            message: `Model ${model} returned an empty message`,
            model,
          };
          continue;
        }
        return {
          success: true,
          data: { choices: [{ message: { content: text } }] },
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
        if (isRateLimitStop(result.status, errorMessage)) {
          stoppedForRateLimit = true;
          lastError = {
            type: "rate_limit",
            message: errorMessage || `Rate limited on ${model}`,
            model,
            status: result.status,
            details: errorMessage,
          };
          break;
        }
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

  const retryAfterHuman =
    typeof retryAfterMs === "number" ? formatRetryAfter(retryAfterMs) : undefined;

  // All models failed
  return {
    success: false,
    error: stoppedForRateLimit
      ? retryAfterHuman
        ? `The AI provider is busy. Try again in ${retryAfterHuman}.`
        : "The AI provider is rate limited. Please try again shortly."
      : "All models failed. Please try again later.",
    status: stoppedForRateLimit ? 429 : lastStatus,
    lastError,
    modelsTried,
    retryAfterMs,
    retryAfterHuman,
  };
}
