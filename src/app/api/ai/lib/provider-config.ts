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
  "mixtral-8x7b-32768",
  "gemma2-9b-it",
  "llama-3.1-8b-instant",
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

function parseModels(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      return [];
    }
  }
  return [];
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
    const body = unwrapRuntimePayload(json);
    if (!body) {
      return setHint(
        "Laravel runtime JSON was empty or status/success=false. Expected data.api_key, data.base_url, data.models.",
      );
    }

    const baseUrl = str(body.base_url).replace(/\/+$/, "");
    const apiKey = str(body.api_key) || str(body.key);
    const models = parseModels(body.models);

    if (!baseUrl || !apiKey || models.length === 0) {
      return setHint(
        "Laravel runtime responded but missing base_url, api_key, or models.",
      );
    }

    lastRuntimeHint = null;
    return {
      isConfigured: true,
      providerType:
        body.provider_type === "anthropic" ? "anthropic" : "openai_compatible",
      baseUrl,
      apiKey,
      models,
      defaultModel: str(body.default_model) || models[0],
      providerId: str(body.provider_id) || "backend",
      isFallback: false,
    };
  } catch {
    return setHint("Laravel runtime request failed (network or invalid JSON).");
  }
}

/**
 * Resolve the active AI config. Prefers the backend-managed provider, falls
 * back to GROQ_API_KEY. Successful lookups cache for 60s; failures cache 5s.
 */
export async function resolveAiRuntimeConfig(): Promise<AiRuntimeConfig> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.value;

  const fromBackend = await fetchRuntimeConfig();
  const value = fromBackend ?? buildGroqFallback();
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

/** Clear the cached config (useful right after an admin saves a new provider). */
export function clearAiRuntimeConfigCache(): void {
  cache = null;
}
