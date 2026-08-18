import { api } from "@/services/core/api-client";
import { API_ENDPOINTS } from "@/services/core/endpoints";
import type {
  AdminBlogDetailResponse,
  AdminBlogListParams,
  AdminBlogListResponse,
  AdminBlogWritePayload,
} from "./types";

function buildFormData(payload: AdminBlogWritePayload): FormData {
  const formData = new FormData();
  formData.append("title", payload.title);
  formData.append("status", payload.status);

  if (payload.excerpt != null) formData.append("excerpt", payload.excerpt);
  if (payload.content != null) formData.append("content", payload.content);
  if (payload.published_at) formData.append("published_at", payload.published_at);
  if (payload.slug) formData.append("slug", payload.slug);
  if (payload.meta_title != null) {
    formData.append("meta_title", payload.meta_title);
  }
  if (payload.meta_description != null) {
    formData.append("meta_description", payload.meta_description);
  }
  if (payload.featured_image instanceof File) {
    formData.append("featured_image", payload.featured_image);
  }
  if (payload.remove_featured_image) {
    formData.append("remove_featured_image", "1");
  }

  return formData;
}

const multipartHeaders = {
  "Content-Type": "multipart/form-data",
};

export const adminBlogsService = {
  list: (params: AdminBlogListParams = {}) => {
    const query: Record<string, string | number> = {};
    if (params.search?.trim()) query.search = params.search.trim();
    if (params.status) query.status = params.status;
    if (params.page != null) query.page = Math.max(1, params.page);
    if (params.per_page != null) {
      query.per_page = Math.min(100, Math.max(1, params.per_page));
    }

    return api.get<AdminBlogListResponse>(API_ENDPOINTS.ADMIN.BLOGS.LIST, {
      params: Object.keys(query).length ? query : undefined,
      returnFullResponse: true,
    });
  },

  show: (slug: string) => {
    const url = API_ENDPOINTS.ADMIN.BLOGS.SHOW.replace(
      "{slug}",
      encodeURIComponent(slug),
    );
    return api.get<AdminBlogDetailResponse>(url, { returnFullResponse: true });
  },

  create: (payload: AdminBlogWritePayload) => {
    return api.post<AdminBlogDetailResponse>(
      API_ENDPOINTS.ADMIN.BLOGS.STORE,
      buildFormData(payload),
      {
        headers: multipartHeaders,
        returnFullResponse: true,
      },
    );
  },

  update: (slug: string, payload: AdminBlogWritePayload) => {
    const url = API_ENDPOINTS.ADMIN.BLOGS.UPDATE.replace(
      "{slug}",
      encodeURIComponent(slug),
    );
    return api.post<AdminBlogDetailResponse>(url, buildFormData(payload), {
      headers: multipartHeaders,
      returnFullResponse: true,
    });
  },

  delete: (slug: string) => {
    const url = API_ENDPOINTS.ADMIN.BLOGS.DELETE.replace(
      "{slug}",
      encodeURIComponent(slug),
    );
    return api.delete<AdminBlogDetailResponse>(url, {
      returnFullResponse: true,
    });
  },
};
