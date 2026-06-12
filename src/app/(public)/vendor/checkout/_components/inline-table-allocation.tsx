"use client";

import { useEffect, useMemo, useState } from "react";
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
  onTableSeatingConfirmed?: () => void | Promise<void>;
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
  onTableSeatingConfirmed,
}: InlineTableAllocationProps) {
  const { format: formatMoney } = useCurrencyFormat();
  const { getDateData, confirmTableSeating } = useCartEditStore();
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

  useEffect(() => {
    setDraftAllocation(committedAllocation);
  }, [committedAllocation]);

  useEffect(() => {
    setIsConfirmed(false);
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
        await onTableSeatingConfirmed();
      }

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
    <div className="overflow-hidden rounded-xl border border-[color:var(--checkout-border)] bg-white">
      <div className="p-3.5 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight text-[color:var(--checkout-foreground)]">
              Minimum {minPersons}, Maximum {maxPersons}
            </p>
            <p className="mt-0.5 text-[11px] text-[color:var(--checkout-muted-foreground)]">
              {table.quantity} table{table.quantity !== 1 ? "s" : ""} ·{" "}
              {minPersons}–{maxPersons} per table
            </p>
          </div>
          <div className="shrink-0 text-left sm:text-right">
            <p className="text-[11px] text-[color:var(--checkout-muted-foreground)]">
              {validation.totalAllocated} / {seatingTarget} guests assigned
            </p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-[color:var(--checkout-foreground)]">
              {formatMoney(pricePerPerson * draftGuestTotal)}
            </p>
          </div>
        </div>

        <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-[color:var(--checkout-muted)]">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              validation.isValid
                ? "bg-emerald-500"
                : validation.totalAllocated > seatingTarget
                  ? "bg-red-500"
                  : "bg-[color:var(--checkout-brand-accent)]",
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleAutoDistribute}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[color:var(--checkout-brand-accent)] px-3 text-xs font-semibold text-white transition-colors hover:opacity-90"
          >
            <Wand2 className="h-3 w-3" />
            Auto Distribute
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[color:var(--checkout-border)] bg-white px-3 text-xs font-semibold text-[color:var(--checkout-muted-foreground)] transition-colors hover:bg-[color:var(--checkout-muted)]/50"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
          {!isConfirmed && validation.isValid && isDirty && (
            <button
              type="button"
              onClick={handleConfirmSeating}
              disabled={isSavingSeating}
              className="inline-flex h-8 items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
            >
              {isSavingSeating ? "Saving…" : "Confirm seating"}
            </button>
          )}
        </div>
      </div>

      <div
        className={cn(
          "flex flex-wrap gap-2 border-t border-[color:var(--checkout-border)] px-3 py-3",
          table.quantity > 8 &&
            "max-h-[min(45vh,360px)] overflow-y-auto overscroll-contain",
        )}
      >
        {Array.from({ length: table.quantity }, (_, index) => {
          const currentValue = draftAllocation[index] ?? minPersons;
          const isFull = currentValue >= maxPersons;
          const isOverflow = currentValue > maxPersons;
          const isUnder = currentValue < minPersons;

          return (
            <div
              key={index}
              className={cn(
                "w-[6.5rem] shrink-0 rounded-lg border bg-white px-1.5 py-2 sm:w-[7.25rem] sm:px-2",
                isOverflow
                  ? "border-red-200"
                  : isUnder
                    ? "border-amber-200"
                    : "border-[color:var(--checkout-border)]",
              )}
            >
              <div className="mb-1 flex items-center justify-between gap-0.5">
                <span className="text-[8px] font-semibold uppercase tracking-wider text-[color:var(--checkout-muted-foreground)]">
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
                          : "text-[color:var(--checkout-foreground)]",
                    )}
                  >
                    {currentValue}
                  </p>
                  <p className="mt-0.5 text-[8px] text-[color:var(--checkout-muted-foreground)]">
                    Max {maxPersons}
                  </p>
                </div>

                <div className="flex overflow-hidden rounded border border-[color:var(--checkout-border)] bg-[color:var(--checkout-muted)]/40">
                  <button
                    type="button"
                    onClick={() => stepAllocation(index, -1)}
                    disabled={currentValue <= minPersons}
                    className="flex h-6 w-6 items-center justify-center text-[color:var(--checkout-muted-foreground)] transition-colors hover:bg-white disabled:opacity-30"
                    aria-label={`Decrease guests at table ${index + 1}`}
                  >
                    <Minus className="h-2.5 w-2.5" />
                  </button>
                  <div className="w-px bg-[color:var(--checkout-border)]" />
                  <button
                    type="button"
                    onClick={() => stepAllocation(index, 1)}
                    disabled={currentValue >= maxPersons}
                    className="flex h-6 w-6 items-center justify-center text-[color:var(--checkout-muted-foreground)] transition-colors hover:bg-white disabled:opacity-30"
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
