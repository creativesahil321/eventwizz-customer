import type { CommissionSummary, CommissionEntry } from "./types";

export const dummyCommissionSummary: CommissionSummary = {
  totalCommissionEarned: 16_500,
  totalCommissionReceived: 12_500,
  totalCommissionDue: 4_000,
};

const VENUE_NAME = "Glamour Events";
const DATE_STR = "18 Feb 2023";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Dummy list for "Commission Settled" tab — mix of paid and unpaid. */
export function getDummyCommissionEntriesSettled(): CommissionEntry[] {
  const base = [
    { commissionSettled: 500, paidDate: DATE_STR as string | null },
    { commissionSettled: 500, paidDate: DATE_STR as string | null },
    { commissionSettled: 500, paidDate: null },
    { commissionSettled: 500, paidDate: DATE_STR as string | null },
    { commissionSettled: 500, paidDate: DATE_STR as string | null },
    { commissionSettled: 500, paidDate: null },
    { commissionSettled: 500, paidDate: null },
    { commissionSettled: 500, paidDate: DATE_STR as string | null },
    { commissionSettled: 500, paidDate: DATE_STR as string | null },
  ];
  return base.map((row, i) => ({
    id: i + 1,
    sno: i + 1,
    date: DATE_STR,
    venueName: VENUE_NAME,
    commissionSettled: row.commissionSettled,
    paidDate: row.paidDate,
    status: row.paidDate ? "paid" : "due",
  }));
}

/** Dummy list for "Commission Due" tab — all due. */
export function getDummyCommissionEntriesDue(): CommissionEntry[] {
  return [1, 2, 3, 4, 5].map((i) => ({
    id: 10 + i,
    sno: i,
    date: DATE_STR,
    venueName: VENUE_NAME,
    commissionSettled: 500,
    paidDate: null,
    status: "due" as const,
  }));
}

export { formatCurrency };
