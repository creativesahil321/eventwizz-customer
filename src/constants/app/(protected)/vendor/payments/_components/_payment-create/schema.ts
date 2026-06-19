import { z } from "zod";

export const PaymentStatusEnum = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
  "refunded",
  "cancelled",
]);

export const PaymentSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  event_name: z.string().min(1, { message: "Event name is required." }),
  menu_name: z.string().min(1, { message: "Menu name is required." }),
  category: z.union([z.string(), z.number()]),
  event_type: z.string().optional(),
  status: PaymentStatusEnum,
});

export type PaymentType = z.infer<typeof PaymentSchema>;
export type PaymentStatusType = z.infer<typeof PaymentStatusEnum>;
