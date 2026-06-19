import { faker } from "@faker-js/faker";
import { SupportTicket } from "./types";

const priorities: SupportTicket["priority"][] = ["low", "medium", "high"];
const statuses: SupportTicket["status"][] = ["open", "pending", "closed"];

export const fetchTickets = async (count: number): Promise<SupportTicket[]> => {
  await new Promise((res) => setTimeout(res, 500)); // optional delay
  return Array.from({ length: count }, () => ({
    id: faker.string.uuid(),
    requested_by: faker.person.fullName(),
    subject: faker.lorem.sentence(4),
    priority: faker.helpers.arrayElement(priorities),
    agent: faker.person.fullName(),
    created_at: faker.date.recent({ days: 30 }).toISOString(),
    status: faker.helpers.arrayElement(statuses),
  }));
};
