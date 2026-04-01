/**
 * Currency display helpers — symbol comes from tenant theme API (`currency_symbol`).
 * Use {@link useCurrencySymbol} / {@link useCurrencyFormat} in client components.
 */

export const DEFAULT_CURRENCY_SYMBOL = "£";

export function resolveCurrencySymbol(symbol?: string | null): string {
  const s = symbol?.trim();
  return s && s.length > 0 ? s : DEFAULT_CURRENCY_SYMBOL;
}

/** Map common display symbols to ISO 4217 (fallback when API omits currency code). */
const SYMBOL_TO_ISO4217: Readonly<Record<string, string>> = {
  "£": "GBP",
  "$": "USD",
  "€": "EUR",
  "₹": "INR",
  "¥": "JPY",
};

function inferIsoFromAmountPrefix(amount: unknown): string | undefined {
  if (typeof amount !== "string") return undefined;
  const t = amount.trim();
  if (t.startsWith("£")) return "GBP";
  if (t.startsWith("$")) return "USD";
  if (t.startsWith("€")) return "EUR";
  if (t.startsWith("₹")) return "INR";
  if (t.startsWith("¥")) return "JPY";
  return undefined;
}

/**
 * Best-effort ISO 4217 code for transaction detail UIs.
 * Checks several API field names, then amount prefix, then tenant symbol.
 */
export function resolveTransactionCurrencyIso(
  raw: {
    currency?: string | null;
    currency_code?: string | null;
    currencyCode?: string | null;
    amount?: string | null;
  },
  tenantSymbol: string,
): string {
  const candidates = [
    raw.currency_code,
    raw.currencyCode,
    raw.currency,
  ];
  for (const c of candidates) {
    if (typeof c === "string") {
      const t = c.trim();
      if (t.length >= 3) return t.toUpperCase();
      if (t.length === 1 && SYMBOL_TO_ISO4217[t]) {
        return SYMBOL_TO_ISO4217[t];
      }
    }
  }
  const fromAmount = inferIsoFromAmountPrefix(raw.amount);
  if (fromAmount) return fromAmount;
  const sym = resolveCurrencySymbol(tenantSymbol);
  return SYMBOL_TO_ISO4217[sym] ?? "GBP";
}

/**
 * Format a numeric amount with the given symbol (prefix style: £10.00).
 */
export function formatMoney(
  amount: number,
  symbol: string = DEFAULT_CURRENCY_SYMBOL
): string {
  const sym = resolveCurrencySymbol(symbol);
  const n = Number(amount);
  if (!Number.isFinite(n)) {
    return `${sym}0.00`;
  }
  return `${sym}${n.toFixed(2)}`;
}

/**
 * Same as formatMoney but omits trailing ".00" when the value is a whole number.
 */
/**
 * Like {@link formatMoney} but uses locale grouping (e.g. £1,234.56).
 */
export function formatMoneyLocale(
  amount: number,
  symbol: string = DEFAULT_CURRENCY_SYMBOL,
  locale: string = "en-GB",
): string {
  const sym = resolveCurrencySymbol(symbol);
  const n = Number(amount);
  if (!Number.isFinite(n)) {
    return `${sym}0.00`;
  }
  return `${sym}${n.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatMoneyCompact(
  amount: number,
  symbol: string = DEFAULT_CURRENCY_SYMBOL
): string {
  const sym = resolveCurrencySymbol(symbol);
  const n = Number(amount);
  if (!Number.isFinite(n)) {
    return `${sym}0`;
  }
  const rounded = Math.round(n * 100) / 100;
  if (Number.isInteger(rounded)) {
    return `${sym}${rounded}`;
  }
  return `${sym}${rounded.toFixed(2)}`;
}

/**
 * Escape a symbol for use in RegExp (e.g. $ → \$).
 */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Strip common currency prefixes/suffixes and thousands separators; parse as float.
 */
export function parseFormattedMoney(
  value: string,
  knownSymbol?: string | null
): number {
  if (value == null || value === "") {
    return NaN;
  }
  let s = String(value).trim();
  const sym = resolveCurrencySymbol(knownSymbol);
  s = s.replace(new RegExp(`^\\s*${escapeRegExp(sym)}\\s*`, "i"), "");
  s = s.replace(new RegExp(`\\s*${escapeRegExp(sym)}\\s*$`, "i"), "");
  s = s.replace(/[$€]/g, "").replace(/,/g, "").trim();
  const n = parseFloat(s);
  return n;
}
