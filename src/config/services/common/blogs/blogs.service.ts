import { api } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import type { ApiResponse } from "@/services/core/api-client";
import {
  BLOG_HOME_PER_PAGE,
  mapApiBlogPost,
  type BlogApiPost,
  type BlogPaginationMeta,
  type BlogPost,
} from "@/lib/blogs";

export interface PublicBlogListResult {
  posts: BlogPost[];
  total: number;
}

interface PublicBlogListResponse extends ApiResponse<BlogApiPost[]> {
  meta?: Partial<BlogPaginationMeta> & Record<string, unknown>;
}

export const publicBlogsService = {
  list: async (
    perPage = BLOG_HOME_PER_PAGE,
    page = 1,
  ): Promise<PublicBlogListResult> => {
    const response = await api.get<PublicBlogListResponse>(
      API_ENDPOINTS.COMMON.BLOGS.LIST,
      {
        params: { per_page: perPage, page },
        returnFullResponse: true,
      },
    );
    if (!response?.status || !Array.isArray(response.data)) {
      return { posts: [], total: 0 };
    }
    const posts = response.data.map(mapApiBlogPost);
    return {
      posts,
      total: Number(response.meta?.total ?? posts.length),
    };
  },
};
