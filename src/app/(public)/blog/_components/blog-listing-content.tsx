import { SiteHeading } from "@/components/public/site-heading";
import { BlogPostGrid } from "./blog-post-grid";
import type { BlogPost } from "@/lib/blogs";

export default function BlogListingContent({
  articles,
}: {
  articles: BlogPost[];
}) {
  return (
    <section className="bg-[color:var(--color-background)] py-12 sm:py-16 md:py-20">
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center sm:mb-12">
          <SiteHeading
            level={1}
            title="Latest News & Articles"
            variant="onSurface"
            align="center"
            className="mb-3 !text-2xl !font-bold sm:!text-3xl md:!text-4xl"
          />
          <p className="mx-auto max-w-2xl px-1 text-sm text-[color:var(--color-text-dimmed)] sm:text-base">
            Insights, tips, and best practices from our team.
          </p>
        </div>

        <BlogPostGrid posts={articles} />
      </div>
    </section>
  );
}
