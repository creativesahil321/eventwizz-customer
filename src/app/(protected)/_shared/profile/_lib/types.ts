import { z } from "zod";
import { profileSchema, passwordUpdateSchema } from "./schema";

export type ProfileFormValues = z.infer<typeof profileSchema>;
export type PasswordUpdateFormValues = z.infer<typeof passwordUpdateSchema>;

/** Optional company fields sent with admin profile update in the same request. */
export type ProfileCompanyFields = {
  company_number?: string;
  company_registered_office?: string;
};

export type UpdateProfilePayload = ProfileFormValues & ProfileCompanyFields;

export type ProfileResponse = {
  status: boolean;
  message: string;
  data?: {
    is_password_set: boolean;
    _key: string;
    avatar: string;
    venue_name?: string | null;
    first_name: string;
    last_name: string;
    full_name: string;
    email: string;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    post_code: string | null;
    /** When present (tenant branding), matches theme API display symbol */
    currency_symbol?: string;
    /** Same as login — true when at least one payment gateway is connected. */
    has_payment_provider?: boolean;
    /** Public vendor storefront URL for copy/open in the header. */
    site_url?: string | null;
  };
  errors?: string[];
};

export type PasswordUpdateResponse = {
  status: boolean;
  message: string;
  data?: Record<string, unknown>;
  errors?: string[];
};
