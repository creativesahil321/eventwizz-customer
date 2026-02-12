import { z } from "zod";

export const emailTemplateFormSchema = z.object({
  subject: z
    .string()
    .min(3, { message: "Subject must be at least 3 characters." })
    .max(200, { message: "Subject must not be longer than 200 characters." }),
  body: z
    .string()
    .min(10, { message: "Body must be at least 10 characters." }),
  signature: z.string().optional(),
});

export type EmailTemplateFormValues = z.infer<typeof emailTemplateFormSchema>;
