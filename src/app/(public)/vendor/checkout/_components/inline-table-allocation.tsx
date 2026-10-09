"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  Minus,
  Plus,
  Wand2,
  RotateCcw,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { EditableItem, useCartEditStore } from "@/store/cart-edit.store";
import { useCheckoutSeatingDraftStore } from "@/store/checkout-seating-draft.store";
import {
  autoArrangeGuests,
  validateAllocation,
  TableAllocationData,
} from "../_lib/guest-allocation";
import { formatTableCapacityTitle } from "../_lib/table-labels";
import { useCurrencyFormat } from "@/hooks/use-currency-format";

interface InlineTableAllocationProps {
  eventSlug: string;
  date: string;
  table: EditableItem;
  peopleCount: number;
  isMixedPlan?: boolean;
  nested?: boolean;
  showConfirmHint?: boolean;
  onTableSeatingConfirmed?: () => boolean | Promise<boolean>;
}

function normalizeAllocation(
  allocation: number[],
  quantity: number,
  minPersons: number,
): number[] {
  if (allocation.length === quantity) return allocation;
  return Array(quantity).fill(minPersons);
}

export default function InlineTableAllocation({
  eventSlug,
  date,
  table,
  peopleCount,
  isMixedPlan = false,
  nested = false,
  showConfirmHint = false,
  onTableSeatingConfirmed,
}: InlineTableAllocationProps) {
  const { format: formatMoney } = useCurrencyFormat();
  const { getDateData, confirmTableSeating } = useCartEditStore();
  const isStoreConfirmed = useCartEditStore(
    (state) =>
      state.editingData[eventSlug]?.[date]?.confirmedTableIds?.includes(
        table.id,
      ) ?? false,
  );
  const [isSavingSeating, setIsSavingSeating] = useState(false);

  const minPersons = table.minPersons || 1;
  const maxPersons = table.maxPersons || 999;
  const pricePerPerson = table.pricePerPerson || table.price;
  const capacityTitle = formatTableCapacityTitle(minPersons, maxPersons);

  const committedAllocation = useMemo(
    () => normalizeAllocation(table.allocation ?? [], table.quantity, minPersons),
    [table.allocation, table.quantity, minPersons],
  );

  const [draftAllocation, setDraftAllocation] =
    useState<number[]>(committedAllocation);
  const [isConfirmed, setIsConfirmed] = useState(false);
  /** Show Auto Distribute / Reset only after the user edits a table. */
  const [hasTouchedTables, setHasTouchedTables] = useState(false);
  /**
   * "How many guests?" is the one main control — tables are filled for the
   * customer and shown as read-only rows. Per-table steppers only appear on
   * request (2+ tables), so there is never a second, competing control.
   */
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Sync before paint so Confirm seating never submits stale allocation after
  // group-size / auto-match updates (useEffect was one frame too late).
  useLayoutEffect(() => {
    setDraftAllocation(committedAllocation);
    setHasTouchedTables(false);
  }, [committedAllocation]);

  useEffect(() => {
    setIsConfirmed(false);
    setHasTouchedTables(false);
  }, [peopleCount, table.id, table.quantity]);

  const isDirty = useMemo(
    () =>
      draftAllocation.length !== committedAllocation.length ||
      draftAllocation.some((value, index) => value !== committedAllocation[index]),
    [draftAllocation, committedAllocation],
  );

  useEffect(() => {
    const dateData = getDateData(eventSlug, date);
    const storeConfirmed =
      dateData?.confirmedTableIds?.includes(table.id) ?? false;
    if (storeConfirmed && !isDirty) {
      setIsConfirmed(true);
    }
  }, [eventSlug, date, table.id, committedAllocation, isDirty, getDateData]);

  const draftGuestTotal = draftAllocation.reduce((sum, guests) => sum + guests, 0);
  const committedGuestTotal = committedAllocation.reduce(
    (sum, guests) => sum + guests,
    0,
  );
  const seatingTarget = isMixedPlan
    ? committedGuestTotal || draftGuestTotal
    : peopleCount;

  const tableAllocationData: TableAllocationData[] = useMemo(
    () => [
      {
        tableId: table.id,
        title: capacityTitle,
        minPersons,
        maxPersons,
        quantity: table.quantity,
        allocation: draftAllocation,
      },
    ],
    [table.id, capacityTitle, minPersons, maxPersons, table.quantity, draftAllocation],
  );

  const validation = useMemo(
    () => validateAllocation(tableAllocationData, seatingTarget),
    [tableAllocationData, seatingTarget],
  );

  const progressPercent = Math.min(
    100,
    Math.round(
      (validation.totalAllocated / Math.max(1, seatingTarget)) * 100,
    ),
  );

  const updateDraft = (next: number[]) => {
    setDraftAllocation(next);
    setIsConfirmed(false);
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
    setIsConfirmed(false);
  };

  const handleAutoDistribute = () => {
    const dateData = getDateData(eventSlug, date);
    const activeTables = (dateData?.tables ?? []).filter(
      (entry) => entry.quantity > 0,
    );
    const arrangeInput =
      isMixedPlan && activeTables.length > 1
        ? activeTables.map((entry) => ({
            id: entry.id,
            title: formatTableCapacityTitle(
              entry.minPersons || 1,
              entry.maxPersons || 999,
            ),
            minPersons: entry.minPersons || 1,
            maxPersons: entry.maxPersons || 999,
            quantity: entry.quantity,
          }))
        : [
            {
              id: table.id,
              title: capacityTitle,
              minPersons,
              maxPersons,
              quantity: table.quantity,
            },
          ];

    const autoArranged = autoArrangeGuests(arrangeInput, peopleCount);
    updateDraft(
      autoArranged[table.id] ?? normalizeAllocation([], table.quantity, minPersons),
    );
  };

  const handleReset = () => {
    updateDraft(Array(table.quantity).fill(minPersons));
  };

  const showConfirmButton =
    validation.isValid && (!isStoreConfirmed || isDirty) && !isSavingSeating;

  // Splitting guests only makes sense across several tables.
  const canAdjustTables = table.quantity > 1;
  // An invalid split must stay fixable, so open the controls automatically.
  const showTableControls =
    canAdjustTables && (isAdjusting || !validation.isValid);

  // Payment stays blocked until the seating on screen is valid and confirmed.
  const isSeatingDraftPending =
    table.quantity > 0 &&
    ((canAdjustTables && isAdjusting) || isDirty || !validation.isValid);
  const setSeatingDraftPending = useCheckoutSeatingDraftStore(
    (state) => state.setSeatingDraftPending,
  );
  const seatingDraftKey = `${eventSlug}|${date}|${table.id}`;

  useEffect(() => {
    setSeatingDraftPending(seatingDraftKey, isSeatingDraftPending);
  }, [seatingDraftKey, isSeatingDraftPending, setSeatingDraftPending]);

  useEffect(
    () => () => setSeatingDraftPending(seatingDraftKey, false),
    [seatingDraftKey, setSeatingDraftPending],
  );

  const handleConfirmSeating = async () => {
    if (!validation.isValid) {
      toast.error("Please assign all guests correctly before confirming seating.");
      return;
    }
    if (isSavingSeating) return;

    setIsSavingSeating(true);
    try {
      confirmTableSeating(eventSlug, date, table.id, draftAllocation);
      setIsConfirmed(true);

      if (onTableSeatingConfirmed) {
        let saved = await onTableSeatingConfirmed();
        if (!saved) {
          await new Promise((resolve) => setTimeout(resolve, 200));
          saved = await onTableSeatingConfirmed();
        }
        if (!saved) {
          toast.error("Could not save seating. Please try again.");
          setIsConfirmed(false);
          return;
        }
      }

      setIsAdjusting(false);
      toast.success("Seating confirmed");
    } catch (error) {
      console.error("Failed to save seating:", error);
      toast.error("Could not save seating. Please try again.");
      setIsConfirmed(false);
    } finally {
      setIsSavingSeating(false);
    }
  };

  return (
    <div
      className={cn(
        nested
          ? "border-t border-[color:var(--checkout-border)]"
          : "overflow-hidden rounded-xl border border-[color:var(--checkout-border)] bg-white",
      )}
    >
      <div className="p-3.5 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight text-[color:var(--checkout-foreground)]">
              {minPersons === maxPersons
                      ? `Table for ${maxPersons} guests`
                      : `Table for ${minPersons}–${maxPersons} guests`}
            </p>
            <p className="mt-0.5 text-xs text-[color:var(--checkout-muted-foreground)]">
              {table.quantity} table{table.quantity !== 1 ? "s" : ""} ·{" "}
              {draftGuestTotal} guest{draftGuestTotal !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="shrink-0 text-left sm:text-right">
            <p className="text-sm font-bold tabular-nums text-[color:var(--checkout-foreground)]">
              {formatMoney(pricePerPerson * draftGuestTotal)}
            </p>
            <p className="text-xs tabular-nums text-[color:var(--checkout-muted-foreground)]">
              {formatMoney(pricePerPerson)}/person
            </p>
          </div>
        </div>

        <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-[color:var(--checkout-muted)]">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              validation.isValid
                ? "bg-[color:var(--checkout-cta)]"
                : validation.totalAllocated > seatingTarget
                  ? "bg-red-500"
                  : "bg-[color:var(--checkout-brand-accent)]",
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {showTableControls && hasTouchedTables ? (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={handleAutoDistribute}
              className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-[color:var(--checkout-brand-accent)] px-3 text-xs font-semibold text-white transition-colors hover:opacity-90 sm:h-8 sm:w-auto"
            >
              <Wand2 className="h-3 w-3" />
              Auto Distribute
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-[color:var(--checkout-border)] bg-white px-3 text-xs font-semibold text-[color:var(--checkout-muted-foreground)] transition-colors hover:bg-[color:var(--checkout-muted)]/50 sm:h-8 sm:w-auto"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          </div>
        ) : null}

        {showConfirmButton && (
          <>
            {showConfirmHint ? (
              <p className="mt-3 text-[11px] leading-snug text-[color:var(--checkout-muted-foreground)]">
                Tap{" "}
                <span className="font-semibold text-[color:var(--checkout-foreground)]">
                  Confirm seating
                </span>{" "}
                to add tables to your order.
              </p>
            ) : null}
            <button
              type="button"
              onClick={handleConfirmSeating}
              disabled={isSavingSeating}
              className={cn(
                "flex h-10 w-full items-center justify-center rounded-lg bg-[color:var(--checkout-cta)] px-4 text-sm font-semibold text-[color:var(--checkout-cta-foreground)] transition-colors hover:bg-[color:var(--checkout-cta)] disabled:opacity-50",
                showConfirmHint ? "mt-2" : "mt-3",
              )}
            >
              {isSavingSeating ? "Saving…" : "Confirm seating"}
            </button>
          </>
        )}
      </div>

      <div className="border-t border-[color:var(--checkout-border)] px-3 py-3">
        <div
          className={cn(
            "grid gap-2",
            showTableControls
              ? "grid-cols-1 min-[420px]:grid-cols-2"
              : "grid-cols-2 sm:grid-cols-3",
            table.quantity > 6 &&
              "max-h-[min(50vh,420px)] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]",
          )}
        >
          {Array.from({ length: table.quantity }, (_, index) => {
            const currentValue = draftAllocation[index] ?? minPersons;
            const isOverflow = currentValue > maxPersons;
            const isUnder = currentValue < minPersons;

            return (
              <div
                key={index}
                className={cn(
                  "flex min-w-0 items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2",
                  isOverflow
                    ? "border-red-200"
                    : isUnder
                      ? "border-amber-200"
                      : "border-[color:var(--checkout-border)]",
                )}
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[color:var(--checkout-muted-foreground)]">
                    Table {index + 1}
                  </p>
                  <p
                    className={cn(
                      "text-sm font-bold tabular-nums",
                      isOverflow
                        ? "text-red-600"
                        : isUnder
                          ? "text-amber-600"
                          : "text-[color:var(--checkout-foreground)]",
                    )}
                  >
                    {currentValue} guest{currentValue !== 1 ? "s" : ""}
                  </p>
                  {showTableControls ? (
                    <p className="text-xs tabular-nums text-[color:var(--checkout-muted-foreground)]">
                      {formatMoney(pricePerPerson * currentValue)} · max {maxPersons}
                    </p>
                  ) : null}
                </div>

                {showTableControls ? (
                  <div className="flex shrink-0 items-center overflow-hidden rounded-lg border border-[color:var(--checkout-border)] bg-[color:var(--checkout-muted)]/40">
                    <button
                      type="button"
                      onClick={() => stepAllocation(index, -1)}
                      disabled={currentValue <= minPersons}
                      className="flex h-10 w-10 items-center justify-center text-[color:var(--checkout-foreground)] transition-colors hover:bg-white disabled:opacity-30"
                      aria-label={`Decrease guests at table ${index + 1}`}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <div className="h-6 w-px bg-[color:var(--checkout-border)]" />
                    <button
                      type="button"
                      onClick={() => stepAllocation(index, 1)}
                      disabled={currentValue >= maxPersons}
                      className="flex h-10 w-10 items-center justify-center text-[color:var(--checkout-foreground)] transition-colors hover:bg-white disabled:opacity-30"
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
            className="mt-2 inline-flex min-h-9 items-center text-sm font-semibold text-[color:var(--checkout-brand-accent)] underline-offset-2 hover:underline"
            aria-expanded={isAdjusting}
          >
            {isAdjusting ? "Done adjusting" : "Adjust tables"}
          </button>
        ) : null}
      </div>

      {!validation.isValid && validation.errors.length > 0 && (
        <div className="mx-3.5 mb-3.5 rounded-lg border border-red-100 bg-red-50 px-2.5 py-2">
          <div className="flex items-start gap-1.5">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
            <p className="text-[11px] leading-snug text-red-700">
              {validation.errors[0]}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
