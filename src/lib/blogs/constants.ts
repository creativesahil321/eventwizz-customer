export const BLOG_ADMIN_PATH = "/admin/blog-management";

export const blogAdminPaths = {
  list: BLOG_ADMIN_PATH,
  create: `${BLOG_ADMIN_PATH}/create`,
  edit: (slug: string) => `${BLOG_ADMIN_PATH}/edit/${encodeURIComponent(slug)}`,
} as const;

export const blogPublicPaths = {
  list: "/blog",
  article: (slug: string) => `/blog/${encodeURIComponent(slug)}`,
} as const;

export const BLOG_HOME_PER_PAGE = 3;
export const BLOG_LIST_PER_PAGE = 12;
export const BLOG_ADMIN_PER_PAGE = 12;
export const BLOG_TITLE_MIN = 3;
export const BLOG_TITLE_MAX = 120;
export const BLOG_EXCERPT_MAX = 280;
export const BLOG_META_TITLE_MAX = 70;
export const BLOG_META_DESCRIPTION_MAX = 160;
export const BLOG_PUBLISH_CONTENT_MIN = 20;
export const BLOG_FEATURED_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const BLOG_FEATURED_IMAGE_ACCEPT: Record<string, string[]> = {
  "image/png": [],
  "image/jpeg": [],
  "image/jpg": [],
  "image/webp": [],
};

export const BLOG_FEATURED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;
