import type { BlogPost } from "./types";

export type {
  BlogAdjacentPost,
  BlogApiPost,
  BlogListStats,
  BlogPaginationMeta,
  BlogPost,
  BlogStatus,
} from "./types";
export { mapApiBlogPost } from "./map-api-post";
export {
  BLOG_ADMIN_PATH,
  BLOG_ADMIN_PER_PAGE,
  BLOG_EXCERPT_MAX,
  BLOG_FEATURED_IMAGE_ACCEPT,
  BLOG_FEATURED_IMAGE_MAX_BYTES,
  BLOG_FEATURED_IMAGE_TYPES,
  BLOG_HOME_PER_PAGE,
  BLOG_LIST_PER_PAGE,
  BLOG_META_DESCRIPTION_MAX,
  BLOG_META_TITLE_MAX,
  BLOG_PUBLISH_CONTENT_MIN,
  BLOG_TITLE_MAX,
  BLOG_TITLE_MIN,
  blogAdminPaths,
  blogPublicPaths,
} from "./constants";

function parseBlogDate(isoDate: string): Date | null {
  if (!isoDate) return null;
  const date = new Date(`${isoDate.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatBlogDate(isoDate: string): string {
  const date = parseBlogDate(isoDate);
  if (!date) return isoDate || "";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatBlogDateLong(isoDate: string): string {
  const date = parseBlogDate(isoDate);
  if (!date) return isoDate || "";
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function resolveBlogMeta(post: BlogPost) {
  return {
    title: post.meta_title?.trim() || `${post.title} | EventWizz`,
    description: post.meta_description?.trim() || post.excerpt,
  };
}
