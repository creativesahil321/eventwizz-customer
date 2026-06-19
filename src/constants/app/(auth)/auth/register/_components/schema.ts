import { z } from "zod";

// Define the Zod schema for validation
export const registerSchema = z.object({
  email: z.string().email("Invalid email format").nonempty("Email is required"),
});

export type RegisterFormInputs = z.infer<typeof registerSchema>;
