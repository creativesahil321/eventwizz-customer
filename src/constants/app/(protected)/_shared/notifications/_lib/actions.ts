"use server";

import { Notification, SearchParams } from "./types";
import { faker } from "@faker-js/faker";

type NotificationResponse = {
  data: Notification[];
  links?: any;
  meta?: any;
};

export async function generateFakeNotifications(
  count: number
): Promise<Notification[]> {
  const roles = ["admin", "customer", "vendor", "all"];
  const priorities = ["low", "medium", "high"];
  const readStatuses = [true, false];
  const categories = ["customer", "order", "payment", "account", "event"];

  return Array.from({ length: count }, () => {
    const role = faker.helpers.arrayElement(roles);
    const priority = faker.helpers.arrayElement(priorities);
    const read = faker.helpers.arrayElement(readStatuses);
    const timestamp = faker.date.recent({ days: 30 }).toISOString();
    const category = faker.helpers.arrayElement(categories);

    const user = {
      username: faker.person.suffix(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      avatar: faker.image.avatar(),
    };

    const payload = {
      user,
      category,
      notification: `${category} notification: ${faker.lorem.sentence(5)}`,
      date: timestamp,
    };

    return {
      id: faker.string.uuid(),
      timestamp,
      role,
      read,
      priority,
      payload,
    };
  });
}

export async function fetchNotifications(
  parsedSearch: SearchParams
): Promise<NotificationResponse> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  const totalNotifications = 50;
  const perPage = parsedSearch.per_page || 20;
  const page = parsedSearch.page || 1;
  const lastPage = Math.ceil(totalNotifications / perPage);
  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, totalNotifications);

  const allNotifications = await generateFakeNotifications(totalNotifications);

  // Filter notifications
  const userRole = "vendor"; // Replace with auth context
  const filteredNotifications = allNotifications.filter((n) => {
    const matchesRole =
      userRole === "admin" ? true : n.role === userRole || n.role === "all";
    const matchesCategory = parsedSearch.category
      ? n.payload.category === parsedSearch.category
      : true;
    const matchesRead = parsedSearch.read
      ? n.read === (parsedSearch.read === "true")
      : true;
    return matchesRole && matchesCategory && matchesRead;
  });

  // Sort notifications
  const sortedNotifications = filteredNotifications.sort((a, b) => {
    if (parsedSearch.sort === "timestamp.desc") {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    }
    if (parsedSearch.sort === "timestamp.asc") {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    }
    if (parsedSearch.sort === "priority.asc") {
      const priorityOrder = { low: 1, medium: 2, high: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    if (parsedSearch.sort === "priority.desc") {
      const priorityOrder = { low: 1, medium: 2, high: 3 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    return 0;
  });

  // Paginate
  const start = (page - 1) * perPage;
  const paginatedNotifications = sortedNotifications.slice(
    start,
    start + perPage
  );

  const baseUrl = "http://api.example.com/notifications";
  const links = {
    first: `${baseUrl}?page=1`,
    last: `${baseUrl}?page=${lastPage}`,
    prev: page > 1 ? `${baseUrl}?page=${page - 1}` : null,
    next: page < lastPage ? `${baseUrl}?page=${page + 1}` : null,
  };

  const meta = {
    current_page: page,
    from,
    last_page: lastPage,
    path: baseUrl,
    per_page: perPage,
    to,
    total: totalNotifications,
  };

  return {
    data: paginatedNotifications,
    links,
    meta,
  };
}
