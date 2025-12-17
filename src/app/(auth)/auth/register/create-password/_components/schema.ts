import { z } from "zod";

// Schema for the registration form
export const registerSchema = z
  .object({
    firstName: z
      .string()
      .min(2, "First name must be at least 2 characters")
      .regex(/^[a-zA-Z\s'-]+$/, "First name must contain only letters, spaces, hyphens, or apostrophes"),
    lastName: z
      .string()
      .min(2, "Last name must be at least 2 characters")
      .regex(/^[a-zA-Z\s'-]+$/, "Last name must contain only letters, spaces, hyphens, or apostrophes"),
    email: z
      .string()
      .email("Please enter a valid email address")
      .min(1, "Email is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterFormInputs = z.infer<typeof registerSchema>;
