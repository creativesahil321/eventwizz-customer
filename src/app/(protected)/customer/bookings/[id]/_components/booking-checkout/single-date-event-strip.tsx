"use client";

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
  const badgeTone =
    card.paymentStatus === "paid"
      ? "paid"
      : card.paymentStatus === "partial"
        ? "partial"
        : card.paymentStatus === "refunded"
          ? "refunded"
          : card.paymentStatus === "cancelled"
            ? "cancelled"
            : "unpaid";

  return (
    <div
      className={cn(
        "booking-single-date-strip",
        isFullyPaid && "booking-single-date-strip--paid",
        showPay && "booking-single-date-strip--payable",
      )}
    >
      <div className="booking-single-date-strip__main">
        <div className="booking-single-date-strip__info">
          <div className="booking-single-date-strip__cal" aria-hidden>
            <span className="booking-single-date-strip__cal-month">
              {calendar.month}
            </span>
            <span className="booking-single-date-strip__cal-day">
              {calendar.day}
            </span>
          </div>
          <div className="booking-single-date-strip__copy min-w-0">
            <div className="booking-single-date-strip__title-row">
              <p className="booking-single-date-strip__date">{card.date}</p>
              <span
                className={cn(
                  "booking-single-date-strip__badge",
                  `booking-single-date-strip__badge--${badgeTone}`,
                )}
              >
                {statusLabel}
              </span>
            </div>
            {card.subtitle && (
              <p className="booking-single-date-strip__subtitle truncate">
                {card.subtitle}
              </p>
            )}
          </div>
        </div>

        <div
          className="booking-single-date-strip__divider hidden sm:block"
          aria-hidden
        />

        <div className="booking-single-date-strip__amounts">
          <div className="booking-single-date-strip__amount-col">
            <p className="booking-single-date-strip__amount-label">Total</p>
            <p className="booking-single-date-strip__amount-value">
              {card.amountFormatted}
            </p>
          </div>
          <div
            className="booking-single-date-strip__amount-divider hidden sm:block"
            aria-hidden
          />
          <div className="booking-single-date-strip__amount-col">
            {isFullyPaid ? (
              <>
                <p className="booking-single-date-strip__amount-label booking-single-date-strip__amount-label--paid">
                  Paid
                </p>
                <p className="booking-single-date-strip__amount-value booking-single-date-strip__amount-value--paid">
                  {card.paidAmountFormatted}
                </p>
              </>
            ) : pendingDue > 0 ? (
              <>
                <p className="booking-single-date-strip__amount-label booking-single-date-strip__amount-label--due">
                  Due
                </p>
                <p className="booking-single-date-strip__amount-value booking-single-date-strip__amount-value--due">
                  {formatCurrency(pendingDue)}
                </p>
              </>
            ) : (
              <>
                <p className="booking-single-date-strip__amount-label">Paid</p>
                <p className="booking-single-date-strip__amount-value booking-single-date-strip__amount-value--muted">
                  {card.paidAmountFormatted}
                </p>
              </>
            )}
          </div>
        </div>

        <div
          className="booking-single-date-strip__divider hidden sm:block"
          aria-hidden
        />

        <div className="booking-single-date-strip__action">
          {isFullyPaid ? (
            <div className="booking-single-date-strip__paid-pill">
              <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={2.5} />
              <span>Fully Paid</span>
            </div>
          ) : showPay ? (
            <Button
              type="button"
              className="booking-single-date-strip__pay-btn"
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
