"use client";

import Link from "next/link";
import { blogAdminPaths } from "@/lib/blogs";
import { useAdminBlog } from "@/services/admin/blogs";
import { Button } from "@/components/ui/button";
import { BlogForm } from "./blog-form";
import { BlogFormSkeleton } from "./skeleton-loader";

export function EditBlogContent({ slug }: { slug: string }) {
  const { data: post, isLoading, isError } = useAdminBlog(slug);

  if (isLoading) {
    return <BlogFormSkeleton />;
  }

  if (isError || !post) {
    return (
      <div className="rounded-lg border border-[var(--color-border)] bg-white p-6 text-center shadow-sm">
        <p className="text-base font-medium text-foreground">
          Blog post not found
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          It may have been deleted, or the link is incorrect.
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link href={blogAdminPaths.list}>Back to Blog Management</Link>
        </Button>
      </div>
    );
  }

  return <BlogForm mode="edit" initialPost={post} />;
}
