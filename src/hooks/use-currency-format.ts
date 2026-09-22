"use client";

import { useContext, useMemo } from "react";
import { useDomainStore } from "@/store/domain.store";
import { useTheme } from "@/providers/theme-provider/ThemeContext";
import { ServerContext } from "@/lib/server-context";
import {
  formatMoney,
  formatMoneyCompact,
  formatMoneyLocale,
  resolveCurrencySymbol,
} from "@/lib/currency-format";

/**
 * Tenant `currency_symbol` from theme API — one path for event pages,
 * location cards, and previews. Never hardcode `$` / `£` in UI.
 */
export function useCurrencySymbol(): string {
  const domainSymbol = useDomainStore((s) => s.settings?.currency_symbol);
  const { theme } = useTheme();
  const serverTheme = useContext(ServerContext)?.theme;

  return useMemo(
    () =>
      resolveCurrencySymbol(
        theme?.currency_symbol ||
          domainSymbol ||
          serverTheme?.currency_symbol,
      ),
    [theme?.currency_symbol, domainSymbol, serverTheme?.currency_symbol],
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
