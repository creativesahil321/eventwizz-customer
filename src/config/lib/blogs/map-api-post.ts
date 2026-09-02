import type { BlogApiPost, BlogPost, BlogStatus } from "./types";

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asStatus(value: unknown): BlogStatus {
  return value === "draft" ? "draft" : "published";
}

export function mapApiBlogPost(raw: BlogApiPost | null | undefined): BlogPost {
  const post = raw ?? {};
  return {
    title: asString(post.title),
    slug: asString(post.slug),
    excerpt: asString(post.excerpt),
    content: asString(post.content),
    cover_image: asString(post.featured_image),
    status: asStatus(post.status),
    published_at: asString(post.published_at).slice(0, 10),
    meta_title: asString(post.meta_title),
    meta_description: asString(post.meta_description),
    previous: post.previous ?? null,
    next: post.next ?? null,
  };
}
