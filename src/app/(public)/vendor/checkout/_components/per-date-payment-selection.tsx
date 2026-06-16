/**
 * Per-Date Payment Selection — clean radio-card design for full vs deposit.
 */

"use client";

import React from "react";
import { Calendar } from "lucide-react";
import type { ApiEventCartData, ApiDateData } from "@/lib/types/cart.types";
import { format } from "date-fns";
import { useCurrencyFormat } from "@/hooks/use-currency-format";
import {
  calculateEditableDateTotal,
  getApiCartDateKeys,
  getApiDateData,
  getBillableTables,
  isDepositChoiceAvailable,
  parseRoomDateKey,
} from "../_lib/cart-calculations";
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

interface DepositBreakdown {
  fullTotal: number;
  tableTotal: number;
  tableDeposit: number;
  ticketsAndDrinksToday: number;
  payToday: number;
  tableBalanceLater: number;
}

function calculateDepositBreakdown(
  paymentInfo: ApiDateData["payment"],
  editStoreData: EditableDateData | null,
): DepositBreakdown {
  if (!editStoreData) {
    return {
      fullTotal: 0,
      tableTotal: 0,
      tableDeposit: 0,
      ticketsAndDrinksToday: 0,
      payToday: 0,
      tableBalanceLater: 0,
    };
  }

  const fullTotal = calculateEditableDateTotal(editStoreData);
  const billableTables = getBillableTables(editStoreData);

  const tableTotal = billableTables.reduce(
    (sum, table) => sum + tableLineTotal(table),
    0,
  );

  const ticketsAndDrinksToday =
    editStoreData.tickets
      .filter((ticket) => ticket.quantity > 0)
      .reduce((sum, ticket) => sum + ticket.price * ticket.quantity, 0) +
    editStoreData.drinks
      .filter((drink) => drink.quantity > 0)
      .reduce((sum, drink) => sum + drink.price * drink.quantity, 0);

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
            Due today · Pay in full
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
          const breakdown = calculateDepositBreakdown(
            paymentInfo,
            editStoreData,
          );
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
