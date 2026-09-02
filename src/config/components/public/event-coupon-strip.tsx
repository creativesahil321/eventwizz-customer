"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Clock, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Matches strip min-height — keep in sync with layout classes. */
export const EVENT_COUPON_STRIP_HEIGHT = "4.5rem";
export const EVENT_COUPON_STRIP_HEIGHT_PX = 72;

/**
 * Site header (`4.5rem`) + coupon strip — use for sticky bars under both.
 * Keep aligned with `PUBLIC_EVENT_HEADER_OFFSET` in event-room-selector.
 */
export const PUBLIC_EVENT_HEADER_WITH_COUPON_OFFSET = "9rem";

export type EventCouponStripProps = {
  code?: string;
  /** Uppercase eyebrow, e.g. "Limited time offer". */
  label?: string;
  /** Compact badge next to the eyebrow, e.g. "50% OFF". */
  badge?: string;
  /** Main offer headline. */
  headline?: string;
  /** ISO date / timestamp when the offer ends (drives the countdown). */
  endsAt?: string | Date;
  className?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  /** Primary CTA — defaults to scrolling to `#booking`. */
  onClaim?: () => void;
  /**
   * `fixed` pins to the viewport top.
   * `static` sits in a parent chrome stack (preferred with CommonHeader).
   */
  position?: "fixed" | "static";
  /**
   * Vendor form preview: show a hint when expiry is not set yet.
   * Public page hides the countdown block entirely when there is no `endsAt`.
   */
  previewMode?: boolean;
};

type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function getCountdownParts(endsAt: Date, now: number): CountdownParts {
  const totalMs = Math.max(0, endsAt.getTime() - now);
  const totalSec = Math.floor(totalMs / 1000);
  return {
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
  };
}

function CountdownUnit({ value, unit }: { value: number; unit: string }) {
  return (
    <span className="inline-flex items-baseline gap-0.5">
      <span className="tabular-nums font-semibold text-white">{value}</span>
      <span className="text-[10px] font-medium text-white/70">{unit}</span>
    </span>
  );
}

/**
 * Promo strip for the public event page — coupon codes only.
 * Layout: offer copy · countdown · code + CTA (apply the code at checkout).
 */
export function EventCouponStrip({
  code = "",
  label = "Limited time offer",
  badge,
  headline = "",
  endsAt,
  className,
  dismissible = true,
  onDismiss,
  onClaim,
  position = "fixed",
  previewMode = false,
}: EventCouponStripProps) {
  const deadline = useMemo(() => {
    if (!endsAt) return null;
    const d = new Date(endsAt);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [endsAt]);

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!deadline) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [deadline]);

  const parts = deadline ? getCountdownParts(deadline, now) : null;
  const trimmedCode = code.trim();

  const handleClaim = () => {
    if (onClaim) {
      onClaim();
      return;
    }
    const booking = document.getElementById("booking");
    booking?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div
      role="region"
      aria-label="Coupon offer"
      className={cn(
        position === "fixed" && "fixed top-0 left-0 right-0 z-[60]",
        position === "static" && "relative w-full",
        "min-h-[4.5rem]",
        "bg-[color:var(--color-primary)] text-[color:var(--color-primary-foreground)]",
        "shadow-[0_1px_0_rgba(0,0,0,0.08)]",
        className,
      )}
    >
      <div className="relative mx-auto flex min-h-[4.5rem] max-w-7xl items-center gap-3 px-3 py-2.5 sm:gap-4 sm:px-5 lg:px-6">
        {/* Left — offer copy */}
        <div className="flex min-w-0 flex-1 items-start gap-2 sm:items-center sm:gap-2.5">
          <Sparkles
            className="mt-0.5 hidden h-4 w-4 shrink-0 opacity-90 sm:mt-0 sm:block"
            aria-hidden
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-primary-foreground)]/85">
                {label}
              </span>
              {badge ? (
                <span
                  className={cn(
                    "inline-flex items-center rounded px-1.5 py-0.5",
                    "bg-[color:color-mix(in_srgb,var(--color-primary-foreground)_18%,transparent)]",
                    "text-[10px] font-bold uppercase tracking-wide",
                  )}
                >
                  {badge}
                </span>
              ) : null}
            </div>
            {headline?.trim() ? (
              <p
                className="mt-0.5 truncate text-sm font-semibold leading-snug sm:text-base"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {headline}
              </p>
            ) : null}
          </div>
        </div>

        {/* Center — countdown from real `endsAt` only (no fake timer) */}
        {parts || previewMode ? (
          <div className="hidden shrink-0 items-center gap-2 md:flex">
            {parts ? (
              <>
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-[color:var(--color-primary-foreground)]/80">
                  <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>Offer ends in:</span>
                </div>
                <div
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-3 py-1.5",
                    "bg-[color:color-mix(in_srgb,#0f172a_72%,var(--color-primary))]",
                    "text-xs shadow-sm",
                  )}
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <CountdownUnit value={parts.days} unit="d" />
                  <CountdownUnit value={parts.hours} unit="h" />
                  <CountdownUnit value={parts.minutes} unit="m" />
                  <CountdownUnit value={parts.seconds} unit="s" />
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-[color:var(--color-primary-foreground)]/70">
                <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>Set expiry to show countdown</span>
              </div>
            )}
          </div>
        ) : null}

        {/* Right — code (display only) + CTA */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          {trimmedCode ? (
            <span
              className={cn(
                "hidden h-8 items-center gap-1 rounded-md px-2.5 sm:inline-flex",
                "border border-[color:color-mix(in_srgb,var(--color-primary-foreground)_40%,transparent)]",
                "bg-[color:color-mix(in_srgb,var(--color-primary-foreground)_14%,transparent)]",
                "text-xs",
              )}
            >
              <span className="text-[color:var(--color-primary-foreground)]/80">
                Code:
              </span>
              <span className="font-bold tracking-wide">{trimmedCode}</span>
            </span>
          ) : null}

          <button
            type="button"
            onClick={handleClaim}
            className={cn(
              "inline-flex h-8 items-center gap-1 rounded-full px-3 sm:px-3.5",
              "bg-white text-sm font-semibold text-neutral-900",
              "shadow-sm transition-transform duration-150",
              "hover:scale-[1.02] hover:bg-white/95",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
            )}
          >
            Claim Now
            <ChevronRight
              className="h-3.5 w-3.5 shrink-0 opacity-70"
              aria-hidden
            />
          </button>

          {dismissible ? (
            <button
              type="button"
              onClick={() => onDismiss?.()}
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-md",
                "text-[color:var(--color-primary-foreground)]/75 transition-opacity",
                "hover:bg-[color:color-mix(in_srgb,var(--color-primary-foreground)_12%,transparent)] hover:opacity-100",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary-foreground)]/45",
              )}
              aria-label="Dismiss coupon offer"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
