"use client";

import type { CSSProperties } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CheckoutDateCard } from "./types";
import { getDateCalendarParts } from "./build-line-items";

interface SingleDateEventStripProps {
  card: CheckoutDateCard;
  pendingDue: number;
  showPay: boolean;
  statusLabel: string;
  formatCurrency: (amount: number) => string;
  isProcessing?: boolean;
  onPay: () => void;
}

const stripBaseStyle: CSSProperties = {
  borderRadius: "1rem",
  border: "1.5px solid color-mix(in srgb, var(--color-primary) 38%, var(--border))",
  background: "var(--card)",
  boxShadow:
    "0 0 0 1px color-mix(in srgb, var(--color-primary) 10%, transparent), 0 2px 10px color-mix(in srgb, var(--color-primary) 12%, transparent)",
};

const stripPaidStyle: CSSProperties = {
  ...stripBaseStyle,
  borderColor: "color-mix(in srgb, var(--color-primary) 34%, var(--border))",
  background: "color-mix(in srgb, var(--color-primary) 5%, var(--card))",
  boxShadow:
    "0 0 0 1px color-mix(in srgb, var(--color-primary) 14%, transparent), 0 2px 8px color-mix(in srgb, var(--color-primary) 10%, transparent)",
};

const stripPayableStyle: CSSProperties = {
  ...stripBaseStyle,
  borderColor: "color-mix(in srgb, var(--color-primary) 52%, var(--border))",
  background: "color-mix(in srgb, var(--color-primary) 6%, var(--card))",
  boxShadow:
    "0 0 0 1px color-mix(in srgb, var(--color-primary) 18%, transparent), 0 4px 14px color-mix(in srgb, var(--color-primary) 16%, transparent)",
};

const calBorderStyle: CSSProperties = {
  border: "1px solid color-mix(in srgb, var(--color-primary) 32%, var(--border))",
  boxShadow: "0 2px 6px color-mix(in srgb, var(--color-primary) 12%, transparent)",
};

const dividerStyle: CSSProperties = {
  background: "color-mix(in srgb, var(--border) 85%, var(--muted-foreground))",
};

const payBtnStyle: CSSProperties = {
  background: "var(--color-primary)",
  color: "var(--color-primary-foreground, #fff)",
  boxShadow: "0 4px 14px color-mix(in srgb, var(--color-primary) 32%, transparent)",
};

type BadgeTone = "paid" | "partial" | "unpaid" | "pending" | "refunded" | "cancelled";

const BADGE_TONES: Record<BadgeTone, { bg: string; color: string }> = {
  unpaid: {
    bg: "color-mix(in srgb, var(--color-primary) 12%, var(--card))",
    color: "var(--color-primary)",
  },
  pending: {
    bg: "color-mix(in srgb, var(--color-primary) 12%, var(--card))",
    color: "var(--color-primary)",
  },
  partial: { bg: "#fff7ed", color: "#c2410c" },
  paid: { bg: "#ecfdf5", color: "#15803d" },
  refunded: { bg: "#f3f4f6", color: "#4b5563" },
  cancelled: { bg: "#f3f4f6", color: "#4b5563" },
};

export function SingleDateEventStrip({
  card,
  pendingDue,
  showPay,
  statusLabel,
  formatCurrency,
  isProcessing = false,
  onPay,
}: SingleDateEventStripProps) {
  const isFullyPaid = pendingDue <= 0;
  const calendar = getDateCalendarParts(card.id);
  const badgeTone: BadgeTone =
    card.paymentStatus === "paid"
      ? "paid"
      : card.paymentStatus === "partial"
        ? "partial"
        : card.paymentStatus === "refunded"
          ? "refunded"
          : card.paymentStatus === "cancelled"
            ? "cancelled"
            : "unpaid";

  const containerStyle = isFullyPaid
    ? stripPaidStyle
    : showPay
      ? stripPayableStyle
      : stripBaseStyle;

  const tone = BADGE_TONES[badgeTone];

  return (
    <div className="overflow-hidden" style={containerStyle}>
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-0 sm:px-[1.125rem] sm:py-3.5">
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          <div
            className="flex w-12 h-[3.25rem] shrink-0 flex-col overflow-hidden rounded-[0.625rem] bg-card leading-none"
            style={calBorderStyle}
            aria-hidden
          >
            <span
              className="flex w-full items-center justify-center py-[0.2rem] text-[0.5625rem] font-bold tracking-[0.06em] uppercase"
              style={{
                background: "var(--color-primary)",
                color: "var(--color-primary-foreground, #fff)",
              }}
            >
              {calendar.month}
            </span>
            <span
              className="flex flex-1 items-center justify-center text-lg font-extrabold leading-none bg-card"
              style={{ color: "var(--color-primary)" }}
            >
              {calendar.day}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[0.9375rem] font-bold leading-[1.25] text-foreground">
                {card.date}
              </p>
              <span
                className="inline-flex items-center rounded-full px-[0.55rem] py-[0.2rem] text-[0.5625rem] font-bold tracking-[0.05em] leading-[1.1] whitespace-nowrap"
                style={{ background: tone.bg, color: tone.color }}
              >
                {statusLabel}
              </span>
            </div>
            {card.subtitle && (
              <p className="mt-0.5 truncate text-xs font-normal text-muted-foreground">
                {card.subtitle}
              </p>
            )}
          </div>
        </div>

        <div
          className="hidden sm:block w-px self-stretch shrink-0 mx-5"
          style={dividerStyle}
          aria-hidden
        />

        <div className="flex w-full shrink-0 flex-col gap-3 sm:ml-auto sm:w-auto sm:flex-row sm:items-center">
          <div className="flex w-full items-center justify-between gap-6 sm:w-auto sm:gap-8">
          <div className="min-w-[4.5rem]">
            <p className="text-[0.625rem] font-semibold tracking-[0.08em] uppercase text-muted-foreground">
              Total
            </p>
            <p className="mt-1 text-lg font-extrabold leading-none text-foreground tabular-nums sm:text-xl">
              {card.amountFormatted}
            </p>
          </div>
          <div
            className="hidden sm:block w-px self-stretch shrink-0"
            style={dividerStyle}
            aria-hidden
          />
          <div className="min-w-[4.5rem]">
            {isFullyPaid ? (
              <>
                <p className="text-[0.625rem] font-semibold tracking-[0.08em] uppercase text-[#16a34a]">
                  Paid
                </p>
                <p className="mt-1 text-lg font-extrabold leading-none text-[#16a34a] tabular-nums sm:text-xl">
                  {card.paidAmountFormatted}
                </p>
              </>
            ) : pendingDue > 0 ? (
              <>
                <p className="text-[0.625rem] font-semibold tracking-[0.08em] uppercase text-[#ea580c]">
                  Due
                </p>
                <p className="mt-1 text-lg font-extrabold leading-none text-[#ea580c] tabular-nums sm:text-xl">
                  {formatCurrency(pendingDue)}
                </p>
              </>
            ) : (
              <>
                <p className="text-[0.625rem] font-semibold tracking-[0.08em] uppercase text-muted-foreground">
                  Paid
                </p>
                <p className="mt-1 text-lg font-extrabold leading-none text-muted-foreground tabular-nums sm:text-xl">
                  {card.paidAmountFormatted}
                </p>
              </>
            )}
          </div>
          </div>

          {isFullyPaid ? (
            <div className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-[#ecfdf5] px-5 text-[0.8125rem] font-bold text-[#15803d] sm:w-auto sm:min-w-36">
              <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={2.5} />
              <span>Fully Paid</span>
            </div>
          ) : showPay ? (
            <Button
              type="button"
              className="h-11 w-full rounded-full border-0 px-4 text-sm font-bold sm:w-auto sm:min-w-44 sm:px-6 sm:whitespace-nowrap hover:brightness-105 hover:opacity-96"
              style={payBtnStyle}
              onClick={onPay}
              disabled={isProcessing}
            >
              Pay {formatCurrency(pendingDue)} Now
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
