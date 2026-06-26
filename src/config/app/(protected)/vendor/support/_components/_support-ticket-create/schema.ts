import { z } from "zod";

export const supportTicketSchema = z.object({
  requester: z.string().min(1, "Requester is required"),
  agent: z.string().min(1, "Agent is required"),
  tags: z.array(z.string()).optional(),
  type: z.enum(["question", "incident", "problem", "task"]).optional(),
  priority: z.enum(["low", "medium", "high"]),
  message: z.string().min(1, "Message is required"),
});
export type SupportTicketFormValues = z.infer<typeof supportTicketSchema>;
