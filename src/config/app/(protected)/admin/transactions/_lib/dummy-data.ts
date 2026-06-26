import type { Transaction } from "./types";

/**
 * Dummy transactions for admin Transaction History (all vendors).
 * Replace with API when backend is ready.
 */
export const DUMMY_TRANSACTIONS: Transaction[] = [
  {
    payment_id: 1,
    booking_number: "EV-056",
    transaction_id: "pi_3Supd2BVfJHBZ4zVOZVzzzPm",
    booking_date: "29-01-2026 12:57PM",
    event_date: "10-07-2026",
    full_name: "stefen y",
    email: "stefen@yopmail.com",
    card_brand: "visa",
    cardLast4: "1111",
    status: "success",
    amount: "160.00",
    platform_fee: "8.00",
  },
  {
    payment_id: 2,
    booking_number: "EV-057",
    transaction_id: "pi_3Supd2BVfJHBZ4zVOZVzzzPn",
    booking_date: "28-01-2026 10:30AM",
    event_date: "15-07-2026",
    full_name: "Jane Smith",
    email: "jane.smith@example.com",
    card_brand: "mastercard",
    cardLast4: "4242",
    status: "success",
    amount: "320.00",
    platform_fee: "16.00",
  },
  {
    payment_id: 3,
    booking_number: "EV-058",
    transaction_id: "pi_3Supd2BVfJHBZ4zVOZVzzzPo",
    booking_date: "27-01-2026 03:45PM",
    event_date: "22-07-2026",
    full_name: "Alex Brown",
    email: "alex.b@yopmail.com",
    card_brand: "visa",
    cardLast4: "5555",
    status: "pending",
    amount: "95.00",
    platform_fee: "4.75",
  },
  {
    payment_id: 4,
    booking_number: "EV-059",
    transaction_id: "pi_3Supd2BVfJHBZ4zVOZVzzzPq",
    booking_date: "26-01-2026 09:15AM",
    event_date: "01-08-2026",
    full_name: "Maria Garcia",
    email: "maria.g@example.com",
    card_brand: "amex",
    cardLast4: "1005",
    status: "success",
    amount: "450.00",
    platform_fee: "22.50",
  },
  {
    payment_id: 5,
    booking_number: "EV-060",
    transaction_id: "pi_3Supd2BVfJHBZ4zVOZVzzzPr",
    booking_date: "25-01-2026 11:00AM",
    event_date: "12-08-2026",
    full_name: "Chris Wilson",
    email: "chris.w@yopmail.com",
    card_brand: "visa",
    cardLast4: "9999",
    status: "success",
    amount: "210.00",
    platform_fee: "10.50",
  },
  {
    payment_id: 6,
    booking_number: "EV-061",
    transaction_id: "pi_3Supd2BVfJHBZ4zVOZVzzzPs",
    booking_date: "24-01-2026 02:20PM",
    event_date: "20-08-2026",
    full_name: "Sarah Lee",
    email: "sarah.lee@example.com",
    card_brand: "mastercard",
    cardLast4: "8888",
    status: "pending",
    amount: "180.00",
    platform_fee: "9.00",
  },
  {
    payment_id: 7,
    booking_number: "EV-062",
    transaction_id: "pi_3Supd2BVfJHBZ4zVOZVzzzPt",
    booking_date: "23-01-2026 04:00PM",
    event_date: "05-09-2026",
    full_name: "James Taylor",
    email: "james.t@yopmail.com",
    card_brand: "visa",
    cardLast4: "1234",
    status: "success",
    amount: "275.00",
    platform_fee: "13.75",
  },
  {
    payment_id: 8,
    booking_number: "EV-063",
    transaction_id: "pi_3Supd2BVfJHBZ4zVOZVzzzPu",
    booking_date: "22-01-2026 01:30PM",
    event_date: "18-09-2026",
    full_name: "Emma Davis",
    email: "emma.d@example.com",
    card_brand: "visa",
    cardLast4: "7777",
    status: "success",
    amount: "140.00",
    platform_fee: "7.00",
  },
  {
    payment_id: 9,
    booking_number: "EV-064",
    transaction_id: "pi_3Supd2BVfJHBZ4zVOZVzzzPv",
    booking_date: "21-01-2026 10:45AM",
    event_date: "25-09-2026",
    full_name: "David Clark",
    email: "david.c@yopmail.com",
    card_brand: "mastercard",
    cardLast4: "3333",
    status: "success",
    amount: "520.00",
    platform_fee: "26.00",
  },
];

/** Total earnings (sum of platform_fee) for display; in real app comes from API. */
export function getDummyEarnings(transactions: Transaction[]): string {
  const total = transactions.reduce(
    (sum, t) => sum + parseFloat(t.platform_fee || "0"),
    0
  );
  return total.toFixed(2);
}

function parseBookingDate(dateStr: string): Date {
  const [datePart] = dateStr.split(" ");
  const [day, month, year] = datePart.split("-");
  return new Date(Number(year), Number(month) - 1, Number(day));
}

export type AdminSearchParams = {
  search?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
};

export function getFilteredDummyTransactions(
  params: AdminSearchParams
): Transaction[] {
  let data = [...DUMMY_TRANSACTIONS];
  const q = (params.search ?? "").toLowerCase().trim();
  if (q) {
    data = data.filter(
      (t) =>
        t.booking_number.toLowerCase().includes(q) ||
        t.transaction_id.toLowerCase().includes(q)
    );
  }
  const status = (params.status ?? "").toString();
  if (status && status !== "all") {
    data = data.filter((t) => t.status.toLowerCase() === status.toLowerCase());
  }
  const fromDate = params.from_date?.toString();
  const toDate = params.to_date?.toString();
  if (fromDate || toDate) {
    data = data.filter((t) => {
      const d = parseBookingDate(t.booking_date).getTime();
      if (fromDate && d < new Date(fromDate).setHours(0, 0, 0, 0))
        return false;
      if (toDate && d > new Date(toDate).setHours(23, 59, 59, 999))
        return false;
      return true;
    });
  }
  return data;
}
