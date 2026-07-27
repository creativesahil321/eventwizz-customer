import { Shell } from "@/components/shell";
import { BackButton } from "@/components/ui/back-button";
import { BlogForm } from "../../../_shared/blog-management/_components/blog-form";

export default function CreateBlogPage() {
  return (
    <section className="page bg-[var(--color-background,#f3f4f6)]">
      <Shell>
        <BackButton
          href="/admin/blog-management"
          label="Back to Blog Management"
        />

        <div className="mb-4 rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-md sm:mb-6 sm:p-6">
          <h1 className="title-header mb-2 text-xl font-bold sm:text-2xl">
            Create blog post
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Write a new article with a featured image, excerpt, rich body
            content, and SEO meta. Preview the public card before publishing.
          </p>
        </div>

        <BlogForm mode="create" />
      </Shell>
    </section>
  );
}
