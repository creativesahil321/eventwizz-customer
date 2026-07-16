import { z } from "zod";

export const ADMIN_SUPPORT_HOURS = "Mon – Fri, 8am – 6pm (GMT)";

export const ADMIN_CONTACT_FORM_SUBJECTS = [
  { value: "general", label: "General Enquiry" },
  { value: "technical", label: "Technical Support" },
  { value: "onboarding", label: "Onboarding Assistance" },
  { value: "partnership", label: "Partnership Opportunity" },
] as const;

export type AdminContactSubject =
  (typeof ADMIN_CONTACT_FORM_SUBJECTS)[number]["value"];

export const adminContactFormSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name"),
  businessName: z.string().trim().optional(),
  email: z.string().trim().email("Please enter a valid email address"),
  subject: z.enum(
    ADMIN_CONTACT_FORM_SUBJECTS.map((item) => item.value) as [
      AdminContactSubject,
      ...AdminContactSubject[],
    ],
    { message: "Please select a subject" },
  ),
  message: z
    .string()
    .trim()
    .min(10, "Please enter at least 10 characters"),
});

export type AdminContactFormValues = z.infer<typeof adminContactFormSchema>;
