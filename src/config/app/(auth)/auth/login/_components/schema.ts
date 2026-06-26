import { z } from "zod";

// Define the Zod schema for validation
export const loginSchema = z.object({
  email: z.string().email("Invalid email format").nonempty("Email is required"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .nonempty("Password is required"),
  remember: z.boolean().optional(),
});

export type LoginFormInputs = z.infer<typeof loginSchema>;
