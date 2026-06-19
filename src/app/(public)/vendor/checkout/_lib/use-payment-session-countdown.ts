import { useEffect, useState } from "react";

export function formatPaymentCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
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
