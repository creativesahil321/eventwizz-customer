import { z } from "zod";

export const EmailTemplateSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters." }),
  subject: z
    .string()
    .min(3, { message: "Subject must be at least 3 characters." })
    .optional(),
  email: z.string().email({ message: "Please enter a valid email address." }),
  body: z.string().min(10, { message: "Body must be at least 10 characters." }),
});

export type FormType = z.infer<typeof EmailTemplateSchema>;
