/**
 * Table Recommendation System for Add-ons
 * AI-powered suggestions based on available capacity
 */

export interface TableData {
  id: string;
  capacity: number;
  table_count: number;
  allocation: number[];
  people_added: number;
}

export interface AvailableTableSize {
  id: number;
  size: number;
  min_persons: number;
  max_persons: number;
  price: number;
  available: number;
}

export interface TableRecommendation {
  table: AvailableTableSize;
  fit: "perfect" | "good" | "oversized" | "multiple";
  totalCost: number;
  tablesNeeded: number;
  wastedSeats: number;
  recommendation: string;
  priority: number;
}

export interface RecommendationResult {
  recommended: TableRecommendation[];
  otherOptions: TableRecommendation[];
  hasRecommendations: boolean;
}

/**
 * Generate table recommendations for additional people
 */
export function generateTableRecommendations(
  availableTables: AvailableTableSize[],
  additionalPeople: number
): RecommendationResult {
  if (additionalPeople <= 0 || availableTables.length === 0) {
    return {
      recommended: [],
      otherOptions: [],
      hasRecommendations: false,
    };
  }

  const recommendations: TableRecommendation[] = [];

  availableTables.forEach((table) => {
    if (table.available <= 0) return;

    const recommendation = calculateTableRecommendation(
      table,
      additionalPeople
    );

    if (recommendation) {
      recommendations.push(recommendation);
    }
  });

  recommendations.sort((a, b) => a.priority - b.priority);

  const recommended = recommendations.slice(0, 3);
  const otherOptions = recommendations.slice(3);

  return {
    recommended,
    otherOptions,
    hasRecommendations: recommendations.length > 0,
  };
}

function calculateTableRecommendation(
  table: AvailableTableSize,
  peopleCount: number
): TableRecommendation | null {
  const { min_persons, max_persons } = table;
  // Ensure price is a valid number
  const price = isNaN(table.price) || table.price < 0 ? 0 : table.price;

  // Perfect fit
  if (peopleCount >= min_persons && peopleCount <= max_persons) {
    const wastedSeats = max_persons - peopleCount;
    const totalCost = price * peopleCount;

    return {
      table,
      fit: "perfect",
      totalCost,
      tablesNeeded: 1,
      wastedSeats,
      recommendation:
        wastedSeats === 0
          ? `Perfect fit for ${peopleCount} people`
          : `Great fit - ${wastedSeats} extra seat${
              wastedSeats > 1 ? "s" : ""
            }`,
      priority: wastedSeats,
    };
  }

  // Multiple tables needed
  if (peopleCount > max_persons) {
    const tablesNeeded = Math.ceil(peopleCount / max_persons);
    const totalCapacity = tablesNeeded * max_persons;
    const wastedSeats = totalCapacity - peopleCount;
    const totalCost = price * peopleCount;

    if (tablesNeeded > table.available) {
      return null;
    }

    return {
      table,
      fit: "multiple",
      totalCost,
      tablesNeeded,
      wastedSeats,
      recommendation:
        wastedSeats === 0
          ? `Perfect fit - ${tablesNeeded} tables needed`
          : `Good option - ${tablesNeeded} tables (${wastedSeats} extra seats)`,
      priority: 100 + wastedSeats,
    };
  }

  // Oversized table
  if (peopleCount < min_persons) {
    const wastedSeats = min_persons - peopleCount;
    const totalCost = price * peopleCount;

    return {
      table,
      fit: "oversized",
      totalCost,
      tablesNeeded: 1,
      wastedSeats,
      recommendation: `Larger table - ${wastedSeats} empty seat${
        wastedSeats > 1 ? "s" : ""
      }`,
      priority: 200 + wastedSeats,
    };
  }

  return null;
}

/**
 * Calculate cost per person
 */
export function getCostPerPerson(
  rec: TableRecommendation,
  peopleCount: number
): number {
  // Safeguard against NaN and invalid values
  const validTotalCost =
    isNaN(rec.totalCost) || rec.totalCost < 0 ? 0 : rec.totalCost;
  const validPeopleCount =
    isNaN(peopleCount) || peopleCount <= 0 ? 1 : peopleCount;
  const costPerPerson = validTotalCost / validPeopleCount;
  return isNaN(costPerPerson) ? 0 : costPerPerson;
}

/**
 * Validate if user can add more people to existing tables
 */
export function canAddPeopleToTable(
  table: TableData,
  additionalPeople: number
): { canAdd: boolean; message?: string } {
  const totalCapacity = table.capacity * table.table_count;
  const usedCapacity = table.allocation.reduce((sum, p) => sum + p, 0);
  const availableSeats = totalCapacity - usedCapacity;

  if (additionalPeople > availableSeats) {
    return {
      canAdd: false,
      message: `Only ${availableSeats} seat${
        availableSeats !== 1 ? "s" : ""
      } available`,
    };
  }

  return { canAdd: true };
}
