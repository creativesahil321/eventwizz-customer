import { z } from "zod";

export const UserSchema = z
  .object({
    first_name: z
      .string()
      .min(2, { message: "First name must be at least 2 characters long." })
      .regex(/^[a-zA-Z\s'-]+$/, {
        message:
          "First name must contain only letters, spaces, hyphens, or apostrophes.",
      }),
    last_name: z
      .string()
      .min(2, { message: "Last name must be at least 2 characters long." })
      .regex(/^[a-zA-Z\s'-]+$/, {
        message:
          "Last name must contain only letters, spaces, hyphens, or apostrophes.",
      }),
    email: z.string().email({ message: "Invalid email address." }),
    phone: z
      .string()
      .regex(/^\+?\d{10,15}$/, { message: "Invalid phone number." }),
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters long." }),
    password_confirmation: z.string(),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Passwords do not match.",
    path: ["password_confirmation"],
  });

export type UserType = z.infer<typeof UserSchema>;
