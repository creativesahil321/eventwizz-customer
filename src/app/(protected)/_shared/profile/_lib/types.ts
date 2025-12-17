import { z } from "zod";
import { profileSchema, passwordUpdateSchema } from "./schema";

export type ProfileFormValues = z.infer<typeof profileSchema>;
export type PasswordUpdateFormValues = z.infer<typeof passwordUpdateSchema>;

export type ProfileResponse = {
  status: boolean;
  message: string;
  data?: {
    is_password_set: boolean;
    _key: string;
    avatar: string;
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
  };
  errors?: string[];
};

export type PasswordUpdateResponse = {
  status: boolean;
  message: string;
  data?: Record<string, unknown>;
  errors?: string[];
};
