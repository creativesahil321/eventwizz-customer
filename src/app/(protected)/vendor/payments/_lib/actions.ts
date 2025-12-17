import { faker } from "@faker-js/faker";
import { PaymentsParams, Payment } from "./types";

export const generateFakePayments = (count: number): Payment[] => {
  const statuses = [
    "pending",
    "processing",
    "completed",
    "failed",
    "refunded",
    "cancelled",
  ];
  return Array.from({ length: count }, () => ({
    id: faker.string.uuid(),
    event_name: faker.lorem.words(2),
    menu_name: faker.commerce.productName(),
    category: faker.commerce.department(),
    status: faker.helpers.arrayElement(statuses),
    created_at: faker.date.past().toISOString(),
  }));
};
export const fetchPayments = async ({
  page = 1,
  per_page = 10,
}: PaymentsParams = {}) => {
  // Simulate network delay.
  await new Promise((resolve) => setTimeout(resolve, 100));

  const totalMenus = 50; // Total simulated menus.
  const lastPage = Math.ceil(totalMenus / Number(per_page));
  const from = (Number(page) - 1) * Number(per_page) + 1;
  const to = Math.min(Number(page) * Number(per_page), totalMenus);
  // Generate fake data for the current page.
  const data = generateFakePayments(Number(per_page));
  // Base URL for constructing pagination links (update with your actual URL if available)
  const baseUrl = "http://api.example.com/menus";
  // Construct Laravel-style pagination links.
  const links = {
    first: `${baseUrl}?page=1`,
    last: `${baseUrl}?page=${lastPage}`,
    prev: Number(page) > 1 ? `${baseUrl}?page=${Number(page) - 1}` : null,
    next:
      Number(page) < lastPage ? `${baseUrl}?page=${Number(page) + 1}` : null,
  };

  // Construct meta information similar to Laravel's pagination meta.
  const meta = {
    current_page: Number(page),
    from,
    last_page: lastPage,
    path: baseUrl,
    per_page: Number(per_page),
    to: Number(to),
    total: totalMenus,
  };

  return { data, links, meta };
};
