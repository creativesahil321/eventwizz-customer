/**
 * Shared hook for managing guest allocation input fields
 * Handles raw input values and numeric allocations for better UX
 * Supports both simple and existing table scenarios
 */

import { useState, useCallback } from "react";

interface TableConfig {
  id: number;
  minPersons: number;
  maxPersons: number;
}

interface ExistingTableConfig extends TableConfig {
  currentAllocation?: number[];
}

interface UseGuestAllocationInputOptions {
  tables: TableConfig[];
  existingTables?: ExistingTableConfig[];
  setAllocations: React.Dispatch<
    React.SetStateAction<Record<number, number[]>>
  >;
}

interface UseGuestAllocationInputReturn {
  inputValues: Record<string, string>;
  setInputValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  updateTableAllocation: (
    tableId: number,
    tableIndex: number,
    value: string
  ) => void;
  handleInputBlur: (
    tableId: number,
    tableIndex: number,
    table: TableConfig
  ) => void;
  syncInputValuesFromAllocations: (
    newAllocations: Record<number, number[]>
  ) => void;
}

/**
 * Hook to manage guest allocation input fields with support for clearing/editing
 *
 * @param options Configuration options including tables, allocations state
 * @returns Input management functions and state
 */
export function useGuestAllocationInput({
  tables,
  existingTables,
  setAllocations,
}: UseGuestAllocationInputOptions): UseGuestAllocationInputReturn {
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  /**
   * Get the minimum value for a table at a specific index
   * Handles existing tables (can't go below current allocation) vs new tables
   */
  const getMinValue = useCallback(
    (tableId: number, tableIndex: number, table: TableConfig): number => {
      if (existingTables) {
        const existingTable = existingTables.find((t) => t.id === tableId);
        const currentAllocation = existingTable?.currentAllocation || [];
        const isExistingTable = currentAllocation.length > 0;

        if (isExistingTable && currentAllocation[tableIndex] !== undefined) {
          // Can't go below current allocation for existing tables
          return currentAllocation[tableIndex];
        }
      }
      // For new tables, use minPersons
      return table.minPersons || 1;
    },
    [existingTables]
  );

  /**
   * Update table allocation when user types
   * Stores raw input value immediately to allow clearing
   */
  const updateTableAllocation = useCallback(
    (tableId: number, tableIndex: number, value: string) => {
      const inputKey = `${tableId}-${tableIndex}`;

      // Store raw input value (allows empty string for clearing)
      setInputValues((prev) => ({
        ...prev,
        [inputKey]: value,
      }));

      // Only update numeric allocation if value is a valid number
      if (value === "" || value === "-") {
        // Allow empty during editing, don't update numeric state yet
        return;
      }

      const numValue = parseInt(value);
      if (isNaN(numValue) || numValue < 0) {
        return;
      }

      const table = tables.find((t) => t.id === tableId);
      if (!table) return;

      const minValue = getMinValue(tableId, tableIndex, table);

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
    },
    [tables, getMinValue, setAllocations]
  );

  /**
   * Normalize input value on blur
   * Sets to minimum if empty, validates and clamps to min/max
   */
  const handleInputBlur = useCallback(
    (tableId: number, tableIndex: number, table: TableConfig) => {
      const inputKey = `${tableId}-${tableIndex}`;
      const minValue = getMinValue(tableId, tableIndex, table);

      // Get current input value from state
      setInputValues((prev) => {
        const rawValue = prev[inputKey];

        // If empty or invalid, set to minimum
        if (!rawValue || rawValue === "" || rawValue === "-") {
          setAllocations((prev) => {
            const newAllocations = { ...prev };
            if (!newAllocations[tableId]) {
              newAllocations[tableId] = [];
            }
            newAllocations[tableId] = [...newAllocations[tableId]];
            newAllocations[tableId][tableIndex] = minValue;
            return newAllocations;
          });
          return {
            ...prev,
            [inputKey]: minValue.toString(),
          };
        }

        // Validate and clamp to min/max
        const numValue = parseInt(rawValue);
        if (isNaN(numValue) || numValue < minValue) {
          const finalValue = minValue;
          setAllocations((prev) => {
            const newAllocations = { ...prev };
            if (!newAllocations[tableId]) {
              newAllocations[tableId] = [];
            }
            newAllocations[tableId] = [...newAllocations[tableId]];
            newAllocations[tableId][tableIndex] = finalValue;
            return newAllocations;
          });
          return {
            ...prev,
            [inputKey]: finalValue.toString(),
          };
        } else if (numValue > (table.maxPersons || 999)) {
          const finalValue = table.maxPersons || 999;
          setAllocations((prev) => {
            const newAllocations = { ...prev };
            if (!newAllocations[tableId]) {
              newAllocations[tableId] = [];
            }
            newAllocations[tableId] = [...newAllocations[tableId]];
            newAllocations[tableId][tableIndex] = finalValue;
            return newAllocations;
          });
          return {
            ...prev,
            [inputKey]: finalValue.toString(),
          };
        }

        // No change needed
        return prev;
      });
    },
    [getMinValue, setAllocations]
  );

  /**
   * Sync input values from allocations (used when auto-arranging or resetting)
   */
  const syncInputValuesFromAllocations = useCallback(
    (newAllocations: Record<number, number[]>) => {
      const newInputValues: Record<string, string> = {};
      Object.entries(newAllocations).forEach(([tableId, allocation]) => {
        allocation.forEach((value, index) => {
          newInputValues[`${tableId}-${index}`] = value.toString();
        });
      });
      setInputValues(newInputValues);
    },
    []
  );

  return {
    inputValues,
    setInputValues,
    updateTableAllocation,
    handleInputBlur,
    syncInputValuesFromAllocations,
  };
}
