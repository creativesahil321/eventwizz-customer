/**
 * Professional Guest Allocation Modal
 * User-friendly interface for distributing guests across selected tables
 */

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Users,
  Wand2,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import { EditableItem } from "@/store/cart-edit.store";
import {
  autoArrangeGuests,
  validateAllocation,
  generateAllocationSummary,
  TableAllocationData,
} from "../_lib/guest-allocation";

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
  // Local state for allocations
  const [allocations, setAllocations] = useState<Record<number, number[]>>({});
  const [isAutoArranging, setIsAutoArranging] = useState(false);
  const [hasBeenAutoArranged, setHasBeenAutoArranged] = useState(false);

  // Initialize allocations when modal opens and auto-fill if needed
  useEffect(() => {
    if (isOpen && selectedTables.length > 0) {
      const initialAllocations: Record<number, number[]> = {};

      selectedTables.forEach((table) => {
        // Use existing allocation or initialize with minimum capacity
        const existingAllocation =
          table.allocation && table.allocation.length === table.quantity
            ? table.allocation
            : Array(table.quantity).fill(table.minPersons || 1);

        initialAllocations[table.id] = [...existingAllocation];
      });

      // Calculate total allocated
      let totalAllocated = 0;
      Object.values(initialAllocations).forEach((allocation) => {
        totalAllocated += allocation.reduce((sum, count) => sum + count, 0);
      });

      // Check if all tables are at minimum capacity (first time or reset state)
      const allAtMinimum = Object.entries(initialAllocations).every(
        ([tableId, allocation]) => {
          const table = selectedTables.find((t) => t.id === parseInt(tableId));
          return allocation.every(
            (count) => count === (table?.minPersons || 1)
          );
        }
      );

      // Auto-fill if allocation is incomplete or all at minimum (first time)
      const needsAutoFill = totalAllocated !== totalGuests && allAtMinimum;

      if (needsAutoFill) {
        // Auto-arrange guests automatically on first open
        const tableData = selectedTables.map((table) => ({
          id: table.id,
          title: table.title,
          minPersons: table.minPersons || 1,
          maxPersons: table.maxPersons || 999,
          quantity: table.quantity,
        }));

        const autoArranged = autoArrangeGuests(tableData, totalGuests);
        setAllocations(autoArranged);
        setHasBeenAutoArranged(true);
      } else {
        setAllocations(initialAllocations);
        setHasBeenAutoArranged(false);
      }
    }
  }, [isOpen, selectedTables, totalGuests]);

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

  // Validation results
  const validation = useMemo(() => {
    return validateAllocation(tableAllocationData, totalGuests);
  }, [tableAllocationData, totalGuests]);

  // Auto-arrange functionality
  const handleAutoArrange = async () => {
    setIsAutoArranging(true);

    try {
      // Simulate brief loading for better UX
      await new Promise((resolve) => setTimeout(resolve, 800));

      const tableData = selectedTables.map((table) => ({
        id: table.id,
        title: table.title,
        minPersons: table.minPersons || 1,
        maxPersons: table.maxPersons || 999,
        quantity: table.quantity,
      }));

      const autoArranged = autoArrangeGuests(tableData, totalGuests);
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

  // Reset to minimum allocations
  const handleReset = () => {
    const resetAllocations: Record<number, number[]> = {};
    selectedTables.forEach((table) => {
      resetAllocations[table.id] = Array(table.quantity).fill(
        table.minPersons || 1
      );
    });
    setAllocations(resetAllocations);
    setHasBeenAutoArranged(false);
    toast.info("Reset to minimum allocations");
  };

  // Update individual table allocation
  const updateTableAllocation = (
    tableId: number,
    tableIndex: number,
    value: string
  ) => {
    const numValue = parseInt(value) || 0;

    setAllocations((prev) => {
      const newAllocations = { ...prev };
      if (!newAllocations[tableId]) {
        newAllocations[tableId] = [];
      }

      newAllocations[tableId] = [...newAllocations[tableId]];
      newAllocations[tableId][tableIndex] = numValue;

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
        {/* Header */}
        <div className="bg-[var(--color-primary)] text-white p-4 relative">
          <div className="flex items-center justify-between pr-12">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-white/20 rounded-lg">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Manage Seating</h2>
                <p className="text-blue-100 text-xs">
                  {eventName && dateString && `${eventName} • ${dateString}`}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{totalGuests}</div>
              <div className="text-blue-100 text-xs">Total Guests</div>
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

            {validation.isValid && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 mt-3 text-green-700"
              >
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium text-sm">
                  Perfect! All guests assigned correctly.
                </span>
              </motion.div>
            )}
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
              variant="event-outline"
              className="border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm"
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
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-gray-900">
                        {table.title}
                      </h4>
                      <p className="text-xs text-gray-600">
                        {table.quantity} table{table.quantity > 1 ? "s" : ""} •
                        {table.minPersons}-{table.maxPersons} guests per table
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">
                      £
                      {(() => {
                        const pricePerPerson =
                          table.pricePerPerson || table.price;
                        const currentAllocation = allocations[table.id] || [];
                        const totalGuests = currentAllocation.reduce(
                          (sum, guests) => sum + guests,
                          0
                        );
                        return (pricePerPerson * totalGuests).toLocaleString();
                      })()}
                    </div>
                    <div className="text-xs text-gray-500">Total Cost</div>
                  </div>
                </div>

                {/* Table Inputs Grid */}
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
                    const currentValue =
                      allocations[table.id]?.[index] || table.minPersons || 1;
                    const isValid =
                      currentValue >= (table.minPersons || 1) &&
                      currentValue <= (table.maxPersons || 999);

                    return (
                      <div key={index} className="space-y-2">
                        <Label
                          htmlFor={`table-${table.id}-${index}`}
                          className="text-xs font-medium text-gray-700 block"
                        >
                          Table {index + 1}
                        </Label>
                        <div className="relative">
                          <Input
                            id={`table-${table.id}-${index}`}
                            type="number"
                            min={table.minPersons || 1}
                            max={table.maxPersons || 999}
                            value={currentValue}
                            onChange={(e) =>
                              updateTableAllocation(
                                table.id,
                                index,
                                e.target.value
                              )
                            }
                            className={`text-center text-base font-semibold py-2 ${
                              isValid
                                ? "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                : "border-red-300 focus:border-red-500 focus:ring-red-500"
                            }`}
                          />
                          <div className="absolute -bottom-5 left-0 right-0 text-center">
                            <span className="text-xs text-gray-400 bg-white px-1 py-0.5 rounded text-xs">
                              {table.minPersons}-{table.maxPersons}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Validation Messages */}
          <AnimatePresence>
            {validation.errors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-50 border border-red-200 rounded-lg p-3"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h5 className="font-medium text-red-800 mb-1 text-sm">
                      Allocation Issues
                    </h5>
                    <ul className="text-xs text-red-700 space-y-1">
                      {validation.errors.map((error, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-red-500 mt-1">•</span>
                          <span>{error}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success Summary */}
          {validation.isValid && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-50 border border-green-200 rounded-lg p-3"
            >
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h5 className="font-medium text-green-800 mb-1 text-sm">
                    Allocation Complete
                  </h5>
                  <div className="text-xs text-green-700 space-y-1">
                    {generateAllocationSummary(
                      tableAllocationData,
                      totalGuests
                    ).map((line, index) => (
                      <div key={index}>{line}</div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 px-4 py-3">
          <div className="flex items-center justify-between">
            <Button
              variant="event-outline"
              onClick={onClose}
              className="px-6 py-2 rounded-lg font-medium text-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!validation.isValid}
              variant="event-primary"
              className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${
                validation.isValid
                  ? "bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              {validation.isValid ? (
                <>
                  <CheckCircle className="h-3 w-3 mr-2" />
                  Confirm Allocation
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3 w-3 mr-2" />
                  Fix Issues First
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
