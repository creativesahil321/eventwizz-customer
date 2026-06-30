import type { AddOnsData } from "@/services/customer/bookings/type";
import type { VendorAddOnsData } from "@/services/vendor/bookings/add-ons.service";

export function mapVendorAddOnsToCustomer(data: VendorAddOnsData): AddOnsData {
  return {
    tables: data.tables.map((table) => {
      const available =
        table.available_tables ??
        Math.max(0, table.total_tables - table.sold_tables);

      return {
        id: table.id,
        min_persons: table.min_persons,
        max_persons: table.max_persons,
        price: table.price,
        total_tables: table.total_tables,
        sold_tables: table.sold_tables,
        available_tables: available,
        available_new_tables: available,
        can_add_new_table: available > 0,
      };
    }),
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
        allocation[String(entry.parent_id)] = entry.seats;
      });

      return {
        id: table.id,
        price: table.price,
        table_size: table.table_size,
        no_tables: table.no_tables,
        allocation,
      };
    }),
  };
}
