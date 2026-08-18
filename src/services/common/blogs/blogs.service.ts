import { api } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import type { ApiResponse } from "@/services/core/api-client";
import { BLOG_HOME_PER_PAGE, mapApiBlogPost, type BlogApiPost, type BlogPost } from "@/lib/blogs";

export const publicBlogsService = {
  list: async (perPage = BLOG_HOME_PER_PAGE, page = 1): Promise<BlogPost[]> => {
    const response = await api.get<ApiResponse<BlogApiPost[]>>(
      API_ENDPOINTS.COMMON.BLOGS.LIST,
      {
        params: { per_page: perPage, page },
        returnFullResponse: true,
      },
    );
    if (!response?.status || !Array.isArray(response.data)) return [];
    return response.data.map(mapApiBlogPost);
  },
};
