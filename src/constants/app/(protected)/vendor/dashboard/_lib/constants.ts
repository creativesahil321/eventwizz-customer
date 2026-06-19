import type { Orders } from "./types";

/**
 * Empty commissions stats (zeros) until backend provides GET /vendor/dashboard commissions.
 * Same shape as BookingsStats for the Commissions tab.
 */
export const EMPTY_COMMISSIONS_STATS: Orders = {
  today: [
    { title: "Total Commission", value: 0 },
    { title: "Commission Due", value: 0 },
  ],
  weekly: [
    { title: "Total Commission", value: 0 },
    { title: "Commission Due", value: 0 },
  ],
  monthly: [
    { title: "Total Commission", value: 0 },
    { title: "Commission Due", value: 0 },
  ],
  yearly: [
    { title: "Total Commission", value: 0 },
    { title: "Commission Due", value: 0 },
  ],
};
