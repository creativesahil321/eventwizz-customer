"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Minus, Plus, Users } from "lucide-react";
import { toast } from "sonner";

import { EditableItem, useCartEditStore } from "@/store/cart-edit.store";
import InlineTableAllocation from "./inline-table-allocation";
import {
  hasViableTablePlan,
  isGuestCountBelowTableMinimum,
  getLowestTableMinimum,
} from "../_lib/table-recommendations";
import { useDomain } from "@/providers/domain-provider/domain-provider";
import VenueContactNotice from "./venue-contact-notice";

interface TableRecommendationsProps {
  eventSlug: string;
  date: string;
  tables: EditableItem[];
  onQuantityChange: (tableId: number, change: number) => void;
  onUpdateQuantity: (tableId: number, quantity: number) => void;
  getTotalQuantity: (tableId: number) => number;
  onTableSeatingConfirmed?: () => void | Promise<void>;
}

function GuestCountControl({
  peopleCount,
  onChange,
}: {
  peopleCount: number;
  onChange: (count: number) => void;
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
    if (Number.isNaN(num) || num < 1) {
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
    const next = Math.min(Math.max(1, peopleCount + delta), 500);
    if (peopleCount + delta > 500) {
      toast.error("Maximum group size is 500 people");
    }
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[color:var(--checkout-border)] bg-[color:var(--checkout-muted)]/25 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-2">
        <Users className="h-4 w-4 shrink-0 text-[color:var(--checkout-table)]" />
        <div>
          <p className="text-xs font-semibold text-[color:var(--checkout-foreground)]">
            Total guests
          </p>
          <p className="text-[10px] text-[color:var(--checkout-muted-foreground)]">
            Set your group size for table seating
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 self-end rounded-lg border border-[color:var(--checkout-border)] bg-white p-0.5 sm:self-auto">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={peopleCount <= 1}
          className="flex h-8 w-8 items-center justify-center rounded-md text-[color:var(--checkout-muted-foreground)] transition-colors hover:bg-[color:var(--checkout-muted)]/50 disabled:opacity-30"
          aria-label="Decrease guest count"
        >
          <Minus className="h-3.5 w-3.5" />
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
          className="w-10 border-0 bg-transparent text-center text-sm font-bold tabular-nums text-[color:var(--checkout-foreground)] focus:outline-none focus:ring-0"
          aria-label="Total number of guests"
        />
        <button
          type="button"
          onClick={() => step(1)}
          disabled={peopleCount >= 500}
          className="flex h-8 w-8 items-center justify-center rounded-md text-[color:var(--checkout-muted-foreground)] transition-colors hover:bg-[color:var(--checkout-muted)]/50 disabled:opacity-30"
          aria-label="Increase guest count"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function TableRecommendations({
  eventSlug,
  date,
  tables,
  getTotalQuantity,
  onTableSeatingConfirmed,
}: TableRecommendationsProps) {
  const { getDateData, updatePeopleCount, applyBestTableMatch } =
    useCartEditStore();
  const { settings } = useDomain();

  const venuePhone =
    settings?.contactDetails?.phone ||
    settings?.contactDetails?.alternativePhone ||
    null;
  const venueEmail =
    settings?.contactDetails?.email ||
    settings?.contactDetails?.alternativeEmail ||
    null;

  const dateData = getDateData(eventSlug, date);
  const peopleCount = dateData?.peopleCount || 20;

  const prevPeopleCountRef = useRef(peopleCount);

  useEffect(() => {
    if (tables.length === 0) return;

    const hasExistingSelection = tables.some((table) => table.quantity > 0);
    const peopleCountChanged = prevPeopleCountRef.current !== peopleCount;
    prevPeopleCountRef.current = peopleCount;

    if (hasExistingSelection && !peopleCountChanged) return;

    applyBestTableMatch(eventSlug, date);
  }, [peopleCount, eventSlug, date, tables.length, applyBestTableMatch, tables]);

  const belowMinimum = isGuestCountBelowTableMinimum(tables, peopleCount);
  const lowestMinimum = getLowestTableMinimum(tables);
  const hasBestMatch = hasViableTablePlan(tables, peopleCount);
  const selectedTables = tables.filter(
    (table) => getTotalQuantity(table.id) > 0,
  );
  const usesMultipleTableTypes = selectedTables.length > 1;

  const handlePeopleCountChange = (count: number) => {
    updatePeopleCount(eventSlug, date, count);
  };

  if (tables.length === 0) {
    return (
      <div className="py-4 text-center">
        <AlertCircle className="mx-auto mb-2 h-6 w-6 text-gray-300" />
        <p className="text-xs text-gray-500">No tables available for this date</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <GuestCountControl
        peopleCount={peopleCount}
        onChange={handlePeopleCountChange}
      />

      {hasBestMatch && selectedTables.length > 0 ? (
        <div className="space-y-2">
          {usesMultipleTableTypes ? (
            <p className="rounded-lg border border-[color:var(--checkout-border)] bg-[color:var(--checkout-muted)]/40 px-2.5 py-1.5 text-[11px] leading-snug text-[color:var(--checkout-muted-foreground)]">
              {selectedTables.length} table types — confirm seating for each.
            </p>
          ) : null}
          {selectedTables.map((table) => (
            <InlineTableAllocation
              key={table.id}
              eventSlug={eventSlug}
              date={date}
              table={table}
              peopleCount={peopleCount}
              isMixedPlan={usesMultipleTableTypes}
              onTableSeatingConfirmed={onTableSeatingConfirmed}
            />
          ))}
        </div>
      ) : belowMinimum ? (
        <VenueContactNotice
          message={
            lowestMinimum
              ? `Minimum group size for available tables is ${lowestMinimum} guests.`
              : undefined
          }
          phone={venuePhone}
          email={venueEmail}
        />
      ) : (
        <VenueContactNotice
          title="No tables available for your group size."
          message="Please contact the venue for assistance."
          phone={venuePhone}
          email={venueEmail}
        />
      )}
    </div>
  );
}
