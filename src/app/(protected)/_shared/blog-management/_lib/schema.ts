import { z } from "zod";
import {
  BLOG_EXCERPT_MAX,
  BLOG_FEATURED_IMAGE_MAX_BYTES,
  BLOG_FEATURED_IMAGE_TYPES,
  BLOG_META_DESCRIPTION_MAX,
  BLOG_META_TITLE_MAX,
  BLOG_PUBLISH_CONTENT_MIN,
  BLOG_TITLE_MAX,
  BLOG_TITLE_MIN,
} from "@/lib/blogs";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

export function stripBlogHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isValidBlogIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** Local calendar date as `YYYY-MM-DD` (matches `<input type="date">`). */
export function localIsoDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Publication picker bounds: last 5 years through today (no future dates). */
export function blogPublicationDateBounds() {
  const max = localIsoDate();
  const oldest = new Date();
  oldest.setFullYear(oldest.getFullYear() - 5);
  return { min: localIsoDate(oldest), max };
}

function isAllowedBlogImageType(mime: string): boolean {
  return (BLOG_FEATURED_IMAGE_TYPES as readonly string[]).includes(
    mime.toLowerCase(),
  );
}

export function getBlogImageError(file: File): string | null {
  if (!isAllowedBlogImageType(file.type) && !IMAGE_EXT.test(file.name)) {
    return "Use a JPG, PNG or WebP image.";
  }
  if (file.size > BLOG_FEATURED_IMAGE_MAX_BYTES) {
    return "Image must be 5MB or less.";
  }
  return null;
}

export const blogFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(BLOG_TITLE_MIN, "Title must be at least 3 characters")
      .max(BLOG_TITLE_MAX, `Title must be ${BLOG_TITLE_MAX} characters or less`),
    excerpt: z
      .string()
      .trim()
      .max(
        BLOG_EXCERPT_MAX,
        `Excerpt must be ${BLOG_EXCERPT_MAX} characters or less`,
      ),
    content: z.string(),
    cover_image: z.string(),
    status: z.enum(["draft", "published"]),
    published_at: z.string(),
    meta_title: z
      .string()
      .trim()
      .max(
        BLOG_META_TITLE_MAX,
        `Meta title should be ${BLOG_META_TITLE_MAX} characters or less`,
      ),
    meta_description: z
      .string()
      .trim()
      .max(
        BLOG_META_DESCRIPTION_MAX,
        `Meta description should be ${BLOG_META_DESCRIPTION_MAX} characters or less`,
      ),
  })
  .superRefine((values, ctx) => {
    if (values.published_at && !isValidBlogIsoDate(values.published_at)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["published_at"],
        message: "Use a valid publication date",
      });
    } else if (values.published_at) {
      const { min, max } = blogPublicationDateBounds();
      if (values.published_at < min || values.published_at > max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["published_at"],
          message:
            "Publication date must be within the last 5 years and cannot be in the future",
        });
      }
    }

    if (!values.cover_image.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cover_image"],
        message: "Featured image is required",
      });
    }

    if (/data:image\//i.test(values.content)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["content"],
        message:
          "Inline images must be uploaded. Use the image button instead of pasting files.",
      });
    }

    if (values.status !== "published") return;

    if (!values.published_at) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["published_at"],
        message: "Publication date is required to publish",
      });
    }

    if (!values.excerpt.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["excerpt"],
        message: "Add a short excerpt before publishing",
      });
    }

    if (stripBlogHtml(values.content).length < BLOG_PUBLISH_CONTENT_MIN) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["content"],
        message: "Write the article body before publishing",
      });
    }
  });

export type BlogFormValues = z.infer<typeof blogFormSchema>;
