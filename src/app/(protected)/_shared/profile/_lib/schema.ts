import { z } from "zod";
import { getImageDimensions } from "@/components/ui/image-cropper/crop-utils";

// Profile validation constants
export const AVATAR_MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
export const AVATAR_MIN_DIMENSION = 200; // Minimum width/height in pixels
export const AVATAR_SIZE_ERROR_MESSAGE = "Avatar must be 2MB or smaller";
export const AVATAR_INVALID_FILE_MESSAGE = "Please select a valid image file";
export const AVATAR_DIMENSION_ERROR_MESSAGE = `Avatar must be at least ${AVATAR_MIN_DIMENSION}x${AVATAR_MIN_DIMENSION} pixels`;
export const AVATAR_INVALID_TYPE_MESSAGE = "Only JPEG, PNG, and WebP images are allowed";

// Field length limits
export const FIRST_NAME_MIN_LENGTH = 2;
export const FIRST_NAME_MAX_LENGTH = 50;
export const LAST_NAME_MIN_LENGTH = 2;
export const LAST_NAME_MAX_LENGTH = 50;
export const PHONE_MIN_LENGTH = 10;
export const PHONE_MAX_LENGTH = 15;
export const ADDRESS_MAX_LENGTH = 255;
export const CITY_MAX_LENGTH = 100;
export const POSTCODE_MAX_LENGTH = 20;

// Allowed image MIME types
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const isFile = (value: unknown): value is File =>
  typeof File !== "undefined" && value instanceof File;

const avatarSchema = z
  .custom<File>((value) => {
    if (!value) return true; // Optional field
    return isFile(value);
  }, {
    message: AVATAR_INVALID_FILE_MESSAGE,
  })
  .refine(
    (file) => {
      if (!file) return true; // Optional field
      return file.size <= AVATAR_MAX_FILE_SIZE;
    },
    {
      message: AVATAR_SIZE_ERROR_MESSAGE,
    }
  )
  .refine(
    (file) => {
      if (!file) return true; // Optional field
      return ALLOWED_IMAGE_TYPES.includes(file.type);
    },
    {
      message: AVATAR_INVALID_TYPE_MESSAGE,
    }
  );

// Define the profile form schema
export const profileSchema = z.object({
  firstName: z
    .string()
    .min(FIRST_NAME_MIN_LENGTH, `First name must be at least ${FIRST_NAME_MIN_LENGTH} characters`)
    .max(FIRST_NAME_MAX_LENGTH, `First name must not exceed ${FIRST_NAME_MAX_LENGTH} characters`)
    .regex(
      /^[a-zA-Z\s'-]+$/,
      "First name must contain only letters, spaces, hyphens, or apostrophes"
    ),
  lastName: z
    .string()
    .min(LAST_NAME_MIN_LENGTH, `Last name must be at least ${LAST_NAME_MIN_LENGTH} characters`)
    .max(LAST_NAME_MAX_LENGTH, `Last name must not exceed ${LAST_NAME_MAX_LENGTH} characters`)
    .regex(
      /^[a-zA-Z\s'-]+$/,
      "Last name must contain only letters, spaces, hyphens, or apostrophes"
    ),
  phone: z
    .string()
    .transform((val) => (val?.trim() === "" ? undefined : val))
    .optional()
    .refine(
      (value) => {
        if (!value) return true; // Optional field
        // Remove spaces, dashes, parentheses, and plus signs for validation
        const digitsOnly = value.replace(/[\s\-+()]/g, "");
        return (
          digitsOnly.length >= PHONE_MIN_LENGTH &&
          digitsOnly.length <= PHONE_MAX_LENGTH &&
          /^\d+$/.test(digitsOnly)
        );
      },
      {
        message: `Phone number must be ${PHONE_MIN_LENGTH}-${PHONE_MAX_LENGTH} digits`,
      }
    ),
  address: z
    .string()
    .max(ADDRESS_MAX_LENGTH, `Address must not exceed ${ADDRESS_MAX_LENGTH} characters`)
    .optional(),
  city: z
    .string()
    .max(CITY_MAX_LENGTH, `City must not exceed ${CITY_MAX_LENGTH} characters`)
    .optional(),
  postcode: z
    .string()
    .max(POSTCODE_MAX_LENGTH, `Postcode must not exceed ${POSTCODE_MAX_LENGTH} characters`)
    .regex(/^[A-Za-z0-9\s\-]*$/, "Postcode can only contain letters, numbers, spaces, and hyphens")
    .optional(),
  avatar: avatarSchema.optional(),
});

/**
 * Validates avatar file including dimensions
 * This is an async function that should be called in components when files are selected
 */
export async function validateAvatarFile(file: File): Promise<{
  valid: boolean;
  error?: string;
}> {
  // Check file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: AVATAR_INVALID_TYPE_MESSAGE,
    };
  }

  // Check file size
  if (file.size > AVATAR_MAX_FILE_SIZE) {
    return {
      valid: false,
      error: AVATAR_SIZE_ERROR_MESSAGE,
    };
  }

  // Check dimensions
  try {
    const { width, height } = await getImageDimensions(file);
    if (width < AVATAR_MIN_DIMENSION || height < AVATAR_MIN_DIMENSION) {
      return {
        valid: false,
        error: AVATAR_DIMENSION_ERROR_MESSAGE,
      };
    }
  } catch (error) {
    console.error("Failed to read image dimensions:", error);
    return {
      valid: false,
      error: "Failed to read image dimensions. Please try another image.",
    };
  }

  return { valid: true };
}

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
