import { MenuItemProps } from "./types";
import { createCustomerUrl } from "./utils";

// Customer Menus
export const customerMenus: MenuItemProps[] = [
  {
    id: 1,
    title: "Dashboard",
    icon: "dashboard",
    href: createCustomerUrl("/customer/dashboard"),
    url: createCustomerUrl("/customer/dashboard"),
    type: "title",
    menu: [],
  },
  {
    id: 2,
    title: "Profile",
    icon: "user",
    href: createCustomerUrl("/customer/profile"),
    url: createCustomerUrl("/customer/profile"),
    type: "title",
    menu: [],
  },

  {
    id: 4,
    title: "Bookings",
    icon: "bookings",
    href: createCustomerUrl("/customer/bookings"),
    url: createCustomerUrl("/customer/bookings"),
    type: "title",
  },
  {
    id: 7,
    title: "Support",
    icon: "support",
    href: createCustomerUrl("/customer/support"),
    url: createCustomerUrl("/customer/support"),
    type: "title",
    menu: [],
  },
  {
    id: 9,
    title: "Notifications",
    icon: "bell",
    href: createCustomerUrl("/customer/notifications"),
    url: createCustomerUrl("/customer/notifications"),
    type: "title",
    menu: [],
  },

  {
    id: 10,
    title: "Transactions",
    icon: "creditCard",
    href: createCustomerUrl("/customer/transactions"),
    url: createCustomerUrl("/customer/transactions"),
    type: "title",
  },
];
