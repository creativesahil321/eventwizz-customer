/**
 * Guest Allocation Modal — Premium Professional Redesign
 * Clean, focused interface for distributing guests across tables.
 * Design inspired by Stripe's modal patterns: minimal chrome,
 * clear hierarchy, confident actions.
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Users,
  Wand2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  X,
  Armchair,
  Minus,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import { EditableItem } from "@/store/cart-edit.store";
import {
  autoArrangeGuests,
  validateAllocation,
  TableAllocationData,
} from "../_lib/guest-allocation";
import { useCurrencyFormat } from "@/hooks/use-currency-format";

interface GuestAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTables: EditableItem[];
  totalGuests: number;
  onConfirm: (allocations: Record<number, number[]>) => void;
  eventName?: string;
  dateString?: string;
}

export default function GuestAllocationModal({
  isOpen,
  onClose,
  selectedTables,
  totalGuests,
  onConfirm,
  eventName,
  dateString,
}: GuestAllocationModalProps) {
  const { format: formatMoney } = useCurrencyFormat();
  const [allocations, setAllocations] = useState<Record<number, number[]>>({});
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [isAutoArranging, setIsAutoArranging] = useState(false);

  // Initialize allocations when modal opens
  useEffect(() => {
    if (isOpen && selectedTables.length > 0) {
      const initialAllocations: Record<number, number[]> = {};

      selectedTables.forEach((table) => {
        const existingAllocation =
          table.allocation && table.allocation.length === table.quantity
            ? table.allocation
            : Array(table.quantity).fill(table.minPersons || 1);
        initialAllocations[table.id] = [...existingAllocation];
      });

      // Check if needs auto-fill
      let totalAllocated = 0;
      Object.values(initialAllocations).forEach((allocation) => {
        totalAllocated += allocation.reduce((sum, count) => sum + count, 0);
      });

      const allAtMinimum = Object.entries(initialAllocations).every(
        ([tableId, allocation]) => {
          const table = selectedTables.find((t) => t.id === parseInt(tableId));
          return allocation.every(
            (count) => count === (table?.minPersons || 1),
          );
        },
      );

      if (totalAllocated !== totalGuests && allAtMinimum) {
        const tableData = selectedTables.map((table) => ({
          id: table.id,
          title: table.title,
          minPersons: table.minPersons || 1,
          maxPersons: table.maxPersons || 999,
          quantity: table.quantity,
        }));

        const autoArranged = autoArrangeGuests(tableData, totalGuests);
        setAllocations(autoArranged);
        syncInputValues(autoArranged);
      } else {
        setAllocations(initialAllocations);
        syncInputValues(initialAllocations);
      }
    }
  }, [isOpen, selectedTables, totalGuests]);

  // Sync input display values from allocations
  const syncInputValues = (allocs: Record<number, number[]>) => {
    const values: Record<string, string> = {};
    Object.entries(allocs).forEach(([tableId, allocation]) => {
      allocation.forEach((value, index) => {
        values[`${tableId}-${index}`] = value.toString();
      });
    });
    setInputValues(values);
  };

  // Allocation data for validation
  const tableAllocationData: TableAllocationData[] = useMemo(() => {
    return selectedTables.map((table) => ({
      tableId: table.id,
      title: table.title,
      minPersons: table.minPersons || 1,
      maxPersons: table.maxPersons || 999,
      quantity: table.quantity,
      allocation:
        allocations[table.id] ||
        Array(table.quantity).fill(table.minPersons || 1),
    }));
  }, [selectedTables, allocations]);

  // Validation
  const validation = useMemo(() => {
    return validateAllocation(tableAllocationData, totalGuests);
  }, [tableAllocationData, totalGuests]);

  // Derived state
  const guestsRemaining = totalGuests - validation.totalAllocated;
  const progressPercent = Math.min(
    100,
    Math.round((validation.totalAllocated / totalGuests) * 100),
  );

  // Auto-arrange
  const handleAutoArrange = async () => {
    setIsAutoArranging(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 400));
      const tableData = selectedTables.map((table) => ({
        id: table.id,
        title: table.title,
        minPersons: table.minPersons || 1,
        maxPersons: table.maxPersons || 999,
        quantity: table.quantity,
      }));
      const autoArranged = autoArrangeGuests(tableData, totalGuests);
      setAllocations(autoArranged);
      syncInputValues(autoArranged);
      toast.success("Guests distributed evenly!");
    } catch (error) {
      console.error("Auto-arrange error:", error);
      toast.error("Failed to auto-arrange guests");
    } finally {
      setIsAutoArranging(false);
    }
  };

  // Reset
  const handleReset = () => {
    const resetAllocations: Record<number, number[]> = {};
    selectedTables.forEach((table) => {
      const minValue = table.minPersons || 1;
      resetAllocations[table.id] = Array(table.quantity).fill(minValue);
    });
    setAllocations(resetAllocations);
    syncInputValues(resetAllocations);
    toast.info("Reset to minimum");
  };

  // Update individual input
  const updateTableAllocation = (
    tableId: number,
    tableIndex: number,
    value: string,
  ) => {
    const inputKey = `${tableId}-${tableIndex}`;
    setInputValues((prev) => ({ ...prev, [inputKey]: value }));

    if (value === "" || value === "-") return;

    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setAllocations((prev) => {
        const updated = { ...prev };
        if (!updated[tableId]) updated[tableId] = [];
        updated[tableId] = [...updated[tableId]];
        updated[tableId][tableIndex] = numValue;
        return updated;
      });
    }
  };

  // Stepper: increment/decrement a specific table input
  const stepAllocation = (
    tableId: number,
    tableIndex: number,
    table: EditableItem,
    delta: number,
  ) => {
    const current = allocations[tableId]?.[tableIndex] ?? (table.minPersons || 1);
    const minValue = table.minPersons || 1;
    const maxValue = table.maxPersons || 999;
    const next = Math.max(minValue, Math.min(maxValue, current + delta));

    const inputKey = `${tableId}-${tableIndex}`;
    setInputValues((prev) => ({ ...prev, [inputKey]: next.toString() }));
    setAllocations((prev) => {
      const updated = { ...prev };
      if (!updated[tableId]) updated[tableId] = [];
      updated[tableId] = [...updated[tableId]];
      updated[tableId][tableIndex] = next;
      return updated;
    });
  };

  // Handle blur — clamp values
  const handleInputBlur = (
    tableId: number,
    tableIndex: number,
    table: EditableItem,
  ) => {
    const inputKey = `${tableId}-${tableIndex}`;
    const rawValue = inputValues[inputKey];
    const minValue = table.minPersons || 1;
    const maxValue = table.maxPersons || 999;

    let finalValue = minValue;
    if (rawValue && rawValue !== "" && rawValue !== "-") {
      const numValue = parseInt(rawValue);
      if (!isNaN(numValue)) {
        finalValue = Math.max(minValue, Math.min(maxValue, numValue));
      }
    }

    setInputValues((prev) => ({ ...prev, [inputKey]: finalValue.toString() }));
    setAllocations((prev) => {
      const updated = { ...prev };
      if (!updated[tableId]) updated[tableId] = [];
      updated[tableId] = [...updated[tableId]];
      updated[tableId][tableIndex] = finalValue;
      return updated;
    });
  };

  // Confirm
  const handleConfirm = () => {
    if (validation.isValid) {
      onConfirm(allocations);
      toast.success("Seating confirmed!");
      onClose();
    } else {
      toast.error("Please assign all guests before confirming");
    }
  };

  if (!isOpen) return null;

  // Count total tables
  const totalTableCount = selectedTables.reduce(
    (sum, t) => sum + t.quantity,
    0,
  );

  // Calculate grand total cost
  const grandTotalCost = selectedTables.reduce((sum, table) => {
    const pricePerPerson = table.pricePerPerson || table.price;
    const currentAllocation = allocations[table.id] || [];
    const tableGuestTotal = currentAllocation.reduce(
      (s, guests) => s + guests,
      0,
    );
    return sum + pricePerPerson * tableGuestTotal;
  }, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-0 [&>button]:hidden rounded-2xl border-0 shadow-2xl">

        {/* ── Header ── Minimal, premium feel */}
        <div className="px-6 pt-5 pb-4 bg-gradient-to-b from-gray-50 to-white">
          {/* Top row: title + close */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-sm">
                <Users className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 leading-tight">
                  Assign Seating
                </h2>
                {(eventName || dateString) && (
                  <p className="text-xs text-gray-400 mt-0.5 leading-tight">
                    {[eventName, dateString].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Progress section — clean and informative */}
          <div className="mt-4">
            {/* Progress bar */}
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-200/60 rounded-full h-1.5 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full transition-colors duration-300 ${
                    validation.isValid
                      ? "bg-[color:var(--checkout-cta)]"
                      : validation.totalAllocated > totalGuests
                        ? "bg-red-500"
                        : "bg-[color:var(--checkout-cta)]"
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
              <span className="text-xs tabular-nums text-gray-500 flex-shrink-0">
                <span
                  className={`font-semibold ${
                    validation.isValid
                      ? "text-emerald-600"
                      : validation.totalAllocated > totalGuests
                        ? "text-red-600"
                        : "text-gray-900"
                  }`}
                >
                  {validation.totalAllocated}
                </span>
                <span className="text-gray-300 mx-0.5">/</span>
                <span>{totalGuests}</span>
              </span>
            </div>

            {/* Status text */}
            <div className="mt-1.5 min-h-[1.25rem]">
              <AnimatePresence mode="wait">
                {validation.isValid ? (
                  <motion.div
                    key="valid"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-xs font-medium text-emerald-600">
                      All {totalGuests} guests assigned perfectly
                    </span>
                  </motion.div>
                ) : guestsRemaining > 0 ? (
                  <motion.p
                    key="remaining"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="text-xs text-gray-500"
                  >
                    <span className="font-semibold text-amber-600">
                      {guestsRemaining}
                    </span>{" "}
                    guest{guestsRemaining !== 1 ? "s" : ""} still need a seat
                  </motion.p>
                ) : guestsRemaining < 0 ? (
                  <motion.p
                    key="overflow"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="text-xs font-medium text-red-600"
                  >
                    {Math.abs(guestsRemaining)} too many — remove some guests
                  </motion.p>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ── Quick Actions ── Inline, unobtrusive */}
        <div className="px-4 sm:px-6 pb-3 flex items-center gap-2">
          <button
            onClick={handleAutoArrange}
            disabled={isAutoArranging}
            className="flex items-center gap-1.5 px-3.5 h-8 rounded-lg bg-[color:var(--checkout-cta)] text-[color:var(--checkout-cta-foreground)] text-xs font-medium transition-all hover:bg-[color:var(--checkout-cta)] active:scale-[0.97] disabled:opacity-60 shadow-sm"
          >
            {isAutoArranging ? (
              <>
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Distributing...</span>
              </>
            ) : (
              <>
                <Wand2 className="h-3 w-3" />
                <span>Auto Distribute</span>
              </>
            )}
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 h-8 rounded-lg border border-gray-200 text-gray-500 text-xs font-medium transition-all hover:bg-gray-50 hover:text-gray-700 active:scale-[0.97]"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset</span>
          </button>
        </div>

        <div className="h-px bg-gray-100 mx-4 sm:mx-6" />

        {/* ── Table Cards ── Clean, card-based layout */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
          {selectedTables.map((table, tableGroupIndex) => {
            const pricePerPerson = table.pricePerPerson || table.price;
            const currentAllocation = allocations[table.id] || [];
            const tableGuestTotal = currentAllocation.reduce(
              (sum, guests) => sum + guests,
              0,
            );

            return (
              <motion.div
                key={table.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: tableGroupIndex * 0.05 }}
                className="rounded-xl border border-gray-200 overflow-hidden bg-white"
              >
                {/* Table group header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50/70 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <Armchair className="h-3.5 w-3.5 text-amber-700" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 leading-tight">
                        {table.title}
                      </h4>
                      <p className="text-[11px] text-gray-400 leading-tight">
                        {table.quantity} table{table.quantity > 1 ? "s" : ""} · {table.minPersons}–{table.maxPersons} per table
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-gray-900 tabular-nums leading-tight">
                      {formatMoney(pricePerPerson * tableGuestTotal)}
                    </p>
                    <p className="text-[10px] text-gray-400 leading-tight">
                      {formatMoney(pricePerPerson)}/person
                    </p>
                  </div>
                </div>

                {/* Individual table seats — stepper inputs */}
                <div className="p-4">
                  <div className="grid gap-2.5 sm:gap-3 grid-cols-2 sm:grid-cols-3">
                    {Array.from({ length: table.quantity }, (_, index) => {
                      const inputKey = `${table.id}-${index}`;
                      const rawInputValue = inputValues[inputKey];
                      const currentValue =
                        allocations[table.id]?.[index] ||
                        table.minPersons ||
                        1;
                      const displayValue =
                        rawInputValue !== undefined
                          ? rawInputValue
                          : currentValue.toString();
                      const isValid =
                        currentValue >= (table.minPersons || 1) &&
                        currentValue <= (table.maxPersons || 999);
                      const isOverflow =
                        currentValue > (table.maxPersons || 999);
                      const isUnder =
                        currentValue < (table.minPersons || 1);

                      return (
                        <div
                          key={index}
                          className={`text-center rounded-xl p-3 border transition-colors duration-200 ${
                            isOverflow
                              ? "border-red-200 bg-red-50/50"
                              : isUnder
                                ? "border-amber-200 bg-amber-50/50"
                                : isValid && validation.isValid
                                  ? "border-emerald-200 bg-emerald-50/30"
                                  : "border-gray-150 bg-gray-50/30"
                          }`}
                        >
                          {/* Table label */}
                          <label
                            htmlFor={`seat-${table.id}-${index}`}
                            className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-2"
                          >
                            Table {index + 1}
                          </label>

                          {/* Stepper input group */}
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              aria-label={`Decrease guests for table ${index + 1}`}
                              onClick={() =>
                                stepAllocation(table.id, index, table, -1)
                              }
                              disabled={currentValue <= (table.minPersons || 1)}
                              className="w-7 h-7 rounded-md border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Minus className="h-3 w-3" />
                            </button>

                            <Input
                              id={`seat-${table.id}-${index}`}
                              type="text"
                              inputMode="numeric"
                              value={displayValue}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === "" || /^\d*$/.test(value)) {
                                  updateTableAllocation(
                                    table.id,
                                    index,
                                    value,
                                  );
                                }
                              }}
                              onBlur={() =>
                                handleInputBlur(table.id, index, table)
                              }
                              onFocus={(e) => e.target.select()}
                              className={`text-center text-lg font-bold w-14 h-9 rounded-lg border-0 bg-transparent shadow-none focus:ring-0 tabular-nums ${
                                isOverflow
                                  ? "text-red-600"
                                  : isUnder
                                    ? "text-amber-600"
                                    : "text-gray-900"
                              }`}
                            />

                            <button
                              type="button"
                              aria-label={`Increase guests for table ${index + 1}`}
                              onClick={() =>
                                stepAllocation(table.id, index, table, 1)
                              }
                              disabled={currentValue >= (table.maxPersons || 999)}
                              className="w-7 h-7 rounded-md border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          {/* Capacity hint */}
                          <p className={`text-[10px] mt-1.5 tabular-nums ${
                            isOverflow
                              ? "text-red-500 font-medium"
                              : isUnder
                                ? "text-amber-500 font-medium"
                                : "text-gray-400"
                          }`}>
                            {isOverflow
                              ? `Max ${table.maxPersons}`
                              : isUnder
                                ? `Min ${table.minPersons}`
                                : `${table.minPersons}–${table.maxPersons} guests`}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Validation errors — only show critical ones */}
          <AnimatePresence>
            {!validation.isValid && validation.errors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-xl bg-red-50 border border-red-100 p-3"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="space-y-0.5">
                    {validation.errors.slice(0, 2).map((error, index) => (
                      <p key={index} className="text-xs text-red-700">
                        {error}
                      </p>
                    ))}
                    {validation.errors.length > 2 && (
                      <p className="text-xs text-red-500">
                        +{validation.errors.length - 2} more issue{validation.errors.length - 2 > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Footer ── Clean, confident actions */}
        <div className="border-t border-gray-100 px-4 sm:px-6 py-3 sm:py-3.5 bg-white flex-shrink-0">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {/* Summary stats */}
            <div className="flex items-center gap-2 sm:gap-3 text-xs">
              <span className="text-gray-400">
                {totalTableCount} table{totalTableCount !== 1 ? "s" : ""}
              </span>
              <div className="w-px h-3 bg-gray-200" />
              <span>
                <span className="font-semibold text-gray-700">
                  {validation.totalAllocated}
                </span>
                <span className="text-gray-400"> guests</span>
              </span>
              {grandTotalCost > 0 && (
                <>
                  <div className="w-px h-3 bg-gray-200" />
                  <span className="font-semibold text-gray-700 tabular-nums">
                    {formatMoney(grandTotalCost)}
                  </span>
                </>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="ghost"
                onClick={onClose}
                className="rounded-xl h-9 px-4 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!validation.isValid}
                className={`rounded-xl h-9 px-4 sm:px-5 text-sm font-semibold transition-all duration-200 flex-1 sm:flex-initial ${
                  validation.isValid
                    ? "bg-[color:var(--checkout-cta)] text-[color:var(--checkout-cta-foreground)] hover:bg-[color:var(--checkout-cta)] shadow-sm shadow-emerald-200 active:scale-[0.97]"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                {validation.isValid ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Confirm Seating
                  </span>
                ) : (
                  <span>Assign All Guests</span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
