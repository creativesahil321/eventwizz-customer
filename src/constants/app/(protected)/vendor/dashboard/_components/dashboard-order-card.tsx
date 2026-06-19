"use client";

import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  CreditCard,
  ReceiptText,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { useCurrencySymbol } from "@/hooks/use-currency-format";
import { formatMoneyLocale } from "@/lib/currency-format";

/**
 * Order card item interface
 */
interface OrderItem {
  title: string;
  value: string | number;
}

/**
 * OrderCard component props interface
 */
interface OrderCardProps {
  orders: OrderItem[];
  /** Number of columns on large screens. Use 2 for fewer cards (e.g. Commissions). @default 4 */
  columns?: 2 | 4;
}

function getOrderItemIcon(title: string): LucideIcon {
  const normalizedTitle = title.trim().toLowerCase();

  switch (normalizedTitle) {
    case "total bookings":
      return ShoppingCart;
    case "total payment":
      return Wallet;
    case "received payment":
      return CreditCard;
    case "total commission":
      return ReceiptText;
    case "commission due":
      return Banknote;
    default:
      return ShoppingCart;
  }
}

/** Booking count only — all other dashboard stat cards are monetary */
function isCountStatTitle(title: string): boolean {
  return title.trim().toLowerCase() === "total bookings";
}

/**
 * Component to display order statistics in cards
 */
export default function OrderCard({ orders, columns = 4 }: OrderCardProps) {
  const currencySymbol = useCurrencySymbol();
  const isThreeWideLayout = columns === 4 && orders.length === 3;

  const gridCols =
    columns === 2
      ? "sm:grid-cols-2 lg:grid-cols-2"
      : isThreeWideLayout
        ? "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3"
        : "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";

  return (
    <div className={`grid grid-cols-1 ${gridCols} gap-4`}>
      {orders.map((order: OrderItem, index: number) => {
        const Icon = getOrderItemIcon(order.title);
        const numeric =
          typeof order.value === "number"
            ? order.value
            : Number.parseFloat(String(order.value));
        const displayValue = isCountStatTitle(order.title)
          ? String(
              Number.isFinite(numeric) ? Math.trunc(numeric) : order.value,
            )
          : formatMoneyLocale(
              Number.isFinite(numeric) ? numeric : 0,
              currencySymbol,
            );

        return (
          <div className="w-full bg-background items-center" key={index}>
            <article className="border shadow-sm p-6 rounded-sm">
              <section className="w-full flex items-start justify-between gap-4">
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <section className="w-full flex items-start lg:items-end justify-between lg:justify-end flex-col">
                  <p className="text-base text-muted-foreground">{order.title}</p>
                  <p className="text-2xl font-bold">{displayValue}</p>
                </section>
              </section>
            </article>
          </div>
        );
      })}
    </div>
  );
}
