"use client";

import { useMemo } from "react";
import { useDomainStore } from "@/store/domain.store";
import { useTheme } from "@/providers/theme-provider/ThemeContext";
import {
  formatMoney,
  formatMoneyCompact,
  formatMoneyLocale,
  resolveCurrencySymbol,
} from "@/lib/currency-format";

/**
 * Tenant currency symbol from theme (API `currency_symbol`) with safe default.
 * Prefers ThemeProvider (SSR + client query); falls back to domain store.
 */
export function useCurrencySymbol(): string {
  const domainSymbol = useDomainStore((s) => s.settings?.currency_symbol);
  const { theme } = useTheme();

  return useMemo(
    () => resolveCurrencySymbol(theme?.currency_symbol ?? domainSymbol),
    [theme?.currency_symbol, domainSymbol],
  );
}

export function useCurrencyFormat() {
  const symbol = useCurrencySymbol();

  return useMemo(
    () => ({
      symbol,
      format: (amount: number) => formatMoney(amount, symbol),
      formatCompact: (amount: number) => formatMoneyCompact(amount, symbol),
      formatLocale: (amount: number) => formatMoneyLocale(amount, symbol),
    }),
    [symbol],
  );
}
