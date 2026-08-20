"use client";

import { SiteHeading } from "@/components/public/site-heading";
import type { AdminHomeContent } from "@/lib/admin-cms-content";
import { BLOG_HOME_PER_PAGE } from "@/lib/blogs";
import { usePublicBlogs } from "@/services/common/blogs";
import {
  BlogPostGrid,
  BlogPostGridSkeleton,
} from "@/app/(public)/blog/_components/blog-post-grid";

export default function NewsSection({
  content,
}: {
  content: AdminHomeContent["news"];
}) {
  const { data: articles = [], isLoading } = usePublicBlogs(BLOG_HOME_PER_PAGE);

  if (!isLoading && articles.length === 0) {
    return null;
  }

  return (
    <section
      id="latest-news"
      className="bg-[color:var(--color-background)] py-10 sm:py-12 md:py-14"
    >
      <div className="container mx-auto max-w-6xl px-4">
        <div className="mb-8 max-w-2xl sm:mb-10">
          <SiteHeading
            level={2}
            title={content.title}
            variant="onSurface"
            align="left"
            className="mb-2 !text-2xl !font-bold sm:!text-3xl md:!text-4xl"
          />
          <p className="text-sm text-[color:var(--color-text-dimmed)] sm:text-base">
            {content.subtitle}
          </p>
        </div>

        {isLoading ? (
          <BlogPostGridSkeleton count={BLOG_HOME_PER_PAGE} />
        ) : (
          <BlogPostGrid posts={articles} />
        )}
      </div>
    </section>
  );
}
