export type BlogStatus = "draft" | "published";

export interface BlogAdjacentPost {
  title: string;
  slug: string;
}

export interface BlogPost {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string;
  status: BlogStatus;
  published_at: string;
  meta_title: string;
  meta_description: string;
  previous?: BlogAdjacentPost | null;
  next?: BlogAdjacentPost | null;
}

export interface BlogListStats {
  total: number;
  published: number;
  drafts: number;
}

export interface BlogPaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

/** Raw Laravel list/show payload (`featured_image` instead of `cover_image`). */
export interface BlogApiPost {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  featured_image?: string | null;
  status?: BlogStatus | string;
  published_at?: string | null;
  meta_title?: string;
  meta_description?: string;
  previous?: BlogAdjacentPost | null;
  next?: BlogAdjacentPost | null;
}
