"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Minus, Plus, RotateCcw, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  autoArrangeGuests,
  validateAllocation,
  type TableAllocationData,
} from "../../_lib/guest-allocation";
import { formatTableCapacityTitle } from "@/app/(public)/vendor/checkout/_lib/table-labels";
import VenueContactNotice from "@/app/(public)/vendor/checkout/_components/venue-contact-notice";
import { useDomain } from "@/providers/domain-provider/domain-provider";
import { QuantityStepper } from "./quantity-stepper";

export interface TableSeatingConfig {
  id: number;
  min: number;
  max: number;
  price: number;
  maxTables: number;
}

export interface TableSeatingSnapshot {
  groupSize: number;
  allocation: number[];
  seatingConfirmed: boolean;
  tableTotal: number;
  tableItemCount: number;
}

interface TableSeatingPanelProps {
  tableConfig: TableSeatingConfig;
  formatCurrency: (amount: number) => string;
  formatUnit: (amount: number) => string;
  onStateChange?: (snapshot: TableSeatingSnapshot) => void;
}

function resolveTableQuantity(
  groupSize: number,
  minPersons: number,
  maxPersons: number,
  maxStock = 50,
): number | null {
  if (groupSize <= 0) return null;

  for (let qty = 1; qty <= maxStock; qty++) {
    if (groupSize >= minPersons * qty && groupSize <= maxPersons * qty) {
      return qty;
    }
  }

  if (groupSize > maxPersons) {
    const qty = Math.ceil(groupSize / maxPersons);
    return qty <= maxStock ? qty : null;
  }

  if (groupSize < minPersons) {
    return 1;
  }

  return null;
}

function normalizeAllocation(
  allocation: number[],
  quantity: number,
  minPersons: number,
): number[] {
  if (allocation.length === quantity) return allocation;
  return Array(quantity).fill(minPersons);
}

export function TableSeatingPanel({
  tableConfig,
  formatCurrency,
  formatUnit,
  onStateChange,
}: TableSeatingPanelProps) {
  const { settings } = useDomain();
  const venuePhone =
    settings?.contactDetails?.phone ||
    settings?.contactDetails?.alternativePhone ||
    null;
  const venueEmail =
    settings?.contactDetails?.email ||
    settings?.contactDetails?.alternativeEmail ||
    null;

  const minPersons = tableConfig.min;
  const maxPersons = tableConfig.max;
  const maxTables = Math.max(0, tableConfig.maxTables);
  const pricePerPerson = tableConfig.price;
  const maxGroupSize =
    maxTables > 0 ? maxTables * maxPersons : maxPersons;
  const capacityTitle = formatTableCapacityTitle(minPersons, maxPersons);

  const [groupSize, setGroupSize] = useState(0);
  const [tableQuantity, setTableQuantity] = useState(0);
  const [draftAllocation, setDraftAllocation] = useState<number[]>([]);
  const [seatingConfirmed, setSeatingConfirmed] = useState(false);

  const belowMinimum = groupSize > 0 && groupSize < minPersons;
  const tablesSoldOut = maxTables <= 0;
  const resolvedQty =
    groupSize > 0
      ? resolveTableQuantity(groupSize, minPersons, maxPersons, maxTables)
      : null;
  const idealQty =
    groupSize > 0
      ? resolveTableQuantity(groupSize, minPersons, maxPersons, 999)
      : null;
  const exceedsAvailability =
    groupSize > 0 &&
    maxTables > 0 &&
    idealQty !== null &&
    (resolvedQty === null || idealQty > maxTables);
  const hasViablePlan =
    groupSize > 0 && resolvedQty !== null && maxTables > 0 && !tablesSoldOut;

  const applyPlanForGroupSize = useCallback(
    (nextGroupSize: number) => {
      if (nextGroupSize <= 0) {
        setTableQuantity(0);
        setDraftAllocation([]);
        setSeatingConfirmed(false);
        return;
      }

      const qty = resolveTableQuantity(
        nextGroupSize,
        minPersons,
        maxPersons,
        maxTables,
      );
      if (!qty) {
        setTableQuantity(0);
        setDraftAllocation([]);
        setSeatingConfirmed(false);
        return;
      }

      const arranged = autoArrangeGuests(
        [
          {
            id: tableConfig.id,
            title: capacityTitle,
            minPersons,
            maxPersons,
            quantity: qty,
          },
        ],
        nextGroupSize,
      );

      setTableQuantity(qty);
      setDraftAllocation(
        normalizeAllocation(arranged[tableConfig.id] ?? [], qty, minPersons),
      );
      setSeatingConfirmed(false);
    },
    [capacityTitle, maxPersons, maxTables, minPersons, tableConfig.id],
  );

  useEffect(() => {
    applyPlanForGroupSize(groupSize);
  }, [groupSize, applyPlanForGroupSize]);

  const tableAllocationData: TableAllocationData[] = useMemo(
    () =>
      tableQuantity > 0
        ? [
            {
              tableId: tableConfig.id,
              title: capacityTitle,
              minPersons,
              maxPersons,
              quantity: tableQuantity,
              allocation: draftAllocation,
            },
          ]
        : [],
    [
      capacityTitle,
      draftAllocation,
      maxPersons,
      minPersons,
      tableConfig.id,
      tableQuantity,
    ],
  );

  const validation = useMemo(
    () =>
      tableQuantity > 0
        ? validateAllocation(tableAllocationData, groupSize)
        : {
            isValid: false,
            errors: [] as string[],
            warnings: [] as string[],
            totalAllocated: 0,
            totalRequired: groupSize,
          },
    [groupSize, tableAllocationData, tableQuantity],
  );

  const draftGuestTotal = draftAllocation.reduce(
    (sum, guests) => sum + guests,
    0,
  );

  const progressPercent = Math.min(
    100,
    Math.round((validation.totalAllocated / Math.max(1, groupSize)) * 100),
  );

  const confirmedGuestTotal = seatingConfirmed ? draftGuestTotal : 0;
  const tableTotal = seatingConfirmed
    ? confirmedGuestTotal * pricePerPerson
    : 0;
  const tableItemCount = seatingConfirmed
    ? draftAllocation.filter((count) => count > 0).length
    : 0;

  useEffect(() => {
    onStateChange?.({
      groupSize,
      allocation: seatingConfirmed ? draftAllocation : [],
      seatingConfirmed,
      tableTotal,
      tableItemCount,
    });
  }, [
    draftAllocation,
    groupSize,
    onStateChange,
    seatingConfirmed,
    tableItemCount,
    tableTotal,
  ]);

  const updateDraft = (next: number[]) => {
    setDraftAllocation(next);
    setSeatingConfirmed(false);
  };

  const stepAllocation = (index: number, delta: number) => {
    setDraftAllocation((current) => {
      const value = current[index] ?? minPersons;
      const next = Math.max(minPersons, Math.min(maxPersons, value + delta));
      const updated = [...current];
      updated[index] = next;
      return updated;
    });
    setSeatingConfirmed(false);
  };

  const handleAutoDistribute = () => {
    if (groupSize <= 0 || tableQuantity <= 0) return;

    const arranged = autoArrangeGuests(
      [
        {
          id: tableConfig.id,
          title: capacityTitle,
          minPersons,
          maxPersons,
          quantity: tableQuantity,
        },
      ],
      groupSize,
    );

    updateDraft(
      normalizeAllocation(
        arranged[tableConfig.id] ?? [],
        tableQuantity,
        minPersons,
      ),
    );
  };

  const handleReset = () => {
    setGroupSize(0);
    setTableQuantity(0);
    setDraftAllocation([]);
    setSeatingConfirmed(false);
  };

  const handleConfirmSeating = () => {
    if (tableQuantity > maxTables) {
      toast.error(
        `Only ${maxTables} table(s) available. You requested ${tableQuantity}.`,
      );
      return;
    }
    if (!validation.isValid) {
      toast.error(
        "Please assign all guests correctly before confirming seating.",
      );
      return;
    }

    setSeatingConfirmed(true);
    toast.success("Seating ready — tap Add to booking to save");
  };

  const showConfirmButton =
    groupSize > 0 &&
    tableQuantity > 0 &&
    validation.isValid &&
    !seatingConfirmed &&
    tableQuantity <= maxTables;

  return (
    <div className="booking-table-panel booking-table-panel--compact overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
        <span className="text-xs font-medium text-foreground">Group size</span>
        <QuantityStepper
          value={groupSize}
          max={maxGroupSize}
          onChange={(next) => setGroupSize(next)}
          size="sm"
          useKindAccent
        />
      </div>

      {groupSize > 0 && (
        <div className="flex flex-col gap-3 p-3">
          {tablesSoldOut ? (
            <VenueContactNotice
              title="No tables available."
              message="All tables for this date are sold out. Contact the venue for assistance."
              phone={venuePhone}
              email={venueEmail}
            />
          ) : belowMinimum ? (
            <VenueContactNotice
              message={`Tables start from ${minPersons} guests. Contact the venue for smaller groups.`}
              phone={venuePhone}
              email={venueEmail}
            />
          ) : exceedsAvailability ? (
            <VenueContactNotice
              title={`Only ${maxTables} table${maxTables === 1 ? "" : "s"} available.`}
              message={`Your group of ${groupSize} needs ${idealQty ?? tableQuantity} table${(idealQty ?? tableQuantity) === 1 ? "" : "s"}. Contact the venue for larger groups.`}
              phone={venuePhone}
              email={venueEmail}
            />
          ) : !hasViablePlan ? (
            <VenueContactNotice
              title="No tables available for your group size."
              message="Please contact the venue for assistance."
              phone={venuePhone}
              email={venueEmail}
            />
          ) : (
            <>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Minimum {minPersons}, Maximum {maxPersons}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {tableQuantity} table{tableQuantity === 1 ? "" : "s"} ·{" "}
                    {minPersons}–{maxPersons} per table · {maxTables} available
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold tabular-nums text-foreground">
                    {formatCurrency(pricePerPerson * draftGuestTotal)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatUnit(pricePerPerson)}/person
                  </p>
                </div>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    validation.isValid
                      ? "bg-emerald-500"
                      : validation.totalAllocated > groupSize
                        ? "bg-red-500"
                        : "bg-primary",
                  )}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  className="booking-table-auto-btn"
                  onClick={handleAutoDistribute}
                >
                  <Wand2 className="h-3 w-3" strokeWidth={2} />
                  Auto Distribute
                </button>
                <button
                  type="button"
                  className="booking-table-reset-btn"
                  onClick={handleReset}
                >
                  <RotateCcw className="h-3 w-3" strokeWidth={2} />
                  Reset
                </button>
              </div>

              {showConfirmButton && (
                <>
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    Tap{" "}
                    <span className="font-semibold text-foreground">
                      Confirm seating
                    </span>{" "}
                    to add tables to your order.
                  </p>
                  <button
                    type="button"
                    className="booking-table-confirm-btn"
                    onClick={handleConfirmSeating}
                  >
                    Confirm seating
                  </button>
                </>
              )}

              {seatingConfirmed && (
                <p className="text-[11px] font-semibold text-emerald-700">
                  Seating confirmed · {draftGuestTotal} guest
                  {draftGuestTotal === 1 ? "" : "s"} across {tableQuantity}{" "}
                  table{tableQuantity === 1 ? "" : "s"}
                </p>
              )}

              <div
                className={cn(
                  "grid grid-cols-2 gap-2 min-[420px]:grid-cols-3 sm:grid-cols-4",
                  tableQuantity > 6 &&
                    "max-h-[min(50vh,420px)] overflow-y-auto overscroll-contain",
                )}
              >
                {Array.from({ length: tableQuantity }, (_, index) => {
                  const currentValue = draftAllocation[index] ?? minPersons;
                  const isFull = currentValue >= maxPersons;
                  const isOverflow = currentValue > maxPersons;
                  const isUnder = currentValue < minPersons;

                  return (
                    <div
                      key={index}
                      className={cn(
                        "min-w-0 rounded-lg border bg-card px-1.5 py-2 sm:px-2",
                        isOverflow
                          ? "border-red-200"
                          : isUnder
                            ? "border-amber-200"
                            : "border-border",
                      )}
                    >
                      <div className="mb-1 flex items-center justify-between gap-0.5">
                        <span className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Table {index + 1}
                        </span>
                        {isFull && !isOverflow && (
                          <span className="text-[8px] font-bold uppercase text-emerald-600">
                            Full
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-1">
                        <div>
                          <p
                            className={cn(
                              "text-lg font-bold tabular-nums leading-none",
                              isOverflow
                                ? "text-red-600"
                                : isUnder
                                  ? "text-amber-600"
                                  : "text-foreground",
                            )}
                          >
                            {currentValue}
                          </p>
                          <p className="mt-0.5 text-[8px] text-muted-foreground">
                            Max {maxPersons}
                          </p>
                          <p className="mt-1 text-[8px] font-semibold tabular-nums text-foreground">
                            {formatCurrency(pricePerPerson * currentValue)}
                          </p>
                        </div>

                        <div className="flex overflow-hidden rounded border border-border bg-muted/40">
                          <button
                            type="button"
                            onClick={() => stepAllocation(index, -1)}
                            disabled={currentValue <= minPersons}
                            className="flex h-6 w-6 items-center justify-center text-muted-foreground transition-colors hover:bg-background disabled:opacity-30"
                            aria-label={`Decrease guests at table ${index + 1}`}
                          >
                            <Minus className="h-2.5 w-2.5" />
                          </button>
                          <div className="w-px bg-border" />
                          <button
                            type="button"
                            onClick={() => stepAllocation(index, 1)}
                            disabled={currentValue >= maxPersons}
                            className="flex h-6 w-6 items-center justify-center text-muted-foreground transition-colors hover:bg-background disabled:opacity-30"
                            aria-label={`Increase guests at table ${index + 1}`}
                          >
                            <Plus className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {!validation.isValid && validation.errors.length > 0 && (
                <div className="rounded-lg border border-red-100 bg-red-50 px-2.5 py-2">
                  <div className="flex items-start gap-1.5">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                    <p className="text-[11px] leading-snug text-red-700">
                      {validation.errors[0]}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
