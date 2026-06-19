import { z } from "zod";

export const EmailSchema = z.object({
  subject: z.string().min(1, { message: "Subject is required" }),
  body: z.string().min(1, { message: "Body is required" }),
  attachments: z.array(z.instanceof(File)).optional(),
});

export type BulkEmailFormData = z.infer<typeof EmailSchema>;
