import * as z from "zod";

/**
 * Schema for editing staff members
 */
export const editStaffSchema = z
  .object({
    first_name: z
      .string()
      .min(2, {
        message: "First name must be at least 2 characters.",
      })
      .regex(/^[a-zA-Z\s'-]+$/, {
        message:
          "First name must contain only letters, spaces, hyphens, or apostrophes.",
      }),
    last_name: z
      .string()
      .min(2, {
        message: "Last name must be at least 2 characters.",
      })
      .regex(/^[a-zA-Z\s'-]+$/, {
        message:
          "Last name must contain only letters, spaces, hyphens, or apostrophes.",
      }),
    email: z.string().email({
      message: "Please enter a valid email address.",
    }),
    phone: z.string().optional(),
    role_id: z.coerce.number({
      required_error: "Please select a role.",
    }),
    password: z
      .string()
      .refine(
        (val) => {
          // Either empty or at least 8 characters
          return val === "" || val.length >= 8;
        },
        {
          message: "Password must be at least 8 characters if provided.",
        }
      )
      .optional(),
    confirmPassword: z.string().optional(),
    status: z.enum(["active", "inactive"]),
  })
  .refine(
    (data) => {
      // If password is provided, confirmPassword must match
      if (
        data.password &&
        data.password.trim() !== "" &&
        data.password !== data.confirmPassword
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Passwords don't match",
      path: ["confirmPassword"],
    }
  );

/**
 * Schema for creating new staff members
 */
export const createStaffSchema = z
  .object({
    first_name: z
      .string()
      .min(2, {
        message: "First name must be at least 2 characters.",
      })
      .regex(/^[a-zA-Z\s'-]+$/, {
        message:
          "First name must contain only letters, spaces, hyphens, or apostrophes.",
      }),
    last_name: z
      .string()
      .min(2, {
        message: "Last name must be at least 2 characters.",
      })
      .regex(/^[a-zA-Z\s'-]+$/, {
        message:
          "Last name must contain only letters, spaces, hyphens, or apostrophes.",
      }),
    email: z.string().email({
      message: "Please enter a valid email address.",
    }),
    phone: z.string().optional(),
    role_id: z.coerce.number({
      required_error: "Please select a role.",
    }),
    password: z.string().min(8, {
      message: "Password must be at least 8 characters.",
    }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// Export types that can be used in components
export type EditStaffFormValues = z.infer<typeof editStaffSchema>;
export type CreateStaffFormValues = z.infer<typeof createStaffSchema>;
