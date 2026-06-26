import { z } from "zod";

export const formSchema = z.object({
  title: z.string().min(2, { message: "Title must be at least 2 characters." }),
  sub_title: z
    .string()
    .min(2, { message: "Subtitle must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  sendEmailToAll: z.boolean(),
});
export type FormSchema = z.infer<typeof formSchema>;
