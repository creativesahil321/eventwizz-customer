import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { BLOG_ADMIN_PER_PAGE, mapApiBlogPost } from "@/lib/blogs";
import { publicBlogKeys } from "@/services/common/blogs";
import { adminBlogsService } from "./blogs.service";
import type { AdminBlogListParams, AdminBlogWritePayload } from "./types";

export const adminBlogKeys = {
  all: ["admin", "blogs"] as const,
  lists: () => [...adminBlogKeys.all, "list"] as const,
  list: (params: AdminBlogListParams) =>
    [...adminBlogKeys.lists(), params] as const,
  details: () => [...adminBlogKeys.all, "detail"] as const,
  detail: (slug: string) => [...adminBlogKeys.details(), slug] as const,
};

function invalidateBlogQueries(queryClient: QueryClient, slug?: string) {
  queryClient.invalidateQueries({ queryKey: adminBlogKeys.all });
  queryClient.invalidateQueries({ queryKey: publicBlogKeys.all });
  if (slug) {
    queryClient.invalidateQueries({ queryKey: adminBlogKeys.detail(slug) });
  }
}

export function useAdminBlogs(params: AdminBlogListParams) {
  return useQuery({
    queryKey: adminBlogKeys.list(params),
    queryFn: async () => {
      const response = await adminBlogsService.list(params);
      const rows = Array.isArray(response.data) ? response.data : [];
      const meta = response.meta ?? {};
      return {
        posts: rows.map(mapApiBlogPost),
        stats: {
          total: Number(response.stats?.total ?? meta.total ?? rows.length),
          published: Number(response.stats?.published ?? 0),
          drafts: Number(response.stats?.drafts ?? 0),
        },
        meta: {
          current_page: Number(meta.current_page ?? params.page ?? 1),
          last_page: Number(meta.last_page ?? 1),
          per_page: Number(meta.per_page ?? params.per_page ?? BLOG_ADMIN_PER_PAGE),
          total: Number(meta.total ?? rows.length),
        },
      };
    },
    placeholderData: (previous) => previous,
  });
}

export function useAdminBlog(slug: string) {
  return useQuery({
    queryKey: adminBlogKeys.detail(slug),
    queryFn: async () => {
      const response = await adminBlogsService.show(slug);
      if (!response?.status || !response.data) {
        throw new Error(
          typeof response?.message === "string"
            ? response.message
            : "Failed to load blog post",
        );
      }
      return mapApiBlogPost(response.data);
    },
    enabled: Boolean(slug),
  });
}

export function useCreateAdminBlog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminBlogWritePayload) =>
      adminBlogsService.create(payload),
    onSuccess: () => invalidateBlogQueries(queryClient),
  });
}

export function useUpdateAdminBlog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      slug,
      payload,
    }: {
      slug: string;
      payload: AdminBlogWritePayload;
    }) => adminBlogsService.update(slug, payload),
    onSuccess: (_data, variables) =>
      invalidateBlogQueries(queryClient, variables.slug),
  });
}

export function useDeleteAdminBlog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => adminBlogsService.delete(slug),
    onSuccess: () => invalidateBlogQueries(queryClient),
  });
}
