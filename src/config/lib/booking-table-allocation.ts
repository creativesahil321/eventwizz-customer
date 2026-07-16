export type NormalizedTableAllocation = {
  key: string;
  tableLabel: string;
  seats: number;
  displayValue: string | number;
  isNewTable: boolean;
  isAddedToExisting: boolean;
};

function parseAllocationRecordValue(
  people: unknown,
  tableIdx: number,
  tableId: string,
): NormalizedTableAllocation {
  const isString = typeof people === "string";
  const displayValue = isString ? people : Number(people) || 0;
  const numericValue = isString
    ? parseInt(String(people).replace("+", ""), 10) || 0
    : Number(people) || 0;
  const isAddedToExisting = isString && String(people).startsWith("+");

  return {
    key: tableId,
    tableLabel: `Table ${tableIdx + 1}`,
    seats: numericValue,
    displayValue,
    isNewTable: !isAddedToExisting && typeof people === "number",
    isAddedToExisting,
  };
}

function normalizeAllocationArray(
  allocation: unknown[],
): NormalizedTableAllocation[] {
  const result = allocation
    .map((entry, idx) => {
      if (entry == null || typeof entry !== "object" || Array.isArray(entry)) {
        return null;
      }

      const row = entry as Record<string, unknown>;

      if ("table_number" in row || "final_table_number" in row) {
        const tableNumber =
          row.table_number ?? row.final_table_number ?? idx + 1;
        const seats = Number(row.seats ?? 0) || 0;
        const id = row.id != null ? String(row.id) : `slot-${idx}`;

        return {
          key: id,
          tableLabel: `Table ${tableNumber}`,
          seats,
          displayValue: seats,
          isNewTable: true,
          isAddedToExisting: false,
        } satisfies NormalizedTableAllocation;
      }

      if ("parent_id" in row) {
        const seats = Number(row.seats ?? 0) || 0;
        const parentId = String(row.parent_id);

        return {
          key: parentId,
          tableLabel: `Table ${idx + 1}`,
          seats,
          displayValue: `+${seats}`,
          isNewTable: false,
          isAddedToExisting: true,
        } satisfies NormalizedTableAllocation;
      }

      return null;
    })
    .filter((entry) => entry != null) as NormalizedTableAllocation[];
  return result;
}

/** Supports keyed maps, legacy strings, and room-system `{ table_number, seats }[]`. */
export function normalizeTableAllocations(
  allocation: unknown,
): NormalizedTableAllocation[] {
  if (allocation == null) return [];

  if (Array.isArray(allocation)) {
    return normalizeAllocationArray(allocation);
  }

  if (typeof allocation === "object") {
    return Object.entries(allocation as Record<string, unknown>).map(
      ([tableId, people], tableIdx) =>
        parseAllocationRecordValue(people, tableIdx, tableId),
    );
  }

  return [];
}

export function hasTableAllocations(allocation: unknown): boolean {
  return normalizeTableAllocations(allocation).length > 0;
}

export function hasAddedToExistingAllocation(allocation: unknown): boolean {
  return normalizeTableAllocations(allocation).some(
    (entry) => entry.isAddedToExisting,
  );
}
