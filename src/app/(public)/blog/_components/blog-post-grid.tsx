import { BlogPostCard } from "./blog-post-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { BlogPost } from "@/lib/blogs";

const GRID_CLASS =
  "grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3";

export function BlogPostGrid({ posts }: { posts: BlogPost[] }) {
  if (posts.length === 0) {
    return (
      <p className="text-center text-sm text-[color:var(--color-text-dimmed)] sm:text-base">
        No articles published yet. Check back soon.
      </p>
    );
  }

  return (
    <div className={GRID_CLASS}>
      {posts.map((post) => (
        <BlogPostCard key={post.slug} post={post} />
      ))}
    </div>
  );
}

export function BlogPostGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className={GRID_CLASS}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-2xl bg-[color:var(--color-surface)]"
        >
          <Skeleton className="h-44 w-full sm:h-52" />
          <div className="space-y-3 p-5 sm:p-6">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
