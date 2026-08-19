import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { blogPublicPaths, formatBlogDateLong, type BlogPost } from "@/lib/blogs";
import { shouldUseNextImageOptimization } from "@/lib/image-utils";
import { BlogPostNav } from "./blog-post-nav";
import { BlogShareButton } from "./blog-share-button";

const BLOG_PROSE_CLASS =
  "blog-prose text-[16px] leading-[1.75] text-[color:var(--color-text)] sm:text-[17px] sm:leading-[1.8] " +
  "[&_p]:mb-4 sm:[&_p]:mb-5 [&_p:last-child]:mb-0 " +
  "[&_strong]:font-semibold [&_strong]:text-[color:var(--color-text)] " +
  "[&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-[1.2rem] [&_h2]:font-bold [&_h2]:leading-snug [&_h2]:text-[color:var(--color-text)] sm:[&_h2]:mt-10 sm:[&_h2]:text-[1.35rem] [&_h2:first-child]:mt-0 " +
  "[&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-[1.05rem] [&_h3]:font-semibold [&_h3]:text-[color:var(--color-text)] sm:[&_h3]:mt-8 sm:[&_h3]:text-[1.15rem] [&_h3:first-child]:mt-0 " +
  "[&_em]:italic " +
  "[&_ul]:mb-4 sm:[&_ul]:mb-5 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 " +
  "[&_ol]:mb-4 sm:[&_ol]:mb-5 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5 " +
  "[&_li]:pl-1 " +
  "[&_a]:font-medium [&_a]:text-[color:var(--color-primary)] [&_a]:no-underline hover:[&_a]:underline hover:[&_a]:underline-offset-4 " +
  "[&_img]:my-5 [&_img]:mx-auto [&_img]:h-auto [&_img]:max-h-[240px] [&_img]:w-full [&_img]:rounded-md [&_img]:object-cover sm:[&_img]:max-h-[280px]";

interface BlogArticleContentProps {
  post: BlogPost;
}

export default function BlogArticleContent({ post }: BlogArticleContentProps) {
  const metaDate = formatBlogDateLong(post.published_at).toUpperCase();

  return (
    <article className="bg-[color:var(--color-background)] pb-12 pt-4 sm:pb-16 sm:pt-6">
      <div className="mx-auto w-full max-w-[680px] px-4 sm:px-5">
        <Link
          href={blogPublicPaths.list}
          className="mb-5 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[color:var(--color-text-dimmed)] transition-colors hover:text-[color:var(--color-primary)] sm:mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to news
        </Link>

        <header>
          <h1
            className="text-balance text-[1.5rem] font-semibold leading-[1.3] tracking-tight text-[color:var(--color-text)] sm:text-[1.85rem] sm:leading-[1.25] md:text-[2rem]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {post.title}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--color-text-dimmed)]">
              <time dateTime={post.published_at}>{metaDate}</time>
            </p>
            <BlogShareButton
              title={post.title}
              excerpt={post.excerpt}
              slug={post.slug}
              align="left"
            />
          </div>
        </header>

        {post.cover_image ? (
          <figure className="relative mt-5 aspect-[16/9] w-full overflow-hidden rounded-lg sm:mt-6">
            <Image
              src={post.cover_image}
              alt={post.title}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 680px"
              unoptimized={!shouldUseNextImageOptimization(post.cover_image)}
            />
          </figure>
        ) : null}

        <div className="mt-6 sm:mt-7">
          {post.excerpt ? (
            <p className="mb-5 text-[16px] leading-[1.7] text-[color:var(--color-text-dimmed)] sm:mb-6 sm:text-[17px]">
              {post.excerpt}
            </p>
          ) : null}

          {post.content ? (
            <div
              className={BLOG_PROSE_CLASS}
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          ) : null}

          <BlogPostNav previous={post.previous} next={post.next} />
        </div>
      </div>
    </article>
  );
}
