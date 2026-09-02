import type { AiModelOption, AiProviderType } from "./providers";

/** Not usable as EventWizz chatbot / JSON autofill models. */
const NON_CHAT_MODEL =
  /whisper|tts|dall-e|embedding|moderation|transcribe|realtime|sora|wav|pcm|search-preview|text-embedding|davinci-codex|prompt-?guard|llama-guard|orpheus|playai|canopy|safeguard/i;

/** Turn a raw model id into a readable dropdown label. */
export function humanizeModelId(id: string): string {
  const last = id.split("/").pop() ?? id;
  return last
    .replace(/[_]+/g, "-")
    .split("-")
    .filter(Boolean)
    .map((part) => {
      if (/^\d/.test(part) || part === part.toUpperCase()) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

export function isChatModelId(id: string): boolean {
  if (!id.trim()) return false;
  return !NON_CHAT_MODEL.test(id);
}

/**
 * Higher = better default for EventWizz (chat + structured JSON).
 * Used so the dropdown does not pick a tiny/specialist model just because
 * it sorts first alphabetically.
 */
export function scoreChatModel(id: string): number {
  const key = id.toLowerCase();
  if (/llama-3\.3-70b|70b-versatile/.test(key)) return 100;
  if (/llama-4-maverick/.test(key)) return 95;
  if (/llama-4-scout/.test(key)) return 90;
  if (/qwen3\.?5|qwen\/qwen3/.test(key)) return 86;
  if (/qwen3/.test(key)) return 85;
  if (/gpt-oss-120b/.test(key)) return 80;
  if (/claude-sonnet|gpt-4o(?!-mini)|gpt-4\.1(?!-mini)/.test(key)) return 88;
  if (/gpt-4o-mini|gpt-4\.1-mini|claude-haiku/.test(key)) return 75;
  if (/mixtral/.test(key)) return 70;
  if (/llama-3\.1-8b|8b-instant/.test(key)) return 65;
  if (/gpt-oss-20b/.test(key)) return 60;
  if (/gemma/.test(key)) return 50;
  if (/compound/.test(key)) return 40;
  if (/allam/.test(key)) return 15;
  return 30;
}

function sortForEventWizz(a: AiModelOption, b: AiModelOption): number {
  const score = scoreChatModel(b.id) - scoreChatModel(a.id);
  if (score !== 0) return score;
  return a.label.localeCompare(b.label);
}

export function toModelOption(
  id: string,
  displayName?: string | null,
): AiModelOption {
  return {
    id,
    label: displayName?.trim() || humanizeModelId(id),
  };
}

/** Accept Laravel `string[]` or `{ id, label }[]` from list-models. */
export function normalizeAdminModelList(
  models: Array<string | { id?: string; label?: string; name?: string }> | null | undefined,
): AiModelOption[] {
  if (!Array.isArray(models)) return [];
  const seen = new Set<string>();
  const next: AiModelOption[] = [];
  for (const item of models) {
    if (typeof item === "string") {
      const id = item.trim();
      if (!id || seen.has(id) || !isChatModelId(id)) continue;
      seen.add(id);
      next.push(toModelOption(id));
      continue;
    }
    const id = (item.id ?? item.name ?? "").trim();
    if (!id || seen.has(id) || !isChatModelId(id)) continue;
    seen.add(id);
    next.push(toModelOption(id, item.label));
  }
  next.sort(sortForEventWizz);
  return next;
}

export function normalizeListedModels(
  items: Array<{ id?: string; display_name?: string; name?: string }>,
  _providerType: AiProviderType,
): AiModelOption[] {
  const seen = new Set<string>();
  const models: AiModelOption[] = [];
  for (const item of items) {
    const id = (item.id ?? item.name ?? "").trim();
    if (!id || seen.has(id) || !isChatModelId(id)) continue;
    seen.add(id);
    models.push(toModelOption(id, item.display_name));
  }
  models.sort(sortForEventWizz);
  return models;
}

export { type AiProviderType };
