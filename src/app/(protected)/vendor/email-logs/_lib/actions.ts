import { faker } from "@faker-js/faker";
import { AdminEmailLogsParams, EmailLog } from "./types";

export const generateEmailLogs = (count: number): EmailLog[] => {
  const roles = ["admin", "user", "manager"];
  return Array.from({ length: count }, () => ({
    id: faker.string.uuid(),
    emailTo: faker.internet.email(),
    body: faker.lorem.paragraph(),
    subject: faker.lorem.sentence(),
    role: faker.helpers.arrayElement(roles),
    created_at: faker.date.past(),
  }));
};

export const fetchEmailLogs = async ({
  search = "",
  page = 1,
  per_page = 10,
  status = "",
}: AdminEmailLogsParams = {}) => {
  // Simulate network delay.
  await new Promise((resolve) => setTimeout(resolve, 100));

  const totalMenus = 50; // Total simulated menus.
  const lastPage = Math.ceil(totalMenus / per_page);
  const from = (page - 1) * per_page + 1;
  const to = Math.min(page * per_page, totalMenus);

  // Generate fake data for the current page.
  const data = generateEmailLogs(per_page);

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

export async function updateRowStatus(id: string, newStatus: string) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true, id, status: newStatus });
    }, 1500);
  });
}
