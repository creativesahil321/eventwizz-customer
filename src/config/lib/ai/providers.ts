/**
 * Shared AI provider catalogue.
 *
 * Safe to import from BOTH client components (admin Settings UI) and server
 * routes (`/api/ai/*`) — it contains no secrets and no server-only imports.
 *
 * The platform is provider-agnostic: any provider that speaks the
 * OpenAI-compatible `/chat/completions` contract (Groq, OpenAI, xAI Grok,
 * Together, DeepSeek, Mistral, OpenRouter, …) works with a single code path.
 * Anthropic uses a different request/response shape and is handled separately
 * in the route layer.
 */

export type AiProviderType = "openai_compatible" | "anthropic";

export interface AiModelOption {
  /** Model id sent to the provider (e.g. "gpt-4o-mini"). */
  id: string;
  /** Human label shown in the admin UI. */
  label: string;
}

export interface AiProviderPreset {
  /** Stable key used as the provider id (e.g. "groq", "openai"). */
  id: string;
  label: string;
  providerType: AiProviderType;
  /** Base URL WITHOUT the trailing `/chat/completions` (or `/messages`). */
  baseUrl: string;
  /** Where an admin obtains a key — shown as a helper link. */
  consoleUrl?: string;
  /** Hint shown near the key input, e.g. "starts with sk-". */
  keyPrefixHint?: string;
  /** Suggested models; admins can enable a subset or add their own. */
  suggestedModels: AiModelOption[];
}

/** Sentinel id for a hand-configured provider (custom base URL + models). */
export const CUSTOM_PROVIDER_ID = "custom";

export const AI_PROVIDER_PRESETS: AiProviderPreset[] = [
  {
    id: "groq",
    label: "Groq",
    providerType: "openai_compatible",
    baseUrl: "https://api.groq.com/openai/v1",
    consoleUrl: "https://console.groq.com/keys",
    keyPrefixHint: "starts with gsk_",
    suggestedModels: [
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B (versatile)" },
      { id: "openai/gpt-oss-120b", label: "GPT OSS 120B" },
      {
        id: "meta-llama/llama-4-scout-17b-16e-instruct",
        label: "Llama 4 Scout 17B",
      },
    ],
  },
  {
    id: "openai",
    label: "OpenAI (ChatGPT)",
    providerType: "openai_compatible",
    baseUrl: "https://api.openai.com/v1",
    consoleUrl: "https://platform.openai.com/api-keys",
    keyPrefixHint: "starts with sk-",
    suggestedModels: [
      { id: "gpt-4o", label: "GPT-4o" },
      { id: "gpt-4o-mini", label: "GPT-4o mini" },
      { id: "gpt-4.1", label: "GPT-4.1" },
      { id: "gpt-4.1-mini", label: "GPT-4.1 mini" },
      { id: "o4-mini", label: "o4-mini (reasoning)" },
    ],
  },
  {
    id: "xai",
    label: "xAI (Grok)",
    providerType: "openai_compatible",
    baseUrl: "https://api.x.ai/v1",
    consoleUrl: "https://console.x.ai",
    keyPrefixHint: "starts with xai-",
    suggestedModels: [
      { id: "grok-2-latest", label: "Grok 2" },
      { id: "grok-2-mini", label: "Grok 2 mini" },
      { id: "grok-beta", label: "Grok beta" },
    ],
  },
  {
    id: "anthropic",
    label: "Anthropic (Claude)",
    providerType: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    consoleUrl: "https://console.anthropic.com/settings/keys",
    keyPrefixHint: "starts with sk-ant-",
    suggestedModels: [
      { id: "claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet" },
      { id: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku" },
      { id: "claude-3-opus-latest", label: "Claude 3 Opus" },
    ],
  },
  {
    id: "together",
    label: "Together AI",
    providerType: "openai_compatible",
    baseUrl: "https://api.together.xyz/v1",
    consoleUrl: "https://api.together.ai/settings/api-keys",
    suggestedModels: [
      {
        id: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
        label: "Llama 3.3 70B Turbo",
      },
      {
        id: "mistralai/Mixtral-8x7B-Instruct-v0.1",
        label: "Mixtral 8x7B",
      },
    ],
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    providerType: "openai_compatible",
    baseUrl: "https://api.deepseek.com/v1",
    consoleUrl: "https://platform.deepseek.com/api_keys",
    suggestedModels: [
      { id: "deepseek-chat", label: "DeepSeek Chat" },
      { id: "deepseek-reasoner", label: "DeepSeek Reasoner" },
    ],
  },
  {
    id: "mistral",
    label: "Mistral AI",
    providerType: "openai_compatible",
    baseUrl: "https://api.mistral.ai/v1",
    consoleUrl: "https://console.mistral.ai/api-keys",
    suggestedModels: [
      { id: "mistral-large-latest", label: "Mistral Large" },
      { id: "mistral-small-latest", label: "Mistral Small" },
    ],
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    providerType: "openai_compatible",
    baseUrl: "https://openrouter.ai/api/v1",
    consoleUrl: "https://openrouter.ai/keys",
    suggestedModels: [
      { id: "openai/gpt-4o-mini", label: "GPT-4o mini (via OpenRouter)" },
      {
        id: "anthropic/claude-3.5-sonnet",
        label: "Claude 3.5 Sonnet (via OpenRouter)",
      },
    ],
  },
  {
    id: CUSTOM_PROVIDER_ID,
    label: "Custom (OpenAI-compatible)",
    providerType: "openai_compatible",
    baseUrl: "",
    suggestedModels: [],
  },
];

export function getProviderPreset(id: string): AiProviderPreset | undefined {
  return AI_PROVIDER_PRESETS.find((p) => p.id === id);
}

/** Default provider used before an admin configures anything. */
export const DEFAULT_PROVIDER_ID = "groq";
