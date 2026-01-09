/**
 * Professional Guest Allocation Modal
 * User-friendly interface for distributing guests across selected tables
 * Matches checkout system exactly
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Users,
  Wand2,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import {
  autoArrangeGuests,
  validateAllocation,
  generateAllocationSummary,
  TableAllocationData,
} from "../_lib/guest-allocation";

interface NewTableSelection {
  id: number;
  title: string;
  size: number;
  min_persons: number;
  max_persons: number;
  quantity: number;
  price: number;
  currentAllocation?: number[]; // For existing tables - current allocation before adding
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
  // Local state for allocations
  const [allocations, setAllocations] = useState<Record<number, number[]>>({});
  const [isAutoArranging, setIsAutoArranging] = useState(false);
  const [hasBeenAutoArranged, setHasBeenAutoArranged] = useState(false);

  // Track if we've initialized allocations for this modal session
  const initializedRef = useRef(false);
  const previousTablesRef = useRef<NewTableSelection[]>([]);

  // Convert newTables to EditableItem format for compatibility
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

  // Initialize allocations when modal opens and auto-fill if needed
  useEffect(() => {
    if (!isOpen) {
      // Reset when modal closes
      initializedRef.current = false;
      previousTablesRef.current = [];
      setAllocations({});
      setHasBeenAutoArranged(false);
      return;
    }

    if (newTables.length === 0) {
      return;
    }

    // Check if tables have changed (by comparing IDs and quantities)
    const tablesChanged =
      previousTablesRef.current.length !== newTables.length ||
      previousTablesRef.current.some(
        (prevTable, index) =>
          prevTable.id !== newTables[index]?.id ||
          prevTable.quantity !== newTables[index]?.quantity
      );

    // Only initialize if modal just opened or tables changed
    if (!initializedRef.current || tablesChanged) {
      const tables = newTables;
      const initialAllocations: Record<number, number[]> = {};

      tables.forEach((table) => {
        // For existing tables, start with current allocation if provided
        // Otherwise initialize with minimum capacity
        if (
          table.currentAllocation &&
          table.currentAllocation.length === table.quantity
        ) {
          // This is an existing table - start with current allocation
          initialAllocations[table.id] = [...table.currentAllocation];
        } else {
          // New table - initialize with minimum capacity
          initialAllocations[table.id] = Array(table.quantity).fill(
            table.min_persons || 1
          );
        }
      });

      // Calculate total allocated
      let totalAllocated = 0;
      Object.values(initialAllocations).forEach((allocation) => {
        totalAllocated += allocation.reduce((sum, count) => sum + count, 0);
      });

      // For existing tables, calculate target total (current + people to add)
      // For new tables, target is just totalPeople
      const hasExistingAllocation = tables.some(
        (t) => t.currentAllocation && t.currentAllocation.length > 0
      );
      const targetTotal = hasExistingAllocation
        ? totalAllocated + totalPeople // Current allocation + people to add
        : totalPeople; // Just the new people

      // Check if all tables are at minimum capacity
      const allAtMinimum = Object.entries(initialAllocations).every(
        ([tableId, allocation]) => {
          const table = tables.find((t) => t.id === parseInt(tableId));
          return allocation.every(
            (count) => count === (table?.min_persons || 1)
          );
        }
      );

      // Auto-fill if allocation is incomplete (same as checkout)
      // For existing tables: always auto-fill when there are people to add
      // For new tables: auto-fill only when all at minimum and incomplete
      const needsAutoFill = hasExistingAllocation
        ? totalAllocated !== targetTotal // Existing tables: always auto-fill if incomplete
        : totalAllocated !== targetTotal && allAtMinimum; // New tables: only if at minimum

      if (needsAutoFill) {
        // Auto-arrange guests automatically on first open (like checkout)
        const tableData = tables.map((table) => ({
          id: table.id,
          title: table.title,
          minPersons: table.min_persons || 1,
          maxPersons: table.max_persons || 999, // Use actual max capacity
          quantity: table.quantity,
        }));

        const autoArranged = autoArrangeGuests(tableData, targetTotal);

        // Verify the auto-arranged total doesn't exceed targetTotal
        let autoArrangedTotal = 0;
        Object.values(autoArranged).forEach((allocation) => {
          autoArrangedTotal += allocation.reduce(
            (sum, count) => sum + count,
            0
          );
        });

        // If it exceeds, clamp it
        if (autoArrangedTotal > targetTotal) {
          // Recalculate to ensure exact total
          const adjusted = autoArrangeGuests(tableData, targetTotal);
          setAllocations(adjusted);
        } else {
          setAllocations(autoArranged);
        }

        setHasBeenAutoArranged(true);
      } else {
        setAllocations(initialAllocations);
        setHasBeenAutoArranged(false);
      }

      // Mark as initialized and store current tables
      initializedRef.current = true;
      previousTablesRef.current = [...newTables];
    }
  }, [isOpen, newTables, totalPeople]);

  // Convert selected tables to allocation data format
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
  // For existing tables: current allocation + people to add
  // For new tables: just totalPeople
  const targetTotalForValidation = useMemo(() => {
    const hasExistingAllocation = newTables.some(
      (t) => t.currentAllocation && t.currentAllocation.length > 0
    );
    if (hasExistingAllocation) {
      // Calculate original current total from currentAllocation
      let originalTotal = 0;
      newTables.forEach((table) => {
        if (table.currentAllocation) {
          originalTotal += table.currentAllocation.reduce(
            (sum, count) => sum + count,
            0
          );
        }
      });
      // Target is original + people to add
      return originalTotal + totalPeople;
    }
    return totalPeople;
  }, [newTables, totalPeople]);

  // Validation results
  const validation = useMemo(() => {
    return validateAllocation(tableAllocationData, targetTotalForValidation);
  }, [tableAllocationData, targetTotalForValidation]);

  // Auto-arrange functionality
  const handleAutoArrange = async () => {
    setIsAutoArranging(true);

    try {
      // Simulate brief loading for better UX
      await new Promise((resolve) => setTimeout(resolve, 800));

      const tableData = selectedTables.map((table) => {
        // Find the original table config to get correct maxPersons
        const originalTable = newTables.find((t) => t.id === table.id);
        return {
          id: table.id,
          title: table.title,
          minPersons: table.minPersons || 1,
          maxPersons: originalTable?.max_persons || table.maxPersons || 999,
          quantity: table.quantity,
        };
      });

      // Calculate target total (current + people to add for existing tables)
      const hasExistingAllocation = newTables.some(
        (t) => t.currentAllocation && t.currentAllocation.length > 0
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
      setHasBeenAutoArranged(true);

      toast.success("Guests arranged automatically!");
    } catch (error) {
      console.error("Auto-arrange error:", error);
      toast.error("Failed to auto-arrange guests");
    } finally {
      setIsAutoArranging(false);
    }
  };

  // Reset to minimum allocations (or current allocation for existing tables)
  const handleReset = () => {
    const resetAllocations: Record<number, number[]> = {};
    selectedTables.forEach((table) => {
      // Find original table to check if it's existing
      const originalTable = newTables.find((t) => t.id === table.id);
      const currentAllocation = originalTable?.currentAllocation || [];

      if (currentAllocation.length === table.quantity) {
        // Existing table - reset to current allocation
        resetAllocations[table.id] = [...currentAllocation];
      } else {
        // New table - reset to minimum
        resetAllocations[table.id] = Array(table.quantity).fill(
          table.minPersons || 1
        );
      }
    });
    setAllocations(resetAllocations);
    setHasBeenAutoArranged(false);
    toast.info("Reset to original allocations");
  };

  // Calculate remaining guests
  const remainingGuests = useMemo(() => {
    let totalAllocated = 0;
    Object.values(allocations).forEach((allocation) => {
      totalAllocated += allocation.reduce((sum, count) => sum + count, 0);
    });
    return totalPeople - totalAllocated;
  }, [allocations, totalPeople]);

  // Update individual table allocation
  const updateTableAllocation = (
    tableId: number,
    tableIndex: number,
    value: string
  ) => {
    const numValue = parseInt(value) || 0;
    const table = selectedTables.find((t) => t.id === tableId);
    if (!table) return;

    // Find original table config to check if it's an existing table
    const originalTable = newTables.find((t) => t.id === tableId);
    const currentAllocation = originalTable?.currentAllocation || [];
    const isExistingTable = currentAllocation.length > 0;

    // For existing tables, minimum is the current allocation value
    // For new tables, minimum is minPersons
    const minValue =
      isExistingTable && currentAllocation[tableIndex] !== undefined
        ? currentAllocation[tableIndex] // Can't go below current allocation
        : table.minPersons || 1;

    // Clamp to table capacity limits and minimum value
    const clampedValue = Math.max(
      minValue,
      Math.min(table.maxPersons || 999, numValue)
    );

    setAllocations((prev) => {
      const newAllocations = { ...prev };
      if (!newAllocations[tableId]) {
        newAllocations[tableId] = [];
      }

      newAllocations[tableId] = [...newAllocations[tableId]];
      newAllocations[tableId][tableIndex] = clampedValue;

      return newAllocations;
    });
  };

  // Handle confirmation
  const handleConfirm = () => {
    if (validation.isValid) {
      onConfirm(allocations);
      toast.success("Guest allocation confirmed!");
      onClose();
    } else {
      toast.error("Please fix allocation errors before confirming");
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 [&>button]:hidden">
        {/* Visually Hidden Title for Screen Readers */}
        <DialogTitle className="sr-only">
          Manage Seating - Distribute {totalPeople} guests across tables
        </DialogTitle>

        {/* Header */}
        <div className="bg-[var(--color-primary)] text-white p-4 relative">
          <div className="flex items-center justify-between pr-12">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-white/20 rounded-lg">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Manage Seating</h2>
                {(() => {
                  // Check if managing existing tables
                  const hasExistingTables = newTables.some(
                    (t) => t.currentAllocation && t.currentAllocation.length > 0
                  );
                  return (
                    <p className="text-blue-100 text-xs">
                      {hasExistingTables ? (
                        <>
                          Adjust your existing table allocation • Add up to{" "}
                          {totalPeople} more guests
                        </>
                      ) : (
                        <>
                          {eventName && dateString
                            ? `${eventName} • ${dateString}`
                            : `Distribute ${totalPeople} guests`}
                        </>
                      )}
                    </p>
                  );
                })()}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{totalPeople}</div>
              <div className="text-blue-100 text-xs">
                {newTables.some(
                  (t) => t.currentAllocation && t.currentAllocation.length > 0
                )
                  ? "Additional Guests"
                  : "Total Guests"}
              </div>
            </div>
          </div>

          {/* Custom Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-all duration-200 text-white hover:text-white focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="Close modal"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Existing Tables Info Banner */}
          {newTables.some(
            (t) => t.currentAllocation && t.currentAllocation.length > 0
          ) && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-2.5">
              <p className="text-xs text-purple-700">
                💡{" "}
                <span className="font-semibold">Adjusting existing tables</span>{" "}
                - You can only increase the numbers. Use &quot;Auto
                Arrange&quot; for quick distribution.
              </p>
            </div>
          )}

          {/* Progress Section */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 rounded-lg">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">
                    Guest Assignment
                  </h3>
                  <p className="text-xs text-gray-600">
                    {validation.isValid
                      ? "All guests assigned"
                      : `${validation.totalAllocated} of ${validation.totalRequired} assigned`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-gray-900">
                  {validation.totalAllocated}
                </div>
                <div className="text-xs text-gray-500">assigned</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="relative">
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full transition-all duration-500 ${
                    validation.isValid
                      ? "bg-gradient-to-r from-green-500 to-green-600"
                      : validation.totalAllocated > validation.totalRequired
                      ? "bg-gradient-to-r from-red-500 to-red-600"
                      : "bg-gradient-to-r from-blue-500 to-blue-600"
                  }`}
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min(
                      100,
                      (validation.totalAllocated / validation.totalRequired) *
                        100
                    )}%`,
                  }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-medium text-white drop-shadow-sm">
                  {Math.round(
                    (validation.totalAllocated / validation.totalRequired) * 100
                  )}
                  %
                </span>
              </div>
            </div>

            {/* Remaining/Over-allocation Status */}
            <div className="mt-3">
              {validation.isValid ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-green-700"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-medium text-sm">
                    Perfect! All guests assigned correctly.
                  </span>
                </motion.div>
              ) : remainingGuests > 0 ? (
                <div className="flex items-center gap-2 text-blue-700">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {remainingGuests} guest{remainingGuests > 1 ? "s" : ""}{" "}
                    remaining
                  </span>
                </div>
              ) : remainingGuests < 0 ? (
                <div className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {Math.abs(remainingGuests)} guest
                    {Math.abs(remainingGuests) > 1 ? "s" : ""} over-allocated
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleAutoArrange}
              disabled={isAutoArranging}
              className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl text-sm"
            >
              {isAutoArranging ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent mr-2" />
                  Arranging...
                </>
              ) : (
                <>
                  <Wand2 className="h-3 w-3 mr-2" />
                  Auto Arrange
                </>
              )}
            </Button>

            <Button
              onClick={handleReset}
              variant="outline"
              className="border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium transition-all text-black duration-200 text-sm"
            >
              <RotateCcw className="h-3 w-3 mr-2" />
              Reset
            </Button>

            {hasBeenAutoArranged && (
              <Badge className="bg-green-100 text-green-800 border-green-200 px-2 py-1 text-xs">
                Auto-arranged
              </Badge>
            )}
          </div>

          {/* Table Allocation Cards */}
          <div className="grid gap-4">
            {selectedTables.map((table, tableIndex) => (
              <motion.div
                key={table.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: tableIndex * 0.1 }}
                className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-base font-semibold text-gray-900">
                          {table.title}
                        </h4>
                        {/* Check if this is an existing table */}
                        {(() => {
                          const originalTable = newTables.find(
                            (t) => t.id === table.id
                          );
                          const hasCurrentAllocation =
                            originalTable?.currentAllocation &&
                            originalTable.currentAllocation.length > 0;
                          return (
                            hasCurrentAllocation && (
                              <Badge className="bg-purple-100 text-purple-800 border-purple-200 px-2 py-0.5 text-xs">
                                Existing
                              </Badge>
                            )
                          );
                        })()}
                      </div>
                      <p className="text-xs text-gray-600">
                        {table.quantity} table{table.quantity > 1 ? "s" : ""} •
                        Max {table.maxPersons} per table
                      </p>
                    </div>
                  </div>
                  {table.pricePerPerson > 0 && (
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        £{table.pricePerPerson || table.price}
                      </div>
                      <div className="text-xs text-gray-500">per person</div>
                    </div>
                  )}
                </div>

                <div
                  className="grid gap-3"
                  style={{
                    gridTemplateColumns: `repeat(${Math.min(
                      table.quantity,
                      4
                    )}, 1fr)`,
                  }}
                >
                  {Array.from({ length: table.quantity }, (_, index) => {
                    // Find original table to get current allocation
                    const originalTable = newTables.find(
                      (t) => t.id === table.id
                    );
                    const currentAllocation =
                      originalTable?.currentAllocation || [];
                    const isExistingTable = currentAllocation.length > 0;

                    // For existing tables, minimum is current allocation; for new tables, use minPersons
                    const minValue =
                      isExistingTable && currentAllocation[index] !== undefined
                        ? currentAllocation[index]
                        : table.minPersons || 1;

                    const currentValue =
                      allocations[table.id]?.[index] || minValue;
                    const isValid =
                      currentValue >= minValue &&
                      currentValue <= (table.maxPersons || 999);

                    return (
                      <div key={index} className="space-y-2">
                        <Label
                          htmlFor={`table-${table.id}-${index}`}
                          className="text-xs font-medium text-gray-700 block"
                        >
                          Table {index + 1}
                          {/* Show minimum for existing tables */}
                          {isExistingTable &&
                            currentAllocation[index] !== undefined && (
                              <span className="ml-1 text-purple-600 font-normal">
                                (min: {currentAllocation[index]})
                              </span>
                            )}
                        </Label>
                        <div className="relative">
                          <Input
                            id={`table-${table.id}-${index}`}
                            type="number"
                            min={minValue}
                            max={table.maxPersons || 999}
                            value={currentValue}
                            onChange={(e) =>
                              updateTableAllocation(
                                table.id,
                                index,
                                e.target.value
                              )
                            }
                            className={`h-10 text-center font-semibold ${
                              isValid
                                ? validation.totalAllocated >
                                  validation.totalRequired
                                  ? "border-orange-300 focus:border-orange-500 bg-orange-50"
                                  : isExistingTable
                                  ? "border-purple-300 focus:border-purple-500 bg-purple-50"
                                  : "border-gray-300 focus:border-blue-500"
                                : "border-red-300 focus:border-red-500 bg-red-50"
                            }`}
                            placeholder={
                              isExistingTable
                                ? `Min: ${minValue}`
                                : `${table.minPersons}-${table.maxPersons}`
                            }
                          />
                          {!isValid && (
                            <div className="absolute -bottom-5 left-0 right-0 text-xs text-red-600 text-center">
                              Invalid
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Table Summary */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Total for this table:</span>
                    <span className="font-semibold text-gray-900">
                      {(
                        allocations[table.id] || Array(table.quantity).fill(0)
                      ).reduce((sum, count) => sum + count, 0)}{" "}
                      guests
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Validation Errors */}
          {!validation.isValid && validation.errors.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-lg p-4 ${
                validation.totalAllocated > validation.totalRequired
                  ? "bg-orange-50 border border-orange-200"
                  : "bg-red-50 border border-red-200"
              }`}
            >
              <div className="flex items-start gap-2">
                <AlertTriangle
                  className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                    validation.totalAllocated > validation.totalRequired
                      ? "text-orange-600"
                      : "text-red-600"
                  }`}
                />
                <div className="flex-1">
                  <h4
                    className={`font-semibold mb-2 ${
                      validation.totalAllocated > validation.totalRequired
                        ? "text-orange-900"
                        : "text-red-900"
                    }`}
                  >
                    {validation.totalAllocated > validation.totalRequired
                      ? "Too Many Guests Assigned"
                      : "Allocation Issues"}
                  </h4>
                  <ul className="space-y-1">
                    {validation.errors.map((error, index) => (
                      <li
                        key={index}
                        className={`text-sm ${
                          validation.totalAllocated > validation.totalRequired
                            ? "text-orange-700"
                            : "text-red-700"
                        }`}
                      >
                        • {error}
                      </li>
                    ))}
                  </ul>
                  {validation.totalAllocated > validation.totalRequired && (
                    <p className="text-xs mt-2 text-orange-600">
                      Tip: Reduce guest counts in the tables above to match the
                      required {validation.totalRequired} guests.
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Allocation Summary */}
          {validation.isValid && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-50 border border-green-200 rounded-lg p-4"
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <h4 className="font-semibold text-green-900">
                    Allocation Complete
                  </h4>
                  <p className="text-sm text-green-700 whitespace-pre-line">
                    {generateAllocationSummary(tableAllocationData)}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center justify-end gap-3">
            <Button onClick={onClose} variant="event-outline" className="px-6">
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!validation.isValid || isAutoArranging}
              variant="event-primary"
              className="px-6"
            >
              Confirm Allocation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
