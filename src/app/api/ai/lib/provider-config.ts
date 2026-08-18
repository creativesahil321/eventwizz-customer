import { env } from "@/env";
import type { AiProviderType } from "@/lib/ai/providers";

/**
 * Resolved AI configuration used by every `/api/ai/*` route.
 *
 * The active provider/key/models are owned by the backend so the platform can
 * switch AI without a frontend rebuild. This module fetches that config
 * (cached briefly) and falls back to GROQ_API_KEY so AI keeps working before
 * the backend endpoint exists.
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

const CACHE_TTL_MS = 60_000;

type CacheEntry = { value: AiRuntimeConfig; expiresAt: number };
let cache: CacheEntry | null = null;

interface RuntimeResponseBody {
  provider_id?: string;
  provider_type?: AiProviderType;
  base_url?: string;
  api_key?: string;
  models?: string[];
  default_model?: string | null;
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

async function fetchRuntimeConfig(): Promise<AiRuntimeConfig | null> {
  if (!env.AI_RUNTIME_URL) return null;

  try {
    const res = await fetch(env.AI_RUNTIME_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(env.AI_RUNTIME_SECRET
          ? { "X-Internal-Secret": env.AI_RUNTIME_SECRET }
          : {}),
      },
      // Route handlers cache their own layer; keep this fresh per TTL.
      cache: "no-store",
    });

    if (!res.ok) return null;

    const body = (await res.json()) as RuntimeResponseBody;
    const baseUrl = (body.base_url ?? "").trim().replace(/\/+$/, "");
    const apiKey = (body.api_key ?? "").trim();
    const models = Array.isArray(body.models)
      ? body.models.map((m) => String(m).trim()).filter(Boolean)
      : [];

    if (!baseUrl || !apiKey || models.length === 0) return null;

    return {
      isConfigured: true,
      providerType:
        body.provider_type === "anthropic" ? "anthropic" : "openai_compatible",
      baseUrl,
      apiKey,
      models,
      defaultModel: body.default_model?.trim() || models[0],
      providerId: body.provider_id?.trim() || "backend",
      isFallback: false,
    };
  } catch {
    return null;
  }
}

/**
 * Resolve the active AI config. Prefers the backend-managed provider, falls
 * back to GROQ_API_KEY. Cached for {@link CACHE_TTL_MS} to avoid a round-trip
 * on every AI request.
 */
export async function resolveAiRuntimeConfig(): Promise<AiRuntimeConfig> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.value;

  const fromBackend = await fetchRuntimeConfig();
  const value = fromBackend ?? buildGroqFallback();
  cache = { value, expiresAt: now + CACHE_TTL_MS };
  return value;
}

/** Clear the cached config (useful right after an admin saves a new provider). */
export function clearAiRuntimeConfigCache(): void {
  cache = null;
}
