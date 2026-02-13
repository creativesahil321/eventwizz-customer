/**
 * Compact Table Recommendations Component
 * Similar to tickets section layout
 */

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
      (sum, table) => sum + table.quantity,
      0
    );
    return totalTablesSelected > 1;
  }, [selectedTables]);

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
    // Allow empty string, spaces, and numbers while typing
    if (value === "" || /^\d*$/.test(value)) {
      setInputValue(value);
    }
  };

  // Validate and update on blur or Enter key
  const handleInputBlur = () => {
    const trimmedValue = inputValue.trim();

    if (trimmedValue === "") {
      // If empty, restore to current peopleCount
      setInputValue(String(peopleCount));
      return;
    }

    const num = parseInt(trimmedValue);
    if (isNaN(num) || num < 1) {
      // Invalid input, restore to current value
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
      updatePeopleCount(eventSlug, date, 500);
    } else if (num < 1) {
      toast.error("Minimum group size is 1 person");
      setInputValue(String(1));
      updatePeopleCount(eventSlug, date, 1);
    } else {
      // Valid input, update store
      setInputValue(String(validatedNum));
      updatePeopleCount(eventSlug, date, validatedNum);
    }
  };

  // Handle Enter key press
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur(); // Trigger blur which validates
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

    // If allocation is complete, only allow changes to already selected tables
    const isAlreadySelected = selectedTables.some(
      (selectedTable) => selectedTable.id === table.id
    );
    return !isAlreadySelected;
  };

  // Helper function to check if table is eligible for current people count
  const isTableEligible = (table: { title: string }) => {
    // Extract min/max persons from table title
    const titleMatch = table.title.match(/\((\d+)-(\d+)\s+persons?\)/);
    if (titleMatch) {
      const min = parseInt(titleMatch[1]);
      const max = parseInt(titleMatch[2]);
      const minPersons = Math.min(min, max);

      // Table is eligible if people count meets the minimum requirement
      // No flexibility - must meet minimum requirement
      return peopleCount >= minPersons;
    }
    return true; // Default to eligible if can't parse
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
        return `You need ${needed} more people to book this table`;
      }
    }
    return null;
  };

  // Helper function to check if user can increase table quantity
  const canIncreaseTableQuantity = (table: { title: string; id: number }) => {
    const currentQuantity = getTotalQuantity(table.id);
    const titleMatch = table.title.match(/\((\d+)-(\d+)\s+persons?\)/);

    if (titleMatch) {
      const min = parseInt(titleMatch[1]);
      const max = parseInt(titleMatch[2]);
      const minPersons = Math.min(min, max);
      const maxPersons = Math.max(min, max);

      // First check: Do we have enough people to meet the minimum requirement?
      const hasEnoughPeople = peopleCount >= minPersons; // Must meet minimum requirement

      if (!hasEnoughPeople) {
        return false; // Can't add more tables if we don't have enough people
      }

      // Calculate total capacity if we add one more table
      const totalCapacityAfterIncrease = (currentQuantity + 1) * minPersons;

      // Don't allow if it would exceed people count by more than 20%
      const wouldExceedReasonableCapacity =
        totalCapacityAfterIncrease > peopleCount * 1.2;

      // Check if remaining people can be accommodated by adding more tables
      const remainingPeople = peopleCount - currentQuantity * maxPersons;

      // Calculate minimum tables needed to accommodate remaining people
      const minTablesNeeded = Math.ceil(remainingPeople / maxPersons);
      const maxTablesNeeded = Math.ceil(remainingPeople / minPersons);

      // Check if we can accommodate remaining people with reasonable number of tables
      // Allow up to 50 additional tables for very large events
      const canAccommodateRemaining =
        remainingPeople > 0 &&
        minTablesNeeded <= 50 &&
        minTablesNeeded <= maxTablesNeeded;

      return !wouldExceedReasonableCapacity && canAccommodateRemaining;
    }

    return true;
  };

  // Helper function to get table quantity limit message
  const getTableQuantityLimitMessage = (table: {
    title: string;
    id: number;
  }) => {
    const currentQuantity = getTotalQuantity(table.id);
    const titleMatch = table.title.match(/\((\d+)-(\d+)\s+persons?\)/);

    if (titleMatch && currentQuantity > 0) {
      const min = parseInt(titleMatch[1]);
      const max = parseInt(titleMatch[2]);
      const minPersons = Math.min(min, max);
      const currentCapacity = currentQuantity * minPersons;

      // Only show error if we have excess capacity and can't add more
      if (currentCapacity > peopleCount && !canIncreaseTableQuantity(table)) {
        const excessCapacity = currentCapacity - peopleCount;
        return `You have ${excessCapacity} extra seats. Adding more tables would create excessive capacity.`;
      }
    }

    return null;
  };

  // Helper function to get increment disabled reason
  const getIncrementDisabledReason = (table: { title: string; id: number }) => {
    const currentQuantity = getTotalQuantity(table.id);
    const titleMatch = table.title.match(/\((\d+)-(\d+)\s+persons?\)/);

    if (titleMatch) {
      const min = parseInt(titleMatch[1]);
      const max = parseInt(titleMatch[2]);
      const minPersons = Math.min(min, max);
      const maxPersons = Math.max(min, max);

      // Check if we can't add more tables
      if (!canIncreaseTableQuantity(table)) {
        const remainingPeople = peopleCount - currentQuantity * maxPersons;

        // Check if remaining people can be accommodated
        const minTablesNeeded = Math.ceil(remainingPeople / maxPersons);
        const maxTablesNeeded = Math.ceil(remainingPeople / minPersons);

        if (
          remainingPeople > 0 &&
          (minTablesNeeded > 50 || minTablesNeeded > maxTablesNeeded)
        ) {
          return `Cannot add more tables. ${remainingPeople} people remaining would require ${minTablesNeeded} or more tables.`;
        }

        // Capacity constraint - check if adding more would create excessive capacity
        const totalCapacityAfterIncrease = (currentQuantity + 1) * minPersons;
        if (totalCapacityAfterIncrease > peopleCount * 1.2) {
          const excessCapacity = totalCapacityAfterIncrease - peopleCount;
          return `Adding more tables would create excessive capacity (${excessCapacity} extra seats).`;
        }
      }
    }

    return null;
  };

  if (tables.length === 0) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No tables available for this date</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Compact People Count Input */}
      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-900">
            People in group:
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePeopleCountChange(-1)}
            disabled={peopleCount <= 1}
            className="h-7 w-7 p-0 rounded-full"
          >
            <Minus className="h-3 w-3" />
          </Button>

          <input
            type="text"
            inputMode="numeric"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            className="text-lg font-semibold text-center w-20 bg-white border rounded px-2 py-1 text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="20"
          />

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePeopleCountChange(1)}
            disabled={peopleCount >= 500}
            className="h-7 w-7 p-0 rounded-full"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Guest Allocation Section - responsive: stack on mobile so buttons aren't cut off */}
      {needsAllocation && selectedTables.length > 0 && (
        <div
          className={`border rounded-lg p-4 ${
            allocationValidation.isValid
              ? "bg-green-50 border-green-200"
              : "bg-blue-50 border-blue-200"
          }`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <Settings
                className={`h-4 w-4 flex-shrink-0 ${
                  allocationValidation.isValid
                    ? "text-green-600"
                    : "text-blue-600"
                }`}
              />
              <div className="min-w-0">
                <h4
                  className={`text-sm font-medium ${
                    allocationValidation.isValid
                      ? "text-green-900"
                      : "text-blue-900"
                  }`}
                >
                  {allocationValidation.isValid
                    ? "Guest Allocation Complete"
                    : "Guest Allocation Required"}
                </h4>
                <p
                  className={`text-xs ${
                    allocationValidation.isValid
                      ? "text-green-700"
                      : "text-blue-700"
                  }`}
                >
                  {allocationValidation.isValid
                    ? `Your ${peopleCount} guests are properly distributed. Only selected tables can be modified.`
                    : `You have multiple tables selected. Please distribute your ${peopleCount} guests.`}
                </p>
              </div>
            </div>
            <div className="flex flex-shrink-0 flex-wrap items-center gap-2 sm:justify-end">
              {allocationValidation.isValid ? (
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Allocated
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-orange-300 text-orange-700 whitespace-nowrap"
                >
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Needs Setup
                </Badge>
              )}
              <Button
                onClick={() => setShowAllocationModal(true)}
                size="sm"
                variant="outline"
                className="shrink-0 text-blue-700 border-blue-300 hover:bg-blue-100"
              >
                <Settings className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="whitespace-nowrap">Manage Seating</span>
              </Button>
            </div>
          </div>

          {/* Show allocation errors if any */}
          {!allocationValidation.isValid &&
            allocationValidation.errors.length > 0 && (
              <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
                <ul className="space-y-1">
                  {allocationValidation.errors
                    .slice(0, 2)
                    .map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  {allocationValidation.errors.length > 2 && (
                    <li>
                      • And {allocationValidation.errors.length - 2} more
                      issues...
                    </li>
                  )}
                </ul>
              </div>
            )}
        </div>
      )}

      {/* Information message when allocation is complete */}
      {isAllocationComplete && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">Table Selection Locked</p>
              <p className="text-xs mt-1">
                Guest allocation is complete. You can only modify quantities of
                already selected tables. To select different tables, please
                update your allocation first.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Separate eligible and ineligible tables */}
      {(() => {
        const eligibleRecommended = recommended.filter((rec) =>
          isTableEligible(rec.table)
        );
        const eligibleOther = otherOptions.filter((rec) =>
          isTableEligible(rec.table)
        );
        const ineligibleOther = otherOptions.filter(
          (rec) => !isTableEligible(rec.table)
        );

        const hasEligibleTables = eligibleRecommended.length > 0;
        const allOtherOptions = [...eligibleOther, ...ineligibleOther];

        if (hasEligibleTables) {
          return (
            <div className="space-y-4">
              {/* Eligible Tables */}
              <div className="grid grid-cols-1 gap-3">
                {eligibleRecommended.map((rec, index) => {
                  const validationMsg = getTableValidationMessage(rec.table);
                  const isDisabled = isTableDisabled(rec.table);
                  const isSelected = getTotalQuantity(rec.table.id) > 0;

                  return (
                    <div
                      key={`${rec.table.id}-${index}`}
                      className={`border rounded-lg ${
                        isDisabled
                          ? "opacity-60 bg-gray-50"
                          : "hover:bg-gray-50"
                      } ${
                        index === 0 && !isDisabled
                          ? "border-green-200 bg-green-50"
                          : ""
                      } ${
                        isSelected ? "ring-2 ring-blue-200 bg-blue-50/30" : ""
                      } ${isDisabled ? "cursor-not-allowed" : ""}`}
                    >
                      <div className="flex items-center justify-between p-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-900">
                              {rec.table.title}
                            </h4>
                            {index === 0 && (
                              <Badge className="text-xs bg-green-100 text-green-800 border-green-200">
                                <Star className="h-3 w-3 mr-1" />
                                Best
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {rec.recommendation}
                          </p>
                          <div className="flex gap-4 text-xs text-gray-500">
                            <span>
                              £{getCostPerPerson(rec, peopleCount).toFixed(0)}
                              /person
                            </span>
                            {rec.tablesNeeded > 1 && (
                              <span>{rec.tablesNeeded} tables</span>
                            )}
                          </div>
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
                      {(validationMsg ||
                        getTableQuantityLimitMessage(rec.table) ||
                        getIncrementDisabledReason(rec.table)) && (
                        <div className="px-4 pb-3">
                          <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 p-2 rounded">
                            <Info className="h-3 w-3 flex-shrink-0" />
                            <span>
                              {validationMsg ||
                                getTableQuantityLimitMessage(rec.table) ||
                                getIncrementDisabledReason(rec.table)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Other Options - Show if there are any */}
              {allOtherOptions.length > 0 && (
                <div>
                  <Button
                    variant="ghost"
                    onClick={() => setShowAllOptions(!showAllOptions)}
                    className="w-full justify-between text-gray-600 hover:text-gray-900 h-10"
                  >
                    <span className="text-sm">
                      View {allOtherOptions.length} more option
                      {allOtherOptions.length > 1 ? "s" : ""}
                    </span>
                    {showAllOptions ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>

                  <AnimatePresence>
                    {showAllOptions && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="grid gap-3 mt-3"
                      >
                        {allOtherOptions.map((rec, index) => {
                          const isEligible = isTableEligible(rec.table);
                          const isDisabled = isTableDisabled(rec.table);
                          const isSelected = getTotalQuantity(rec.table.id) > 0;
                          const validationMsg = getTableValidationMessage(
                            rec.table
                          );

                          return (
                            <div
                              key={`${rec.table.id}-other-${index}`}
                              className={`border rounded-lg ${
                                isDisabled
                                  ? "opacity-60 bg-gray-50 cursor-not-allowed"
                                  : "hover:bg-gray-50"
                              } ${
                                isSelected
                                  ? "ring-2 ring-blue-200 bg-blue-50/30"
                                  : ""
                              } ${
                                !isEligible && !isDisabled ? "opacity-75" : ""
                              }`}
                            >
                              <div className="flex items-center justify-between p-4">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-gray-900 mb-1">
                                    {rec.table.title}
                                  </h4>
                                  <p className="text-sm text-gray-600 mb-2">
                                    {rec.recommendation}
                                  </p>
                                  <div className="flex gap-4 text-xs text-gray-500">
                                    <span>
                                      £{rec.totalCost.toLocaleString()}
                                    </span>
                                    <span>
                                      £
                                      {getCostPerPerson(
                                        rec,
                                        peopleCount
                                      ).toFixed(0)}
                                      /person
                                    </span>
                                    {rec.tablesNeeded > 1 && (
                                      <span>{rec.tablesNeeded} tables</span>
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
                              {(validationMsg ||
                                getTableQuantityLimitMessage(rec.table) ||
                                getIncrementDisabledReason(rec.table)) && (
                                <div className="px-4 pb-3">
                                  <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 p-2 rounded">
                                    <Info className="h-3 w-3 flex-shrink-0" />
                                    <span>
                                      {validationMsg ||
                                        getTableQuantityLimitMessage(
                                          rec.table
                                        ) ||
                                        getIncrementDisabledReason(rec.table)}
                                    </span>
                                  </div>
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
            <div className="space-y-4">
              <div className="text-center py-6 bg-orange-50 rounded-lg border border-orange-200">
                <AlertCircle className="h-8 w-8 text-orange-500 mx-auto mb-3" />
                <h3 className="font-medium text-orange-900 mb-2">
                  Sorry, we haven&apos;t yet available tables for {peopleCount}{" "}
                  people
                </h3>
                <p className="text-sm text-orange-700 mb-3">
                  Kindly contact with support so they can arrange
                </p>
                <div className="flex items-center justify-center gap-4 text-xs text-orange-600">
                  <span>📧 support@eventwizz.com</span>
                  <span>📞 +44 20 1234 5678</span>
                </div>
              </div>

              {/* Show all tables as view-only */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  Available tables (may require special arrangement):
                </h3>
                <div className="grid gap-3">
                  {[...recommended, ...otherOptions].map((rec, index) => (
                    <div
                      key={`${rec.table.id}-alt-${index}`}
                      className="border rounded-lg opacity-75"
                    >
                      <div className="flex items-center justify-between p-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 mb-1">
                            {rec.table.title}
                          </h4>
                          <p className="text-sm text-gray-600 mb-2">
                            {rec.recommendation}
                          </p>
                          <div className="flex gap-4 text-xs text-gray-500">
                            <span>
                              £{getCostPerPerson(rec, peopleCount).toFixed(0)}
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
