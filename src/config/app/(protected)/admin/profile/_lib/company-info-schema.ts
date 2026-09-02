import { z } from "zod";
import { profileSchema } from "@/app/(protected)/_shared/profile/_lib/schema";

export const adminCompanyInfoSchema = z.object({
  company_number: z
    .string()
    .trim()
    .min(1, "Company number is required")
    .max(50, "Company number must not exceed 50 characters"),
  company_registered_office: z
    .string()
    .trim()
    .min(1, "Registered office is required")
    .max(500, "Registered office must not exceed 500 characters"),
  company_phone: z
    .string()
    .trim()
    .min(1, "Phone is required")
    .refine(
      (value) => {
        const digitsOnly = value.replace(/[\s\-+()]/g, "");
        return digitsOnly.length >= 10 && digitsOnly.length <= 15 && /^\d+$/.test(digitsOnly);
      },
      { message: "Phone number must be 10–15 digits" },
    ),
});

export type AdminCompanyInfoFormValues = z.infer<typeof adminCompanyInfoSchema>;

export const adminProfileFormSchema = profileSchema
  .omit({ phone: true, address: true, city: true, postcode: true })
  .merge(adminCompanyInfoSchema);

export type AdminProfileFormValues = z.infer<typeof adminProfileFormSchema>;

export const ADMIN_COMPANY_INFO_DEFAULTS: AdminCompanyInfoFormValues = {
  company_number: "11555643",
  company_registered_office: "124 City Road, London, England, EC1V 2NX",
  company_phone: "+44 (0)20 3925 0350",
};
