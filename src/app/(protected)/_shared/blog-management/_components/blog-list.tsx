"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, Pencil, PlusCircle, Search, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDebounce } from "@/hooks/data-table/use-debounce";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  BLOG_ADMIN_PER_PAGE,
  blogAdminPaths,
  formatBlogDate,
  type BlogPost,
  type BlogStatus,
} from "@/lib/blogs";
import { shouldUseNextImageOptimization } from "@/lib/image-utils";
import { useAdminBlogs, useDeleteAdminBlog } from "@/services/admin/blogs";
import { BlogCardPreview } from "./blog-card-preview";
import { BlogListSkeleton } from "./skeleton-loader";

type ViewMode = "table" | "cards";
type StatusFilter = "all" | BlogStatus;

export function BlogList() {
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const deleteBlog = useDeleteAdminBlog();

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [page, setPage] = React.useState(1);
  const [viewMode, setViewMode] = React.useState<ViewMode>("cards");
  const [deleteTarget, setDeleteTarget] = React.useState<BlogPost | null>(null);

  const debouncedSearch = useDebounce(search, 400);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  React.useEffect(() => {
    if (isMobile) setViewMode("cards");
  }, [isMobile]);

  const { data, isLoading, isFetching } = useAdminBlogs({
    search: debouncedSearch || undefined,
    status: statusFilter,
    page,
    per_page: BLOG_ADMIN_PER_PAGE,
  });

  const posts = data?.posts ?? [];
  const stats = data?.stats ?? { total: 0, published: 0, drafts: 0 };
  const meta = data?.meta;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteBlog.mutateAsync(deleteTarget.slug);
      setDeleteTarget(null);
    } catch {
      // interceptor toasts
    }
  };

  const effectiveView: ViewMode = isMobile ? "cards" : viewMode;

  if (isLoading && !data) {
    return <BlogListSkeleton />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Published" value={stats.published} accent="green" />
        <StatCard label="Drafts" value={stats.drafts} accent="amber" />
      </div>

      <div className="rounded-lg border border-[var(--color-border)] bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, excerpt..."
              className="pl-9"
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilter)}
            >
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>

            {!isMobile ? (
              <div className="flex rounded-md border border-[var(--color-border)] p-0.5">
                <Button
                  type="button"
                  size="sm"
                  variant={viewMode === "table" ? "event-primary" : "ghost"}
                  className="h-8"
                  onClick={() => setViewMode("table")}
                >
                  Table
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={viewMode === "cards" ? "event-primary" : "ghost"}
                  className="h-8"
                  onClick={() => setViewMode("cards")}
                >
                  Cards
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-white px-4 py-12 text-center sm:px-6 sm:py-16">
          <p className="text-lg font-semibold text-foreground">No posts found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a different search, or create your first blog post.
          </p>
          <Link
            href={blogAdminPaths.create}
            className="mt-4 inline-block w-full sm:w-auto"
          >
            <Button variant="event-primary" className="w-full gap-1.5 sm:w-auto">
              <PlusCircle className="h-4 w-4" />
              Create blog
            </Button>
          </Link>
        </div>
      ) : effectiveView === "cards" ? (
        <div
          className={`grid gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3 ${isFetching ? "opacity-70" : ""}`}
        >
          {posts.map((post) => (
            <div key={post.slug} className="relative overflow-hidden rounded-2xl">
              <BlogCardPreview
                title={post.title}
                excerpt={post.excerpt}
                publishedAt={post.published_at}
                coverImage={post.cover_image}
                usePlaceholders={false}
              />
              <div className="absolute inset-x-0 bottom-0 flex gap-2 bg-gradient-to-t from-black/55 via-black/25 to-transparent p-3 pt-10">
                <Button
                  size="sm"
                  variant="event-primary"
                  className="h-9 flex-1 shadow-md"
                  onClick={() =>
                    router.push(blogAdminPaths.edit(post.slug))
                  }
                >
                  <Pencil className="mr-1 h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-9 shrink-0 shadow-md"
                  onClick={() => setDeleteTarget(post)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="border-b border-[var(--color-border)] bg-slate-50 text-muted-foreground">
                <tr>
                  <th className="w-12 px-3 py-3 font-medium sm:px-4">#</th>
                  <th className="px-3 py-3 font-medium sm:px-4">Post</th>
                  <th className="w-28 px-3 py-3 font-medium sm:px-4">Status</th>
                  <th className="w-32 px-3 py-3 font-medium sm:px-4">
                    Published
                  </th>
                  <th className="w-28 px-3 py-3 font-medium sm:px-4">Meta</th>
                  <th className="w-32 px-3 py-3 font-medium text-right sm:px-4">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post, index) => (
                  <tr
                    key={post.slug}
                    className="border-b border-[var(--color-border)] last:border-0 hover:bg-slate-50/80"
                  >
                    <td className="px-3 py-3 text-muted-foreground sm:px-4">
                      {(page - 1) * (meta?.per_page ?? BLOG_ADMIN_PER_PAGE) +
                        index +
                        1}
                    </td>
                    <td className="max-w-0 px-3 py-3 sm:px-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-slate-100">
                          {post.cover_image ? (
                            <Image
                              src={post.cover_image}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="64px"
                              unoptimized={
                                !shouldUseNextImageOptimization(post.cover_image)
                              }
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <p className="truncate font-semibold text-foreground">
                            {post.title}
                          </p>
                          <p className="mt-0.5 line-clamp-2 break-words text-xs text-muted-foreground">
                            {post.excerpt}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 sm:px-4">
                      <StatusBadge status={post.status} />
                    </td>
                    <td className="px-3 py-3 text-muted-foreground sm:px-4">
                      {formatBlogDate(post.published_at)}
                    </td>
                    <td className="px-3 py-3 sm:px-4">
                      {post.meta_title || post.meta_description ? (
                        <Badge variant="outline" className="font-normal">
                          SEO set
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Uses defaults
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 sm:px-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          title="Edit"
                          onClick={() =>
                            router.push(blogAdminPaths.edit(post.slug))
                          }
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          title="Card view"
                          onClick={() => setViewMode("cards")}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          title="Delete"
                          onClick={() => setDeleteTarget(post)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {meta && meta.last_page > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Page {meta.current_page} of {meta.last_page}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="event-outline"
              size="sm"
              disabled={page <= 1 || isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="event-outline"
              size="sm"
              disabled={page >= meta.last_page || isFetching}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="mx-4 max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this blog post?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleteTarget?.title}” will be permanently deleted, including its
              featured image.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel className="m-0 w-full sm:w-auto">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              className="m-0 w-full bg-destructive text-white hover:bg-destructive/90 sm:w-auto"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "green" | "amber";
}) {
  const valueClass =
    accent === "green"
      ? "text-emerald-600"
      : accent === "amber"
        ? "text-amber-600"
        : "text-foreground";

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-white px-2.5 py-2.5 shadow-sm sm:px-4 sm:py-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
        {label}
      </p>
      <p className={`mt-0.5 text-xl font-bold sm:mt-1 sm:text-2xl ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: BlogStatus }) {
  if (status === "published") {
    return (
      <Badge className="border-transparent bg-emerald-100 text-emerald-800">
        Published
      </Badge>
    );
  }
  return (
    <Badge className="border-transparent bg-amber-100 text-amber-800">
      Draft
    </Badge>
  );
}
