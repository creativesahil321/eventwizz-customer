import { z } from "zod";

export const NotificationFilterSchema = z.object({
  category: z.string().optional(),
  status: z.enum(["read", "unread", "all"]).optional(),
  page: z.number().optional(),
  limit: z.number().optional(),
});

export const NotificationSchema = z.object({
  id: z.number(),
  icon: z.string(),
  title: z.string(),
  notice: z.string(),
  action_url: z.string().nullable(),
  is_read: z.number(), // 0 = unread, 1 = read
  created_at: z.string(),
  user: z.object({
    id: z.number(),
    full_name: z.string(),
    avatar: z.string().nullable(),
    // Other fields available but not needed
  }),
});

export type NotificationFilterValues = z.infer<typeof NotificationFilterSchema>;
