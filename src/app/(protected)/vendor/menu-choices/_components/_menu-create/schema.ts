import { z } from "zod";

export const menuChoiceSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  event_id: z.number().min(1, "Event is required"),
  menu_name: z.string().min(1, "Menu name is required"),
  category_id: z.number().min(1, "Event Category is required"),
  description: z.string().optional(),
  status: z.boolean(),
});

export type MenuChoiceType = z.infer<typeof menuChoiceSchema>;
