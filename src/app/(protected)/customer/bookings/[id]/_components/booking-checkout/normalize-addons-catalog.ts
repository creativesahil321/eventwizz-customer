import type { AddOnsData, AddOnsTable } from "@/services/customer/bookings/type";

/** Shared stock helper for customer + vendor add-ons catalog tables. */
export function getAddOnNewTableStock(table: AddOnsTable): number {
  const stock = table.available_new_tables ?? table.available_tables;
  return Math.max(0, stock ?? 0);
}

/**
 * Normalize API capability flags so customer and vendor catalogs drive the same UI rules.
 * Omitted flags default to permissive values (extend existing / add new when stock exists).
 */
export function normalizeAddOnsTableCapabilities(table: AddOnsTable): AddOnsTable {
  const availableNew =
    table.available_new_tables ??
    Math.max(0, (table.total_tables ?? 0) - (table.sold_tables ?? 0));

  return {
    ...table,
    available_tables: table.available_tables ?? availableNew,
    available_new_tables: availableNew,
    can_add_new_table:
      table.can_add_new_table === false
        ? false
        : (table.can_add_new_table ?? availableNew > 0),
    can_extend_existing:
      table.can_extend_existing === false
        ? false
        : (table.can_extend_existing ?? true),
  };
}

export function normalizeAddOnsCatalogData(data: AddOnsData): AddOnsData {
  return {
    ...data,
    tables: data.tables.map(normalizeAddOnsTableCapabilities),
  };
}

export function canExtendExistingTables(catalogTables: AddOnsTable[]): boolean {
  if (catalogTables.length === 0) return true;
  return !catalogTables.every((table) => table.can_extend_existing === false);
}
