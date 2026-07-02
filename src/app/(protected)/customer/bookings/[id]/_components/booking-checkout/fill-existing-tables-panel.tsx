"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { SelectedTable } from "@/services/customer/bookings/type";
import type { BookingDateSource } from "./build-line-items";
import { QuantityStepper } from "./quantity-stepper";

export interface ExistingTableSlot {
  key: string;
  allocationId: number;
  label: string;
  occupied: number;
  capacity: number;
  pricePerPerson: number;
  tableConfigId: number;
  tableSize: number;
  tableCount: number;
  parentId: number;
}

export interface ExistingTableSaveGroup {
  tableConfigId: number;
  tableSize: number;
  pricePerPerson: number;
  tableCount: number;
  allocations: Array<{ parentId: number; seats: number }>;
}

export interface ExistingTableFillSnapshot {
  additionsBySlot: Record<string, number>;
  totalAdded: number;
  totalCost: number;
  saveGroups: ExistingTableSaveGroup[];
}

interface FillExistingTablesPanelProps {
  slots: ExistingTableSlot[];
  guestsToAdd: number;
  formatCurrency: (amount: number) => string;
  onStateChange?: (snapshot: ExistingTableFillSnapshot) => void;
  /** Guests assigned on the new-table panel (draft or confirmed). */
  guestsPlacedOnNewTable?: number;
  /** When true, section is optional — customer may skip and book a new table instead. */
  optional?: boolean;
  /** Increment to trigger auto-fill from parent (e.g. "seat all on existing"). */
  autoFillSignal?: number;
  /** When true, footer hints that remaining guests can use a new table. */
  canPlaceRemainingOnNewTable?: boolean;
  /** New-table minimum — for remaining-guest messaging in fill-existing footer. */
  newTableMinGuests?: number;
  /** Remaining count is below new-table minimum. */
  remainingBelowNewTableMin?: boolean;
  seatingConfirmed?: boolean;
  onConfirmSeating?: () => void;
  /** @deprecated Use optional — hide duplicate capacity banner when parent explains constraints. */
  hideCapacityBanner?: boolean;
  /** @deprecated Hide per-section footer when parent shows a combined summary. */
  hideFooter?: boolean;
}

export function getExistingTableFreeSeats(slot: {
  occupied: number;
  capacity: number;
}): number {
  return Math.max(0, slot.capacity - slot.occupied);
}

type SelectedTableAllocationInput =
  | SelectedTable["allocation"]
  | Array<{
      parent_id?: number;
      booking_date_table_id?: number;
      seats?: number;
    }>
  | null
  | undefined;

/** Supports add-ons array `[{ parent_id, seats }]` and record `{"1113": 6}` / `{"1113": "+2"}`. */
export function iterSelectedTableAllocationEntries(
  allocation: SelectedTableAllocationInput,
): Array<{ parentId: number; seats: number; isAddonMarker: boolean }> {
  if (allocation == null) return [];

  if (Array.isArray(allocation)) {
    return allocation
      .map((entry) => {
        if (entry == null || typeof entry !== "object") return null;
        const parentId = Number(
          entry.parent_id ?? entry.booking_date_table_id ?? NaN,
        );
        const seats = Number(entry.seats ?? 0) || 0;
        if (!Number.isFinite(parentId) || parentId <= 0) return null;
        return { parentId, seats, isAddonMarker: false };
      })
      .filter(
        (
          entry,
        ): entry is { parentId: number; seats: number; isAddonMarker: boolean } =>
          entry != null,
      );
  }

  if (typeof allocation === "object") {
    return Object.entries(allocation).flatMap(([parentKey, seatValue]) => {
      const parentId = Number.parseInt(parentKey, 10);
      if (!Number.isFinite(parentId) || parentId <= 0) return [];

      const seatLabel = String(seatValue);
      const isAddonMarker = seatLabel.startsWith("+");
      const seats = isAddonMarker
        ? Number.parseInt(seatLabel.slice(1), 10) || 0
        : Number(seatValue) || 0;

      return [{ parentId, seats, isAddonMarker }];
    });
  }

  return [];
}

function bookingDetailHasAllocations(
  dateSource: BookingDateSource | undefined,
): boolean {
  return (
    dateSource?.tables?.some((table) => (table.allocations?.length ?? 0) > 0) ??
    false
  );
}

function findBookingAllocation(
  dateSource: BookingDateSource | undefined,
  parentId: number,
  tableSize?: number,
) {
  for (const tableLine of dateSource?.tables ?? []) {
    if (tableSize != null && tableLine.table_size !== tableSize) continue;
    const match = tableLine.allocations?.find((alloc) => alloc.id === parentId);
    if (match) return { tableLine, alloc: match };
  }
  return null;
}

export function hasBookedTableAllocations(
  dateSource: BookingDateSource | undefined,
  selectedTables: SelectedTable[] = [],
): boolean {
  if (
    dateSource?.tables?.some((table) => (table.allocations?.length ?? 0) > 0)
  ) {
    return true;
  }

  if ((dateSource?.tables?.length ?? 0) === 0) {
    return false;
  }

  return selectedTables.some(
    (table) =>
      iterSelectedTableAllocationEntries(
        table.allocation as SelectedTableAllocationInput,
      ).length > 0,
  );
}

export function buildExistingTableSlots(
  dateSource: BookingDateSource | undefined,
  selectedTables: SelectedTable[],
): ExistingTableSlot[] {
  if (!dateSource?.tables?.length) return [];

  const slots: ExistingTableSlot[] = [];

  dateSource.tables.forEach((tableLine) => {
    const matchedSelected =
      selectedTables.find((st) => st.table_size === tableLine.table_size) ??
      selectedTables[0];
    const tableConfigId = matchedSelected?.id ?? tableLine.id;
    const pricePerPerson = matchedSelected
      ? parseFloat(matchedSelected.price) || tableLine.unit_price
      : tableLine.unit_price;
    const tableCount =
      matchedSelected?.no_tables ||
      tableLine.table_count ||
      tableLine.allocations?.length ||
      1;

    tableLine.allocations?.forEach((alloc) => {
      const capacity = alloc.capacity ?? tableLine.table_size;
      const occupied = alloc.people;
      if (getExistingTableFreeSeats({ occupied, capacity }) <= 0) {
        return;
      }

      slots.push({
        key: `${tableLine.id}-${alloc.id}`,
        allocationId: alloc.id,
        label: alloc.label || `Table ${alloc.table_number}`,
        occupied,
        capacity,
        pricePerPerson,
        tableConfigId,
        tableSize: tableLine.table_size,
        tableCount,
        parentId: alloc.id,
      });
    });
  });

  if (slots.length > 0 || bookingDetailHasAllocations(dateSource)) {
    return slots;
  }

  selectedTables.forEach((selected) => {
    const tableLine = dateSource.tables?.find(
      (table) => table.table_size === selected.table_size,
    );
    const pricePerPerson =
      parseFloat(selected.price) || tableLine?.unit_price || 0;
    const tableCount = selected.no_tables || tableLine?.table_count || 1;
    const defaultCapacity = selected.table_size;

    iterSelectedTableAllocationEntries(
      selected.allocation as SelectedTableAllocationInput,
    ).forEach(({ parentId, seats, isAddonMarker }) => {
      const bookingMatch = findBookingAllocation(
        dateSource,
        parentId,
        selected.table_size,
      );
      const bookingAlloc = bookingMatch?.alloc;
      const capacity = bookingAlloc?.capacity ?? defaultCapacity;
      const occupied = bookingAlloc
        ? bookingAlloc.people
        : isAddonMarker
          ? capacity
          : seats;
      if (getExistingTableFreeSeats({ occupied, capacity }) <= 0) return;

      const label =
        bookingAlloc?.label ||
        (bookingAlloc?.table_number != null
          ? `Table ${bookingAlloc.table_number}`
          : `Table ${parentId}`);

      slots.push({
        key: `${selected.id}-${parentId}`,
        allocationId: parentId,
        label,
        occupied,
        capacity,
        pricePerPerson,
        tableConfigId: selected.id,
        tableSize: selected.table_size,
        tableCount,
        parentId,
      });
    });
  });

  return slots;
}

function buildSaveGroups(
  slots: ExistingTableSlot[],
  additionsBySlot: Record<string, number>,
): ExistingTableSaveGroup[] {
  const groups = new Map<string, ExistingTableSaveGroup>();

  slots.forEach((slot) => {
    const added = additionsBySlot[slot.key] ?? 0;
    if (added <= 0) return;

    const groupKey = `${slot.tableConfigId}-${slot.tableSize}`;
    const existing = groups.get(groupKey);
    const entry = { parentId: slot.parentId, seats: added };

    if (!existing) {
      groups.set(groupKey, {
        tableConfigId: slot.tableConfigId,
        tableSize: slot.tableSize,
        pricePerPerson: slot.pricePerPerson,
        tableCount: slot.tableCount,
        allocations: [entry],
      });
      return;
    }

    existing.allocations.push(entry);
  });

  return Array.from(groups.values());
}

export function buildAutoFillAdditions(
  slots: ExistingTableSlot[],
  guestsToAdd: number,
): Record<string, number> {
  if (guestsToAdd <= 0) return {};

  let remaining = guestsToAdd;
  const next: Record<string, number> = {};

  slots.forEach((slot) => {
    if (remaining <= 0) {
      next[slot.key] = 0;
      return;
    }
    const free = getExistingTableFreeSeats(slot);
    const assign = Math.min(free, remaining);
    next[slot.key] = assign;
    remaining -= assign;
  });

  return next;
}

interface ExistingTablesPlacedSummaryProps {
  slots: ExistingTableSlot[];
  snapshot: ExistingTableFillSnapshot;
  formatCurrency: (amount: number) => string;
}

/** Read-only recap after new-table seating is confirmed. */
export function ExistingTablesPlacedSummary({
  slots,
  snapshot,
  formatCurrency,
}: ExistingTablesPlacedSummaryProps) {
  const placedSlots = slots.filter(
    (slot) => (snapshot.additionsBySlot[slot.key] ?? 0) > 0,
  );

  if (placedSlots.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold tracking-[0.14em] uppercase text-muted-foreground">Existing tables</p>
          <p className="mt-1 text-[11px] font-medium leading-[1.35] text-muted-foreground">
            {snapshot.totalAdded} guest
            {snapshot.totalAdded === 1 ? "" : "s"} added to your booked tables
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-[0.625rem] max-sm:grid-cols-1">
        {placedSlots.map((slot) => {
          const added = snapshot.additionsBySlot[slot.key] ?? 0;
          const effectiveOccupied = slot.occupied + added;
          const progress = Math.min(
            100,
            Math.round(
              (effectiveOccupied / Math.max(1, slot.capacity)) * 100,
            ),
          );

          return (
            <div
              key={slot.key}
              className="rounded-lg border border-border bg-card p-[0.625rem_0.75rem]"
              style={{ background: "color-mix(in srgb, var(--muted) 35%, transparent)" }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[0.8125rem] font-bold text-foreground">
                    {slot.label}
                  </p>
                  <p className="mt-[0.15rem] text-[10px] text-muted-foreground">
                    {effectiveOccupied} / {slot.capacity} seats occupied
                  </p>
                </div>
                <span
                  className="rounded text-[9px] font-bold uppercase px-1.5 py-0.5"
                  style={{
                    background: "color-mix(in srgb, var(--color-success) 14%, var(--card))",
                    color: "var(--color-success)",
                  }}
                >
                  +{added}
                </span>
              </div>

              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full"
                style={{ background: "color-mix(in srgb, var(--muted) 60%, var(--card))" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${progress}%`,
                    background: "var(--color-success)",
                    boxShadow: "0 0 0 1px color-mix(in srgb, var(--color-success) 35%, transparent)",
                  }}
                />
              </div>

              <p className="font-semibold" style={{ color: "var(--color-success)" }}>
                +{added} guest{added === 1 ? "" : "s"} ·{" "}
                {formatCurrency(added * slot.pricePerPerson)}
              </p>
            </div>
          );
        })}
      </div>

      <div className="flex items-start justify-between gap-3 border-t border-dashed border-border pt-[0.625rem] text-[11px] font-semibold text-muted-foreground">
        <span>
          {snapshot.totalAdded} guest
          {snapshot.totalAdded === 1 ? "" : "s"} on existing tables
        </span>
        <span className="text-sm font-bold text-foreground">
          {formatCurrency(snapshot.totalCost)}
        </span>
      </div>
    </div>
  );
}

export function FillExistingTablesPanel({
  slots,
  guestsToAdd,
  formatCurrency,
  onStateChange,
  guestsPlacedOnNewTable = 0,
  optional = false,
  autoFillSignal = 0,
  canPlaceRemainingOnNewTable = false,
  newTableMinGuests,
  remainingBelowNewTableMin = false,
  seatingConfirmed = false,
  onConfirmSeating,
  hideCapacityBanner = false,
  hideFooter = false,
}: FillExistingTablesPanelProps) {
  const [additionsBySlot, setAdditionsBySlot] = useState<
    Record<string, number>
  >({});
  const lastAutoFillSignalRef = useRef(0);

  const totalFreeSeats = useMemo(
    () =>
      slots.reduce(
        (sum, slot) => sum + Math.max(0, slot.capacity - slot.occupied),
        0,
      ),
    [slots],
  );

  const totalAdded = useMemo(
    () => Object.values(additionsBySlot).reduce((sum, n) => sum + n, 0),
    [additionsBySlot],
  );

  const totalCost = useMemo(
    () =>
      slots.reduce((sum, slot) => {
        const added = additionsBySlot[slot.key] ?? 0;
        return sum + added * slot.pricePerPerson;
      }, 0),
    [additionsBySlot, slots],
  );

  const saveGroups = useMemo(
    () => buildSaveGroups(slots, additionsBySlot),
    [additionsBySlot, slots],
  );

  useEffect(() => {
    onStateChange?.({
      additionsBySlot,
      totalAdded,
      totalCost,
      saveGroups,
    });
  }, [additionsBySlot, onStateChange, saveGroups, totalAdded, totalCost]);

  const getFreeSeats = useCallback(
    (slot: ExistingTableSlot) => getExistingTableFreeSeats(slot),
    [],
  );

  const getMaxCanAdd = useCallback(
    (slot: ExistingTableSlot) => {
      const free = getFreeSeats(slot);
      const otherAdded = totalAdded - (additionsBySlot[slot.key] ?? 0);
      const remainingGuests = Math.max(0, guestsToAdd - otherAdded);
      return Math.min(free, remainingGuests);
    },
    [additionsBySlot, getFreeSeats, guestsToAdd, totalAdded],
  );

  const setSlotAddition = (slotKey: string, next: number) => {
    setAdditionsBySlot((prev) => ({
      ...prev,
      [slotKey]: Math.max(0, next),
    }));
  };

  const handleConfirmSeating = () => {
    if (totalAdded <= 0) return;
    onConfirmSeating?.();
    toast.success("Existing table seating confirmed");
  };

  const handleAutoFill = useCallback(() => {
    setAdditionsBySlot(buildAutoFillAdditions(slots, guestsToAdd));
  }, [guestsToAdd, slots]);

  useEffect(() => {
    if (autoFillSignal > lastAutoFillSignalRef.current) {
      lastAutoFillSignalRef.current = autoFillSignal;
      handleAutoFill();
      return;
    }

    setAdditionsBySlot({});
  }, [autoFillSignal, guestsToAdd, handleAutoFill]);

  const autoFillCapacity = Math.min(guestsToAdd, totalFreeSeats);
  const unplacedGuests = Math.max(
    0,
    guestsToAdd - totalAdded - guestsPlacedOnNewTable,
  );
  const allGuestsPlacedOnExisting =
    totalAdded > 0 && totalAdded === guestsToAdd;
  const canConfirmExistingPortion =
    totalAdded > 0 &&
    unplacedGuests > 0 &&
    canPlaceRemainingOnNewTable;
  const showConfirmButton =
    !seatingConfirmed &&
    (allGuestsPlacedOnExisting || canConfirmExistingPortion);
  const showCapacityBanner = guestsToAdd > 0 && !hideCapacityBanner && !optional;

  if (slots.length === 0) return null;

  const allFit =
    guestsToAdd > 0 && totalFreeSeats >= guestsToAdd && totalAdded === 0;

  return (
    <div className="flex flex-col gap-3">
      {showCapacityBanner && (
        <div
          className="flex items-center gap-2 rounded-lg p-[0.625rem_0.75rem] text-[11px] font-semibold"
          style={allFit ? {
            border: "1px solid color-mix(in srgb, var(--color-success) 30%, var(--border))",
            background: "color-mix(in srgb, var(--color-success) 10%, var(--card))",
            color: "color-mix(in srgb, var(--color-success) 85%, var(--foreground))",
          } : {
            border: "1px solid color-mix(in srgb, var(--color-info) 25%, var(--border))",
            background: "color-mix(in srgb, var(--color-info) 8%, var(--card))",
            color: "color-mix(in srgb, var(--color-info) 85%, var(--foreground))",
          }}
        >
          {allFit ? (
            <>
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span>
                All {guestsToAdd} guest{guestsToAdd === 1 ? "" : "s"} fit in
                your existing tables
              </span>
            </>
          ) : (
            <span>
              {totalFreeSeats} seat{totalFreeSeats === 1 ? "" : "s"} available
              across existing tables
            </span>
          )}
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold tracking-[0.14em] uppercase text-muted-foreground">
            {optional ? "Fill existing tables (optional)" : "Fill existing tables"}
          </p>
          {optional && (
            <p className="mt-1 text-[11px] font-medium leading-[1.35] text-muted-foreground">
              Skip this section to book a new table for all guests.
            </p>
          )}
        </div>
        {guestsToAdd > 0 && (
          <button
            type="button"
            className="shrink-0 mt-0.5 rounded-full px-[0.625rem] py-1 text-[10px] font-bold"
            style={{
              background: "color-mix(in srgb, var(--color-success) 14%, var(--card))",
              color: "var(--color-success)",
            }}
            onClick={handleAutoFill}
          >
            {optional ? "Auto-fill existing" : autoFillCapacity < guestsToAdd
              ? `Auto-fill ${autoFillCapacity} of ${guestsToAdd}`
              : `Auto-fill ${guestsToAdd}`}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-[0.625rem] max-sm:grid-cols-1">
        {slots.map((slot) => {
          const added = additionsBySlot[slot.key] ?? 0;
          const effectiveOccupied = slot.occupied + added;
          const effectiveFree = Math.max(0, slot.capacity - effectiveOccupied);
          const isFull = effectiveFree <= 0;
          const maxCanAdd = getMaxCanAdd(slot);
          const progress = Math.min(
            100,
            Math.round((effectiveOccupied / Math.max(1, slot.capacity)) * 100),
          );

          return (
            <div key={slot.key} className="rounded-lg border border-border bg-card p-[0.625rem_0.75rem]">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[0.8125rem] font-bold text-foreground">
                    {slot.label}
                  </p>
                  <p className="mt-[0.15rem] text-[10px] text-muted-foreground">
                    {effectiveOccupied} / {slot.capacity} seats occupied
                  </p>
                </div>
                <span
                  className="rounded text-[9px] font-bold uppercase px-1.5 py-0.5"
                  style={isFull ? {
                    background: "color-mix(in srgb, var(--muted) 50%, var(--card))",
                    color: "var(--muted-foreground)",
                  } : {
                    background: "color-mix(in srgb, var(--color-success) 14%, var(--card))",
                    color: "var(--color-success)",
                  }}
                >
                  {isFull ? "Full" : `${effectiveFree} free`}
                </span>
              </div>

              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full"
                style={{ background: "color-mix(in srgb, var(--muted) 60%, var(--card))" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${progress}%`,
                    background: added > 0
                      ? "var(--color-success)"
                      : isFull
                        ? "color-mix(in srgb, var(--color-success) 55%, var(--muted-foreground))"
                        : "var(--color-success)",
                    boxShadow: added > 0
                      ? "0 0 0 1px color-mix(in srgb, var(--color-success) 35%, transparent)"
                      : undefined,
                  }}
                />
              </div>

              <div className="mt-[0.625rem] flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {added > 0
                    ? `+${added} · ${formatCurrency(added * slot.pricePerPerson)}`
                    : "No guests added"}
                </span>
                <QuantityStepper
                  value={added}
                  max={isFull && added === 0 ? 0 : maxCanAdd}
                  onChange={(next) => setSlotAddition(slot.key, next)}
                  size="sm"
                />
              </div>
            </div>
          );
        })}
      </div>

      {guestsToAdd > 0 && !hideFooter && (
        <div className="flex items-start justify-between gap-3 border-t border-dashed border-border pt-[0.625rem] text-[11px] font-semibold text-muted-foreground">
          <div>
            <span>
              {totalAdded} / {guestsToAdd} guest
              {guestsToAdd === 1 ? "" : "s"} placed
            </span>
            {unplacedGuests > 0 && totalAdded > 0 && (
              <p className="mt-1 text-[10px] font-semibold leading-[1.4] text-[#b45309]">
                {unplacedGuests} guest{unplacedGuests === 1 ? "" : "s"} remaining
                {canPlaceRemainingOnNewTable
                  ? " — you can add a new table below."
                  : remainingBelowNewTableMin &&
                      newTableMinGuests != null &&
                      newTableMinGuests > 0
                    ? ` — new tables require at least ${newTableMinGuests} guests. Use the options below to adjust.`
                    : optional
                      ? "."
                      : " — place them on a new table below."}
              </p>
            )}
          </div>
          <span className="text-sm font-bold text-foreground">
            {formatCurrency(totalCost)}
          </span>
        </div>
      )}

      {showConfirmButton && (
        <>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Tap{" "}
            <span className="font-semibold text-foreground">Confirm seating</span>{" "}
            {allGuestsPlacedOnExisting
              ? "to add guests to your order."
              : "to lock existing tables, then add a new table for remaining guests."}
          </p>
          <button
            type="button"
            className="h-8 w-full rounded-md text-xs font-bold leading-none hover:opacity-[0.92]"
            style={{
              backgroundColor: "var(--color-success)",
              color: "var(--color-primary-foreground, #fff)",
            }}
            onClick={handleConfirmSeating}
          >
            Confirm seating
          </button>
        </>
      )}

      {seatingConfirmed && totalAdded > 0 && (
        <p className="text-[11px] font-semibold text-emerald-700">
          Existing seating confirmed · {totalAdded} guest
          {totalAdded === 1 ? "" : "s"}
        </p>
      )}
    </div>
  );
}
