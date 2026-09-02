import { SiteHeading } from "@/components/public/site-heading";
import { BlogPostGrid } from "./blog-post-grid";
import type { BlogPost } from "@/lib/blogs";

export default function BlogListingContent({
  articles,
}: {
  articles: BlogPost[];
}) {
  return (
    <section className="bg-[color:var(--color-background)] py-10 sm:py-12 md:py-16">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="mb-8 max-w-2xl sm:mb-10">
          <SiteHeading
            level={1}
            title="Latest News & Articles"
            variant="onSurface"
            align="left"
            className="mb-2 !text-2xl !font-bold sm:!text-3xl md:!text-4xl"
          />
          <p className="text-sm text-[color:var(--color-text-dimmed)] sm:text-base">
            Insights, tips, and best practices from our team.
          </p>
        </div>

        <BlogPostGrid posts={articles} />
      </div>
    </section>
  );
}
