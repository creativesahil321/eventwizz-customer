const KEY = "ew_ai_bulk_apply_active";
/** If the tab dies before `finally`, ignore guard after this so returning vendors still get manual mode. */
const TTL_MS = 25 * 60 * 1000;

/** Set while AI is sequentially saving steps 1–9 so client mode logic does not switch to manual mid-run. */
export function markAIBulkApplyStarted(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, String(Date.now()));
}

export function clearAIBulkApplyStarted(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
}

export function isAIBulkApplyInProgress(): boolean {
  if (typeof window === "undefined") return false;
  const raw = sessionStorage.getItem(KEY);
  if (raw === null || raw === "") return false;
  const ts = Number(raw);
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts < TTL_MS;
}
