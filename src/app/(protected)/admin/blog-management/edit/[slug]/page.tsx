"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Shell } from "@/components/shell";
import { BackButton } from "@/components/ui/back-button";
import { BlogForm } from "../../../../_shared/blog-management/_components/blog-form";
import { BlogFormSkeleton } from "../../../../_shared/blog-management/_components/skeleton-loader";
import { blogAdminPaths } from "@/lib/blogs";
import { useAdminBlog } from "@/services/admin/blogs";

export default function EditBlogPage() {
  const params = useParams();
  const router = useRouter();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const { data: post, isLoading, isError } = useAdminBlog(slug);

  useEffect(() => {
    if (!slug || (!isLoading && (isError || !post))) {
      router.replace(blogAdminPaths.list);
    }
  }, [isError, isLoading, post, router, slug]);

  return (
    <section className="page bg-[var(--color-background,#f3f4f6)]">
      <Shell>
        <BackButton
          href={blogAdminPaths.list}
          label="Back to Blog Management"
        />

        <div className="mb-4 rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-md sm:mb-6 sm:p-6">
          <h1 className="title-header mb-2 text-xl font-bold sm:text-2xl">
            Edit blog post
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Update content, imagery, SEO meta, and publish status.
          </p>
        </div>

        {isLoading || !post ? (
          <BlogFormSkeleton />
        ) : (
          <BlogForm mode="edit" initialPost={post} />
        )}
      </Shell>
    </section>
  );
}
