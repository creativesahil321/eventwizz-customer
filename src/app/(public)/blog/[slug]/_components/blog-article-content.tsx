import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { blogPublicPaths, formatBlogDateLong, type BlogPost } from "@/lib/blogs";
import { shouldUseNextImageOptimization } from "@/lib/image-utils";
import { BlogPostNav } from "./blog-post-nav";
import { BlogShareButton } from "./blog-share-button";

/** Editorial prose — Stock Brook–style readability (narrow column, generous leading). */
const BLOG_PROSE_CLASS =
  "blog-prose text-[16px] leading-[1.8] text-[color:var(--color-text)] sm:text-[17px] sm:leading-[1.85] md:text-[18px] md:leading-[1.9] " +
  "[&_p]:mb-5 sm:[&_p]:mb-7 [&_p:last-child]:mb-0 " +
  "[&_strong]:font-semibold [&_strong]:text-[color:var(--color-text)] " +
  "[&_h2]:mb-4 [&_h2]:mt-10 [&_h2]:text-[1.25rem] [&_h2]:font-bold [&_h2]:leading-snug [&_h2]:text-[color:var(--color-text)] sm:[&_h2]:mt-14 sm:[&_h2]:mb-5 sm:[&_h2]:text-[1.35rem] md:[&_h2]:text-[1.5rem] [&_h2:first-child]:mt-0 " +
  "[&_h3]:mb-3 [&_h3]:mt-8 [&_h3]:text-[1.1rem] [&_h3]:font-semibold [&_h3]:text-[color:var(--color-text)] sm:[&_h3]:mb-4 sm:[&_h3]:mt-10 sm:[&_h3]:text-[1.15rem] md:[&_h3]:text-[1.25rem] [&_h3:first-child]:mt-0 " +
  "[&_em]:italic " +
  "[&_ul]:mb-5 sm:[&_ul]:mb-7 [&_ul]:list-disc [&_ul]:space-y-2 sm:[&_ul]:space-y-3 [&_ul]:pl-5 sm:[&_ul]:pl-6 " +
  "[&_ol]:mb-5 sm:[&_ol]:mb-7 [&_ol]:list-decimal [&_ol]:space-y-2 sm:[&_ol]:space-y-3 [&_ol]:pl-5 sm:[&_ol]:pl-6 " +
  "[&_li]:pl-1 " +
  "[&_a]:font-medium [&_a]:text-[color:var(--color-primary)] [&_a]:no-underline hover:[&_a]:underline hover:[&_a]:underline-offset-4 " +
  "[&_img]:my-6 sm:[&_img]:my-8 [&_img]:mx-auto [&_img]:h-auto [&_img]:max-h-[280px] [&_img]:w-full [&_img]:rounded-md [&_img]:object-cover sm:[&_img]:max-h-[320px]";

interface BlogArticleContentProps {
  post: BlogPost;
}

export default function BlogArticleContent({ post }: BlogArticleContentProps) {
  const metaDate = formatBlogDateLong(post.published_at).toUpperCase();

  return (
    <article className="bg-[color:var(--color-background)] pb-16 pt-4 sm:pb-20 sm:pt-6 md:pt-8">
      <div className="mx-auto w-full max-w-[760px] px-4 sm:px-5">
        <Link
          href={blogPublicPaths.list}
          className="mb-6 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--color-text-dimmed)] transition-colors hover:text-[color:var(--color-primary)] sm:mb-8"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to news
        </Link>

        <header className="text-center">
          <h1
            className="text-balance text-[1.6rem] font-semibold leading-[1.25] tracking-tight text-[color:var(--color-text)] sm:text-[1.85rem] md:text-[2.15rem] md:leading-[1.2]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {post.title}
          </h1>

          <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.16em] text-[color:var(--color-text-dimmed)] sm:mt-4 sm:text-[11px] sm:tracking-[0.18em]">
            <time dateTime={post.published_at}>{metaDate}</time>
          </p>

          <BlogShareButton
            title={post.title}
            excerpt={post.excerpt}
            slug={post.slug}
            align="center"
            className="mt-3 sm:mt-4"
          />
        </header>

        {post.cover_image ? (
          <figure className="relative mx-auto mt-6 h-[200px] w-full overflow-hidden rounded-lg sm:mt-8 sm:h-[240px] md:mt-10 md:h-[280px]">
            <Image
              src={post.cover_image}
              alt={post.title}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 760px"
              unoptimized={!shouldUseNextImageOptimization(post.cover_image)}
            />
          </figure>
        ) : null}

        <div className="mt-7 sm:mt-9 md:mt-10">
          {post.excerpt ? (
            <p className="mb-6 text-[16px] leading-[1.8] text-[color:var(--color-text-dimmed)] sm:mb-8 sm:text-[17px] sm:leading-[1.85]">
              {post.excerpt}
            </p>
          ) : null}

          {post.content ? (
            <div
              className={BLOG_PROSE_CLASS}
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          ) : null}

          <BlogShareButton
            title={post.title}
            excerpt={post.excerpt}
            slug={post.slug}
            align="center"
            className="mt-10 sm:mt-12 sm:justify-end"
          />

          <BlogPostNav previous={post.previous} next={post.next} />
        </div>
      </div>
    </article>
  );
}
