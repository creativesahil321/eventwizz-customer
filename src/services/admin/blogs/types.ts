import type { ApiResponse } from "@/services/core/api-client";
import type {
  BlogApiPost,
  BlogListStats,
  BlogPaginationMeta,
  BlogStatus,
} from "@/lib/blogs";

export interface AdminBlogListParams {
  search?: string;
  status?: "all" | BlogStatus;
  page?: number;
  per_page?: number;
}

export interface AdminBlogListResponse extends ApiResponse<BlogApiPost[]> {
  stats?: BlogListStats;
  links?: Record<string, unknown>;
  meta?: Partial<BlogPaginationMeta> & Record<string, unknown>;
}

export type AdminBlogDetailResponse = ApiResponse<BlogApiPost>;

export interface AdminBlogWritePayload {
  title: string;
  status: BlogStatus;
  excerpt?: string;
  content?: string;
  published_at?: string;
  slug?: string;
  meta_title?: string;
  meta_description?: string;
  featured_image?: File | null;
  remove_featured_image?: boolean;
}
