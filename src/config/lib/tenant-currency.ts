import { useDomainStore } from "@/store/domain.store";
import { resolveCurrencySymbol } from "@/lib/currency-format";

/**
 * Sync read of the tenant currency symbol for non-React helpers (chat, utils).
 * Prefers domain-store theme settings; falls back to {@link DEFAULT_CURRENCY_SYMBOL} (£).
 */
export function getTenantCurrencySymbol(): string {
  try {
    return resolveCurrencySymbol(
      useDomainStore.getState().settings?.currency_symbol,
    );
  } catch {
    return resolveCurrencySymbol(undefined);
  }
}
