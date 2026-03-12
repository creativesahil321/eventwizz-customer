/**
 * Commission overview page types and dummy data shape.
 */

export type SearchParams = {
  page?: string;
  per_page?: string;
};

export interface CommissionSummary {
  totalCommissionEarned: number;
  totalCommissionReceived: number;
  totalCommissionDue: number;
}

export interface CommissionEntry {
  id: number;
  sno: number;
  date: string;
  venueName: string;
  commissionSettled: number;
  paidDate: string | null;
  status: "paid" | "due";
}

export type CommissionTab = "settled" | "due";
