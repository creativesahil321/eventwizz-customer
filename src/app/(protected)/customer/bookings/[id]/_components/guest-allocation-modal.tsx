/**
 * Guest Allocation Modal — Premium Professional Redesign
 * Clean, focused interface for distributing guests across tables.
 * Matches the checkout modal design system exactly.
 * Design: Stripe-inspired — minimal chrome, clear hierarchy, confident actions.
 */

"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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

import {
  autoArrangeGuests,
  validateAllocation,
  generateAllocationSummary,
  TableAllocationData,
} from "../_lib/guest-allocation";
import { useCurrencyFormat } from "@/hooks/use-currency-format";

interface NewTableSelection {
  id: number;
  title: string;
  size: number;
  min_persons: number;
  max_persons: number;
  quantity: number;
  price: number;
  currentAllocation?: number[];
}

interface GuestAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  newTables: NewTableSelection[];
  totalPeople: number;
  onConfirm: (allocations: Record<number, number[]>) => void;
  eventName?: string;
  dateString?: string;
}

export default function GuestAllocationModal({
  isOpen,
  onClose,
  newTables,
  totalPeople,
  onConfirm,
  eventName,
  dateString,
}: GuestAllocationModalProps) {
  const { formatCompact: formatMoneyUnit } = useCurrencyFormat();
  const [allocations, setAllocations] = useState<Record<number, number[]>>({});
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [isAutoArranging, setIsAutoArranging] = useState(false);

  const initializedRef = useRef(false);
  const previousTablesRef = useRef<NewTableSelection[]>([]);

  // Convert newTables to internal format
  const selectedTables = useMemo(() => {
    return newTables.map((table) => ({
      id: table.id,
      title: table.title,
      minPersons: table.min_persons,
      maxPersons: table.max_persons,
      quantity: table.quantity,
      pricePerPerson: table.price,
      price: table.price,
      allocation: allocations[table.id] || [],
    }));
  }, [newTables, allocations]);

  // Initialize allocations when modal opens
  useEffect(() => {
    if (!isOpen) {
      initializedRef.current = false;
      previousTablesRef.current = [];
      setAllocations({});
      setInputValues({});
      return;
    }

    if (newTables.length === 0) return;

    const tablesChanged =
      previousTablesRef.current.length !== newTables.length ||
      previousTablesRef.current.some(
        (prevTable, index) =>
          prevTable.id !== newTables[index]?.id ||
          prevTable.quantity !== newTables[index]?.quantity,
      );

    if (!initializedRef.current || tablesChanged) {
      const tables = newTables;
      const initialAllocations: Record<number, number[]> = {};

      tables.forEach((table) => {
        if (
          table.currentAllocation &&
          table.currentAllocation.length === table.quantity
        ) {
          initialAllocations[table.id] = [...table.currentAllocation];
        } else {
          initialAllocations[table.id] = Array(table.quantity).fill(
            table.min_persons || 1,
          );
        }
      });

      let totalAllocated = 0;
      Object.values(initialAllocations).forEach((allocation) => {
        totalAllocated += allocation.reduce((sum, count) => sum + count, 0);
      });

      const hasExistingAllocation = tables.some(
        (t) => t.currentAllocation && t.currentAllocation.length > 0,
      );
      const targetTotal = hasExistingAllocation
        ? totalAllocated + totalPeople
        : totalPeople;

      const allAtMinimum = Object.entries(initialAllocations).every(
        ([tableId, allocation]) => {
          const table = tables.find((t) => t.id === parseInt(tableId));
          return allocation.every(
            (count) => count === (table?.min_persons || 1),
          );
        },
      );

      const needsAutoFill = hasExistingAllocation
        ? totalAllocated !== targetTotal
        : totalAllocated !== targetTotal && allAtMinimum;

      if (needsAutoFill) {
        const tableData = tables.map((table) => ({
          id: table.id,
          title: table.title,
          minPersons: table.min_persons || 1,
          maxPersons: table.max_persons || 999,
          quantity: table.quantity,
        }));

        const autoArranged = autoArrangeGuests(tableData, targetTotal);

        let autoArrangedTotal = 0;
        Object.values(autoArranged).forEach((allocation) => {
          autoArrangedTotal += allocation.reduce(
            (sum, count) => sum + count,
            0,
          );
        });

        let finalAllocations: Record<number, number[]>;
        if (autoArrangedTotal > targetTotal) {
          finalAllocations = autoArrangeGuests(tableData, targetTotal);
        } else {
          finalAllocations = autoArranged;
        }

        setAllocations(finalAllocations);
        syncInputValues(finalAllocations);
      } else {
        setAllocations(initialAllocations);
        syncInputValues(initialAllocations);
      }

      initializedRef.current = true;
      previousTablesRef.current = [...newTables];
    }
  }, [isOpen, newTables, totalPeople]);

  // Sync input display values
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

  // Calculate target total for validation
  const targetTotalForValidation = useMemo(() => {
    const hasExistingAllocation = newTables.some(
      (t) => t.currentAllocation && t.currentAllocation.length > 0,
    );
    if (hasExistingAllocation) {
      let originalTotal = 0;
      newTables.forEach((table) => {
        if (table.currentAllocation) {
          originalTotal += table.currentAllocation.reduce(
            (sum, count) => sum + count,
            0,
          );
        }
      });
      return originalTotal + totalPeople;
    }
    return totalPeople;
  }, [newTables, totalPeople]);

  // Validation
  const validation = useMemo(() => {
    return validateAllocation(tableAllocationData, targetTotalForValidation);
  }, [tableAllocationData, targetTotalForValidation]);

  // Derived state
  const guestsRemaining = targetTotalForValidation - validation.totalAllocated;
  const progressPercent = Math.min(
    100,
    Math.round(
      (validation.totalAllocated / targetTotalForValidation) * 100,
    ),
  );

  // Auto-arrange
  const handleAutoArrange = async () => {
    setIsAutoArranging(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 400));
      const tableData = selectedTables.map((table) => {
        const originalTable = newTables.find((t) => t.id === table.id);
        return {
          id: table.id,
          title: table.title,
          minPersons: table.minPersons || 1,
          maxPersons: originalTable?.max_persons || table.maxPersons || 999,
          quantity: table.quantity,
        };
      });

      const hasExistingAllocation = newTables.some(
        (t) => t.currentAllocation && t.currentAllocation.length > 0,
      );
      let currentTotal = 0;
      Object.values(allocations).forEach((allocation) => {
        currentTotal += allocation.reduce((sum, count) => sum + count, 0);
      });
      const targetTotal = hasExistingAllocation
        ? currentTotal + totalPeople
        : totalPeople;

      const autoArranged = autoArrangeGuests(tableData, targetTotal);
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
      const originalTable = newTables.find((t) => t.id === table.id);
      const currentAllocation = originalTable?.currentAllocation || [];

      if (currentAllocation.length === table.quantity) {
        resetAllocations[table.id] = [...currentAllocation];
      } else {
        const minValue = table.minPersons || 1;
        resetAllocations[table.id] = Array(table.quantity).fill(minValue);
      }
    });
    setAllocations(resetAllocations);
    syncInputValues(resetAllocations);
    toast.info("Reset to original allocations");
  };

  // Update individual input
  const updateTableAllocation = (
    tableId: number,
    tableIndex: number,
    value: string,
  ) => {
    const inputKey = `${tableId}-${tableIndex}`;
    const table = selectedTables.find((t) => t.id === tableId);
    if (!table) return;

    setInputValues((prev) => ({ ...prev, [inputKey]: value }));

    if (value === "" || value === "-") return;

    const numValue = parseInt(value);
    if (isNaN(numValue) || numValue < 0) return;

    const originalTable = newTables.find((t) => t.id === tableId);
    const currentAllocation = originalTable?.currentAllocation || [];
    const isExistingTable = currentAllocation.length > 0;

    const minValue =
      isExistingTable && currentAllocation[tableIndex] !== undefined
        ? currentAllocation[tableIndex]
        : table.minPersons || 1;

    const clampedValue = Math.max(
      minValue,
      Math.min(table.maxPersons || 999, numValue),
    );

    setAllocations((prev) => {
      const updated = { ...prev };
      if (!updated[tableId]) updated[tableId] = [];
      updated[tableId] = [...updated[tableId]];
      updated[tableId][tableIndex] = clampedValue;
      return updated;
    });
  };

  // Stepper: increment/decrement a specific table input
  const stepAllocation = (
    tableId: number,
    tableIndex: number,
    delta: number,
  ) => {
    const table = selectedTables.find((t) => t.id === tableId);
    if (!table) return;

    const originalTable = newTables.find((t) => t.id === tableId);
    const currentAllocation = originalTable?.currentAllocation || [];
    const isExistingTable = currentAllocation.length > 0;

    const minValue =
      isExistingTable && currentAllocation[tableIndex] !== undefined
        ? currentAllocation[tableIndex]
        : table.minPersons || 1;

    const current = allocations[tableId]?.[tableIndex] ?? minValue;
    const next = Math.max(minValue, Math.min(table.maxPersons || 999, current + delta));

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
    table: (typeof selectedTables)[0],
  ) => {
    const inputKey = `${tableId}-${tableIndex}`;
    const rawValue = inputValues[inputKey];
    const originalTable = newTables.find((t) => t.id === tableId);
    const currentAllocation = originalTable?.currentAllocation || [];
    const isExistingTable = currentAllocation.length > 0;

    const minValue =
      isExistingTable && currentAllocation[tableIndex] !== undefined
        ? currentAllocation[tableIndex]
        : table.minPersons || 1;

    let finalValue = minValue;
    if (rawValue && rawValue !== "" && rawValue !== "-") {
      const numValue = parseInt(rawValue);
      if (!isNaN(numValue)) {
        finalValue = Math.max(minValue, Math.min(table.maxPersons || 999, numValue));
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

  const totalTableCount = selectedTables.reduce(
    (sum, t) => sum + t.quantity,
    0,
  );

  const hasExistingTables = newTables.some(
    (t) => t.currentAllocation && t.currentAllocation.length > 0,
  );

  // Calculate grand total cost
  const grandTotalCost = selectedTables.reduce((sum, table) => {
    const pricePerPerson = table.pricePerPerson || table.price;
    const currentAlloc = allocations[table.id] || [];
    const tableGuestTotal = currentAlloc.reduce((s, guests) => s + guests, 0);
    return sum + pricePerPerson * tableGuestTotal;
  }, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-0 [&>button]:hidden rounded-2xl border-0 shadow-2xl">
        <DialogTitle className="sr-only">
          Assign Seating - Distribute guests across tables
        </DialogTitle>

        {/* ── Header ── Premium feel */}
        <div className="px-6 pt-5 pb-4 bg-gradient-to-b from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-sm">
                <Users className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 leading-tight">
                  {hasExistingTables ? "Adjust Seating" : "Assign Seating"}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5 leading-tight">
                  {hasExistingTables
                    ? `Add up to ${totalPeople} more guests`
                    : [eventName, dateString].filter(Boolean).join(" · ") ||
                      `Distribute ${totalPeople} guests`}
                </p>
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

          {/* Progress */}
          <div className="mt-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-200/60 rounded-full h-1.5 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full transition-colors duration-300 ${
                    validation.isValid
                      ? "bg-emerald-500"
                      : validation.totalAllocated > targetTotalForValidation
                        ? "bg-red-500"
                        : "bg-blue-500"
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
                      : validation.totalAllocated > targetTotalForValidation
                        ? "text-red-600"
                        : "text-gray-900"
                  }`}
                >
                  {validation.totalAllocated}
                </span>
                <span className="text-gray-300 mx-0.5">/</span>
                <span>{targetTotalForValidation}</span>
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
                      All guests assigned perfectly
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

        {/* ── Quick Actions ── */}
        <div className="px-6 pb-3 flex items-center gap-2">
          {hasExistingTables && (
            <div className="flex-1 mr-2">
              <p className="text-[11px] text-purple-600 font-medium">
                ↑ Only values can be increased for existing tables
              </p>
            </div>
          )}
          <button
            onClick={handleAutoArrange}
            disabled={isAutoArranging}
            className="flex items-center gap-1.5 px-3.5 h-8 rounded-lg bg-blue-600 text-white text-xs font-medium transition-all hover:bg-blue-700 active:scale-[0.97] disabled:opacity-60 shadow-sm"
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

        <div className="h-px bg-gray-100 mx-6" />

        {/* ── Table Cards ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {selectedTables.map((table, tableGroupIndex) => {
            const pricePerPerson = table.pricePerPerson || table.price;
            const currentAlloc = allocations[table.id] || [];
            const tableGuestTotal = currentAlloc.reduce(
              (sum, guests) => sum + guests,
              0,
            );

            const originalTable = newTables.find((t) => t.id === table.id);
            const isExisting =
              originalTable?.currentAllocation &&
              originalTable.currentAllocation.length > 0;

            return (
              <motion.div
                key={table.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: tableGroupIndex * 0.05 }}
                className={`rounded-xl border overflow-hidden bg-white ${
                  isExisting ? "border-purple-200" : "border-gray-200"
                }`}
              >
                {/* Table header */}
                <div
                  className={`flex items-center justify-between px-4 py-2.5 border-b ${
                    isExisting
                      ? "bg-purple-50/50 border-purple-100"
                      : "bg-gray-50/70 border-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isExisting ? "bg-purple-100" : "bg-amber-100"
                      }`}
                    >
                      <Armchair
                        className={`h-3.5 w-3.5 ${
                          isExisting ? "text-purple-700" : "text-amber-700"
                        }`}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-semibold text-gray-900 leading-tight">
                          {table.title}
                        </h4>
                        {isExisting && (
                          <span className="text-[10px] font-medium text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">
                            Existing
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 leading-tight">
                        {table.quantity} table{table.quantity > 1 ? "s" : ""} ·{" "}
                        {table.minPersons}–{table.maxPersons} per table
                      </p>
                    </div>
                  </div>
                  {pricePerPerson > 0 && (
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-gray-900 tabular-nums leading-tight">
                        {formatMoneyUnit(pricePerPerson * tableGuestTotal)}
                      </p>
                      <p className="text-[10px] text-gray-400 leading-tight">
                        {formatMoneyUnit(pricePerPerson)}/person
                      </p>
                    </div>
                  )}
                </div>

                {/* Seat inputs with steppers */}
                <div className="p-4">
                  <div className="grid gap-2.5 sm:gap-3 grid-cols-2 sm:grid-cols-3">
                    {Array.from({ length: table.quantity }, (_, index) => {
                      const inputKey = `${table.id}-${index}`;
                      const rawInputValue = inputValues[inputKey];

                      const existingAllocation =
                        originalTable?.currentAllocation || [];
                      const isExistingTable = existingAllocation.length > 0;
                      const minValue =
                        isExistingTable &&
                        existingAllocation[index] !== undefined
                          ? existingAllocation[index]
                          : table.minPersons || 1;

                      const currentValue =
                        allocations[table.id]?.[index] || minValue;
                      const displayValue =
                        rawInputValue !== undefined
                          ? rawInputValue
                          : currentValue.toString();
                      const isValid =
                        currentValue >= minValue &&
                        currentValue <= (table.maxPersons || 999);
                      const isOverflow =
                        currentValue > (table.maxPersons || 999);
                      const isUnder = currentValue < minValue;

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
                          <label
                            htmlFor={`seat-${table.id}-${index}`}
                            className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-2"
                          >
                            Table {index + 1}
                          </label>

                          {/* Stepper input group */}
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() =>
                                stepAllocation(table.id, index, -1)
                              }
                              disabled={currentValue <= minValue}
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
                              onClick={() =>
                                stepAllocation(table.id, index, 1)
                              }
                              disabled={
                                currentValue >= (table.maxPersons || 999)
                              }
                              className="w-7 h-7 rounded-md border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          {/* Capacity hint */}
                          <p
                            className={`text-[10px] mt-1.5 tabular-nums ${
                              isOverflow
                                ? "text-red-500 font-medium"
                                : isUnder
                                  ? "text-amber-500 font-medium"
                                  : "text-gray-400"
                            }`}
                          >
                            {isOverflow
                              ? `Max ${table.maxPersons}`
                              : isUnder
                                ? `Min ${minValue}`
                                : isExistingTable
                                  ? `Min ${minValue} · Max ${table.maxPersons}`
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

          {/* Validation errors */}
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
                        +{validation.errors.length - 2} more issue
                        {validation.errors.length - 2 > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="border-t border-gray-100 px-4 sm:px-6 py-3 sm:py-3.5 bg-white flex-shrink-0">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
                    {formatMoneyUnit(grandTotalCost)}
                  </span>
                </>
              )}
            </div>

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
                disabled={!validation.isValid || isAutoArranging}
                className={`rounded-xl h-9 px-4 sm:px-5 text-sm font-semibold transition-all duration-200 flex-1 sm:flex-initial ${
                  validation.isValid
                    ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-200 active:scale-[0.97]"
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
