import * as z from "zod";

/**
 * Schema for creating new roles
 */
export const createRoleSchema = z.object({
  slug: z
    .string()
    .min(2, {
      message: "Slug must be at least 2 characters.",
    })
    .max(50)
    .regex(/^[a-z0-9-]+$/, {
      message: "Slug can only contain lowercase letters, numbers, and hyphens.",
    }),
  label: z
    .string()
    .min(2, {
      message: "Label must be at least 2 characters.",
    })
    .max(50),
  permissions: z.array(z.number()).min(1, {
    message: "Select at least one permission.",
  }),
});

/**
 * Schema for updating role permissions
 */
export const updatePermissionsSchema = z.object({
  slug: z
    .string()
    .min(2, {
      message: "Slug must be at least 2 characters.",
    })
    .max(50)
    .regex(/^[a-z0-9-]+$/, {
      message: "Slug can only contain lowercase letters, numbers, and hyphens.",
    }),
  label: z
    .string()
    .min(2, {
      message: "Label must be at least 2 characters.",
    })
    .max(50),
});

// Export types that can be used in components
export type CreateRoleFormValues = z.infer<typeof createRoleSchema>;
export type UpdatePermissionsFormValues = z.infer<
  typeof updatePermissionsSchema
>;
