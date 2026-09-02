import { useQuery } from "@tanstack/react-query";
import { BLOG_HOME_PER_PAGE } from "@/lib/blogs";
import { publicBlogsService } from "./blogs.service";

export const publicBlogKeys = {
  all: ["public", "blogs"] as const,
  list: (perPage: number, page: number) =>
    [...publicBlogKeys.all, "list", perPage, page] as const,
};

export function usePublicBlogs(perPage = BLOG_HOME_PER_PAGE, page = 1) {
  return useQuery({
    queryKey: publicBlogKeys.list(perPage, page),
    queryFn: () => publicBlogsService.list(perPage, page),
    staleTime: 60 * 1000,
  });
}
