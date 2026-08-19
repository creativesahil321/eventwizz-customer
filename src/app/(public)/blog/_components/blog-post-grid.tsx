import { BlogFeaturedPost, BlogPostCard } from "./blog-post-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { BlogPost } from "@/lib/blogs";

export function BlogPostGrid({ posts }: { posts: BlogPost[] }) {
  if (posts.length === 0) {
    return (
      <p className="text-center text-sm text-[color:var(--color-text-dimmed)] sm:text-base">
        No articles published yet. Check back soon.
      </p>
    );
  }

  const [featured, ...rest] = posts;

  return (
    <div>
      <BlogFeaturedPost post={featured} />

      {rest.length > 0 ? (
        <div className="mt-12 grid gap-10 border-t border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] pt-10 sm:mt-14 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-12 lg:grid-cols-3">
          {rest.map((post) => (
            <BlogPostCard key={post.slug} post={post} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function BlogPostGridSkeleton({ count = 3 }: { count?: number }) {
  const more = Math.max(0, count - 1);

  return (
    <div>
      <div className="grid items-center gap-6 md:grid-cols-12 md:gap-10">
        <Skeleton className="aspect-[16/9] w-full md:col-span-7" />
        <div className="space-y-3 md:col-span-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      {more > 0 ? (
        <div className="mt-12 grid gap-10 border-t border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] pt-10 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: more }).map((_, index) => (
            <div key={index} className="space-y-3">
              <Skeleton className="aspect-[16/9] w-full" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
