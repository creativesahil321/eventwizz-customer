const AI_EVENT_DRAFT_ID_KEY = "vendor_ai_event_draft_id";

export function persistAiEventDraftId(eventId: number): void {
  if (typeof window === "undefined" || !Number.isFinite(eventId) || eventId <= 0) {
    return;
  }
  sessionStorage.setItem(AI_EVENT_DRAFT_ID_KEY, String(eventId));
}

export function readAiEventDraftId(): number | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(AI_EVENT_DRAFT_ID_KEY);
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function clearAiEventDraftId(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(AI_EVENT_DRAFT_ID_KEY);
}

/** Resolves draft event id from callback arg, in-memory ref, or session (AI → manual handoff). */
export function resolveAiDraftEventId(
  explicitId?: number | null,
  refId?: number | null,
): number | undefined {
  const id = explicitId ?? refId ?? readAiEventDraftId();
  return id && id > 0 ? id : undefined;
}
