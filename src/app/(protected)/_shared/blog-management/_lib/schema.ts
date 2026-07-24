import { z } from "zod";

export const blogFormSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(120, "Title must be 120 characters or less"),
  excerpt: z
    .string()
    .min(20, "Excerpt must be at least 20 characters")
    .max(280, "Excerpt must be 280 characters or less"),
  content: z
    .string()
    .min(40, "Article body must be at least 40 characters")
    .refine(
      (html) => {
        const text = html.replace(/<[^>]*>/g, "").trim();
        return text.length >= 20;
      },
      { message: "Write a bit more content for the article body" },
    ),
  cover_image: z.string().min(1, "Add a featured image"),
  status: z.enum(["draft", "published"]),
  published_at: z
    .string()
    .min(1, "Publication date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date"),
  meta_title: z
    .string()
    .max(70, "Meta title should be 70 characters or less")
    .optional()
    .or(z.literal("")),
  meta_description: z
    .string()
    .max(160, "Meta description should be 160 characters or less")
    .optional()
    .or(z.literal("")),
  meta_keywords: z
    .string()
    .max(200, "Keywords should be 200 characters or less")
    .optional()
    .or(z.literal("")),
});

export type BlogFormValues = z.infer<typeof blogFormSchema>;

export { formatBlogDate, slugifyTitle } from "@/lib/blogs";
