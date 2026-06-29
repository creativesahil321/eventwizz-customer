import { useEffect, useState } from "react";

/** Compact timer for pills — e.g. "29:45" or "1:05:30". */
export function formatPaymentCountdown(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Plain-language countdown for banner copy — e.g. "29 min 45 sec". */
export function formatPaymentTimeRemainingVerbose(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  if (safe === 0) return "0 sec";
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h} hr${h === 1 ? "" : "s"}`);
  if (m > 0) parts.push(`${m} min`);
  if (s > 0 || parts.length === 0) parts.push(`${s} sec`);
  return parts.join(" ");
}

/** Live countdown from an absolute Unix timestamp (seconds). */
export function usePaymentSessionCountdown(
  expiresAt: number | undefined | null,
  onExpire?: () => void,
): number | null {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt) {
      setSecondsLeft(null);
      return;
    }

    const compute = () =>
      Math.max(0, expiresAt - Math.floor(Date.now() / 1000));

    const initial = compute();
    if (initial === 0) {
      setSecondsLeft(0);
      onExpire?.();
      return;
    }

    setSecondsLeft(initial);

    const id = setInterval(() => {
      const remaining = compute();
      setSecondsLeft(remaining);
      if (remaining === 0) {
        clearInterval(id);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(id);
  }, [expiresAt, onExpire]);

  return secondsLeft;
}
