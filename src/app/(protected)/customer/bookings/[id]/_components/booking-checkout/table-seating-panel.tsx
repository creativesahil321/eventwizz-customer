"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Minus, Plus, RotateCcw, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  autoArrangeGuests,
  validateAllocation,
  type TableAllocationData,
} from "@/app/(public)/vendor/checkout/_lib/guest-allocation";
import { formatTableCapacityTitle } from "@/app/(public)/vendor/checkout/_lib/table-labels";
import VenueContactNotice from "@/app/(public)/vendor/checkout/_components/venue-contact-notice";
import { resolveVenueContact } from "@/lib/resolve-venue-contact";
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
  /** Draft allocation total — used for progress before Confirm seating. */
  draftGuestTotal: number;
}

interface TableSeatingPanelProps {
  tableConfig: TableSeatingConfig;
  formatCurrency: (amount: number) => string;
  formatUnit: (amount: number) => string;
  onStateChange?: (snapshot: TableSeatingSnapshot) => void;
  /** When set, controls group size externally (e.g. remaining guests after fill-existing). */
  externalGroupSize?: number | null;
  sectionTitle?: string;
  /** Renders a Close control in the section header row. */
  onClose?: () => void;
  /** Existing-table capacity hint for below-minimum messaging in add-guests flow. */
  existingTableCapacity?: number;
  /** Smallest top-level guest count that fills existing tables + one new table. */
  minimumTotalGroupSize?: number;
}

export function resolveTableQuantity(
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

/** Whether `guestCount` can be seated with available new-table stock. */
export function isNewTableGroupViable(
  guestCount: number,
  config: Pick<TableSeatingConfig, "min" | "max" | "maxTables">,
): boolean {
  if (guestCount <= 0 || config.maxTables <= 0) return false;
  if (guestCount < config.min) return false;

  const idealQty = resolveTableQuantity(
    guestCount,
    config.min,
    config.max,
    999,
  );
  const resolvedQty = resolveTableQuantity(
    guestCount,
    config.min,
    config.max,
    config.maxTables,
  );

  return (
    idealQty !== null &&
    resolvedQty !== null &&
    idealQty <= config.maxTables
  );
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
  externalGroupSize = null,
  sectionTitle,
  onClose,
  existingTableCapacity,
  minimumTotalGroupSize,
}: TableSeatingPanelProps) {
  const { settings } = useDomain();
  const { phone: venuePhone, email: venueEmail, address: venueAddress } =
    resolveVenueContact(settings);

  const minPersons = tableConfig.min;
  const maxPersons = tableConfig.max;
  const maxTables = Math.max(0, tableConfig.maxTables);
  const pricePerPerson = tableConfig.price;
  const maxGroupSize =
    maxTables > 0 ? maxTables * maxPersons : maxPersons;
  const capacityTitle = formatTableCapacityTitle(minPersons, maxPersons);

  const [groupSize, setGroupSize] = useState(0);
  const isControlledGroupSize = externalGroupSize != null;
  const effectiveGroupSize = isControlledGroupSize
    ? Math.max(0, externalGroupSize ?? 0)
    : groupSize;

  useEffect(() => {
    if (isControlledGroupSize) {
      setGroupSize(Math.max(0, externalGroupSize ?? 0));
    }
  }, [externalGroupSize, isControlledGroupSize]);

  const [draftAllocation, setDraftAllocation] = useState<number[]>([]);
  const [seatingConfirmed, setSeatingConfirmed] = useState(false);
  /** Show Auto Distribute / Reset only after the user edits a table. */
  const [hasTouchedTables, setHasTouchedTables] = useState(false);
  /**
   * "How many guests?" is the one main control; tables are filled for the
   * customer and shown as read-only rows. Per-table steppers only on request
   * (2+ tables) — same pattern as public checkout.
   */
  const [isAdjusting, setIsAdjusting] = useState(false);
  const lastAppliedPlanRef = useRef<string>("");

  const belowMinimum = effectiveGroupSize > 0 && effectiveGroupSize < minPersons;
  const tablesSoldOut = maxTables <= 0;
  const resolvedQty =
    effectiveGroupSize > 0
      ? resolveTableQuantity(effectiveGroupSize, minPersons, maxPersons, maxTables)
      : null;
  const tableQuantity = resolvedQty ?? 0;
  const idealQty =
    effectiveGroupSize > 0
      ? resolveTableQuantity(effectiveGroupSize, minPersons, maxPersons, 999)
      : null;
  const exceedsAvailability =
    effectiveGroupSize > 0 &&
    maxTables > 0 &&
    idealQty !== null &&
    (resolvedQty === null || idealQty > maxTables);
  const hasViablePlan =
    effectiveGroupSize > 0 && resolvedQty !== null && maxTables > 0 && !tablesSoldOut;

  const buildAutoAllocation = useCallback(
    (guestCount: number, quantity: number) => {
      if (guestCount <= 0 || quantity <= 0) return [] as number[];

      const arranged = autoArrangeGuests(
        [
          {
            id: tableConfig.id,
            title: capacityTitle,
            minPersons,
            maxPersons,
            quantity,
          },
        ],
        guestCount,
      );

      return normalizeAllocation(
        arranged[tableConfig.id] ?? [],
        quantity,
        minPersons,
      );
    },
    [capacityTitle, maxPersons, minPersons, tableConfig.id],
  );

  useEffect(() => {
    const planKey = `${effectiveGroupSize}:${tableQuantity}:${tableConfig.id}`;
    if (planKey === lastAppliedPlanRef.current) return;

    lastAppliedPlanRef.current = planKey;

    if (effectiveGroupSize <= 0 || tableQuantity <= 0) {
      setDraftAllocation([]);
      setSeatingConfirmed(false);
      setHasTouchedTables(false);
      return;
    }

    setDraftAllocation(buildAutoAllocation(effectiveGroupSize, tableQuantity));
    setSeatingConfirmed(false);
    setHasTouchedTables(false);
  }, [
    buildAutoAllocation,
    effectiveGroupSize,
    tableConfig.id,
    tableQuantity,
  ]);

  const activeAllocation = useMemo(() => {
    if (tableQuantity <= 0) return [] as number[];
    if (draftAllocation.length === tableQuantity) return draftAllocation;
    return buildAutoAllocation(effectiveGroupSize, tableQuantity);
  }, [
    buildAutoAllocation,
    draftAllocation,
    effectiveGroupSize,
    tableQuantity,
  ]);

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
              allocation: activeAllocation,
            },
          ]
        : [],
    [
      activeAllocation,
      capacityTitle,
      maxPersons,
      minPersons,
      tableConfig.id,
      tableQuantity,
    ],
  );

  const validation = useMemo(
    () =>
      tableQuantity > 0
        ? validateAllocation(tableAllocationData, effectiveGroupSize)
        : {
            isValid: false,
            errors: [] as string[],
            warnings: [] as string[],
            totalAllocated: 0,
            totalRequired: effectiveGroupSize,
          },
    [effectiveGroupSize, tableAllocationData, tableQuantity],
  );

  const draftGuestTotal = activeAllocation.reduce(
    (sum, guests) => sum + guests,
    0,
  );

  const progressPercent = Math.min(
    100,
    Math.round(
      (validation.totalAllocated / Math.max(1, effectiveGroupSize)) * 100,
    ),
  );

  const confirmedGuestTotal = seatingConfirmed ? draftGuestTotal : 0;
  const tableTotal = seatingConfirmed
    ? confirmedGuestTotal * pricePerPerson
    : 0;
  const tableItemCount = seatingConfirmed
    ? activeAllocation.filter((count) => count > 0).length
    : 0;

  useEffect(() => {
    onStateChange?.({
      groupSize: effectiveGroupSize,
      allocation: seatingConfirmed ? activeAllocation : [],
      seatingConfirmed,
      tableTotal,
      tableItemCount,
      draftGuestTotal,
    });
  }, [
    activeAllocation,
    draftGuestTotal,
    effectiveGroupSize,
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
    setHasTouchedTables(true);
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
    if (effectiveGroupSize <= 0 || tableQuantity <= 0) {
      toast.error("Set your group size before auto distributing guests.");
      return;
    }

    updateDraft(buildAutoAllocation(effectiveGroupSize, tableQuantity));
  };

  const handleReset = () => {
    if (!isControlledGroupSize) {
      setGroupSize(0);
      lastAppliedPlanRef.current = "";
      setDraftAllocation([]);
      setSeatingConfirmed(false);
      setHasTouchedTables(false);
      return;
    }

    if (tableQuantity > 0) {
      updateDraft(Array(tableQuantity).fill(minPersons));
    } else {
      setDraftAllocation([]);
    }
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
    toast.success("Seating ready. Select Add to booking to save.");
  };

  const canAdjustTables = tableQuantity > 1;
  // Keep an invalid split fixable: open the controls automatically.
  const showTableControls =
    canAdjustTables && (isAdjusting || !validation.isValid);

  const showConfirmButton =
    effectiveGroupSize > 0 &&
    tableQuantity > 0 &&
    validation.isValid &&
    !seatingConfirmed &&
    tableQuantity <= maxTables;

  return (
    <div className="flex flex-col gap-3 overflow-hidden rounded-lg border border-border bg-card p-3">
      {(sectionTitle || onClose) && (
        <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
          {sectionTitle ? (
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--booking-kind-table)]">
              {sectionTitle}
            </p>
          ) : (
            <span aria-hidden className="min-w-0 flex-1" />
          )}
          {onClose ? (
            <button
              type="button"
              className="inline-flex min-h-9 shrink-0 items-center px-1 text-xs font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              onClick={onClose}
            >
              Close
            </button>
          ) : null}
        </div>
      )}
      {!isControlledGroupSize && (
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
          <span className="text-sm font-semibold text-foreground">
            How many guests?
          </span>
          <QuantityStepper
            value={groupSize}
            max={maxGroupSize}
            onChange={(next) => setGroupSize(next)}
            useKindAccent
          />
        </div>
      )}

      {effectiveGroupSize > 0 && (
        <div className="flex flex-col gap-3 p-3">
          {tablesSoldOut ? (
            <VenueContactNotice
              title="No tables available."
              message="All tables for this date are sold out. Contact the venue for assistance."
              phone={venuePhone}
              email={venueEmail}
              address={venueAddress}
            />
          ) : belowMinimum ? (
            <VenueContactNotice
              title={`${isControlledGroupSize ? "New tables" : "Tables"} start from ${minPersons} guests.`}
              message={
                isControlledGroupSize &&
                minimumTotalGroupSize != null &&
                existingTableCapacity != null &&
                minimumTotalGroupSize > existingTableCapacity
                  ? `Increase your group size to at least ${minimumTotalGroupSize} guests (${existingTableCapacity} in existing tables + ${minPersons} for a new table), or contact the venue using the details below for smaller groups.`
                  : isControlledGroupSize
                    ? `Increase your group size to at least ${minPersons} guests for a new table, or contact the venue using the details below for smaller groups.`
                    : "Contact the venue using the details below for smaller groups."
              }
              phone={venuePhone}
              email={venueEmail}
              address={venueAddress}
            />
          ) : exceedsAvailability ? (
            <VenueContactNotice
              title={`Only ${maxTables} table${maxTables === 1 ? "" : "s"} available.`}
              message={`Your group of ${effectiveGroupSize} needs ${idealQty ?? tableQuantity} table${(idealQty ?? tableQuantity) === 1 ? "" : "s"}. Contact the venue using the details below for larger groups.`}
              phone={venuePhone}
              email={venueEmail}
              address={venueAddress}
            />
          ) : !hasViablePlan ? (
            <VenueContactNotice
              title="No tables available for your group size."
              message="Please contact the venue using the details below for assistance."
              phone={venuePhone}
              email={venueEmail}
              address={venueAddress}
            />
          ) : (
            <>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    {minPersons === maxPersons
                      ? `Table for ${maxPersons} guests`
                      : `Table for ${minPersons}–${maxPersons} guests`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tableQuantity} table{tableQuantity === 1 ? "" : "s"} ·{" "}
                    {draftGuestTotal} guest{draftGuestTotal === 1 ? "" : "s"} ·{" "}
                    {maxTables} available
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold tabular-nums text-foreground">
                    {formatCurrency(pricePerPerson * draftGuestTotal)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatUnit(pricePerPerson)}/person
                  </p>
                </div>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    validation.isValid
                      ? "bg-[color:var(--color-primary)]"
                      : validation.totalAllocated > effectiveGroupSize
                        ? "bg-red-500"
                        : "bg-primary",
                  )}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {showTableControls && hasTouchedTables ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border-0 text-sm font-semibold leading-none transition-opacity hover:opacity-90 sm:h-9 sm:w-auto sm:px-3"
                    style={{
                      backgroundColor: "var(--color-primary)",
                      color: "var(--color-primary-foreground, #fff)",
                    }}
                    onClick={handleAutoDistribute}
                  >
                    <Wand2 className="h-3 w-3" strokeWidth={2} />
                    Auto Distribute
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-card text-sm font-semibold leading-none text-muted-foreground transition-colors hover:bg-[color-mix(in_srgb,var(--muted)_40%,var(--card))] sm:w-auto sm:px-3"
                    onClick={handleReset}
                  >
                    <RotateCcw className="h-3 w-3" strokeWidth={2} />
                    Reset
                  </button>
                </div>
              ) : null}

              <div
                className={cn(
                  "grid gap-2",
                  showTableControls
                    ? "grid-cols-1 min-[420px]:grid-cols-2"
                    : "grid-cols-2 sm:grid-cols-3",
                  tableQuantity > 6 &&
                    "max-h-[min(50vh,420px)] overflow-y-auto overscroll-contain",
                )}
              >
                {Array.from({ length: tableQuantity }, (_, index) => {
                  const currentValue = activeAllocation[index] ?? minPersons;
                  const isOverflow = currentValue > maxPersons;
                  const isUnder = currentValue < minPersons;

                  return (
                    <div
                      key={index}
                      className={cn(
                        "flex min-w-0 items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2",
                        isOverflow
                          ? "border-red-200"
                          : isUnder
                            ? "border-amber-200"
                            : "border-border",
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-muted-foreground">
                          Table {index + 1}
                        </p>
                        <p
                          className={cn(
                            "text-sm font-bold tabular-nums",
                            isOverflow
                              ? "text-red-600"
                              : isUnder
                                ? "text-amber-600"
                                : "text-foreground",
                          )}
                        >
                          {currentValue} guest{currentValue === 1 ? "" : "s"}
                        </p>
                        {showTableControls ? (
                          <p className="text-xs tabular-nums text-muted-foreground">
                            {formatCurrency(pricePerPerson * currentValue)} · max{" "}
                            {maxPersons}
                          </p>
                        ) : null}
                      </div>

                      {showTableControls ? (
                        <div className="flex shrink-0 items-center overflow-hidden rounded-lg border border-border bg-muted/40">
                          <button
                            type="button"
                            onClick={() => stepAllocation(index, -1)}
                            disabled={currentValue <= minPersons}
                            className="flex h-10 w-10 items-center justify-center text-foreground transition-colors hover:bg-background disabled:opacity-30"
                            aria-label={`Decrease guests at table ${index + 1}`}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <div className="h-6 w-px bg-border" />
                          <button
                            type="button"
                            onClick={() => stepAllocation(index, 1)}
                            disabled={currentValue >= maxPersons}
                            className="flex h-10 w-10 items-center justify-center text-foreground transition-colors hover:bg-background disabled:opacity-30"
                            aria-label={`Increase guests at table ${index + 1}`}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {canAdjustTables && validation.isValid ? (
                <button
                  type="button"
                  onClick={() => setIsAdjusting((open) => !open)}
                  className="inline-flex min-h-9 items-center self-start text-sm font-semibold text-[color:var(--color-primary)] underline-offset-2 hover:underline"
                  aria-expanded={isAdjusting}
                >
                  {isAdjusting ? "Done adjusting" : "Adjust tables"}
                </button>
              ) : null}

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
                    className="h-11 w-full rounded-lg text-sm font-bold leading-none hover:opacity-[0.92]"
                    style={{
                      backgroundColor: "var(--color-primary)",
                      color: "var(--color-primary-foreground, #fff)",
                    }}
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
