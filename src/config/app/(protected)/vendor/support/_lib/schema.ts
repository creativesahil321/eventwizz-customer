import { z } from "zod";

export const SupportTicketSchema = z.object({
  id: z.string(),
  requested_by: z.string(),
  subject: z.string(),
  priority: z.enum(["low", "medium", "high"]),
  agent: z.string(),
  created_at: z.string(), // or z.date() if using Date objects
  status: z.enum(["open", "pending", "closed"]),
});

export type SupportTicket = z.infer<typeof SupportTicketSchema>;
