"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, AlertCircle, ChevronDown, ChevronUp, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import QuantityControls from "./quantity-controls-checkout";
import { AvailableTableSize, NewTableState } from "./types";
import {
  generateTableRecommendations,
  getCostPerPerson,
} from "../../_lib/table-recommendations";

interface NewTablesSectionProps {
  peopleForNewTables: number;
  availableTableSizes: AvailableTableSize[];
  newTables: Record<string, NewTableState>;
  totalAvailableSeats: number;
  allocationValid: boolean;
  onAddNewTable: (tableSizeId: number, delta: number) => void;
  setNewTables: React.Dispatch<
    React.SetStateAction<Record<string, NewTableState>>
  >;
}

export function NewTablesSection({
  peopleForNewTables,
  availableTableSizes,
  newTables,
  totalAvailableSeats,
  allocationValid,
  onAddNewTable,
  setNewTables,
}: NewTablesSectionProps) {
  const [showAllOptions, setShowAllOptions] = useState(false);

  if (peopleForNewTables === 0) {
    return null;
  }

  // Always use peopleForNewTables for recommendations
  // This ensures we suggest tables for the REMAINING people after existing table allocations
  const peopleForRecommendations = peopleForNewTables;

  const { recommended, otherOptions } = generateTableRecommendations(
    availableTableSizes,
    peopleForRecommendations
  );

  // Check if a table should be disabled from selection
  // Tables should only be locked when:
  // 1. Multiple tables are selected (needs allocation)
  // 2. AND allocation is complete and valid
  const isTableDisabled = (tableId: number) => {
    // Only lock if allocation is valid AND we have multiple tables selected
    const totalSelectedTables = Object.values(newTables).reduce(
      (sum, table) => sum + table.quantity,
      0
    );
    const hasMultipleTables = totalSelectedTables > 1;

    // If no multiple tables or allocation not valid, don't lock
    if (!hasMultipleTables || !allocationValid) {
      return false;
    }

    // If allocation is complete with multiple tables, only allow changes to already selected tables
    const isAlreadySelected = newTables[`size-${tableId}`]?.quantity > 0;
    return !isAlreadySelected;
  };

  // Helper function to check if table is eligible for current people count
  const isTableEligible = (table: AvailableTableSize) => {
    // Table is eligible if people count meets the minimum requirement
    return peopleForRecommendations >= table.min_persons;
  };

  // Helper function to get validation message for table
  const getTableValidationMessage = (table: AvailableTableSize) => {
    if (peopleForRecommendations < table.min_persons) {
      const needed = table.min_persons - peopleForRecommendations;
      return `You need ${needed} more people to book this table`;
    }
    return null;
  };

  // Get total quantity for a table
  const getTotalQuantity = (tableId: number) => {
    return newTables[`size-${tableId}`]?.quantity || 0;
  };

  // Check if user can increase table quantity
  const canIncreaseTableQuantity = (table: AvailableTableSize) => {
    const currentQuantity = getTotalQuantity(table.id);

    // First check: Do we have enough people to meet the minimum requirement?
    const hasEnoughPeople = peopleForRecommendations >= table.min_persons;

    if (!hasEnoughPeople) {
      return false;
    }

    // Calculate total capacity if we add one more table
    const totalCapacityAfterIncrease =
      (currentQuantity + 1) * table.min_persons;

    // Don't allow if it would exceed people count by more than 20%
    const wouldExceedReasonableCapacity =
      totalCapacityAfterIncrease > peopleForRecommendations * 1.2;

    // Check if remaining people can be accommodated by adding more tables
    const remainingPeople =
      peopleForRecommendations - currentQuantity * table.max_persons;

    // Calculate minimum tables needed to accommodate remaining people
    const minTablesNeeded = Math.ceil(remainingPeople / table.max_persons);
    const maxTablesNeeded = Math.ceil(remainingPeople / table.min_persons);

    // Check if we can accommodate remaining people with reasonable number of tables
    const canAccommodateRemaining =
      remainingPeople > 0 &&
      minTablesNeeded <= 50 &&
      minTablesNeeded <= maxTablesNeeded;

    return !wouldExceedReasonableCapacity && canAccommodateRemaining;
  };

  if (recommended.length === 0) {
    return (
      <div className="space-y-3">
        {totalAvailableSeats > 0 && <div className="h-px bg-gray-200" />}
        <div className="py-6 px-4 bg-orange-50 rounded-lg border border-orange-200 overflow-visible">
          <AlertCircle className="h-8 w-8 text-orange-500 mx-auto mb-3" />
          <h3 className="font-medium text-orange-900 mb-2 text-center break-words">
            No available tables for {peopleForNewTables} more people
          </h3>
          <p className="text-sm text-orange-700 text-center break-words min-w-0">
            Add more table configurations through your event management settings
            to accommodate additional guests.
          </p>
        </div>
      </div>
    );
  }

  // Check if user is using existing tables
  const isUsingExistingTables = totalAvailableSeats > 0;

  // Separate eligible and ineligible tables
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

  return (
    <div className="space-y-3">
      {isUsingExistingTables && <div className="h-px bg-gray-200" />}

      {hasEligibleTables && (
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Star className="h-4 w-4 text-green-600" />
          {isUsingExistingTables ? "Select New Tables" : "Recommended Tables"}
        </h4>
      )}

      {hasEligibleTables ? (
        <div className="space-y-4">
          {/* Eligible Tables */}
          <div className="grid grid-cols-1 gap-3 px-2">
            {eligibleRecommended.map((rec, index) => {
              const validationMsg = getTableValidationMessage(rec.table);
              const isDisabled = isTableDisabled(rec.table.id);
              const isSelected = getTotalQuantity(rec.table.id) > 0;

              return (
                <div
                  key={`${rec.table.id}-${index}`}
                  className={`border rounded-lg ${
                    isDisabled ? "opacity-60 bg-gray-50" : "hover:bg-gray-50"
                  } ${
                    index === 0 && !isDisabled
                      ? "border-green-200 bg-green-50"
                      : ""
                  } ${isSelected ? "ring-2 ring-blue-200 bg-blue-50/30" : ""} ${
                    isDisabled ? "cursor-not-allowed" : ""
                  }`}
                >
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900 break-words">
                          Table for {rec.table.size} ({rec.table.min_persons}-
                          {rec.table.max_persons} persons)
                        </h4>
                        {index === 0 && (
                          <Badge className="shrink-0 text-xs bg-green-100 text-green-800 border-green-200">
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
                          £
                          {getCostPerPerson(
                            rec,
                            peopleForRecommendations
                          ).toFixed(0)}
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
                        maxQuantity={rec.table.available}
                        onIncrease={() => {
                          if (canIncreaseTableQuantity(rec.table)) {
                            onAddNewTable(rec.table.id, 1);
                          }
                        }}
                        onDecrease={() => onAddNewTable(rec.table.id, -1)}
                        onRemove={() => {
                          setNewTables((prev) => {
                            const updated = { ...prev };
                            delete updated[`size-${rec.table.id}`];
                            return updated;
                          });
                        }}
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
                    <div className="px-4 pb-3">
                      <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 p-2 rounded">
                        <Info className="h-3 w-3 flex-shrink-0" />
                        <span>{validationMsg}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Other Options */}
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
                      const isDisabled = isTableDisabled(rec.table.id);
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
                          } ${!isEligible && !isDisabled ? "opacity-75" : ""}`}
                        >
                          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0 flex-1">
                              <h4 className="font-medium text-gray-900 mb-1 break-words">
                                Table for {rec.table.size} (
                                {rec.table.min_persons}-{rec.table.max_persons}{" "}
                                persons)
                              </h4>
                              <p className="text-sm text-gray-600 mb-2">
                                {rec.recommendation}
                              </p>
                              <div className="flex gap-4 text-xs text-gray-500">
                                <span>£{rec.totalCost.toLocaleString()}</span>
                                <span>
                                  £
                                  {getCostPerPerson(
                                    rec,
                                    peopleForRecommendations
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
                                maxQuantity={rec.table.available}
                                onIncrease={() => {
                                  if (canIncreaseTableQuantity(rec.table)) {
                                    onAddNewTable(rec.table.id, 1);
                                  }
                                }}
                                onDecrease={() =>
                                  onAddNewTable(rec.table.id, -1)
                                }
                                onRemove={() => {
                                  setNewTables((prev) => {
                                    const updated = { ...prev };
                                    delete updated[`size-${rec.table.id}`];
                                    return updated;
                                  });
                                }}
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
                            <div className="px-4 pb-3">
                              <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 p-2 rounded">
                                <Info className="h-3 w-3 flex-shrink-0" />
                                <span>{validationMsg}</span>
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
      ) : (
        <div className="py-6 px-4 bg-orange-50 rounded-lg border border-orange-200 overflow-visible">
          <AlertCircle className="h-8 w-8 text-orange-500 mx-auto mb-3" />
          <h3 className="font-medium text-orange-900 mb-2 text-center break-words">
            Sorry, we haven&apos;t yet available tables for{" "}
            {peopleForRecommendations} people
          </h3>
          <p className="text-sm text-orange-700 text-center break-words min-w-0">
            Kindly contact with support so they can arrange tables for you.
          </p>
        </div>
      )}
    </div>
  );
}
