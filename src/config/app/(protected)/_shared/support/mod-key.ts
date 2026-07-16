/**
 * Platform modifier key label for keyboard shortcut hints.
 */
export function getModKeyLabel(): "Cmd" | "Ctrl" {
  if (typeof navigator === "undefined") return "Ctrl";
  const platform = navigator.platform || navigator.userAgent || "";
  return /Mac|iPhone|iPad|iPod/i.test(platform) ? "Cmd" : "Ctrl";
}
