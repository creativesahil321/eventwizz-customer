import { DUMMY_BLOG_POSTS } from "./dummy-posts";
import type { BlogPost } from "./types";

export type { BlogPost, BlogStatus, BlogPostInput } from "./types";
export { DUMMY_BLOG_POSTS } from "./dummy-posts";

export function formatBlogDate(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Editorial metadata style: "April 8, 2024" */
export function formatBlogDateLong(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
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

/** Published posts for the public marketing site (home cards + article pages). */
export function getPublishedBlogPosts(
  posts: BlogPost[] = DUMMY_BLOG_POSTS,
): BlogPost[] {
  return posts
    .filter((post) => post.status === "published")
    .sort(
      (a, b) =>
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime(),
    );
}

export function getBlogPostBySlug(
  slug: string,
  posts: BlogPost[] = DUMMY_BLOG_POSTS,
): BlogPost | undefined {
  return posts.find(
    (post) => post.slug === slug && post.status === "published",
  );
}

export function getBlogPostSlugs(
  posts: BlogPost[] = DUMMY_BLOG_POSTS,
): string[] {
  return getPublishedBlogPosts(posts).map((post) => post.slug);
}

export function getAdjacentBlogPosts(
  slug: string,
  posts: BlogPost[] = DUMMY_BLOG_POSTS,
): { previous: BlogPost | null; next: BlogPost | null } {
  const published = getPublishedBlogPosts(posts);
  const index = published.findIndex((post) => post.slug === slug);
  if (index === -1) return { previous: null, next: null };

  return {
    previous: published[index + 1] ?? null,
    next: published[index - 1] ?? null,
  };
}

export function resolveBlogMeta(post: BlogPost) {
  return {
    title: post.meta_title?.trim() || `${post.title} | EventWizz`,
    description: post.meta_description?.trim() || post.excerpt,
  };
}
