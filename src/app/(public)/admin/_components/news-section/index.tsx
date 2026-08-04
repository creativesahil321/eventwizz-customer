import type { AdminHomeContent } from "@/lib/admin-cms-content";
import { SiteHeading } from "@/components/public/site-heading";
import { getPublishedBlogPosts } from "@/lib/blogs";
import { BlogPostCard } from "@/app/(public)/blog/_components/blog-post-card";

export default function NewsSection({
  content,
}: {
  content: AdminHomeContent["news"];
}) {
  const articles = getPublishedBlogPosts().slice(0, 3);

  return (
    <section
      id="latest-news"
      className="bg-[color:var(--color-background)] py-12 sm:py-16 md:py-20"
    >
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center sm:mb-12">
          <SiteHeading
            level={2}
            title={content.title}
            variant="onSurface"
            align="center"
            className="mb-3 !text-2xl !font-bold sm:!text-3xl md:!text-4xl"
          />
          <p className="mx-auto max-w-2xl px-1 text-sm text-[color:var(--color-text-dimmed)] sm:text-base">
            {content.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
          {articles.map((article) => (
            <BlogPostCard key={article.id} post={article} />
          ))}
        </div>
      </div>
    </section>
  );
}
