/**
 * Shared helpers for transaction payment-method display
 * (admin + vendor transaction tables).
 */

export type TransactionPaymentFields = {
  card_brand?: string | null;
  card_last4?: string | null;
  cardLast4?: string | null;
  payment_method?: string | null;
};

export function getCardLast4(row: TransactionPaymentFields): string | null {
  return row.card_last4 ?? row.cardLast4 ?? null;
}

export function formatPaymentMethodLabel(method: string): string {
  const key = method.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const labels: Record<string, string> = {
    stripe: "Stripe",
    paypal: "PayPal",
    bank_transfer: "Bank transfer",
    card: "Card",
    cash: "Cash",
  };
  if (labels[key]) return labels[key];
  return method
    .trim()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Prefer card brand/last4 when present; otherwise show payment_method
 * (stripe / paypal / bank_transfer, etc.).
 */
export function formatTransactionPaymentMethod(
  row: TransactionPaymentFields,
): string | null {
  const cardBrand = row.card_brand;
  const cardLast4 = getCardLast4(row);
  if (cardBrand || cardLast4) {
    return `${cardBrand ?? "Card"}${cardLast4 ? ` ••${cardLast4}` : ""}`;
  }
  if (row.payment_method) {
    return formatPaymentMethodLabel(row.payment_method);
  }
  return null;
}
