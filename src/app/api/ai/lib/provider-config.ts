import { env } from "@/env";
import type { AiProviderType } from "@/lib/ai/providers";

/**
 * Resolved AI configuration used by every `/api/ai/*` route.
 *
 * Admin Settings stores the key in Laravel. Chat/onboarding/autofill load it
 * from `AI_RUNTIME_URL` (server-to-server), not from the admin GET (which
 * never returns the decrypted key).
 */
export interface AiRuntimeConfig {
  isConfigured: boolean;
  providerType: AiProviderType;
  /** Base URL WITHOUT `/chat/completions`. */
  baseUrl: string;
  apiKey: string;
  /** Ordered model ids to try (fallback order). */
  models: string[];
  /** Preferred model; falls back to models[0]. */
  defaultModel?: string;
  /** Which provider this came from (for logging/telemetry). */
  providerId: string;
  /** True when this came from GROQ_API_KEY rather than the backend. */
  isFallback: boolean;
}

/** Legacy Groq fallback so nothing breaks before the backend is wired. */
const GROQ_FALLBACK_BASE_URL = "https://api.groq.com/openai/v1";
const GROQ_FALLBACK_MODELS = [
  "llama-3.3-70b-versatile",
  "openai/gpt-oss-120b",
  "meta-llama/llama-4-scout-17b-16e-instruct",
];

const SUCCESS_CACHE_TTL_MS = 60_000;
const FAILURE_CACHE_TTL_MS = 5_000;

type CacheEntry = { value: AiRuntimeConfig; expiresAt: number };
let cache: CacheEntry | null = null;
let lastRuntimeHint: string | null = null;

interface RuntimeResponseBody {
  provider_id?: string;
  provider_type?: AiProviderType;
  base_url?: string;
  api_key?: string;
  key?: string;
  models?: unknown;
  default_model?: string | null;
  active_provider_id?: string;
  providers?: unknown;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Laravel wraps most JSON as `{ status|success, data }`. Spec also allows a flat body. */
function unwrapRuntimePayload(json: unknown): RuntimeResponseBody | null {
  const root = asRecord(json);
  if (!root) return null;
  if (root.status === false || root.success === false) return null;
  const inner = asRecord(root.data);
  return (inner ?? root) as RuntimeResponseBody;
}

function parseModelId(item: unknown): string {
  if (typeof item === "string") return item.trim();
  const rec = asRecord(item);
  if (!rec) return "";
  return str(rec.id) || str(rec.model);
}

function parseModels(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(parseModelId).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map(parseModelId).filter(Boolean);
      }
    } catch {
      return [];
    }
  }
  return [];
}

function isNonChatModel(id: string): boolean {
  return /image|audio|whisper|tts|dall-e|davinci|babbage|embedding|moderation|search-api|transcribe|realtime|codex/i.test(
    id,
  );
}

/** Default model first, skip image/audio/instruct junk, cap fallbacks. */
export function orderChatModels(
  models: string[],
  defaultModel?: string,
): string[] {
  const unique = Array.from(new Set(models.filter(Boolean)));
  const chat = unique.filter((id) => !isNonChatModel(id));
  const list = chat.length > 0 ? chat : unique;
  const preferred = defaultModel?.trim();
  if (preferred && list.includes(preferred)) {
    return [preferred, ...list.filter((id) => id !== preferred)].slice(0, 12);
  }
  if (preferred) {
    return [preferred, ...list].slice(0, 12);
  }
  return list.slice(0, 12);
}

function pickRuntimeSource(body: RuntimeResponseBody): RuntimeResponseBody {
  if (!Array.isArray(body.providers)) return body;

  const providers = body.providers
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => item != null);
  if (providers.length === 0) return body;

  const activeId = str(body.active_provider_id) || str(body.provider_id);
  const active =
    providers.find((p) => p.is_active === true) ??
    providers.find((p) => str(p.id) === activeId) ??
    providers[0];

  return {
    provider_id: str(active.id) || activeId,
    provider_type: (str(active.provider_type) ||
      str(body.provider_type)) as AiProviderType,
    base_url: str(active.base_url) || str(body.base_url),
    api_key:
      str(active.api_key) ||
      str(active.key) ||
      str(body.api_key) ||
      str(body.key),
    models: active.models ?? body.models,
    default_model: str(active.default_model) || str(body.default_model) || null,
  };
}

function buildGroqFallback(): AiRuntimeConfig {
  const apiKey = env.GROQ_API_KEY ?? "";
  return {
    isConfigured: apiKey.length > 0,
    providerType: "openai_compatible",
    baseUrl: GROQ_FALLBACK_BASE_URL,
    apiKey,
    models: GROQ_FALLBACK_MODELS,
    defaultModel: GROQ_FALLBACK_MODELS[0],
    providerId: "groq",
    isFallback: true,
  };
}

function setHint(hint: string): null {
  lastRuntimeHint = hint;
  console.warn(`[ai-runtime] ${hint}`);
  return null;
}

async function fetchRuntimeConfig(): Promise<AiRuntimeConfig | null> {
  if (!env.AI_RUNTIME_URL) {
    return setHint(
      "AI_RUNTIME_URL is not set. Chat cannot load the live provider from Laravel.",
    );
  }

  try {
    const res = await fetch(env.AI_RUNTIME_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(env.AI_RUNTIME_SECRET
          ? { "X-Internal-Secret": env.AI_RUNTIME_SECRET }
          : {}),
      },
      cache: "no-store",
    });

    if (res.status === 204) {
      return setHint("Laravel runtime returned 204 (no active provider).");
    }

    if (!res.ok) {
      return setHint(
        `Laravel runtime ${res.status} at AI_RUNTIME_URL. Expected GET /internal/ai-runtime with header X-Internal-Secret (no user JWT).`,
      );
    }

    const json: unknown = await res.json();
    const raw = unwrapRuntimePayload(json);
    if (!raw) {
      return setHint(
        "Laravel runtime JSON was empty or status/success=false. Expected data.api_key, data.base_url, data.models.",
      );
    }

    const body = pickRuntimeSource(raw);
    const baseUrl = str(body.base_url).replace(/\/+$/, "");
    const apiKey = str(body.api_key) || str(body.key);
    const defaultModel = str(body.default_model);
    const models = orderChatModels(parseModels(body.models), defaultModel);

    if (!baseUrl) {
      return setHint("Laravel runtime responded but missing base_url.");
    }
    if (!apiKey) {
      return setHint(
        "Laravel runtime responded without a decrypted api_key. Admin GET (masked_key) cannot be used — GET /internal/ai-runtime must return api_key.",
      );
    }
    if (models.length === 0) {
      return setHint("Laravel runtime responded but models list was empty.");
    }

    lastRuntimeHint = null;
    return {
      isConfigured: true,
      providerType:
        body.provider_type === "anthropic" ? "anthropic" : "openai_compatible",
      baseUrl,
      apiKey,
      models,
      defaultModel: defaultModel || models[0],
      providerId: str(body.provider_id) || "backend",
      isFallback: false,
    };
  } catch {
    return setHint("Laravel runtime request failed (network or invalid JSON).");
  }
}

function laravelRespondedWithoutUsableKey(): boolean {
  const hint = lastRuntimeHint ?? "";
  return (
    hint.includes("without a decrypted api_key") ||
    hint.includes("missing base_url") ||
    hint.includes("models list was empty")
  );
}

function unconfiguredRuntime(): AiRuntimeConfig {
  return {
    isConfigured: false,
    providerType: "openai_compatible",
    baseUrl: "",
    apiKey: "",
    models: [],
    providerId: "unconfigured",
    isFallback: false,
  };
}

/**
 * Resolve the active AI config. Prefers the backend-managed provider, falls
 * back to GROQ_API_KEY. Successful lookups cache for 60s; failures cache 5s.
 *
 * If Laravel is reachable but returns the admin GET shape (masked_key, no
 * decrypted api_key), we do NOT silently fall back to Groq — that is what
 * made onboarding call llama/mixtral while OpenAI was marked live.
 */
export async function resolveAiRuntimeConfig(): Promise<AiRuntimeConfig> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.value;

  const fromBackend = await fetchRuntimeConfig();
  const value =
    fromBackend ??
    (laravelRespondedWithoutUsableKey()
      ? unconfiguredRuntime()
      : buildGroqFallback());
  const ttl = fromBackend ? SUCCESS_CACHE_TTL_MS : FAILURE_CACHE_TTL_MS;
  cache = { value, expiresAt: now + ttl };
  return value;
}

export function getAiRuntimeHint(): string | null {
  return lastRuntimeHint;
}

export function aiUnconfiguredPayload(): {
  error: string;
  hint: string | null;
} {
  return {
    error: "AI service is not configured",
    hint:
      lastRuntimeHint ??
      "No live provider key. Save an AI provider in Admin Settings and expose GET /internal/ai-runtime.",
  };
}

export function aiRuntimeFailureMeta(config: AiRuntimeConfig): {
  hint: string | null;
  providerId: string;
  defaultModel?: string;
  isFallback: boolean;
} {
  return {
    hint: lastRuntimeHint,
    providerId: config.providerId,
    defaultModel: config.defaultModel,
    isFallback: config.isFallback,
  };
}

/** Clear the cached config (useful right after an admin saves a new provider). */
export function clearAiRuntimeConfigCache(): void {
  cache = null;
}
