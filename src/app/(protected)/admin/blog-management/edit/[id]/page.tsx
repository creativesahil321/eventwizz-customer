"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Shell } from "@/components/shell";
import { BackButton } from "@/components/ui/back-button";
import { BlogForm } from "../../../../_shared/blog-management/_components/blog-form";
import { useBlogStore } from "../../../../_shared/blog-management/_lib/blog-store";

export default function EditBlogPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const hasHydrated = useBlogStore((s) => s.hasHydrated);
  const post = useBlogStore((s) => s.getById(id));

  useEffect(() => {
    if (hasHydrated && id && !post) {
      router.replace("/admin/blog-management");
    }
  }, [hasHydrated, id, post, router]);

  if (!hasHydrated || !post) {
    return (
      <section className="page bg-[var(--color-background,#f3f4f6)]">
        <Shell>
          <div className="rounded-lg border border-[var(--color-border)] bg-white p-8 text-center shadow-sm">
            <p className="text-muted-foreground">Loading post...</p>
          </div>
        </Shell>
      </section>
    );
  }

  return (
    <section className="page bg-[var(--color-background,#f3f4f6)]">
      <Shell>
        <BackButton
          href="/admin/blog-management"
          label="Back to Blog Management"
        />

        <div className="mb-6 rounded-lg border border-[var(--color-border)] bg-white p-6 shadow-md">
          <h1 className="title-header mb-2 text-2xl font-bold">
            Edit blog post
          </h1>
          <p className="text-muted-foreground">
            Update content, imagery, and publish status. Changes are saved in
            this browser until the API is connected.
          </p>
        </div>

        <BlogForm mode="edit" initialPost={post} />
      </Shell>
    </section>
  );
}
