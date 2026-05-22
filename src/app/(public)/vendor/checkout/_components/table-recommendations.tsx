/**
 * Compact Table Recommendations Component
 * UX Overhaul: Compact group-size input, smart defaults,
 * show only top recommendations, inline allocation for simple cases.
 * All calculation/validation logic preserved.
 */

"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  ChevronDown,
  ChevronUp,
  Star,
  Plus,
  Minus,
  AlertCircle,
  Info,
  Settings,
  CheckCircle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

import { EditableItem, useCartEditStore } from "@/store/cart-edit.store";
import {
  generateTableRecommendations,
  getCostPerPerson,
} from "../_lib/table-recommendations";
import QuantityControls from "./quantity-controls";
import GuestAllocationModal from "./guest-allocation-modal";
import { useCurrencyFormat } from "@/hooks/use-currency-format";

interface TableRecommendationsProps {
  eventSlug: string;
  date: string;
  tables: EditableItem[];
  onQuantityChange: (tableId: number, change: number) => void;
  onUpdateQuantity: (tableId: number, quantity: number) => void;
  getTotalQuantity: (tableId: number) => number;
}

export default function TableRecommendations({
  eventSlug,
  date,
  tables,
  onQuantityChange,
  onUpdateQuantity,
  getTotalQuantity,
}: TableRecommendationsProps) {
  const { format: formatMoney, formatCompact: formatMoneyUnit } =
    useCurrencyFormat();
  const {
    getDateData,
    updatePeopleCount,
    updateTableAllocation,
    validateGuestAllocation,
  } = useCartEditStore();
  const [showAllOptions, setShowAllOptions] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);

  // Get peopleCount from Zustand store, default to 20 if not set
  const dateData = getDateData(eventSlug, date);
  const peopleCount = dateData?.peopleCount || 20;

  // Local state for input field to allow clearing and typing
  const [inputValue, setInputValue] = useState<string>(String(peopleCount));

  // Sync input value when peopleCount changes from external source
  useEffect(() => {
    setInputValue(String(peopleCount));
  }, [peopleCount]);

  // Get selected tables for allocation modal
  const selectedTables = useMemo(() => {
    return tables.filter((table) => getTotalQuantity(table.id) > 0);
  }, [tables, getTotalQuantity]);

  // Check if guest allocation is needed and valid
  const allocationValidation = useMemo(() => {
    if (selectedTables.length === 0) return { isValid: true, errors: [] };
    return validateGuestAllocation(eventSlug, date);
  }, [selectedTables, eventSlug, date, validateGuestAllocation]);

  // Check if multiple tables are selected (allocation needed)
  const needsAllocation = useMemo(() => {
    const totalTablesSelected = selectedTables.reduce(
      (sum, table) => sum + getTotalQuantity(table.id),
      0,
    );
    return totalTablesSelected > 1;
  }, [selectedTables, getTotalQuantity]);

  // Check if allocation is complete and should disable other table selection
  const isAllocationComplete = useMemo(() => {
    return (
      selectedTables.length > 0 &&
      allocationValidation.isValid &&
      needsAllocation
    );
  }, [selectedTables.length, allocationValidation.isValid, needsAllocation]);

  // Generate recommendations based on people count
  const { recommended, otherOptions } = useMemo(() => {
    return generateTableRecommendations(tables, peopleCount);
  }, [tables, peopleCount]);

  const handlePeopleCountChange = (change: number) => {
    const targetCount = peopleCount + change;
    const newPeopleCount = Math.min(Math.max(1, targetCount), 500);

    if (targetCount > 500) {
      toast.error("Maximum group size is 500 people", {
        description: "Please contact support for larger events.",
      });
    }

    updatePeopleCount(eventSlug, date, newPeopleCount);
  };

  // Handle input change - allow clearing and typing
  const handleInputChange = (value: string) => {
    if (value === "" || /^\d*$/.test(value)) {
      setInputValue(value);
    }
  };

  // Validate and update on blur or Enter key
  const handleInputBlur = () => {
    const trimmedValue = inputValue.trim();

    if (trimmedValue === "") {
      setInputValue(String(peopleCount));
      return;
    }

    const num = parseInt(trimmedValue);
    if (isNaN(num) || num < 1) {
      toast.error("Please enter a number between 1 and 500");
      setInputValue(String(peopleCount));
      return;
    }

    const validatedNum = Math.min(Math.max(1, num), 500);

    if (num > 500) {
      toast.error("Maximum group size is 500 people", {
        description: "Please contact support for larger events.",
      });
      setInputValue(String(500));
      if (peopleCount !== 500) {
        updatePeopleCount(eventSlug, date, 500);
      }
    } else if (num < 1) {
      toast.error("Minimum group size is 1 person");
      setInputValue(String(1));
      if (peopleCount !== 1) {
        updatePeopleCount(eventSlug, date, 1);
      }
    } else {
      setInputValue(String(validatedNum));
      if (validatedNum !== peopleCount) {
        updatePeopleCount(eventSlug, date, validatedNum);
      }
    }
  };

  // Handle Enter key press
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  // Handle guest allocation confirmation
  const handleAllocationConfirm = (allocations: Record<number, number[]>) => {
    Object.entries(allocations).forEach(([tableIdStr, allocation]) => {
      const tableId = parseInt(tableIdStr);
      updateTableAllocation(eventSlug, date, tableId, allocation);
    });
    setShowAllocationModal(false);
  };

  // Format date for modal display
  const formatDateForModal = (dateString: string) => {
    try {
      return format(new Date(dateString), "EEEE, MMMM dd, yyyy");
    } catch {
      return dateString;
    }
  };

  // Check if a table should be disabled from selection
  const isTableDisabled = (table: { id: number }) => {
    if (!isAllocationComplete) return false;
    const isAlreadySelected = selectedTables.some(
      (selectedTable) => selectedTable.id === table.id,
    );
    return !isAlreadySelected;
  };

  // Helper function to check if table is eligible for current people count
  const isTableEligible = (table: { title: string }) => {
    const titleMatch = table.title.match(/\((\d+)-(\d+)\s+persons?\)/);
    if (titleMatch) {
      const min = parseInt(titleMatch[1]);
      const max = parseInt(titleMatch[2]);
      const minPersons = Math.min(min, max);
      return peopleCount >= minPersons;
    }
    return true;
  };

  // Helper function to get validation message for table
  const getTableValidationMessage = (table: { title: string; id: number }) => {
    const titleMatch = table.title.match(/\((\d+)-(\d+)\s+persons?\)/);
    if (titleMatch) {
      const min = parseInt(titleMatch[1]);
      const max = parseInt(titleMatch[2]);
      const minPersons = Math.min(min, max);

      if (peopleCount < minPersons) {
        const needed = minPersons - peopleCount;
        return `Need ${needed} more guest${needed > 1 ? "s" : ""} for this table`;
      }
    }
    return null;
  };

  // Helper function to check if user can increase table quantity
  const canIncreaseTableQuantity = (table: {
    title: string;
    id: number;
    maxQuantity?: number;
  }) => {
    const currentQuantity = getTotalQuantity(table.id);
    const titleMatch = table.title.match(/\((\d+)-(\d+)\s+persons?\)/);

    if (titleMatch) {
      const min = parseInt(titleMatch[1]);
      const max = parseInt(titleMatch[2]);
      const minPersons = Math.min(min, max);

      const hasEnoughPeople = peopleCount >= minPersons;
      if (!hasEnoughPeople) return false;

      const maxAllowedQuantity = table.maxQuantity ?? 50;
      if (currentQuantity >= maxAllowedQuantity) return false;

      return true;
    }

    const maxAllowedQuantity = table.maxQuantity ?? 50;
    return currentQuantity < maxAllowedQuantity;
  };

  if (tables.length === 0) {
    return (
      <div className="text-center py-6">
        <AlertCircle className="h-8 w-8 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">
          No tables available for this date
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Compact People Count — inline, not a banner */}
      <div className="flex items-center justify-between p-2.5 bg-amber-50/60 rounded-xl border border-amber-100">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-medium text-gray-700">Group size</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handlePeopleCountChange(-1)}
            disabled={peopleCount <= 1}
            className="h-7 w-7 flex items-center justify-center rounded-lg border border-amber-200 bg-white text-amber-600 transition-all hover:bg-amber-50 active:scale-95 disabled:opacity-40"
          >
            <Minus className="h-3 w-3" />
          </button>

          <input
            type="text"
            inputMode="numeric"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            className="text-base font-semibold text-center w-14 bg-white border border-amber-200 rounded-lg px-2 py-1 text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
            placeholder="20"
          />

          <button
            onClick={() => handlePeopleCountChange(1)}
            disabled={peopleCount >= 500}
            className="h-7 w-7 flex items-center justify-center rounded-lg border border-amber-200 bg-white text-amber-600 transition-all hover:bg-amber-50 active:scale-95 disabled:opacity-40"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Guest Allocation Banner — compact */}
      {needsAllocation && selectedTables.length > 0 && (
        <div
          className={`border rounded-xl p-3 ${
            allocationValidation.isValid
              ? "bg-emerald-50 border-emerald-200"
              : "bg-amber-50/60 border-amber-200"
          }`}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {allocationValidation.isValid ? (
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
              ) : (
                <Settings className="h-4 w-4 text-amber-600 flex-shrink-0" />
              )}
              <div className="min-w-0">
                <span
                  className={`text-sm font-medium ${
                    allocationValidation.isValid
                      ? "text-green-800"
                      : "text-amber-800"
                  }`}
                >
                  {allocationValidation.isValid
                    ? `${peopleCount} guests distributed`
                    : "Distribute your guests"}
                </span>
              </div>
            </div>
            <Button
              onClick={() => setShowAllocationModal(true)}
              size="sm"
              variant="outline"
              className={`shrink-0 text-xs h-8 ${
                allocationValidation.isValid
                  ? "text-green-700 border-green-300 hover:bg-green-100"
                  : "text-amber-700 border-amber-300 hover:bg-amber-100"
              }`}
            >
              <Settings className="h-3 w-3 mr-1 flex-shrink-0" />
              Manage Seating
            </Button>
          </div>

          {/* Allocation errors — compact */}
          {!allocationValidation.isValid &&
            allocationValidation.errors.length > 0 && (
              <p className="mt-2 text-xs text-amber-700">
                {allocationValidation.errors[0]}
              </p>
            )}
        </div>
      )}

      {/* Table Selection Locked notice */}
      {isAllocationComplete && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50/60 border border-amber-100 rounded-xl">
          <Info className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
          <p className="text-xs text-amber-700">
            Seating complete. Update allocation to change tables.
          </p>
        </div>
      )}

      {/* Table Cards — show recommended first, then "more options" */}
      {(() => {
        const eligibleRecommended = recommended.filter((rec) =>
          isTableEligible(rec.table),
        );
        const eligibleOther = otherOptions.filter((rec) =>
          isTableEligible(rec.table),
        );
        const ineligibleOther = otherOptions.filter(
          (rec) => !isTableEligible(rec.table),
        );

        const hasEligibleTables = eligibleRecommended.length > 0;
        const allOtherOptions = [...eligibleOther, ...ineligibleOther];

        if (hasEligibleTables) {
          return (
            <div className="space-y-3">
              {/* Recommended Tables — show top ones */}
              <div className="space-y-2">
                {eligibleRecommended.map((rec, index) => {
                  const validationMsg = getTableValidationMessage(rec.table);
                  const isDisabled = isTableDisabled(rec.table);
                  const isSelected = getTotalQuantity(rec.table.id) > 0;
                  const costPerPerson = getCostPerPerson(rec, peopleCount);

                  return (
                    <div
                      key={`${rec.table.id}-${index}`}
                      className={`rounded-xl transition-all duration-200 border-l-[3px] ${
                        isDisabled
                          ? "opacity-60 bg-gray-50 border-l-transparent border border-gray-100 cursor-not-allowed"
                          : isSelected
                            ? "border-l-amber-500 bg-amber-50/40 shadow-sm border-t border-r border-b border-amber-100"
                            : index === 0
                              ? "border-l-emerald-500 bg-emerald-50/30 border-t border-r border-b border-emerald-100 hover:bg-emerald-50/50"
                              : "border-l-transparent bg-gray-50/50 border-t border-r border-b border-gray-100 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 p-3 sm:p-3.5">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                            <h4 className="text-sm font-medium text-gray-900 leading-snug">
                              {rec.table.title}
                            </h4>
                            {index === 0 && !isDisabled && (
                              <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200 px-1.5 py-0">
                                <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                                Best
                              </Badge>
                            )}
                          </div>
                          <span className="text-sm font-semibold text-amber-700 block">
                            {formatMoneyUnit(costPerPerson)}/person
                          </span>
                          {rec.tablesNeeded > 1 && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {rec.tablesNeeded} tables needed
                            </p>
                          )}
                        </div>
                        {isTableEligible(rec.table) && !isDisabled ? (
                          <QuantityControls
                            quantity={getTotalQuantity(rec.table.id)}
                            maxQuantity={rec.table.maxQuantity}
                            onIncrease={() => {
                              if (canIncreaseTableQuantity(rec.table)) {
                                onQuantityChange(rec.table.id, 1);
                              }
                            }}
                            onDecrease={() =>
                              onQuantityChange(rec.table.id, -1)
                            }
                            onRemove={() => onUpdateQuantity(rec.table.id, 0)}
                            size="sm"
                          />
                        ) : isDisabled ? (
                          <Badge
                            variant="outline"
                            className="text-xs bg-gray-100 text-gray-500"
                          >
                            {isSelected ? "Selected" : "Locked"}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Not Available
                          </Badge>
                        )}
                      </div>
                      {validationMsg && (
                        <div className="px-3.5 pb-3">
                          <p className="text-xs text-amber-600 flex items-center gap-1.5">
                            <Info className="h-3 w-3 flex-shrink-0" />
                            {validationMsg}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Other Options — collapsed by default */}
              {allOtherOptions.length > 0 && (
                <div>
                  <Button
                    variant="ghost"
                    onClick={() => setShowAllOptions(!showAllOptions)}
                    className="w-full justify-between text-gray-500 hover:text-gray-700 h-9 text-xs"
                  >
                    <span>
                      {showAllOptions ? "Hide" : "View"}{" "}
                      {allOtherOptions.length} more option
                      {allOtherOptions.length > 1 ? "s" : ""}
                    </span>
                    {showAllOptions ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </Button>

                  <AnimatePresence>
                    {showAllOptions && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-2 mt-2"
                      >
                        {allOtherOptions.map((rec, index) => {
                          const isEligible = isTableEligible(rec.table);
                          const isDisabled = isTableDisabled(rec.table);
                          const isSelected = getTotalQuantity(rec.table.id) > 0;
                          const validationMsg = getTableValidationMessage(
                            rec.table,
                          );
                          const costPerPerson = getCostPerPerson(
                            rec,
                            peopleCount,
                          );

                          return (
                            <div
                              key={`${rec.table.id}-other-${index}`}
                              className={`rounded-xl border-l-[3px] transition-all duration-200 ${
                                isDisabled
                                  ? "opacity-60 bg-gray-50 border-l-transparent border border-gray-100 cursor-not-allowed"
                                  : isSelected
                                    ? "border-l-amber-500 bg-amber-50/40 shadow-sm border-t border-r border-b border-amber-100"
                                    : !isEligible
                                      ? "border-l-transparent bg-gray-50/30 border border-gray-100 opacity-75"
                                      : "border-l-transparent bg-gray-50/50 border border-gray-100 hover:bg-gray-50"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3 p-3 sm:p-3.5">
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-medium text-gray-900 leading-snug mb-0.5">
                                    {rec.table.title}
                                  </h4>
                                  <span className="text-sm font-semibold text-amber-700 block">
                                    {formatMoneyUnit(costPerPerson)}/person
                                  </span>
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500 mt-0.5">
                                    <span>
                                      {formatMoney(rec.totalCost)} total
                                    </span>
                                    {rec.tablesNeeded > 1 && (
                                      <span>· {rec.tablesNeeded} tables</span>
                                    )}
                                  </div>
                                </div>
                                {isEligible && !isDisabled ? (
                                  <QuantityControls
                                    quantity={getTotalQuantity(rec.table.id)}
                                    maxQuantity={rec.table.maxQuantity}
                                    onIncrease={() => {
                                      if (canIncreaseTableQuantity(rec.table)) {
                                        onQuantityChange(rec.table.id, 1);
                                      }
                                    }}
                                    onDecrease={() =>
                                      onQuantityChange(rec.table.id, -1)
                                    }
                                    onRemove={() =>
                                      onUpdateQuantity(rec.table.id, 0)
                                    }
                                    size="sm"
                                  />
                                ) : isDisabled ? (
                                  <Badge
                                    variant="outline"
                                    className="text-xs bg-gray-100 text-gray-500"
                                  >
                                    {isSelected ? "Selected" : "Locked"}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs">
                                    Not Available
                                  </Badge>
                                )}
                              </div>
                              {validationMsg && (
                                <div className="px-3.5 pb-3">
                                  <p className="text-xs text-amber-600 flex items-center gap-1.5">
                                    <Info className="h-3 w-3 flex-shrink-0" />
                                    {validationMsg}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          );
        } else {
          // No eligible tables - show sorry message
          return (
            <div className="space-y-3">
              <div className="text-center py-5 bg-amber-50 rounded-xl border border-amber-200">
                <AlertCircle className="h-7 w-7 text-amber-500 mx-auto mb-2" />
                <h3 className="font-medium text-amber-900 mb-1 text-sm">
                  No tables available for {peopleCount} people
                </h3>
                <p className="text-xs text-amber-700 mb-2">
                  Please contact support for assistance
                </p>
                <div className="flex items-center justify-center gap-3 text-xs text-amber-600">
                  <span>📧 support@eventwizz.com</span>
                </div>
              </div>

              {/* Show all tables as view-only */}
              <div>
                <h3 className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">
                  Available tables (may require arrangement)
                </h3>
                <div className="space-y-2">
                  {[...recommended, ...otherOptions].map((rec, index) => (
                    <div
                      key={`${rec.table.id}-alt-${index}`}
                      className="border border-gray-100 rounded-xl opacity-75"
                    >
                      <div className="flex items-center justify-between p-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 mb-0.5">
                            {rec.table.title}
                          </h4>
                          <div className="flex gap-3 text-xs text-gray-500">
                            <span>
                              {formatMoneyUnit(
                                getCostPerPerson(rec, peopleCount),
                              )}
                              /person
                            </span>
                            {rec.tablesNeeded > 1 && (
                              <span>{rec.tablesNeeded} tables</span>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          Contact Support
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        }
      })()}

      {/* Guest Allocation Modal */}
      <GuestAllocationModal
        isOpen={showAllocationModal}
        onClose={() => setShowAllocationModal(false)}
        selectedTables={selectedTables}
        totalGuests={peopleCount}
        onConfirm={handleAllocationConfirm}
        eventName={eventSlug
          .replace(/-/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase())}
        dateString={formatDateForModal(date)}
      />
    </div>
  );
}
