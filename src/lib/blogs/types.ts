export type BlogStatus = "draft" | "published";

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  /** HTML body from TipTap (may include inline images) */
  content: string;
  /** Cover image URL */
  cover_image: string;
  status: BlogStatus;
  /** ISO date string (YYYY-MM-DD) */
  published_at: string;
  /** SEO meta title (falls back to title when empty) */
  meta_title: string;
  /** SEO meta description (falls back to excerpt when empty) */
  meta_description: string;
  /** Comma-separated SEO keywords */
  meta_keywords: string;
  created_at: string;
  updated_at: string;
}

export type BlogPostInput = Omit<
  BlogPost,
  "id" | "created_at" | "updated_at" | "slug"
> & {
  slug?: string;
};
