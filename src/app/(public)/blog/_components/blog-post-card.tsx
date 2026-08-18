import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatBlogDate, blogPublicPaths, type BlogPost } from "@/lib/blogs";
import { shouldUseNextImageOptimization } from "@/lib/image-utils";

export function BlogPostCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={blogPublicPaths.article(post.slug)}
      className="group cursor-pointer overflow-hidden rounded-2xl bg-[color:var(--color-surface)] shadow-sm transition-all duration-300 hover:shadow-xl"
    >
      <article>
        <div className="relative h-44 overflow-hidden bg-[color:color-mix(in_srgb,var(--color-text)_6%,transparent)] sm:h-52">
          {post.cover_image ? (
            <Image
              src={post.cover_image}
              alt={post.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 33vw"
              unoptimized={!shouldUseNextImageOptimization(post.cover_image)}
            />
          ) : null}
        </div>

        <div className="p-5 sm:p-6">
          {post.published_at ? (
            <p className="mb-2 text-xs font-medium text-[color:var(--color-text)]">
              {formatBlogDate(post.published_at)}
            </p>
          ) : null}
          <h3
            className="mb-2 line-clamp-2 font-bold leading-snug text-[color:var(--color-text)] transition-colors group-hover:text-[color:var(--color-primary)]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {post.title}
          </h3>
          {post.excerpt ? (
            <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-[color:var(--color-text)]">
              {post.excerpt}
            </p>
          ) : null}
          <div className="flex items-center gap-1.5 text-sm font-semibold text-[color:var(--color-primary)] transition-all group-hover:gap-2.5">
            <span>Read Article</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>
      </article>
    </Link>
  );
}
