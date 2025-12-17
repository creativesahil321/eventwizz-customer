import { z } from "zod";

export const replyFormSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  subject: z
    .string()
    .min(2, {
      message: "Subject must be at least 2 characters.",
    })
    .max(150, {
      message: "Subject must not be longer than 60 characters.",
    }),
  message: z
    .string()
    .min(15, {
      message: "Description must be at least 15 characters.",
    })
    .max(300, {
      message: "Description can not be longer than 300 characters.",
    }),
});

export type ReplyFormValues = z.infer<typeof replyFormSchema>;
