"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Minus, Plus } from "lucide-react";
import { toast } from "sonner";

import { EditableItem, useCartEditStore } from "@/store/cart-edit.store";
import InlineTableAllocation from "./inline-table-allocation";
import {
  hasViableTablePlan,
  isGuestCountBelowTableMinimum,
  getLowestTableMinimum,
  resolveCheckoutGroupSize,
} from "../_lib/table-recommendations";
import { useDomain } from "@/providers/domain-provider/domain-provider";
import { resolveVenueContact } from "@/lib/resolve-venue-contact";
import VenueContactNotice from "./venue-contact-notice";
import { useCurrencyFormat } from "@/hooks/use-currency-format";
import { cn } from "@/lib/utils";

function formatTablePriceHint(
  tables: EditableItem[],
  formatMoney: (amount: number) => string,
): string | null {
  const prices = tables
    .map((table) => table.pricePerPerson || table.price)
    .filter((price) => Number.isFinite(price) && price > 0);
  if (prices.length === 0) return null;

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return `${formatMoney(min)}/person`;
  return `${formatMoney(min)}–${formatMoney(max)}/person`;
}

interface TableRecommendationsProps {
  eventSlug: string;
  date: string;
  tables: EditableItem[];
  ticketsAvailable?: boolean;
  onQuantityChange: (tableId: number, change: number) => void;
  onUpdateQuantity: (tableId: number, quantity: number) => void;
  getTotalQuantity: (tableId: number) => number;
  onTableSeatingConfirmed?: () => boolean | Promise<boolean>;
}

function GroupSizeStepper({
  peopleCount,
  onChange,
  clearOnZero = false,
  onClear,
  embedded = false,
}: {
  peopleCount: number;
  onChange: (count: number) => void;
  clearOnZero?: boolean;
  onClear?: () => void;
  embedded?: boolean;
}) {
  const [inputValue, setInputValue] = useState(String(peopleCount));

  useEffect(() => {
    setInputValue(String(peopleCount));
  }, [peopleCount]);

  const applyCount = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === "") {
      setInputValue(String(peopleCount));
      return;
    }

    const num = parseInt(trimmed, 10);
    if (Number.isNaN(num)) {
      setInputValue(String(peopleCount));
      return;
    }

    if (num === 0 && clearOnZero && onClear) {
      onClear();
      return;
    }

    if (num < 1) {
      toast.error("Please enter a number between 1 and 500");
      setInputValue(String(peopleCount));
      return;
    }

    const validated = Math.min(Math.max(1, num), 500);
    if (num > 500) {
      toast.error("Maximum group size is 500 people");
    }

    setInputValue(String(validated));
    if (validated !== peopleCount) {
      onChange(validated);
    }
  };

  const step = (delta: number) => {
    if (delta < 0 && peopleCount <= 1 && clearOnZero && onClear) {
      onClear();
      return;
    }

    const next = Math.min(Math.max(1, peopleCount + delta), 500);
    if (peopleCount + delta > 500) {
      toast.error("Maximum group size is 500 people");
    }
    onChange(next);
  };

  const stepper = (
    <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-[color:var(--checkout-border)] bg-[color:var(--checkout-muted)]/30 p-0.5">
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={!clearOnZero && peopleCount <= 1}
        className="flex h-7 w-7 items-center justify-center rounded-md text-[color:var(--checkout-muted-foreground)] transition-colors hover:bg-white disabled:opacity-30"
        aria-label={
          clearOnZero && peopleCount <= 1
            ? "Remove table seating"
            : "Decrease group size"
        }
      >
        <Minus className="h-3 w-3" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={inputValue}
        onChange={(e) => {
          const value = e.target.value;
          if (value === "" || /^\d*$/.test(value)) {
            setInputValue(value);
          }
        }}
        onBlur={() => applyCount(inputValue)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
        className="w-9 border-0 bg-transparent text-center text-sm font-bold tabular-nums text-[color:var(--checkout-foreground)] focus:outline-none focus:ring-0"
        aria-label="Group size"
      />
      <button
        type="button"
        onClick={() => step(1)}
        disabled={peopleCount >= 500}
        className="flex h-7 w-7 items-center justify-center rounded-md text-[color:var(--checkout-muted-foreground)] transition-colors hover:bg-white disabled:opacity-30"
        aria-label="Increase group size"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );

  if (embedded) {
    return (
      <div className="flex items-center justify-between gap-3 border-b border-[color:var(--checkout-border)] px-4 py-3">
        <p className="text-xs font-medium text-[color:var(--checkout-muted-foreground)]">
          Group size
        </p>
        {stepper}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[color:var(--checkout-border)] bg-[color:var(--checkout-muted)]/25 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-semibold text-[color:var(--checkout-foreground)]">
        Group size
      </p>
      {stepper}
    </div>
  );
}

export default function TableRecommendations({
  eventSlug,
  date,
  tables,
  ticketsAvailable = false,
  getTotalQuantity,
  onTableSeatingConfirmed,
}: TableRecommendationsProps) {
  const {
    getDateData,
    updatePeopleCount,
    applyBestTableMatch,
    resumeTableSeating,
    skipTableSeating,
  } = useCartEditStore();
  const { format: formatMoney } = useCurrencyFormat();
  const { settings } = useDomain();
  const tablePriceHint = formatTablePriceHint(tables, formatMoney);
  const { phone: venuePhone, email: venueEmail, address: venueAddress } =
    resolveVenueContact(settings);

  const dateData = getDateData(eventSlug, date);
  const peopleCount = resolveCheckoutGroupSize({
    peopleCount: dateData?.peopleCount,
    tickets: dateData?.tickets,
    tables: dateData?.tables ?? tables,
  });
  const tableSeatingSkipped = dateData?.tableSeatingSkipped ?? false;

  // Auto-apply the best table match on first load when nothing is selected yet.
  // Group-size changes call applyBestTableMatch inside updatePeopleCount — duplicating
  // here caused a second pass that could fight the confirm flow.
  useEffect(() => {
    if (tables.length === 0 || tableSeatingSkipped) return;

    const hasDraftSelection = tables.some((table) => table.quantity > 0);
    if (!hasDraftSelection) {
      resumeTableSeating(eventSlug, date);
      applyBestTableMatch(eventSlug, date);
    }
  }, [
    eventSlug,
    date,
    tables.length,
    applyBestTableMatch,
    resumeTableSeating,
    tables,
    tableSeatingSkipped,
  ]);

  const handleStartTableSeating = () => {
    resumeTableSeating(eventSlug, date);
  };

  const belowMinimum = isGuestCountBelowTableMinimum(tables, peopleCount);
  const hasBestMatch = hasViableTablePlan(tables, peopleCount);
  const selectedTables = tables.filter(
    (table) => getTotalQuantity(table.id) > 0,
  );
  const confirmedIds = new Set(dateData?.confirmedTableIds ?? []);
  const hasUnconfirmedSeating = selectedTables.some(
    (table) => !confirmedIds.has(table.id),
  );
  const usesMultipleTableTypes = selectedTables.length > 1;

  const handleRemoveTableSeating = () => {
    skipTableSeating(eventSlug, date);
  };

  const handlePeopleCountChange = (count: number) => {
    updatePeopleCount(eventSlug, date, count);
  };

  const groupSizeProps = {
    peopleCount,
    onChange: handlePeopleCountChange,
    clearOnZero: ticketsAvailable,
    onClear: handleRemoveTableSeating,
  };

  if (tables.length === 0) {
    return (
      <div className="py-4 text-center">
        <AlertCircle className="mx-auto mb-2 h-6 w-6 text-gray-300" />
        <p className="text-xs text-gray-500">No tables available for this date</p>
      </div>
    );
  }

  if (tableSeatingSkipped && ticketsAvailable) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-dashed border-[color:var(--checkout-border)] bg-[color:var(--checkout-muted)]/10 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[color:var(--checkout-foreground)]">
            No table seating
          </p>
          <p className="mt-0.5 text-xs text-[color:var(--checkout-muted-foreground)]">
            Optional — reserve tables for larger groups.
            {tablePriceHint ? ` From ${tablePriceHint}.` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={handleStartTableSeating}
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-[color:var(--checkout-border)] bg-white px-4 text-xs font-semibold text-[color:var(--checkout-foreground)] transition-colors hover:bg-[color:var(--checkout-muted)]/40"
        >
          + Add table seating
        </button>
      </div>
    );
  }

  // Single unified card — group size + allocation (Lovable layout)
  return (
    <div className="overflow-hidden rounded-xl border border-[color:var(--checkout-border)] bg-white">
      <GroupSizeStepper {...groupSizeProps} embedded />

      {hasBestMatch && selectedTables.length > 0 ? (
        selectedTables.map((table, index) => (
          <InlineTableAllocation
            key={table.id}
            eventSlug={eventSlug}
            date={date}
            table={table}
            peopleCount={peopleCount}
            isMixedPlan={usesMultipleTableTypes}
            nested
            showConfirmHint={hasUnconfirmedSeating && index === 0}
            onTableSeatingConfirmed={onTableSeatingConfirmed}
          />
        ))
      ) : hasBestMatch ? (
        <div className="flex items-center justify-center px-4 py-6">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[color:var(--checkout-border)] border-t-[color:var(--checkout-brand-primary)]" />
        </div>
      ) : belowMinimum ? (
        <div className={cn("px-4 py-4")}>
          <VenueContactNotice
            message={
              getLowestTableMinimum(tables)
                ? `Tables start from ${getLowestTableMinimum(tables)} guests. Contact the venue using the details below for smaller groups.`
                : undefined
            }
            phone={venuePhone}
            email={venueEmail}
            address={venueAddress}
          />
        </div>
      ) : (
        <div className="px-4 py-4">
          <VenueContactNotice
            title="No tables available for your group size."
            message="Please contact the venue using the details below for assistance."
            phone={venuePhone}
            email={venueEmail}
            address={venueAddress}
          />
        </div>
      )}
    </div>
  );
}
