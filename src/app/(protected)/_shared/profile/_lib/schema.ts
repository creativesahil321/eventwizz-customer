import { z } from "zod";

export const AVATAR_MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
export const AVATAR_SIZE_ERROR_MESSAGE = "Avatar must be 2MB or smaller";
export const AVATAR_INVALID_FILE_MESSAGE = "Please select a valid image file";

const isFile = (value: unknown): value is File =>
  typeof File !== "undefined" && value instanceof File;

const avatarSchema = z
  .custom<File>((value) => isFile(value), {
    message: AVATAR_INVALID_FILE_MESSAGE,
  })
  .refine((file) => file.size <= AVATAR_MAX_FILE_SIZE, {
    message: AVATAR_SIZE_ERROR_MESSAGE,
  });

// Define the profile form schema
export const profileSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .regex(
      /^[a-zA-Z\s'-]+$/,
      "First name must contain only letters, spaces, hyphens, or apostrophes"
    ),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .regex(
      /^[a-zA-Z\s'-]+$/,
      "Last name must contain only letters, spaces, hyphens, or apostrophes"
    ),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postcode: z.string().optional(),
  avatar: avatarSchema.optional(),
});

// Define the password update schema with conditional validation
export const passwordUpdateSchema = z
  .object({
    username: z.string().min(1, "Username is required"),
    currentPassword: z.string().optional(), // Optional for create password scenario
    password: z.string().min(8, "Password must be at least 8 characters"),
    password_confirmation: z
      .string()
      .min(1, "Password confirmation is required"),
    is_password_set: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    // If password is set, current password is required
    if (data.is_password_set) {
      if (!data.currentPassword || data.currentPassword.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Current password is required",
          path: ["currentPassword"],
        });
      }
    }

    // Password confirmation must match password
    if (data.password !== data.password_confirmation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match",
        path: ["password_confirmation"],
      });
    }
  });
