import * as z from "zod";

/**
 * Menu Selection Form Schema
 * Validates attendee menu selection data
 */
export const menuSelectionSchema = z.object({
  title: z.string().optional(),
  fullName: z
    .string()
    .min(1, "Full name is required")
    .trim()
    .refine(
      (val) => val.length >= 2,
      "Full name must be at least 2 characters"
    ),
  menuSelections: z.record(z.string(), z.string()).refine((val) => {
    // Check if there's at least one non-empty selection
    return Object.values(val).some((v) => v && v.trim() !== "");
  }, "Please select at least one menu item"),
  allergens: z.array(z.string()).optional(),
  dietaryRequirements: z.array(z.string()).optional(),
  additionalNotes: z.string().optional(),
});

export type MenuSelectionFormData = z.infer<typeof menuSelectionSchema>;

/**
 * Dynamic validation for menu selections based on available categories
 * Validates that required categories (first 3) have selections
 */
export const createMenuSelectionSchema = (
  menuItems: Array<{ title: string; items: Array<{ id: number }> }>
) => {
  const categoriesWithItems = menuItems.filter((cat) => cat.items.length > 0);
  const requiredCategories = categoriesWithItems.slice(0, 3);

  return menuSelectionSchema.superRefine((data, ctx) => {
    // Validate required categories
    requiredCategories.forEach((category) => {
      const value = data.menuSelections[category.title];
      // Check if value is missing, empty string, or whitespace-only
      if (!value || value.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Please select an item from "${category.title}"`,
          path: ["menuSelections", category.title],
        });
      }
    });
  });
};
