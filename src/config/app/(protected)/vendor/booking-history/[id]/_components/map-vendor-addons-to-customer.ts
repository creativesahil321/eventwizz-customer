import { normalizeAddOnsCatalogData } from "@/app/(protected)/customer/bookings/[id]/_components/booking-checkout/normalize-addons-catalog";
import type { AddOnsData } from "@/services/customer/bookings/type";
import type { VendorAddOnsData } from "@/services/vendor/bookings/add-ons.service";

export function mapVendorAddOnsToCustomer(data: VendorAddOnsData): AddOnsData {
  const hasSelectedTables = data.selected_tables.length > 0;

  return normalizeAddOnsCatalogData({
    tables: data.tables.map((table) => ({
      id: table.id,
      min_persons: table.min_persons,
      max_persons: table.max_persons,
      price: table.price,
      total_tables: table.total_tables,
      sold_tables: table.sold_tables,
      available_tables:
        table.available_tables ??
        table.available_new_tables ??
        Math.max(0, table.total_tables - table.sold_tables),
      available_new_tables:
        table.available_new_tables ??
        Math.max(0, table.total_tables - table.sold_tables),
      has_existing_on_booking:
        table.has_existing_on_booking ??
        (hasSelectedTables ||
          data.selected_tables.some((selected) => selected.id === table.id)),
      can_extend_existing: table.can_extend_existing,
      can_add_new_table: table.can_add_new_table,
    })),
    tickets: data.tickets.map((ticket) => ({
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      price: ticket.price,
      total_capacity: ticket.total_capacity,
      sold_tickets: ticket.sold_tickets,
      available_tickets: ticket.available_tickets,
    })),
    drinks: data.drinks.map((drink) => ({
      id: drink.id,
      title: drink.title,
      description: drink.description,
      price: String(drink.price),
      available_quantity: drink.available_quantity,
      sold_quantity: drink.sold_quantity,
      available_drinks: drink.available_drinks,
      status: drink.status,
    })),
    selected_tables: data.selected_tables.map((table) => {
      const allocation: Record<string, number | string> = {};
      table.allocation.forEach((entry) => {
        const parentId = entry.parent_id ?? entry.booking_date_table_id;
        if (parentId == null || !Number.isFinite(Number(parentId))) return;
        allocation[String(parentId)] = entry.seats;
      });

      return {
        id: table.id,
        price: table.price,
        table_size: table.table_size,
        no_tables: table.no_tables,
        allocation,
      };
    }),
  });
}
