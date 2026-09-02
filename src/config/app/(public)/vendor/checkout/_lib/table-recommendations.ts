/**
 * Professional Table Recommendation System
 * Similar to airline seat selection or hotel room recommendations
 */

import { EditableItem } from "@/store/cart-edit.store";
import {
  autoArrangeGuests,
  validateAllocation,
  type TableAllocationData,
} from "./guest-allocation";
import { parseTableCapacityFromTitle } from "./table-labels";

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
  if (table.minPersons != null && table.maxPersons != null) {
    return {
      minPersons: table.minPersons,
      maxPersons: table.maxPersons,
    };
  }

  const fromTitle = parseTableCapacityFromTitle(table.title);
  if (fromTitle) {
    return fromTitle;
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

function isTableEligibleForGroup(
  table: EditableItem,
  peopleCount: number,
): boolean {
  if (table.minPersons != null && table.minPersons > 0) {
    return peopleCount >= table.minPersons;
  }
  const titleMatch = table.title.match(/\((\d+)-(\d+)\s+persons?\)/);
  if (titleMatch) {
    const min = Math.min(parseInt(titleMatch[1]), parseInt(titleMatch[2]));
    return peopleCount >= min;
  }
  return true;
}

/** True when a recommendation can actually be booked for this group. */
export function isViableTableRecommendation(
  rec: TableRecommendation,
  peopleCount: number,
): boolean {
  if (rec.fit === "oversized") return false;

  const maxStock = rec.table.maxQuantity ?? 50;
  if (rec.tablesNeeded > maxStock) return false;

  const minPersons = rec.table.minPersons || 1;
  const maxPersons = rec.table.maxPersons || 999;

  if (rec.fit === "perfect") {
    return peopleCount >= minPersons && peopleCount <= maxPersons;
  }

  if (rec.fit === "multiple") {
    const totalMin = rec.tablesNeeded * minPersons;
    const totalMax = rec.tablesNeeded * maxPersons;
    return peopleCount >= totalMin && peopleCount <= totalMax;
  }

  return false;
}

/**
 * Group size for table matching. Never invents a party of 20.
 * Prefer an explicit count, then ticket qty, then the smallest table minimum.
 */
export function resolveCheckoutGroupSize(dateData: {
  peopleCount?: number;
  tickets?: Array<{ quantity: number }>;
  tables?: EditableItem[];
}): number {
  if (dateData.peopleCount != null && dateData.peopleCount >= 1) {
    return Math.min(500, Math.floor(dateData.peopleCount));
  }

  const ticketQty = (dateData.tickets ?? []).reduce(
    (sum, ticket) => sum + Math.max(0, ticket.quantity || 0),
    0,
  );
  if (ticketQty >= 1) {
    return Math.min(500, ticketQty);
  }

  const lowest = dateData.tables?.length
    ? getLowestTableMinimum(dateData.tables)
    : null;
  if (lowest != null && lowest >= 1) {
    return lowest;
  }

  return 1;
}

/** Smallest minimum capacity across all table types. */
export function getLowestTableMinimum(tables: EditableItem[]): number | null {
  const mins: number[] = [];
  for (const table of tables) {
    if (table.minPersons != null && table.minPersons > 0) {
      mins.push(table.minPersons);
      continue;
    }
    const parsed = parseTableCapacityFromTitle(table.title);
    if (parsed?.minPersons) mins.push(parsed.minPersons);
  }
  return mins.length > 0 ? Math.min(...mins) : null;
}

/** True when group size is below the smallest table minimum. */
export function isGuestCountBelowTableMinimum(
  tables: EditableItem[],
  peopleCount: number,
): boolean {
  const lowest = getLowestTableMinimum(tables);
  return lowest != null && peopleCount < lowest;
}

/** Pick the top-ranked viable table option for a group size. */
export function pickBestTableRecommendation(
  tables: EditableItem[],
  peopleCount: number,
): TableRecommendation | null {
  const { recommended, otherOptions } = generateTableRecommendations(
    tables,
    peopleCount,
  );

  const viable = [...recommended, ...otherOptions].filter((rec) =>
    isViableTableRecommendation(rec, peopleCount),
  );

  return viable[0] ?? null;
}

export interface ResolvedTableSelectionItem {
  tableId: number;
  quantity: number;
  allocation: number[];
}

export interface ResolvedTableSelection {
  items: ResolvedTableSelectionItem[];
}

interface TableSpec {
  table: EditableItem;
  minPersons: number;
  maxPersons: number;
  stock: number;
}

function getTableSpecs(tables: EditableItem[]): TableSpec[] {
  return tables
    .map((table) => {
      const { minPersons, maxPersons } = parseTableCapacity(table);
      return {
        table,
        minPersons,
        maxPersons,
        stock: table.maxQuantity ?? 50,
      };
    })
    .filter((spec) => spec.minPersons > 0 && spec.maxPersons > 0 && spec.stock > 0);
}

function findQuantityForGuests(
  guests: number,
  minPersons: number,
  maxPersons: number,
  stock: number,
): number | null {
  for (let qty = 1; qty <= stock; qty++) {
    if (guests >= minPersons * qty && guests <= maxPersons * qty) {
      return qty;
    }
  }
  return null;
}

function finalizeTablePlan(
  picks: Array<{ table: EditableItem; quantity: number }>,
  peopleCount: number,
): ResolvedTableSelection | null {
  if (picks.length === 0 || peopleCount <= 0) return null;

  const arrangeInput = picks.map(({ table, quantity }) => {
    const { minPersons, maxPersons } = parseTableCapacity(table);
    return {
      id: table.id,
      title: table.title,
      minPersons,
      maxPersons,
      quantity,
    };
  });

  const arranged = autoArrangeGuests(arrangeInput, peopleCount);
  const validationData: TableAllocationData[] = picks.map(({ table, quantity }) => {
    const { minPersons, maxPersons } = parseTableCapacity(table);
    return {
      tableId: table.id,
      title: table.title,
      minPersons,
      maxPersons,
      quantity,
      allocation: arranged[table.id] ?? Array(quantity).fill(minPersons),
    };
  });

  if (!validateAllocation(validationData, peopleCount).isValid) {
    return null;
  }

  return {
    items: picks.map(({ table, quantity }) => ({
      tableId: table.id,
      quantity,
      allocation: arranged[table.id] ?? [],
    })),
  };
}

/** Greedy mix: max out smaller-capacity types first, spill remainder to next. */
function tryGreedyMixedPlan(
  specs: TableSpec[],
  peopleCount: number,
): ResolvedTableSelection | null {
  const sorted = [...specs].sort((a, b) => a.maxPersons - b.maxPersons);
  let remaining = peopleCount;
  const picks: Array<{ table: EditableItem; quantity: number }> = [];

  for (let i = 0; i < sorted.length && remaining > 0; i++) {
    const spec = sorted[i];
    const hasMoreTypes = i < sorted.length - 1;
    const maxSeatableHere = spec.stock * spec.maxPersons;

    let qty: number | null = null;

    if (!hasMoreTypes) {
      qty = findQuantityForGuests(
        remaining,
        spec.minPersons,
        spec.maxPersons,
        spec.stock,
      );
    } else if (remaining > maxSeatableHere) {
      qty = spec.stock;
    } else {
      qty = findQuantityForGuests(
        remaining,
        spec.minPersons,
        spec.maxPersons,
        spec.stock,
      );
    }

    if (qty == null || qty <= 0) continue;

    picks.push({ table: spec.table, quantity: qty });
    const seated = Math.min(remaining, qty * spec.maxPersons);
    remaining -= seated;
  }

  if (remaining > 0) return null;
  return finalizeTablePlan(picks, peopleCount);
}

/** Try every pair of table types (e.g. 15×2-6 + 1×6-10 for 100 guests). */
function tryPairMixedPlan(
  specs: TableSpec[],
  peopleCount: number,
): ResolvedTableSelection | null {
  for (let i = 0; i < specs.length; i++) {
    for (let j = i + 1; j < specs.length; j++) {
      const a = specs[i];
      const b = specs[j];

      for (let qa = 0; qa <= a.stock; qa++) {
        for (let qb = 0; qb <= b.stock; qb++) {
          if (qa === 0 && qb === 0) continue;

          const minTotal = qa * a.minPersons + qb * b.minPersons;
          const maxTotal = qa * a.maxPersons + qb * b.maxPersons;
          if (peopleCount < minTotal || peopleCount > maxTotal) continue;

          const picks: Array<{ table: EditableItem; quantity: number }> = [];
          if (qa > 0) picks.push({ table: a.table, quantity: qa });
          if (qb > 0) picks.push({ table: b.table, quantity: qb });

          const plan = finalizeTablePlan(picks, peopleCount);
          if (plan) return plan;
        }
      }
    }
  }

  return null;
}

/** True when any single- or mixed-table plan can seat the group. */
export function hasViableTablePlan(
  tables: EditableItem[],
  peopleCount: number,
): boolean {
  return resolveBestTableSelection(tables, peopleCount) != null;
}

/** Resolve auto-selected tables (single type or mixed) + guest allocation. */
export function resolveBestTableSelection(
  tables: EditableItem[],
  peopleCount: number,
): ResolvedTableSelection | null {
  if (peopleCount <= 0 || tables.length === 0) return null;

  const best = pickBestTableRecommendation(tables, peopleCount);
  if (best) {
    const single = finalizeTablePlan(
      [{ table: best.table, quantity: best.tablesNeeded }],
      peopleCount,
    );
    if (single) return single;
  }

  const specs = getTableSpecs(tables);
  if (specs.length === 0) return null;

  const greedy = tryGreedyMixedPlan(specs, peopleCount);
  if (greedy) return greedy;

  const pair = tryPairMixedPlan(specs, peopleCount);
  if (pair) return pair;

  return null;
}
