/**
 * Per-Date Payment Selection — clean radio-card design for full vs deposit.
 *
 * Amounts shown here must match Order Summary: apply date offer / coupon
 * savings first, then compute pay-in-full and table-deposit splits.
 */

"use client";

import React from "react";
import { Calendar } from "lucide-react";
import type { ApiEventCartData, ApiDateData } from "@/lib/types/cart.types";
import { format } from "date-fns";
import { useCurrencyFormat } from "@/hooks/use-currency-format";
import {
  calculateEditableDateDiscountableTotal,
  calculateEditableDateTablesTotal,
  calculateEditableDateTotal,
  getApiCartDateKeys,
  getApiDateData,
  getApiDateDiscount,
  getBillableTables,
  getDateGuestCount,
  computeDateDiscountAmount,
  isDepositChoiceAvailable,
  isFlatPerPersonDateDiscount,
  parseRoomDateKey,
} from "../_lib/cart-calculations";
import { applyDiscountThenSplitPayment } from "../_lib/checkout-utils";
import type { EditableDateData } from "@/store/cart-edit.store";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

interface PerDatePaymentSelectionProps {
  eventData: ApiEventCartData | null;
  selectedPaymentTypes: Record<string, "full" | "deposit">;
  onPaymentTypeChange: (date: string, type: "full" | "deposit") => void;
  disabled?: boolean;
  getDateData?: (eventSlug: string, date: string) => EditableDateData | null;
  eventSlug?: string;
  getRoomName?: (dateKey: string) => string | null;
  /**
   * When a booking coupon is applied, date offers are ignored and this absolute
   * discount is allocated across dates by share of booking subtotal.
   */
  bookingCouponDiscount?: number;
  /** Full booking subtotal (all dates) — required to allocate coupon discount. */
  bookingSubTotal?: number;
}

function isDepositAvailable(
  paymentInfo: ApiDateData["payment"],
  editStoreData: EditableDateData | null,
  apiDate: ApiDateData | null,
): boolean {
  return isDepositChoiceAvailable(paymentInfo, editStoreData, apiDate);
}

function tableLineTotal(
  table: EditableDateData["tables"][number],
): number {
  const pricePerPerson = table.pricePerPerson || table.price;
  if (table.allocation?.length) {
    const guests = table.allocation.reduce((sum, g) => sum + g, 0);
    return pricePerPerson * guests;
  }
  return pricePerPerson * (table.minPersons || 1) * table.quantity;
}

function roundMoney(n: number): number {
  return Math.round(Math.max(0, n) * 100) / 100;
}

interface DepositBreakdown {
  fullTotal: number;
  tableTotal: number;
  tableDeposit: number;
  ticketsAndDrinksToday: number;
  payToday: number;
  tableBalanceLater: number;
}

function calculateRawDepositBreakdown(
  paymentInfo: ApiDateData["payment"],
  editStoreData: EditableDateData | null,
): DepositBreakdown & {
  ticketTotal: number;
  drinkTotal: number;
} {
  if (!editStoreData) {
    return {
      fullTotal: 0,
      tableTotal: 0,
      tableDeposit: 0,
      ticketsAndDrinksToday: 0,
      payToday: 0,
      tableBalanceLater: 0,
      ticketTotal: 0,
      drinkTotal: 0,
    };
  }

  const fullTotal = calculateEditableDateTotal(editStoreData);
  const billableTables = getBillableTables(editStoreData);

  const tableTotal = billableTables.reduce(
    (sum, table) => sum + tableLineTotal(table),
    0,
  );

  const ticketTotal = editStoreData.tickets
    .filter((ticket) => ticket.quantity > 0)
    .reduce((sum, ticket) => sum + ticket.price * ticket.quantity, 0);

  const drinkTotal = editStoreData.drinks
    .filter((drink) => drink.quantity > 0)
    .reduce((sum, drink) => sum + drink.price * drink.quantity, 0);

  const ticketsAndDrinksToday = ticketTotal + drinkTotal;

  const depositType = paymentInfo.deposit_type || "amount";
  const depositValue = Number(
    paymentInfo.deposit_value || paymentInfo.deposit_amount || 0,
  );

  let totalPeople = editStoreData.peopleCount ?? 0;
  if (!totalPeople) {
    for (const table of billableTables) {
      if (table.allocation?.length) {
        totalPeople += table.allocation.reduce((sum, g) => sum + g, 0);
      }
    }
  }

  const tableDeposit =
    depositType === "percentage"
      ? (tableTotal * depositValue) / 100
      : depositValue * totalPeople;

  const payToday = tableDeposit + ticketsAndDrinksToday;
  const tableBalanceLater = Math.max(0, tableTotal - tableDeposit);

  return {
    fullTotal,
    tableTotal,
    tableDeposit,
    ticketsAndDrinksToday,
    payToday,
    tableBalanceLater,
    ticketTotal,
    drinkTotal,
  };
}

/**
 * Date offers: discount tables (+ tickets) first, then deposit % of discounted tables.
 * Coupons: discount the date's share of the booking total, then keep the same split ratio.
 */
function applyPromoToBreakdown(
  raw: ReturnType<typeof calculateRawDepositBreakdown>,
  options: {
    dateOfferAmount: number;
    tableOnlyDateOffer: boolean;
    couponShareAmount: number;
    paymentInfo: ApiDateData["payment"];
    guestCount: number;
  },
): DepositBreakdown {
  const {
    dateOfferAmount,
    tableOnlyDateOffer,
    couponShareAmount,
    paymentInfo,
    guestCount,
  } = options;

  // Coupon XOR date offer — coupon wins when present.
  if (couponShareAmount > 0 && raw.fullTotal > 0) {
    const split = applyDiscountThenSplitPayment({
      subTotal: raw.fullTotal,
      discountAmount: couponShareAmount,
      payToday: raw.payToday,
      payLater: raw.tableBalanceLater,
      depositToday: raw.tableDeposit,
    });
    const fullSplit = applyDiscountThenSplitPayment({
      subTotal: raw.fullTotal,
      discountAmount: couponShareAmount,
      payToday: raw.fullTotal,
      payLater: 0,
    });
    const discountedTableTotal = roundMoney(
      fullSplit.payToday *
        (raw.fullTotal > 0 ? raw.tableTotal / raw.fullTotal : 0),
    );

    return {
      fullTotal: fullSplit.payToday,
      tableTotal: discountedTableTotal,
      tableDeposit: split.depositToday,
      ticketsAndDrinksToday: roundMoney(
        Math.max(0, split.payToday - split.depositToday),
      ),
      payToday: split.payToday,
      tableBalanceLater: split.payLater,
    };
  }

  if (dateOfferAmount > 0) {
    const discountable = tableOnlyDateOffer
      ? raw.tableTotal
      : raw.tableTotal + raw.ticketTotal;
    const discount = roundMoney(Math.min(dateOfferAmount, discountable));

    let discountedTables = raw.tableTotal;
    let discountedTickets = raw.ticketTotal;

    if (tableOnlyDateOffer) {
      discountedTables = roundMoney(Math.max(0, raw.tableTotal - discount));
    } else if (discountable > 0) {
      discountedTables = roundMoney(
        raw.tableTotal - discount * (raw.tableTotal / discountable),
      );
      discountedTickets = roundMoney(
        raw.ticketTotal - discount * (raw.ticketTotal / discountable),
      );
    }

    const depositType = paymentInfo.deposit_type || "amount";
    const depositValue = Number(
      paymentInfo.deposit_value || paymentInfo.deposit_amount || 0,
    );
    const tableDeposit =
      depositType === "percentage"
        ? roundMoney((discountedTables * depositValue) / 100)
        : roundMoney(depositValue * guestCount);

    const ticketsAndDrinksToday = roundMoney(
      discountedTickets + raw.drinkTotal,
    );
    const payToday = roundMoney(tableDeposit + ticketsAndDrinksToday);
    const tableBalanceLater = roundMoney(
      Math.max(0, discountedTables - tableDeposit),
    );
    const fullTotal = roundMoney(
      discountedTables + discountedTickets + raw.drinkTotal,
    );

    return {
      fullTotal,
      tableTotal: discountedTables,
      tableDeposit,
      ticketsAndDrinksToday,
      payToday,
      tableBalanceLater,
    };
  }

  return {
    fullTotal: raw.fullTotal,
    tableTotal: raw.tableTotal,
    tableDeposit: raw.tableDeposit,
    ticketsAndDrinksToday: raw.ticketsAndDrinksToday,
    payToday: raw.payToday,
    tableBalanceLater: raw.tableBalanceLater,
  };
}

function getDepositLabel(paymentInfo: ApiDateData["payment"]): string {
  if (paymentInfo.deposit_type === "percentage") {
    const value = Number(paymentInfo.deposit_value || 0);
    return value > 0 ? `Table deposit (${value}%)` : "Table deposit";
  }
  return "Table deposit";
}

function formatBalanceDueDate(dateString: string | null): string | null {
  if (!dateString) return null;
  try {
    return format(new Date(dateString), "MMM d");
  } catch {
    return null;
  }
}

interface PaymentOptionRowProps {
  id: string;
  value: string;
  label: string;
  amount: string;
  balanceHint?: string;
  detailLines?: string[];
  selected: boolean;
  disabled: boolean;
  isLast?: boolean;
}

function FullPaymentDateRow({
  dateLabel,
  roomName,
  amount,
}: {
  dateLabel: string;
  roomName?: string | null;
  amount: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--checkout-border)] bg-[color:var(--checkout-muted)]/15 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <Calendar className="h-3.5 w-3.5 shrink-0 text-[color:var(--checkout-muted-foreground)]" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[color:var(--checkout-foreground)]">
            {dateLabel}
          </p>
          <p className="truncate text-[11px] text-[color:var(--checkout-muted-foreground)]">
            {roomName ? `${roomName} · ` : ""}
            Pay today · Pay in full
          </p>
        </div>
      </div>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-[color:var(--checkout-foreground)]">
        {amount}
      </span>
    </div>
  );
}

function PaymentOptionRow({
  id,
  value,
  label,
  amount,
  balanceHint,
  detailLines,
  selected,
  disabled,
  isLast = false,
}: PaymentOptionRowProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3 px-3 py-3 transition-colors",
        selected && "bg-[color:var(--checkout-muted)]/40",
        !isLast && "border-b border-[color:var(--checkout-border)]",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <RadioGroupItem
        value={value}
        id={id}
        disabled={disabled}
        className="mt-0.5 border-gray-300 text-[color:var(--checkout-brand-primary)]"
      />
      <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-[color:var(--checkout-foreground)]">
            {label}
          </p>
          {detailLines?.map((line) => (
            <p
              key={line}
              className="text-[11px] leading-snug text-[color:var(--checkout-muted-foreground)]"
            >
              {line}
            </p>
          ))}
          {balanceHint ? (
            <p className="text-[11px] text-[color:var(--checkout-muted-foreground)]">
              {balanceHint}
            </p>
          ) : null}
        </div>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-[color:var(--checkout-foreground)]">
          {amount}
        </span>
      </div>
    </label>
  );
}

export default function PerDatePaymentSelection({
  eventData,
  selectedPaymentTypes,
  onPaymentTypeChange,
  disabled = false,
  getDateData,
  eventSlug,
  getRoomName,
  bookingCouponDiscount = 0,
  bookingSubTotal = 0,
}: PerDatePaymentSelectionProps) {
  const { format: formatCurrency } = useCurrencyFormat();

  if (!eventData) return null;

  /** All payable dates — deposit choice dates get radios; others get a compact row. */
  const dateKeys = getApiCartDateKeys(eventData).filter((dateKey) => {
    const editStoreData =
      getDateData && eventSlug ? getDateData(eventSlug, dateKey) : null;
    return calculateEditableDateTotal(editStoreData) > 0;
  });

  const depositChoiceDateKeys = dateKeys.filter((dateKey) => {
    const editStoreData =
      getDateData && eventSlug ? getDateData(eventSlug, dateKey) : null;
    const apiDate = getApiDateData(eventData, dateKey);
    const paymentInfo = apiDate?.payment ?? {
      type: "full" as const,
      deposit_amount: 0,
      is_deposit_enabled: false,
      deposit_type: "amount" as const,
      deposit_value: 0,
      balance_due_date: null,
    };
    return isDepositAvailable(paymentInfo, editStoreData, apiDate);
  });

  if (depositChoiceDateKeys.length === 0) return null;

  const formatDateLabel = (dateString: string) => {
    try {
      const { date: actualDate } = parseRoomDateKey(dateString);
      return format(new Date(actualDate), "EEE, MMM d");
    } catch {
      return dateString;
    }
  };

  const usingCoupon = bookingCouponDiscount > 0 && bookingSubTotal > 0;

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--checkout-muted-foreground)]">
          Payment Options
        </p>
        <p className="text-[11px] text-[color:var(--checkout-muted-foreground)]">
          Per date
        </p>
      </div>

      <p className="text-[11px] leading-relaxed text-[color:var(--checkout-muted-foreground)]">
        {dateKeys.length > depositChoiceDateKeys.length
          ? "Choose payment for dates with table deposits. Other dates are charged in full today."
          : "Deposits apply to table seating only. Tickets and drink packages are charged in full today."}
      </p>

      <div className="space-y-4">
        {dateKeys.map((dateKey) => {
          const dateData = getApiDateData(eventData, dateKey);
          const paymentInfo = dateData?.payment || {
            type: "full" as const,
            deposit_amount: 0,
            is_deposit_enabled: false,
            deposit_type: "amount" as const,
            deposit_value: 0,
            balance_due_date: null,
          };
          const editStoreData =
            getDateData && eventSlug ? getDateData(eventSlug, dateKey) : null;
          const depositAvailable = isDepositAvailable(
            paymentInfo,
            editStoreData,
            dateData,
          );
          const raw = calculateRawDepositBreakdown(paymentInfo, editStoreData);

          const dateDiscount = usingCoupon
            ? null
            : getApiDateDiscount(eventData, dateKey);
          const guestCount = editStoreData
            ? getDateGuestCount(editStoreData)
            : 0;
          const tableTotalForOffer = editStoreData
            ? calculateEditableDateTablesTotal(editStoreData)
            : 0;
          const dateOfferAmount =
            dateDiscount && editStoreData
              ? computeDateDiscountAmount(dateDiscount, {
                  discountableTotal:
                    calculateEditableDateDiscountableTotal(editStoreData),
                  guestCount,
                  tableTotal: tableTotalForOffer,
                })
              : 0;

          const couponShareAmount =
            usingCoupon && bookingSubTotal > 0 && raw.fullTotal > 0
              ? roundMoney(
                  (raw.fullTotal / bookingSubTotal) * bookingCouponDiscount,
                )
              : 0;

          const breakdown = applyPromoToBreakdown(raw, {
            dateOfferAmount,
            tableOnlyDateOffer: isFlatPerPersonDateDiscount(dateDiscount),
            couponShareAmount,
            paymentInfo,
            guestCount,
          });

          const balanceDueLabel = formatBalanceDueDate(
            paymentInfo.balance_due_date,
          );
          const roomName = getRoomName?.(dateKey);
          const dateLabel = formatDateLabel(dateKey);

          if (!depositAvailable) {
            return (
              <FullPaymentDateRow
                key={dateKey}
                dateLabel={dateLabel}
                roomName={roomName}
                amount={formatCurrency(breakdown.fullTotal)}
              />
            );
          }

          const selectedPaymentType = selectedPaymentTypes[dateKey] || "full";

          const depositDetailLines: string[] = [];
          if (breakdown.tableTotal > 0 && breakdown.tableDeposit > 0) {
            depositDetailLines.push(
              `Table deposit: ${formatCurrency(breakdown.tableDeposit)} of ${formatCurrency(breakdown.tableTotal)}`,
            );
          }
          if (breakdown.ticketsAndDrinksToday > 0) {
            depositDetailLines.push(
              `Tickets & add-ons today: ${formatCurrency(breakdown.ticketsAndDrinksToday)}`,
            );
          }

          return (
            <div key={dateKey} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 shrink-0 text-[color:var(--checkout-muted-foreground)]" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[color:var(--checkout-foreground)]">
                      {dateLabel}
                    </p>
                    {roomName ? (
                      <p className="truncate text-[11px] text-[color:var(--checkout-muted-foreground)]">
                        {roomName}
                      </p>
                    ) : null}
                  </div>
                </div>
                {balanceDueLabel ? (
                  <p className="shrink-0 text-[11px] text-[color:var(--checkout-muted-foreground)]">
                    Table balance by {balanceDueLabel}
                  </p>
                ) : null}
              </div>

              <div className="overflow-hidden rounded-xl border border-[color:var(--checkout-border)] bg-white">
                <RadioGroup
                  value={selectedPaymentType}
                  onValueChange={(value) =>
                    onPaymentTypeChange(dateKey, value as "full" | "deposit")
                  }
                  disabled={disabled}
                  className="gap-0"
                >
                  <PaymentOptionRow
                    id={`${dateKey}-full`}
                    value="full"
                    label="Pay in full"
                    amount={formatCurrency(breakdown.fullTotal)}
                    selected={selectedPaymentType === "full"}
                    disabled={disabled}
                  />

                  <PaymentOptionRow
                    id={`${dateKey}-deposit`}
                    value="deposit"
                    label={getDepositLabel(paymentInfo)}
                    amount={formatCurrency(breakdown.payToday)}
                    detailLines={depositDetailLines}
                    balanceHint={
                      breakdown.tableBalanceLater > 0
                        ? `Table balance later: ${formatCurrency(breakdown.tableBalanceLater)}`
                        : undefined
                    }
                    selected={selectedPaymentType === "deposit"}
                    disabled={disabled}
                    isLast
                  />
                </RadioGroup>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
