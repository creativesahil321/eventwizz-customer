import { SiteHeading } from "@/components/public/site-heading";
import { getPublishedBlogPosts } from "@/lib/blogs";
import { BlogPostCard } from "./blog-post-card";

export default function BlogListingContent() {
  const articles = getPublishedBlogPosts();

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

        {articles.length === 0 ? (
          <p className="text-center text-sm text-[color:var(--color-text-dimmed)] sm:text-base">
            No articles published yet. Check back soon.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
            {articles.map((article) => (
              <BlogPostCard key={article.id} post={article} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
