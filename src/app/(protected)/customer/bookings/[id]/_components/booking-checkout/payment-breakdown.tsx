"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { BookingAppliedOffers } from "@/components/bookings/booking-applied-offers";
import type { ResolvedBookingAppliedOffer } from "@/lib/booking-applied-offer";
import {
  getAddonCategoryLabel,
  splitAddonsByCategory,
  type PaymentBreakdownGroup,
  type PaymentBreakdownLine,
} from "./types";

function PaymentBreakdownLineRow({
  line,
  formatCurrency,
  variant = "default",
}: {
  line: PaymentBreakdownLine;
  formatCurrency: (amount: number) => string;
  variant?: "default" | "addon";
}) {
  return (
    <div
      className="flex items-start justify-between gap-3 px-4 py-2.5"
      style={
        variant === "addon"
          ? {
              background:
                "color-mix(in srgb, var(--color-warning) 4%, var(--color-card))",
            }
          : undefined
      }
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{line.label}</p>
        <p className="text-[11px] font-normal text-muted-foreground">
          {line.meta}
        </p>
      </div>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
        {formatCurrency(line.amount)}
      </span>
    </div>
  );
}

function PaymentBreakdownLineSections({
  lines,
  formatCurrency,
  variant = "default",
  packageSectionTitle,
}: {
  lines: PaymentBreakdownLine[];
  formatCurrency: (amount: number) => string;
  variant?: "default" | "addon";
  packageSectionTitle?: string;
}) {
  const { seating, packages } = splitAddonsByCategory(lines);
  const sections = [
    { category: "seating" as const, items: seating },
    { category: "package" as const, items: packages },
  ].filter((section) => section.items.length > 0);

  if (sections.length <= 1) {
    return (
      <div className="divide-y divide-border/60">
        {lines.map((line) => (
          <PaymentBreakdownLineRow
            key={line.id}
            line={line}
            formatCurrency={formatCurrency}
            variant={variant}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      {sections.map((section, sectionIndex) => (
        <div
          key={section.category}
          className={cn(
            "py-1 pb-0.5",
            variant === "addon" && "px-0",
            sectionIndex > 0 && "mt-0.5 pt-2",
          )}
          style={
            sectionIndex > 0
              ? {
                  borderTop:
                    "1px solid color-mix(in srgb, var(--color-warning) 22%, var(--border))",
                }
              : undefined
          }
        >
          <p
            className="px-4 py-1.5 pb-1 text-[11px] font-extrabold tracking-[0.06em] uppercase"
            style={{
              color:
                variant === "addon"
                  ? "color-mix(in srgb, var(--color-warning) 75%, var(--muted-foreground))"
                  : "var(--kind-accent, var(--muted-foreground))",
            }}
          >
            {getAddonCategoryLabel(
              section.category,
              section.items,
              packageSectionTitle,
            )}
          </p>
          <div className="divide-y divide-border/60">
            {section.items.map((line) => (
              <PaymentBreakdownLineRow
                key={line.id}
                line={line}
                formatCurrency={formatCurrency}
                variant={variant}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

export function PaymentBreakdownDateAccordion({
  groups,
  formatCurrency,
  openDates,
  onOpenDatesChange,
}: {
  groups: PaymentBreakdownGroup[];
  formatCurrency: (amount: number) => string;
  openDates: string[];
  onOpenDatesChange: (value: string[]) => void;
}) {
  if (groups.length === 0) return null;

  return (
    <Accordion
      type="multiple"
      value={openDates}
      onValueChange={onOpenDatesChange}
      className="space-y-3"
    >
      {groups.map((group) => (
        <AccordionItem
          key={group.id}
          value={group.id}
          className="overflow-hidden rounded-xl border border-border bg-card border-b-0"
        >
          <AccordionTrigger
            className="px-4 py-2.5 font-semibold hover:no-underline data-[state=open]:border-b data-[state=open]:border-border"
            style={{
              background:
                "color-mix(in srgb, var(--color-muted) 55%, var(--color-card))",
            }}
          >
            <span className="text-sm font-semibold text-foreground">
              {group.title}
            </span>
            <span className="ml-auto mr-1 text-sm font-bold tabular-nums text-foreground">
              {formatCurrency(group.subtotal)}
            </span>
          </AccordionTrigger>
          <AccordionContent className="pb-0 pt-0 [&>div]:py-0">
            {group.lines.length > 0 && (
              <PaymentBreakdownLineSections
                lines={group.lines}
                formatCurrency={formatCurrency}
                packageSectionTitle={group.packageTitle}
              />
            )}

            {group.addonLines && group.addonLines.length > 0 && (
              <div
                style={{
                  borderTop:
                    "1px dashed color-mix(in srgb, var(--color-warning) 35%, var(--border))",
                  background:
                    "color-mix(in srgb, var(--color-warning) 6%, var(--color-card))",
                }}
              >
                <div
                  className="flex items-center justify-between gap-3 px-4 py-2"
                  style={{
                    borderBottom:
                      "1px solid color-mix(in srgb, var(--color-warning) 18%, var(--border))",
                    background:
                      "color-mix(in srgb, var(--color-warning) 10%, var(--color-card))",
                  }}
                >
                  <span
                    className="text-[11px] font-bold tracking-[0.04em] uppercase"
                    style={{ color: "var(--color-warning)" }}
                  >
                    Extra add-ons
                  </span>
                  <span className="text-xs font-semibold tabular-nums">
                    {formatCurrency(group.addonSubtotal ?? 0)}
                  </span>
                </div>
                <PaymentBreakdownLineSections
                  lines={group.addonLines}
                  formatCurrency={formatCurrency}
                  variant="addon"
                  packageSectionTitle={group.packageTitle}
                />
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export function PaymentBreakdownTotals({
  subTotal,
  addOns = 0,
  paid,
  outstanding,
  formatCurrency,
  appliedOffers = [],
}: {
  subTotal: number;
  /** Unpaid pending add-ons — shown separately from booking subtotal. */
  addOns?: number;
  paid: number;
  outstanding: number;
  formatCurrency: (amount: number) => string;
  /** Coupons / date offers already applied on this booking (read-only). */
  appliedOffers?: ResolvedBookingAppliedOffer[];
}) {
  return (
    <div className="space-y-2 rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex justify-between text-sm">
        <span className="font-normal text-muted-foreground">Subtotal</span>
        <span className="font-semibold tabular-nums text-foreground">
          {formatCurrency(subTotal)}
        </span>
      </div>
      {appliedOffers.length > 0 ? (
        <BookingAppliedOffers
          offers={appliedOffers}
          formatMoney={formatCurrency}
          variant="rows"
        />
      ) : null}
      {addOns > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Extra add-ons</span>
          <span className="font-semibold tabular-nums text-foreground">
            {formatCurrency(addOns)}
          </span>
        </div>
      )}
      {paid > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Paid</span>
          <span className="font-semibold text-foreground">
            {formatCurrency(paid)}
          </span>
        </div>
      )}
      {outstanding > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Outstanding</span>
          <span className="font-semibold text-foreground">
            {formatCurrency(outstanding)}
          </span>
        </div>
      )}
    </div>
  );
}
