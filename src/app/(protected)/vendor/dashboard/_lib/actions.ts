import { env } from "@/env";
import { Booking, OrdersResponse, TransactionHistory, User } from "./types";
const appUrl = `${env.NEXT_PUBLIC_APP_URL}/vendor`;
import { faker } from "@faker-js/faker";

const dashboard = [
  {
    title: "Total Events",
    value: 1000,
    summary: "Total number of customers in the system",
    icon: "users",
    color: "blue",
    link: `${appUrl}/events`,
  },
  {
    title: "Active Customers",
    value: 330,
    summary: "Total number of customers in the system",
    icon: "users",
    color: "blue",
    link: `${appUrl}/customers?status=active`,
  },
  {
    title: "Old Events",
    value: 1000,
    summary: "Total number of customers in the system",
    icon: "users",
    color: "blue",
    link: `${appUrl}/events?status=old`,
  },
  {
    title: "Draft Events",
    value: 500,
    summary: "Total number of customers in the system",
    icon: "users",
    color: "blue",
    link: `${appUrl}/events?status=draft`,
  },
];

const orders = {
  today: [
    { title: "Total Payments", value: 1000 },
    { title: "Pending Payments", value: 2000 },
    { title: "Refund Orders", value: 100 },
    { title: "Incentives", value: 0 },
  ],
  weekly: [
    { title: "Total Payments", value: 5000 },
    { title: "Pending Payments", value: 3000 },
    { title: "Refund Orders", value: 500 },
    { title: "Incentives", value: 200 },
  ],
  monthly: [
    { title: "Total Payments", value: 20000 },
    { title: "Pending Payments", value: 7000 },
    { title: "Refund Orders", value: 800 },
    { title: "Incentives", value: 500 },
  ],
  yearly: [
    { title: "Total Payments", value: 120000 },
    { title: "Pending Payments", value: 15000 },
    { title: "Refund Orders", value: 2000 },
    { title: "Incentives", value: 1000 },
  ],
};

export const fetchDashboardData = async ({ status }: { status: string }) => {
  new Promise((resolve) => {
    setTimeout(resolve), 1500;
  });
  return {
    orders,
    dashboard,
  };
};
export const fetchAdminDashboardOrders = async ({
  search = "",
  page = 1,
  per_page = 30,
  status = "",
}): Promise<OrdersResponse> => {
  // Simulate network delay.
  await new Promise((resolve) => setTimeout(resolve, 100));
  const totalMenus = 50; // Total simulated menus.
  const lastPage = Math.ceil(totalMenus / per_page);
  const from = (page - 1) * per_page + 1;
  const to = Math.min(page * per_page, totalMenus);

  // Generate fake data for the current page.
  const data = generateFakeOrders(per_page);

  // Base URL for constructing pagination links (update with your actual URL if available)
  const baseUrl = "http://api.example.com/menus";

  // Construct Laravel-style pagination links.
  const links = {
    first: `${baseUrl}?page=1`,
    last: `${baseUrl}?page=${lastPage}`,
    prev: page > 1 ? `${baseUrl}?page=${page - 1}` : null,
    next: page < lastPage ? `${baseUrl}?page=${page + 1}` : null,
  };

  // Construct meta information similar to Laravel's pagination meta.
  const meta = {
    current_page: page,
    from,
    last_page: lastPage,
    path: baseUrl,
    per_page,
    to,
    total: totalMenus,
  };

  return { data, links, meta };
};

export const generateFakeOrders = (count: number): Booking[] => {
  const paymentStatuses = ["paid", "pending", "failed"];
  const bookingStatuses = ["completed", "pending", "cancelled"];

  return Array.from({ length: count }, () => {
    const bookingDate = faker.date.past().toISOString();
    const createdAt = faker.date.past().toISOString();
    const transaction_history: TransactionHistory[] = Array.from(
      { length: faker.number.int({ min: 1, max: 5 }) },
      () => ({
        id: faker.string.uuid(),
        date: faker.date.past().toISOString(),
        amount: faker.number.float({ min: 10, max: 300, fractionDigits: 2 }),
        status: faker.helpers.arrayElement(bookingStatuses),
      })
    );

    const user: User = {
      id: faker.string.uuid(),
      user_name: faker.person.fullName(),
      email: faker.internet.email(),
      avatar: faker.image.avatar(),
    };

    return {
      id: faker.string.uuid(),
      event_name: faker.company.name(),
      user,
      booking_date: bookingDate,
      tickets: faker.number.int({ min: 1, max: 10 }),
      total_table: faker.number.int({ min: 1, max: 5 }),
      total_people: faker.number.int({ min: 1, max: 20 }),
      paid_amount: faker.number.float({ min: 10, max: 500, fractionDigits: 2 }),
      balance_amount: faker.number.float({
        min: 0,
        max: 100,
        fractionDigits: 2,
      }),
      discount: faker.number.float({ min: 0, max: 50, fractionDigits: 2 }),
      total_amount: faker.number.float({
        min: 20,
        max: 600,
        fractionDigits: 2,
      }),
      payment_status: faker.helpers.arrayElement(paymentStatuses),
      transaction_history,
      date: faker.date.past().toISOString(),
      amount: faker.number.float({ min: 20, max: 600, fractionDigits: 2 }),
      status: faker.helpers.arrayElement(bookingStatuses),
      created_at: createdAt,
    };
  });
};

export const fetchAdminDashboardSalesHistory = async () => {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return months.map((month) => ({
    month,
    earnings: parseFloat(
      faker.finance.amount({ min: 1000, max: 100000, dec: 2 })
    ),
  }));
};

export const fetchAdminDashboardBestSales = async (count?: number) => {
  return Array.from({ length: count || 10 }, () => ({
    icon: faker.image.avatar(),
    venue_name: faker.company.name(),
    price: `$${faker.finance.amount({ min: 1000, max: 100000, dec: 2 })}`,
  }));
};

export const fetchData = async () => {
  return {};
};
