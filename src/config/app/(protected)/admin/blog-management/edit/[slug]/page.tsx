import { Shell } from "@/components/shell";
import { BackButton } from "@/components/ui/back-button";
import { blogAdminPaths } from "@/lib/blogs";
import { EditBlogContent } from "../../../../_shared/blog-management/_components/edit-blog-content";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function EditBlogPage({ params }: PageProps) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

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
            Update the article content, featured image, publication status, and
            SEO meta. Preview the public card before saving.
          </p>
        </div>

        <EditBlogContent slug={decodedSlug} />
      </Shell>
    </section>
  );
}
