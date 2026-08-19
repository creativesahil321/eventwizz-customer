import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatBlogDate, blogPublicPaths, type BlogPost } from "@/lib/blogs";
import { shouldUseNextImageOptimization } from "@/lib/image-utils";

function Cover({
  post,
  sizes,
  className,
}: {
  post: BlogPost;
  sizes: string;
  className?: string;
}) {
  if (!post.cover_image) {
    return (
      <div
        className={`bg-[color:color-mix(in_srgb,var(--color-text)_6%,transparent)] ${className ?? ""}`}
      />
    );
  }

  return (
    <Image
      src={post.cover_image}
      alt={post.title}
      fill
      className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
      sizes={sizes}
      unoptimized={!shouldUseNextImageOptimization(post.cover_image)}
    />
  );
}

/** Full-width editorial story used for the latest post. */
export function BlogFeaturedPost({ post }: { post: BlogPost }) {
  return (
    <Link
      href={blogPublicPaths.article(post.slug)}
      className="group grid items-center gap-6 md:grid-cols-12 md:gap-10 lg:gap-14"
    >
      <div className="relative aspect-[16/9] overflow-hidden md:col-span-7">
        <Cover post={post} sizes="(max-width: 768px) 100vw, 640px" />
      </div>

      <div className="md:col-span-5">
        {post.published_at ? (
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--color-text-dimmed)]">
            {formatBlogDate(post.published_at)}
          </p>
        ) : null}
        <h3
          className="mt-2 text-2xl font-semibold leading-snug tracking-tight text-[color:var(--color-text)] transition-colors group-hover:text-[color:var(--color-primary)] sm:text-[1.75rem] md:text-[2rem]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {post.title}
        </h3>
        {post.excerpt ? (
          <p className="mt-3 line-clamp-3 text-[15px] leading-relaxed text-[color:var(--color-text-dimmed)] sm:text-base">
            {post.excerpt}
          </p>
        ) : null}
        <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-[color:var(--color-primary)]">
          Read Article
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

/** Quiet story tile for older posts — image + type, no card chrome. */
export function BlogPostCard({ post }: { post: BlogPost }) {
  return (
    <Link href={blogPublicPaths.article(post.slug)} className="group block">
      <article>
        <div className="relative mb-4 aspect-[16/9] overflow-hidden">
          <Cover post={post} sizes="(max-width: 768px) 100vw, 400px" />
        </div>
        {post.published_at ? (
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--color-text-dimmed)]">
            {formatBlogDate(post.published_at)}
          </p>
        ) : null}
        <h3
          className="mt-1.5 line-clamp-2 text-lg font-semibold leading-snug text-[color:var(--color-text)] transition-colors group-hover:text-[color:var(--color-primary)]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {post.title}
        </h3>
        {post.excerpt ? (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[color:var(--color-text-dimmed)]">
            {post.excerpt}
          </p>
        ) : null}
      </article>
    </Link>
  );
}
