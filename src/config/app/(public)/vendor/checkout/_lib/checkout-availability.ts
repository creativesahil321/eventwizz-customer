export type CheckoutAvailabilityTone = "default" | "low" | "sold-out";

export function getRemainingAvailability(
  maxQuantity?: number,
  quantity = 0,
): number | null {
  if (maxQuantity == null || !Number.isFinite(maxQuantity) || maxQuantity < 0) {
    return null;
  }

  return Math.max(0, maxQuantity - quantity);
}

export function formatCheckoutAvailabilityLabel(
  maxQuantity?: number,
  quantity = 0,
): { text: string; tone: CheckoutAvailabilityTone } | null {
  const remaining = getRemainingAvailability(maxQuantity, quantity);
  if (remaining == null) return null;

  if (remaining === 0) {
    return { text: "Sold out", tone: "sold-out" };
  }

  return {
    text: remaining === 1 ? "1 available" : `${remaining} available`,
    tone: remaining <= 10 ? "low" : "default",
  };
}

export function clampCheckoutQuantity(
  quantity: number,
  maxQuantity?: number,
): number {
  const safe = Math.max(0, quantity);
  if (maxQuantity == null || !Number.isFinite(maxQuantity) || maxQuantity < 0) {
    return safe;
  }
  return Math.min(safe, maxQuantity);
}
