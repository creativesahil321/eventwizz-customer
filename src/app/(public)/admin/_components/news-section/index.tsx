"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteHeading } from "@/components/public/site-heading";
import { Button } from "@/components/ui/button";
import type { AdminHomeContent } from "@/lib/admin-cms-content";
import { BLOG_HOME_PER_PAGE, blogPublicPaths } from "@/lib/blogs";
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
  const { data, isLoading } = usePublicBlogs(BLOG_HOME_PER_PAGE + 1);
  const articles = (data?.posts ?? []).slice(0, BLOG_HOME_PER_PAGE);
  const hasMore =
    (data?.total ?? 0) > BLOG_HOME_PER_PAGE ||
    (data?.posts?.length ?? 0) > BLOG_HOME_PER_PAGE;

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
            className="mb-2"
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

        {!isLoading && hasMore ? (
          <div className="mt-10 flex justify-center sm:mt-12">
            <Button asChild variant="event-outline" size="lg" className="rounded-md px-8">
              <Link href={blogPublicPaths.list}>
                View more
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
