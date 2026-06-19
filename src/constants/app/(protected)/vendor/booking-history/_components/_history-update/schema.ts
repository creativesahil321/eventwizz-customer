import { z } from "zod";

export const TransactionHistorySchema = z.object({
  id: z.string(),
  date: z.string(),
  amount: z.number(),
  status: z.enum([
    "pending",
    "processing",
    "completed",
    "failed",
    "refunded",
    "cancelled",
  ]),
});

export const BookingSchema = z.object({
  id: z.string(),
  event_name: z.string(),
  user_name: z.string(),
  booking_date: z.string(),
  tickets: z.number(),
  total_table: z.number(),
  total_people: z.number(),
  paid_amount: z.number(),
  balance_amount: z.number(),
  discount: z.number(),
  total_amount: z.number(),
  payment_status: z.enum([
    "pending",
    "processing",
    "completed",
    "failed",
    "refunded",
    "cancelled",
  ]),
  transaction_history: z.array(TransactionHistorySchema),
  date: z.string(),
  amount: z.number(),
  status: z.enum([
    "pending",
    "processing",
    "completed",
    "failed",
    "refunded",
    "cancelled",
  ]),
});

export type BookingType = z.infer<typeof BookingSchema>;
export type TransactionHistoryType = z.infer<typeof TransactionHistorySchema>;
