import type { AiProviderType } from "@/lib/ai/providers";

/**
 * Admin AI provider settings contract.
 *
 * Endpoints (Laravel):
 * - GET    /admin/settings/ai-providers
 * - PUT    /admin/settings/ai-providers            (upsert one provider)
 * - DELETE /admin/settings/ai-providers/{id}
 * - POST   /admin/settings/ai-providers/{id}/activate
 * - GET    /admin/settings/ai-providers/{id}/models
 *
 * The full API key is NEVER returned by the backend — only `is_configured`
 * plus a short `masked_key` hint.
 */

export interface AdminAiProvider {
  /** Stable id, matches a preset id ("groq", "openai", …) or a custom slug. */
  id: string;
  label: string;
  provider_type: AiProviderType;
  /** Base URL without `/chat/completions`. */
  base_url: string;
  /** True when a key is stored for this provider. */
  is_configured: boolean;
  /** e.g. "••••abcd" — never the full secret. */
  masked_key: string | null;
  /** Whether this is the provider the platform currently uses. */
  is_active: boolean;
  /** Enabled model ids, ordered — first is tried first (fallback order). */
  models: string[];
  /** Preferred model; must be one of `models`. */
  default_model: string | null;
  updated_at: string | null;
}

export interface AdminAiSettingsData {
  active_provider_id: string | null;
  providers: AdminAiProvider[];
}

export interface AdminAiSettingsResponse {
  status: boolean;
  message: string;
  data: AdminAiSettingsData;
  errors: unknown[];
}

export interface AdminAiProviderUpsertPayload {
  id: string;
  label: string;
  provider_type: AiProviderType;
  base_url: string;
  /** Send only when setting or rotating the key; omit to keep the stored key. */
  api_key?: string;
  /** Ordered enabled model ids (fallback order). */
  models: string[];
  default_model: string | null;
  is_active: boolean;
}

export interface AdminAiModelOption {
  id: string;
  label?: string;
}

export interface AdminAiModelsResponse {
  status: boolean;
  message: string;
  data: {
    id?: string;
    /** Laravel returns model ids as strings. */
    models: Array<string | AdminAiModelOption>;
  };
  errors: unknown[];
}
