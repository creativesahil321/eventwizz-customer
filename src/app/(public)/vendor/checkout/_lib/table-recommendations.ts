/**
 * Professional Table Recommendation System
 * Similar to airline seat selection or hotel room recommendations
 */

import { EditableItem } from "@/store/cart-edit.store";

export interface TableRecommendation {
  table: EditableItem;
  fit: "perfect" | "good" | "oversized" | "multiple";
  totalCost: number;
  tablesNeeded: number;
  wastedSeats: number;
  recommendation: string;
  priority: number; // Lower = better recommendation
}

export interface RecommendationResult {
  recommended: TableRecommendation[];
  otherOptions: TableRecommendation[];
  hasRecommendations: boolean;
}

/**
 * Generate table recommendations based on people count
 */
export function generateTableRecommendations(
  tables: EditableItem[],
  peopleCount: number
): RecommendationResult {
  if (peopleCount <= 0 || tables.length === 0) {
    return {
      recommended: [],
      otherOptions: [],
      hasRecommendations: false,
    };
  }

  const recommendations: TableRecommendation[] = [];

  // Process each table type
  tables.forEach((table) => {
    // Extract min/max persons from table data
    const { minPersons, maxPersons } = parseTableCapacity(table);

    if (minPersons === 0 && maxPersons === 0) {
      // Skip invalid table data
      return;
    }

    // Calculate recommendation for this table
    const recommendation = calculateTableRecommendation(
      table,
      peopleCount,
      minPersons,
      maxPersons
    );

    if (recommendation) {
      recommendations.push(recommendation);
    }
  });

  // Sort by priority (lower = better)
  recommendations.sort((a, b) => a.priority - b.priority);

  // Split into recommended (top 3) and other options
  const recommended = recommendations.slice(0, 3);
  const otherOptions = recommendations.slice(3);

  return {
    recommended,
    otherOptions,
    hasRecommendations: recommendations.length > 0,
  };
}

/**
 * Parse table capacity from title or description
 * Handles various formats like "Table (200-300 persons)" or API data
 */
function parseTableCapacity(table: EditableItem): {
  minPersons: number;
  maxPersons: number;
} {
  // Try to extract from title first (current format)
  const titleMatch = table.title.match(/\((\d+)-(\d+)\s+persons?\)/);
  if (titleMatch) {
    const min = parseInt(titleMatch[1]);
    const max = parseInt(titleMatch[2]);

    // Handle reversed values (412-158 should be 158-412)
    return {
      minPersons: Math.min(min, max),
      maxPersons: Math.max(min, max),
    };
  }

  // Try to extract from description
  const descMatch = table.description?.match(/(\d+)\s+to\s+(\d+)\s+people/);
  if (descMatch) {
    const min = parseInt(descMatch[1]);
    const max = parseInt(descMatch[2]);

    return {
      minPersons: Math.min(min, max),
      maxPersons: Math.max(min, max),
    };
  }

  // Default fallback - assume reasonable capacity based on price
  // Higher price = larger table capacity
  const estimatedCapacity = Math.max(4, Math.floor(table.price / 50));

  return {
    minPersons: Math.max(1, estimatedCapacity - 2),
    maxPersons: estimatedCapacity + 2,
  };
}

/**
 * Calculate recommendation for a specific table
 */
function calculateTableRecommendation(
  table: EditableItem,
  peopleCount: number,
  minPersons: number,
  maxPersons: number
): TableRecommendation | null {
  // Perfect fit - people count within table capacity
  if (peopleCount >= minPersons && peopleCount <= maxPersons) {
    const wastedSeats = maxPersons - peopleCount;
    const pricePerPerson = table.pricePerPerson || table.price;
    const totalCost = pricePerPerson * peopleCount;

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
            } available`,
      priority: wastedSeats, // Lower waste = higher priority
    };
  }

  // Multiple tables needed - people count exceeds single table capacity
  if (peopleCount > maxPersons) {
    const tablesNeeded = Math.ceil(peopleCount / maxPersons);
    const totalCapacity = tablesNeeded * maxPersons;
    const wastedSeats = totalCapacity - peopleCount;
    const pricePerPerson = table.pricePerPerson || table.price;
    const totalCost = pricePerPerson * peopleCount; // Pay for actual people, not full capacity

    // Check if we have enough tables available
    if (tablesNeeded > (table.maxQuantity || 1)) {
      return null; // Not enough tables available
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
      priority: 100 + wastedSeats, // Lower priority than perfect fits
    };
  }

  // Oversized table - people count below minimum capacity
  if (peopleCount < minPersons) {
    const wastedSeats = minPersons - peopleCount;
    const pricePerPerson = table.pricePerPerson || table.price;
    const totalCost = pricePerPerson * peopleCount; // Pay for actual people, not minimum capacity

    return {
      table,
      fit: "oversized",
      totalCost,
      tablesNeeded: 1,
      wastedSeats,
      recommendation: `Larger table - ${wastedSeats} empty seat${
        wastedSeats > 1 ? "s" : ""
      } available`,
      priority: 200 + wastedSeats, // Lowest priority
    };
  }

  return null;
}

/**
 * Format recommendation message with emojis and clear language
 */
export function formatRecommendationMessage(rec: TableRecommendation): string {
  switch (rec.fit) {
    case "perfect":
      return rec.wastedSeats === 0
        ? `🎯 Perfect match for your group`
        : `✅ Great fit - ${rec.wastedSeats} extra seat${
            rec.wastedSeats > 1 ? "s" : ""
          }`;

    case "multiple":
      return rec.wastedSeats === 0
        ? `🎯 Perfect fit - ${rec.tablesNeeded} tables needed`
        : `📊 Good option - ${rec.tablesNeeded} tables (${rec.wastedSeats} extra seats)`;

    case "oversized":
      return `📈 Larger option available`;

    default:
      return `💡 Alternative option`;
  }
}

/**
 * Get recommendation badge color based on fit type
 */
export function getRecommendationBadgeColor(
  fit: TableRecommendation["fit"]
): string {
  switch (fit) {
    case "perfect":
      return "bg-green-100 text-green-800 border-green-200";
    case "good":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "multiple":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "oversized":
      return "bg-orange-100 text-orange-800 border-orange-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

/**
 * Calculate cost per person for comparison
 */
export function getCostPerPerson(
  rec: TableRecommendation,
  peopleCount: number
): number {
  return rec.totalCost / Math.max(1, peopleCount);
}
