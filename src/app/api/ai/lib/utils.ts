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
  "openai/gpt-oss-120b",
  "meta-llama/llama-4-scout-17b-16e-instruct",
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
  if (status === 404) return true;
  if (code === "model_decommissioned" || code === "model_not_found") return true;
  if (msg.includes("model_decommissioned")) return true;
  if (msg.includes("model not found") || msg.includes("not found for model")) return true;
  if (msg.includes("does not exist") || msg.includes("do not have access")) return true;
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
  // Newer Claude / reasoning models reject temperature etc. After a same-model
  // retry, leftover 400s should still skip to the next fallback model.
  if (
    status === 400 &&
    (msg.includes("deprecated") || msg.includes("unsupported parameter"))
  ) {
    return true;
  }
  return false;
}

/**
 * Stop the whole chain only when the *account* is exhausted (quota / daily cap).
 * A per-model 429 should skip to the next enabled fallback model.
 */
function isAccountWideRateLimit(
  status: number,
  message: string | undefined,
  code?: string,
): boolean {
  const msg = (message || "").toLowerCase();
  const errCode = (code || "").toLowerCase();
  if (errCode === "insufficient_quota") return true;
  if (msg.includes("insufficient_quota") || msg.includes("exceeded your current quota")) {
    return true;
  }
  if (msg.includes("tokens per day") || /\btpd\b/.test(msg)) return true;
  if (msg.includes("monthly") && (msg.includes("limit") || msg.includes("quota"))) {
    return true;
  }
  if (msg.includes("billing") && msg.includes("hard limit")) return true;
  if (status === 413 && msg.includes("rate limit")) return true;
  return false;
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

type CompletionTokenParam = "max_completion_tokens" | "max_tokens";

function completionTokenLimit(
  body: Record<string, unknown>,
  cap: number,
): number | undefined {
  const fromCompletion =
    typeof body.max_completion_tokens === "number"
      ? body.max_completion_tokens
      : undefined;
  const fromTokens =
    typeof body.max_tokens === "number" ? body.max_tokens : undefined;
  const raw = fromCompletion ?? fromTokens;
  if (typeof raw !== "number" || !Number.isFinite(raw)) return undefined;
  return Math.min(raw, cap);
}

/** Groq + current OpenAI chat models want this; never send both fields. */
function completionTokenParam(
  baseUrl: string,
  model: unknown,
): CompletionTokenParam {
  if (/groq\.com/i.test(baseUrl)) return "max_completion_tokens";
  if (/openai\.com/i.test(baseUrl)) return "max_completion_tokens";
  const id = typeof model === "string" ? model.toLowerCase() : "";
  if (/^(gpt-4\.1|gpt-5|o[1-9]|chatgpt)/.test(id)) {
    return "max_completion_tokens";
  }
  return "max_completion_tokens";
}

/**
 * OpenAI (gpt-4.1 / gpt-5) 400s if both token fields are set. Groq historically
 * wanted max_completion_tokens copied from max_tokens — never send both.
 */
function clampCompletionTokens(
  body: Record<string, unknown>,
  cap = GROQ_MAX_COMPLETION_TOKENS,
  param: CompletionTokenParam = "max_completion_tokens",
): Record<string, unknown> {
  const next = { ...body };
  const limit = completionTokenLimit(body, cap);
  delete next.max_tokens;
  delete next.max_completion_tokens;
  if (typeof limit === "number") {
    next[param] = limit;
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

function omitKeys(
  body: Record<string, unknown>,
  keys: string[],
): Record<string, unknown> {
  const next = { ...body };
  for (const key of keys) delete next[key];
  return next;
}

function isRejectedRequestParam(
  message: string | undefined,
  param: string,
): boolean {
  const msg = (message || "").toLowerCase();
  if (!msg.includes(param.toLowerCase())) return false;
  return (
    msg.includes("deprecated") ||
    msg.includes("unsupported") ||
    msg.includes("not supported") ||
    msg.includes("not allowed") ||
    msg.includes("unknown parameter")
  );
}

/** Claude 4.5 / Sonnet 5 and some reasoning models reject sampling params. */
function modelRejectsTemperature(model: string): boolean {
  const id = model.toLowerCase();
  return (
    id.includes("claude") ||
    id.includes("sonnet") ||
    id.includes("opus-4")
  );
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

    const postAnthropic = async (includeTemperature: boolean) => {
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
          ...(includeTemperature && typeof requestBody.temperature === "number"
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
        return { ok: true as const, status: response.status, content };
      }

      const errorData = await response.json().catch(() => ({}));
      return {
        ok: false as const,
        status: response.status,
        errorMessage: errorData?.error?.message as string | undefined,
        errorCode: errorData?.error?.type as string | undefined,
      };
    };

    const useTemp =
      typeof requestBody.temperature === "number" &&
      !modelRejectsTemperature(model);
    let anthropicResult = await postAnthropic(useTemp);
    if (
      !anthropicResult.ok &&
      anthropicResult.status === 400 &&
      isRejectedRequestParam(anthropicResult.errorMessage, "temperature")
    ) {
      anthropicResult = await postAnthropic(false);
    }
    return anthropicResult;
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
    const send = async (payload: Record<string, unknown>) => {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        const choiceMsg = (data?.choices?.[0]?.message ?? {}) as Record<
          string,
          unknown
        >;
        return {
          ok: true as const,
          status: response.status,
          content: visibleAssistantText(choiceMsg),
        };
      }

      const errorData = await response.json().catch(() => ({}));
      return {
        ok: false as const,
        status: response.status,
        errorMessage: errorData?.error?.message as string | undefined,
        errorCode: errorData?.error?.code as string | undefined,
      };
    };

    const param = completionTokenParam(baseUrl, body.model);
    const cap = tokenCap ?? GROQ_MAX_COMPLETION_TOKENS;
    const modelId = typeof body.model === "string" ? body.model : "";
    const firstBody = modelRejectsTemperature(modelId)
      ? omitKeys(body, ["temperature", "top_p"])
      : body;
    let result = await send(clampCompletionTokens(firstBody, cap, param));

    const err = (result.errorMessage ?? "").toLowerCase();
    if (
      !result.ok &&
      result.status === 400 &&
      err.includes("max_tokens") &&
      err.includes("max_completion_tokens")
    ) {
      result = await send(
        clampCompletionTokens(firstBody, cap, "max_completion_tokens"),
      );
    }
    if (
      !result.ok &&
      result.status === 400 &&
      /unsupported parameter.*max_completion_tokens/i.test(
        result.errorMessage ?? "",
      )
    ) {
      result = await send(clampCompletionTokens(firstBody, cap, "max_tokens"));
    }
    if (
      !result.ok &&
      result.status === 400 &&
      /unsupported parameter.*['"]max_tokens['"]/i.test(result.errorMessage ?? "")
    ) {
      result = await send(
        clampCompletionTokens(firstBody, cap, "max_completion_tokens"),
      );
    }
    if (
      !result.ok &&
      result.status === 400 &&
      (isRejectedRequestParam(result.errorMessage, "temperature") ||
        isRejectedRequestParam(result.errorMessage, "top_p"))
    ) {
      result = await send(
        clampCompletionTokens(
          omitKeys(body, ["temperature", "top_p"]),
          cap,
          param,
        ),
      );
    }

    return result;
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
    // Never inject Groq model ids onto OpenAI / Anthropic / custom endpoints.
    models: input.models,
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
  if (config.models.length === 0) {
    return {
      success: false,
      error:
        "No chat models configured for this AI provider. Set a default model in Admin Settings.",
      lastError: {
        type: "no_models",
        message: "Runtime config had an empty models list",
      },
      modelsTried: [],
    };
  }

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
      if (typeof parsedRetry === "number") {
        retryAfterMs =
          typeof retryAfterMs === "number"
            ? Math.min(retryAfterMs, parsedRetry)
            : parsedRetry;
      }

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
        if (result.status === 429) {
          stoppedForRateLimit = true;
        }
        if (isAccountWideRateLimit(result.status, errorMessage, errorCode)) {
          lastError = {
            type: "rate_limit",
            message: errorMessage || `Account quota exhausted on ${model}`,
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
