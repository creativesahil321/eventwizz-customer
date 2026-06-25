"use client";

import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CheckoutDateCard } from "./types";
import { SingleDateEventStrip } from "./single-date-event-strip";

/** Above this count, use a horizontal strip instead of a full card grid. */
export const MULTI_DATE_STRIP_THRESHOLD = 5;

export interface DateCardViewModel {
  card: CheckoutDateCard;
  pendingDue: number;
  showDatePay: boolean;
  isFullyPaid: boolean;
  statusLabel: string;
}

interface MultiDateSelectorProps {
  items: DateCardViewModel[];
  selectedDateId: string;
  onSelectDate: (id: string) => void;
  onPayForDate: (id: string) => void;
  formatCurrency: (amount: number) => string;
  isProcessingPayment?: boolean;
}

function statusBadgeStyle(status: CheckoutDateCard["paymentStatus"]) {
  if (status === "paid") {
    return { background: "#ecfdf5", borderColor: "#bbf7d0", color: "#15803d" };
  }
  if (status === "partial" || status === "pending") {
    return { background: "#fff7ed", borderColor: "#fed7aa", color: "#c2410c" };
  }
  return { background: "#f3f4f6", borderColor: "#e5e7eb", color: "#4b5563" };
}

function DateCardGridItem({
  item,
  active,
  onSelect,
  onPay,
  formatCurrency,
  isProcessingPayment,
}: {
  item: DateCardViewModel;
  active: boolean;
  onSelect: () => void;
  onPay: () => void;
  formatCurrency: (amount: number) => string;
  isProcessingPayment?: boolean;
}) {
  const { card, pendingDue, showDatePay, isFullyPaid, statusLabel } = item;

  return (
    <div
      className="flex flex-col overflow-hidden rounded-xl border bg-card transition-all p-0"
      style={
        active
          ? {
              borderColor: "var(--color-primary)",
              backgroundColor:
                "color-mix(in srgb, var(--color-primary) 8%, var(--card))",
              boxShadow:
                "0 0 0 1px color-mix(in srgb, var(--color-primary) 22%, transparent)",
            }
          : { borderColor: "var(--border)" }
      }
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex-1 px-3.5 pt-3 pb-2.5 rounded-none text-left transition-colors sm:px-4 sm:pt-3.5 sm:pb-3"
      >
        <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1.5">
          <p
            className={cn(
              "min-w-0 flex-1 text-sm font-bold leading-snug",
              active ? "text-[var(--color-primary)]" : "text-foreground",
            )}
          >
            {card.date}
          </p>
          <span
            className="inline-flex max-w-full shrink-0 items-center justify-center rounded-md border border-transparent px-[0.45rem] py-[0.2rem] text-[0.5625rem] font-bold leading-[1.1] tracking-[0.04em] whitespace-nowrap sm:text-[0.625rem] sm:px-2 sm:py-1"
            style={statusBadgeStyle(card.paymentStatus)}
          >
            {statusLabel}
          </span>
        </div>
        {card.subtitle && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {card.subtitle}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Total
            </p>
            <p className="mt-0.5 text-lg font-bold leading-none text-foreground">
              {card.amountFormatted}
            </p>
          </div>
          <div className="shrink-0 text-right">
            {isFullyPaid ? (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#16a34a]">
                  Paid
                </p>
                <p className="mt-0.5 text-base font-bold leading-none text-[#16a34a]">
                  {card.paidAmountFormatted}
                </p>
              </>
            ) : pendingDue > 0 ? (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#ea580c]">
                  Due
                </p>
                <p className="mt-0.5 text-base font-bold leading-none text-[#ea580c]">
                  {formatCurrency(pendingDue)}
                </p>
              </>
            ) : (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Paid
                </p>
                <p className="mt-0.5 text-base font-bold leading-none text-muted-foreground">
                  {card.paidAmountFormatted}
                </p>
              </>
            )}
          </div>
        </div>
      </button>
      {isFullyPaid ? (
        <div className="mx-[0.625rem] mb-[0.625rem] flex items-center justify-center gap-1.5 rounded-lg bg-[#ecfdf5] px-3 py-2 text-xs font-semibold leading-none text-[#15803d]">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
          <span>Fully Paid</span>
        </div>
      ) : showDatePay ? (
        <Button
          type="button"
          size="sm"
          className="mx-[0.625rem] mb-[0.625rem] h-9 min-h-9 w-[calc(100%-1.25rem)] rounded-lg px-3 text-[0.75rem] font-bold leading-tight sm:text-[0.8125rem]"
          style={{
            background: "var(--color-primary)",
            color: "var(--color-primary-foreground)",
          }}
          onClick={onPay}
          disabled={isProcessingPayment}
        >
          Pay {formatCurrency(pendingDue)} Now
        </Button>
      ) : null}
    </div>
  );
}

function DateStripPill({
  item,
  active,
  onSelect,
  formatCurrency,
}: {
  item: DateCardViewModel;
  active: boolean;
  onSelect: () => void;
  formatCurrency: (amount: number) => string;
}) {
  const { card, pendingDue, isFullyPaid, statusLabel } = item;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "snap-start shrink-0 w-[11.25rem] rounded-xl border bg-card p-3 text-left transition-all sm:w-[12.5rem]",
        active && "ring-1 ring-[var(--color-primary)]",
      )}
      style={
        active
          ? {
              borderColor: "var(--color-primary)",
              backgroundColor:
                "color-mix(in srgb, var(--color-primary) 8%, var(--card))",
            }
          : { borderColor: "var(--border)" }
      }
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={cn(
            "min-w-0 text-xs font-bold leading-snug line-clamp-2",
            active ? "text-[var(--color-primary)]" : "text-foreground",
          )}
        >
          {card.date}
        </p>
        <span
          className="inline-flex shrink-0 rounded-md border border-transparent px-1.5 py-0.5 text-[0.5rem] font-bold uppercase leading-none"
          style={statusBadgeStyle(card.paymentStatus)}
        >
          {statusLabel.length > 10 ? statusLabel.slice(0, 8) + "…" : statusLabel}
        </span>
      </div>
      {card.subtitle && (
        <p className="mt-1 truncate text-[11px] text-muted-foreground">
          {card.subtitle}
        </p>
      )}
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-semibold text-muted-foreground">
          {card.amountFormatted}
        </span>
        <span
          className={cn(
            "text-[10px] font-bold",
            isFullyPaid ? "text-[#16a34a]" : pendingDue > 0 ? "text-[#ea580c]" : "text-muted-foreground",
          )}
        >
          {isFullyPaid
            ? "Paid"
            : pendingDue > 0
              ? `Due ${formatCurrency(pendingDue)}`
              : card.paidAmountFormatted}
        </span>
      </div>
    </button>
  );
}

function SelectedDateActionBar({
  item,
  onPay,
  formatCurrency,
  isProcessingPayment,
}: {
  item: DateCardViewModel;
  onPay: () => void;
  formatCurrency: (amount: number) => string;
  isProcessingPayment?: boolean;
}) {
  const { card, pendingDue, showDatePay, isFullyPaid } = item;

  return (
    <div className="mt-3 flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <div className="min-w-0">
        <p className="text-sm font-bold text-foreground">{card.date}</p>
        {card.subtitle && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {card.subtitle}
          </p>
        )}
        <p className="mt-1.5 text-xs text-muted-foreground">
          Total {card.amountFormatted}
          {!isFullyPaid && pendingDue > 0 && (
            <span className="font-semibold text-[#ea580c]">
              {" "}
              · Due {formatCurrency(pendingDue)}
            </span>
          )}
        </p>
      </div>
      {isFullyPaid ? (
        <div className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#ecfdf5] px-4 text-xs font-semibold text-[#15803d] sm:min-w-[9rem]">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
          Fully Paid
        </div>
      ) : showDatePay ? (
        <Button
          type="button"
          size="sm"
          className="h-10 w-full shrink-0 rounded-lg px-4 text-sm font-bold sm:w-auto sm:min-w-[10rem]"
          style={{
            background: "var(--color-primary)",
            color: "var(--color-primary-foreground)",
          }}
          onClick={onPay}
          disabled={isProcessingPayment}
        >
          Pay {formatCurrency(pendingDue)} Now
        </Button>
      ) : null}
    </div>
  );
}

export function MultiDateSelector({
  items,
  selectedDateId,
  onSelectDate,
  onPayForDate,
  formatCurrency,
  isProcessingPayment,
}: MultiDateSelectorProps) {
  const count = items.length;
  const useStrip = count >= MULTI_DATE_STRIP_THRESHOLD;
  const selected =
    items.find((item) => item.card.id === selectedDateId) ?? items[0];

  if (count === 1) {
    const item = items[0];
    return (
      <SingleDateEventStrip
        card={item.card}
        pendingDue={item.pendingDue}
        showPay={item.showDatePay}
        statusLabel={item.statusLabel}
        formatCurrency={formatCurrency}
        isProcessing={isProcessingPayment}
        onPay={() => onPayForDate(item.card.id)}
      />
    );
  }

  if (useStrip) {
    return (
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">
            {count} dates — scroll to browse
          </p>
        </div>
        <div
          className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-2 snap-x snap-mandatory scroll-smooth"
          style={{ scrollbarWidth: "thin" }}
        >
          {items.map((item) => (
            <DateStripPill
              key={item.card.id}
              item={item}
              active={item.card.id === selectedDateId}
              onSelect={() => onSelectDate(item.card.id)}
              formatCurrency={formatCurrency}
            />
          ))}
        </div>
        {selected && (
          <SelectedDateActionBar
            item={selected}
            onPay={() => onPayForDate(selected.card.id)}
            formatCurrency={formatCurrency}
            isProcessingPayment={isProcessingPayment}
          />
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 px-1 sm:grid-cols-[repeat(auto-fill,minmax(17.5rem,1fr))]">
      {items.map((item) => (
        <DateCardGridItem
          key={item.card.id}
          item={item}
          active={item.card.id === selectedDateId}
          onSelect={() => onSelectDate(item.card.id)}
          onPay={() => onPayForDate(item.card.id)}
          formatCurrency={formatCurrency}
          isProcessingPayment={isProcessingPayment}
        />
      ))}
    </div>
  );
}
