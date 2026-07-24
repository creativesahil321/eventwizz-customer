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

        <div className="mb-6 rounded-lg border border-[var(--color-border)] bg-white p-6 shadow-md">
          <h1 className="title-header mb-2 text-2xl font-bold">
            Create blog post
          </h1>
          <p className="text-muted-foreground">
            Write a new article with a featured image, category, excerpt, and
            rich body content. Preview the public card before publishing.
          </p>
        </div>

        <BlogForm mode="create" />
      </Shell>
    </section>
  );
}
