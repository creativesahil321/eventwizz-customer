/**
 * Admin dashboard data fetching.
 * Replace with real API calls when backend endpoints are available.
 */

import { faker } from "@faker-js/faker";

export async function fetchDashboardData(_params: { status: string }) {
  await new Promise((r) => setTimeout(r, 100));
  return { dashboard: [] };
}

export async function fetchAdminDashboardSalesHistory() {
  await new Promise((r) => setTimeout(r, 100));
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return months.map((month) => ({
    month,
    earnings: parseFloat(faker.finance.amount({ min: 1000, max: 100000, dec: 2 })),
  }));
}

export async function fetchAdminDashboardBestSales(count?: number) {
  await new Promise((r) => setTimeout(r, 100));
  return Array.from({ length: count ?? 10 }, () => ({
    icon: faker.image.avatar(),
    venue_name: faker.company.name(),
    price: `$${faker.finance.amount({ min: 1000, max: 100000, dec: 2 })}`,
  }));
}
