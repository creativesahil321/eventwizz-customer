"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { DUMMY_BLOG_POSTS } from "./dummy-data";
import { slugifyTitle } from "./schema";
import type { BlogPost, BlogPostInput } from "./types";

interface BlogStoreState {
  posts: BlogPost[];
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  getById: (id: string) => BlogPost | undefined;
  createPost: (input: BlogPostInput) => BlogPost;
  updatePost: (id: string, input: BlogPostInput) => BlogPost | null;
  deletePost: (id: string) => void;
  resetToDummy: () => void;
}

function nextId(posts: BlogPost[]): string {
  const max = posts.reduce((acc, post) => {
    const n = Number(post.id);
    return Number.isFinite(n) ? Math.max(acc, n) : acc;
  }, 0);
  return String(max + 1);
}

function ensureUniqueSlug(base: string, posts: BlogPost[], excludeId?: string) {
  let slug = base || "untitled-post";
  let i = 2;
  while (posts.some((p) => p.slug === slug && p.id !== excludeId)) {
    slug = `${base}-${i}`;
    i += 1;
  }
  return slug;
}

function normalizePost(raw: Partial<BlogPost> & { id: string }): BlogPost {
  return {
    id: raw.id,
    title: raw.title ?? "",
    slug: raw.slug ?? slugifyTitle(raw.title ?? "untitled"),
    excerpt: raw.excerpt ?? "",
    content: raw.content ?? "",
    cover_image: raw.cover_image ?? "",
    status: raw.status === "draft" ? "draft" : "published",
    published_at: raw.published_at ?? new Date().toISOString().slice(0, 10),
    meta_title: raw.meta_title ?? "",
    meta_description: raw.meta_description ?? "",
    meta_keywords: raw.meta_keywords ?? "",
    created_at: raw.created_at ?? new Date().toISOString(),
    updated_at: raw.updated_at ?? new Date().toISOString(),
  };
}

export const useBlogStore = create<BlogStoreState>()(
  persist(
    (set, get) => ({
      posts: DUMMY_BLOG_POSTS,
      hasHydrated: false,

      setHasHydrated: (value) => set({ hasHydrated: value }),

      getById: (id) => get().posts.find((p) => p.id === id),

      createPost: (input) => {
        const now = new Date().toISOString();
        const posts = get().posts;
        const slug = ensureUniqueSlug(
          input.slug || slugifyTitle(input.title),
          posts,
        );
        const post: BlogPost = {
          id: nextId(posts),
          title: input.title,
          slug,
          excerpt: input.excerpt,
          content: input.content,
          cover_image: input.cover_image,
          status: input.status,
          published_at: input.published_at,
          meta_title: input.meta_title ?? "",
          meta_description: input.meta_description ?? "",
          meta_keywords: input.meta_keywords ?? "",
          created_at: now,
          updated_at: now,
        };
        set({ posts: [post, ...posts] });
        return post;
      },

      updatePost: (id, input) => {
        const posts = get().posts;
        const existing = posts.find((p) => p.id === id);
        if (!existing) return null;

        const slug = ensureUniqueSlug(
          input.slug || slugifyTitle(input.title),
          posts,
          id,
        );
        const updated: BlogPost = {
          ...existing,
          title: input.title,
          slug,
          excerpt: input.excerpt,
          content: input.content,
          cover_image: input.cover_image,
          status: input.status,
          published_at: input.published_at,
          meta_title: input.meta_title ?? "",
          meta_description: input.meta_description ?? "",
          meta_keywords: input.meta_keywords ?? "",
          updated_at: new Date().toISOString(),
        };
        set({
          posts: posts.map((p) => (p.id === id ? updated : p)),
        });
        return updated;
      },

      deletePost: (id) => {
        set({ posts: get().posts.filter((p) => p.id !== id) });
      },

      resetToDummy: () => {
        set({ posts: DUMMY_BLOG_POSTS });
      },
    }),
    {
      name: "eventwizz-admin-blog-posts-v2",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ posts: state.posts }),
      onRehydrateStorage: () => (state) => {
        if (state?.posts) {
          state.posts = state.posts.map((post) => normalizePost(post));
        }
        state?.setHasHydrated(true);
      },
    },
  ),
);
