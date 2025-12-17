/**
 * Professional Guest Allocation Utilities
 * Auto-arrangement algorithms and validation logic
 */

export interface TableAllocationData {
  tableId: number;
  title: string;
  minPersons: number;
  maxPersons: number;
  quantity: number;
  allocation: number[];
}

export interface AllocationResult {
  isValid: boolean;
  totalAllocated: number;
  totalRequired: number;
  errors: string[];
  suggestions?: string[];
}

/**
 * Auto-arrange guests across tables optimally
 * Distributes guests as evenly as possible while respecting min/max constraints
 */
export function autoArrangeGuests(
  tables: Array<{
    id: number;
    title: string;
    minPersons: number;
    maxPersons: number;
    quantity: number;
  }>,
  totalGuests: number
): Record<number, number[]> {
  const result: Record<number, number[]> = {};

  if (totalGuests <= 0 || tables.length === 0) {
    return result;
  }

  // Create array of all individual tables with their constraints
  const allTables: Array<{
    tableId: number;
    minPersons: number;
    maxPersons: number;
    index: number; // Index within the table type
  }> = [];

  tables.forEach((table) => {
    for (let i = 0; i < table.quantity; i++) {
      allTables.push({
        tableId: table.id,
        minPersons: table.minPersons,
        maxPersons: table.maxPersons,
        index: i,
      });
    }
  });

  if (allTables.length === 0) {
    return result;
  }

  // Initialize result structure
  tables.forEach((table) => {
    result[table.id] = Array(table.quantity).fill(table.minPersons);
  });

  // Calculate minimum required guests
  const minRequired = allTables.reduce(
    (sum, table) => sum + table.minPersons,
    0
  );

  if (totalGuests < minRequired) {
    // Not enough guests - distribute what we have proportionally
    let remaining = totalGuests;
    allTables.forEach((table) => {
      const allocation = Math.min(remaining, table.minPersons);
      const tableIndex = tables.findIndex((t) => t.id === table.tableId);
      if (tableIndex >= 0) {
        result[table.tableId][table.index] = allocation;
      }
      remaining -= allocation;
    });
    return result;
  }

  // Distribute remaining guests after minimum allocation
  let remaining = totalGuests - minRequired;

  // Sort tables by available capacity (max - min) descending
  const sortedTables = [...allTables].sort(
    (a, b) => b.maxPersons - b.minPersons - (a.maxPersons - a.minPersons)
  );

  // Distribute remaining guests
  while (remaining > 0 && sortedTables.length > 0) {
    let distributed = false;

    for (const table of sortedTables) {
      const currentAllocation = result[table.tableId][table.index];

      if (currentAllocation < table.maxPersons && remaining > 0) {
        result[table.tableId][table.index]++;
        remaining--;
        distributed = true;
      }
    }

    // If we couldn't distribute any guests in this round, break to avoid infinite loop
    if (!distributed) {
      break;
    }
  }

  return result;
}

/**
 * Validate guest allocation for all tables
 */
export function validateAllocation(
  tables: TableAllocationData[],
  totalGuests: number
): AllocationResult {
  const errors: string[] = [];
  const suggestions: string[] = [];
  let totalAllocated = 0;

  // Validate each table
  tables.forEach((table) => {
    if (!table.allocation || table.allocation.length !== table.quantity) {
      errors.push(
        `${table.title} needs allocation for ${table.quantity} table${
          table.quantity > 1 ? "s" : ""
        }`
      );
      return;
    }

    table.allocation.forEach((guestCount, index) => {
      if (guestCount < table.minPersons) {
        errors.push(
          `${table.title} Table ${index + 1}: minimum ${
            table.minPersons
          } guests required (currently ${guestCount})`
        );
      }
      if (guestCount > table.maxPersons) {
        errors.push(
          `${table.title} Table ${index + 1}: maximum ${
            table.maxPersons
          } guests allowed (currently ${guestCount})`
        );
      }
      totalAllocated += guestCount;
    });
  });

  // Check total allocation
  if (totalAllocated !== totalGuests) {
    const difference = totalGuests - totalAllocated;
    if (difference > 0) {
      errors.push(
        `${difference} more guest${
          difference > 1 ? "s" : ""
        } need to be allocated`
      );
      suggestions.push(
        `Try using the "Auto Arrange" button to distribute guests automatically`
      );
    } else {
      errors.push(`${Math.abs(difference)} too many guests allocated`);
      suggestions.push(`Reduce guest count in some tables`);
    }
  }

  return {
    isValid: errors.length === 0,
    totalAllocated,
    totalRequired: totalGuests,
    errors,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
  };
}

/**
 * Calculate optimal distribution statistics
 */
export function calculateDistributionStats(
  allocation: Record<number, number[]>
) {
  const allAllocations = Object.values(allocation).flat();

  if (allAllocations.length === 0) {
    return {
      total: 0,
      average: 0,
      min: 0,
      max: 0,
      variance: 0,
    };
  }

  const total = allAllocations.reduce((sum, count) => sum + count, 0);
  const average = total / allAllocations.length;
  const min = Math.min(...allAllocations);
  const max = Math.max(...allAllocations);

  // Calculate variance for distribution quality
  const variance =
    allAllocations.reduce(
      (sum, count) => sum + Math.pow(count - average, 2),
      0
    ) / allAllocations.length;

  return {
    total,
    average: Math.round(average * 100) / 100,
    min,
    max,
    variance: Math.round(variance * 100) / 100,
  };
}

/**
 * Generate human-readable allocation summary
 */
export function generateAllocationSummary(
  tables: TableAllocationData[],
  totalGuests: number
): string[] {
  const summary: string[] = [];

  summary.push(`Total: ${totalGuests} guests`);

  tables.forEach((table) => {
    if (table.allocation && table.allocation.length > 0) {
      const allocatedGuests = table.allocation.reduce(
        (sum, count) => sum + count,
        0
      );
      if (table.quantity === 1) {
        summary.push(`- ${table.title}: ${allocatedGuests} guests`);
      } else {
        const guestCounts = table.allocation.join(", ");
        summary.push(
          `- ${table.title} (${table.quantity} tables): ${guestCounts} guests`
        );
      }
    }
  });

  return summary;
}

/**
 * Check if allocation can be improved
 */
export function suggestImprovements(tables: TableAllocationData[]): string[] {
  const suggestions: string[] = [];
  const stats = calculateDistributionStats(
    tables.reduce((acc, table) => {
      acc[table.tableId] = table.allocation || [];
      return acc;
    }, {} as Record<number, number[]>)
  );

  // Check for very uneven distribution
  if (stats.variance > 4) {
    suggestions.push(
      "Consider redistributing guests more evenly across tables"
    );
  }

  // Check for underutilized tables
  tables.forEach((table) => {
    if (table.allocation) {
      table.allocation.forEach((guestCount, index) => {
        const utilizationPercent = (guestCount / table.maxPersons) * 100;
        if (utilizationPercent < 60 && guestCount > table.minPersons) {
          suggestions.push(
            `${table.title} Table ${index + 1} is only ${Math.round(
              utilizationPercent
            )}% full`
          );
        }
      });
    }
  });

  return suggestions;
}
