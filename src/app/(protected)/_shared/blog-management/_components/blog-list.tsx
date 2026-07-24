"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Eye,
  Pencil,
  PlusCircle,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

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
import { useBlogStore } from "../_lib/blog-store";
import { formatBlogDate } from "../_lib/schema";
import type { BlogPost, BlogStatus } from "@/lib/blogs";
import { BlogCardPreview } from "./blog-card-preview";

type ViewMode = "table" | "cards";
type StatusFilter = "all" | BlogStatus;

export function BlogList() {
  const router = useRouter();
  const posts = useBlogStore((s) => s.posts);
  const deletePost = useBlogStore((s) => s.deletePost);
  const resetToDummy = useBlogStore((s) => s.resetToDummy);

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [viewMode, setViewMode] = React.useState<ViewMode>("table");
  const [deleteTarget, setDeleteTarget] = React.useState<BlogPost | null>(null);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return posts.filter((post) => {
      if (statusFilter !== "all" && post.status !== statusFilter) return false;
      if (!q) return true;
      return (
        post.title.toLowerCase().includes(q) ||
        post.excerpt.toLowerCase().includes(q) ||
        post.meta_title.toLowerCase().includes(q) ||
        post.meta_keywords.toLowerCase().includes(q)
      );
    });
  }, [posts, search, statusFilter]);

  const publishedCount = posts.filter((p) => p.status === "published").length;
  const draftCount = posts.filter((p) => p.status === "draft").length;

  const handleDelete = () => {
    if (!deleteTarget) return;
    deletePost(deleteTarget.id);
    toast.success(`Deleted “${deleteTarget.title}”`);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Total posts" value={posts.length} />
        <StatCard label="Published" value={publishedCount} accent="green" />
        <StatCard label="Drafts" value={draftCount} accent="amber" />
      </div>

      <div className="rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, excerpt, meta..."
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilter)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>

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

            <Button
              type="button"
              variant="event-outline"
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => {
                resetToDummy();
                toast.success("Reset to sample blog posts");
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset demo
            </Button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-white px-6 py-16 text-center">
          <p className="text-lg font-semibold text-foreground">No posts found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a different search, or create your first blog post.
          </p>
          <Link href="/admin/blog-management/create" className="mt-4 inline-block">
            <Button variant="event-primary" className="gap-1.5">
              <PlusCircle className="h-4 w-4" />
              Create blog
            </Button>
          </Link>
        </div>
      ) : viewMode === "cards" ? (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((post) => (
            <div key={post.id} className="group relative">
              <BlogCardPreview
                title={post.title}
                excerpt={post.excerpt}
                publishedAt={post.published_at}
                coverImage={post.cover_image}
              />
              <div className="absolute inset-x-3 bottom-3 flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="event-primary"
                  className="shadow-md"
                  onClick={() =>
                    router.push(`/admin/blog-management/edit/${post.id}`)
                  }
                >
                  <Pencil className="mr-1 h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="shadow-md"
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
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-[var(--color-border)] bg-slate-50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Post</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Published</th>
                  <th className="px-4 py-3 font-medium">Meta</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((post, index) => (
                  <tr
                    key={post.id}
                    className="border-b border-[var(--color-border)] last:border-0 hover:bg-slate-50/80"
                  >
                    <td className="px-4 py-3 text-muted-foreground">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-slate-100">
                          <Image
                            src={post.cover_image}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="64px"
                            unoptimized={
                              post.cover_image.startsWith("blob:") ||
                              post.cover_image.startsWith("data:")
                            }
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">
                            {post.title}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {post.excerpt}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={post.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatBlogDate(post.published_at)}
                    </td>
                    <td className="px-4 py-3">
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
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          title="Edit"
                          onClick={() =>
                            router.push(
                              `/admin/blog-management/edit/${post.id}`,
                            )
                          }
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          title="Preview card"
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

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this blog post?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleteTarget?.title}” will be removed from the demo list. You
              can restore sample posts with Reset demo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
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
    <div className="rounded-lg border border-[var(--color-border)] bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold ${valueClass}`}>{value}</p>
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
