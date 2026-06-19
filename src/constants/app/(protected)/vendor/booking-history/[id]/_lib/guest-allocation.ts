/**
 * Guest Allocation Utilities for Add-ons
 */

export interface TableAllocationData {
  tableId: string | number;
  title: string;
  minPersons: number;
  maxPersons: number;
  quantity: number;
  allocation: number[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  totalAllocated: number;
  totalRequired: number;
}

/**
 * Auto-arrange guests across tables
 * Distributes guests evenly across all tables, respecting min/max constraints
 */
export function autoArrangeGuests(
  tables: Array<{
    id: string | number;
    title: string;
    minPersons: number;
    maxPersons: number;
    quantity: number;
  }>,
  totalGuests: number
): Record<string | number, number[]> {
  const allocations: Record<string | number, number[]> = {};

  if (totalGuests <= 0 || tables.length === 0) {
    // Initialize all tables with minimum capacity
    tables.forEach((table) => {
      allocations[table.id] = Array(table.quantity).fill(table.minPersons || 1);
    });
    return allocations;
  }

  // Calculate minimum required guests (all tables at min capacity)
  const minRequired = tables.reduce(
    (sum, table) => sum + table.quantity * (table.minPersons || 1),
    0
  );

  // If we don't have enough guests for minimum, distribute what we have evenly
  if (totalGuests < minRequired) {
    // Distribute guests evenly across tables, allowing 0 when necessary
    let remaining = totalGuests;
    const allTableSlots: Array<{
      tableId: string | number;
      tableIndex: number;
      minPersons: number;
      maxPersons: number;
    }> = [];

    tables.forEach((table) => {
      for (let i = 0; i < table.quantity; i++) {
        allTableSlots.push({
          tableId: table.id,
          tableIndex: i,
          minPersons: table.minPersons || 1,
          maxPersons: table.maxPersons || 999,
        });
      }
    });

    // Initialize all allocations
    tables.forEach((table) => {
      allocations[table.id] = Array(table.quantity).fill(0);
    });

    // Distribute guests evenly, one per table until we run out
    allTableSlots.forEach((slot) => {
      if (remaining > 0) {
        allocations[slot.tableId][slot.tableIndex] = Math.min(
          slot.maxPersons,
          Math.max(slot.minPersons, 1)
        );
        remaining -= allocations[slot.tableId][slot.tableIndex];
      }
    });

    return allocations;
  }

  // We have enough guests - distribute evenly
  // First, fill all tables to minimum
  tables.forEach((table) => {
    allocations[table.id] = Array(table.quantity).fill(table.minPersons || 1);
  });

  // Calculate remaining guests after minimum allocation
  let remainingGuests = totalGuests - minRequired;

  if (remainingGuests <= 0) {
    return allocations;
  }

  // Distribute remaining guests evenly across all tables
  // Create a flat list of all table slots for even distribution
  const allSlots: Array<{
    tableId: string | number;
    tableIndex: number;
    maxPersons: number;
    currentAllocation: number;
  }> = [];

  tables.forEach((table) => {
    for (let i = 0; i < table.quantity; i++) {
      allSlots.push({
        tableId: table.id,
        tableIndex: i,
        maxPersons: table.maxPersons || 999,
        currentAllocation: allocations[table.id][i],
      });
    }
  });

  // Distribute remaining guests evenly, one at a time
  let slotIndex = 0;
  while (remainingGuests > 0 && allSlots.length > 0) {
    const slot = allSlots[slotIndex % allSlots.length];
    const currentValue = allocations[slot.tableId][slot.tableIndex];

    // Check if this slot can take more guests
    if (currentValue < slot.maxPersons) {
      allocations[slot.tableId][slot.tableIndex] = currentValue + 1;
      remainingGuests--;
    } else {
      // This slot is at max capacity, remove it from rotation
      allSlots.splice(slotIndex % allSlots.length, 1);
      if (allSlots.length === 0) break;
      continue; // Don't increment slotIndex, try again with same index
    }

    slotIndex++;
  }

  // Final verification: ensure total never exceeds totalGuests
  let finalTotal = 0;
  Object.values(allocations).forEach((allocation) => {
    finalTotal += allocation.reduce((sum, count) => sum + count, 0);
  });

  // If somehow we exceeded, reduce from the end
  if (finalTotal > totalGuests) {
    const difference = finalTotal - totalGuests;
    let toReduce = difference;

    // Reduce from tables in reverse order
    for (let i = tables.length - 1; i >= 0 && toReduce > 0; i--) {
      const table = tables[i];
      const allocation = allocations[table.id];

      for (let j = allocation.length - 1; j >= 0 && toReduce > 0; j--) {
        const currentValue = allocation[j];
        const minValue = table.minPersons || 1;
        const reduction = Math.min(currentValue - minValue, toReduce);

        if (reduction > 0) {
          allocation[j] = currentValue - reduction;
          toReduce -= reduction;
        }
      }
    }
  }

  return allocations;
}

/**
 * Validate guest allocation
 */
export function validateAllocation(
  tableData: TableAllocationData[],
  totalGuests: number
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Calculate total allocated guests
  let totalAllocated = 0;
  tableData.forEach((table) => {
    const allocated = table.allocation.reduce((sum, count) => sum + count, 0);
    totalAllocated += allocated;

    // Check each table allocation
    table.allocation.forEach((guestCount, index) => {
      if (guestCount < table.minPersons && guestCount > 0) {
        errors.push(
          `${table.title} (Table ${index + 1}): Needs at least ${
            table.minPersons
          } guests, has ${guestCount}`
        );
      }

      if (guestCount > table.maxPersons) {
        errors.push(
          `${table.title} (Table ${index + 1}): Exceeds capacity of ${
            table.maxPersons
          }, has ${guestCount}`
        );
      }
    });
  });

  // Check total allocation
  if (totalAllocated < totalGuests) {
    errors.push(
      `${totalGuests - totalAllocated} guests not allocated to any table`
    );
  } else if (totalAllocated > totalGuests) {
    errors.push(
      `Over-allocated: ${totalAllocated - totalGuests} extra guests assigned`
    );
  }

  // Warnings for empty tables
  tableData.forEach((table) => {
    const emptyTables = table.allocation.filter((count) => count === 0).length;
    if (emptyTables > 0 && emptyTables < table.quantity) {
      warnings.push(`${table.title} has ${emptyTables} empty table(s)`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    totalAllocated,
    totalRequired: totalGuests,
  };
}

/**
 * Generate allocation summary
 */
export function generateAllocationSummary(
  tableData: TableAllocationData[]
): string {
  let summary = "";

  tableData.forEach((table) => {
    const totalGuests = table.allocation.reduce((sum, count) => sum + count, 0);
    if (totalGuests > 0) {
      summary += `${table.title}: ${totalGuests} guests across ${table.quantity} table(s)\n`;
    }
  });

  return summary;
}
