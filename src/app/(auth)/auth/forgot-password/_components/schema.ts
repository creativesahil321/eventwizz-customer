import { z } from "zod";

export const ForgetPasswordEmailVerifySchema = z.object({
  email: z.string().email()
});