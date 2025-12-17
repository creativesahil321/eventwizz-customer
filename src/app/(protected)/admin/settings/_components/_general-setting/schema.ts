import { z } from "zod";

export const userSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .regex(/^[a-zA-Z\s'-]+$/, "First name must contain only letters, spaces, hyphens, or apostrophes"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .regex(/^[a-zA-Z\s'-]+$/, "Last name must contain only letters, spaces, hyphens, or apostrophes"),
  country: z.string().min(1, "Country is required"),
  city: z.string().min(1, "City is required"),
  address: z.string().min(1, "Address is required"),
  email: z.string().email("Invalid email"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  birthday: z.string().min(1, "Birthday is required"), // or use z.date() if using Date object
  zipcode: z.string().min(1, "Zipcode is required"),
});

export type UserSchema = z.infer<typeof userSchema>;
