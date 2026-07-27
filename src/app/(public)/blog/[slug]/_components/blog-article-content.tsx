import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  formatBlogDateLong,
  getAdjacentBlogPosts,
  type BlogPost,
} from "@/lib/blogs";
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
  "[&_img]:my-6 sm:[&_img]:my-10 [&_img]:h-auto [&_img]:w-full [&_img]:rounded-sm";

interface BlogArticleContentProps {
  post: BlogPost;
}

export default function BlogArticleContent({ post }: BlogArticleContentProps) {
  const { previous, next } = getAdjacentBlogPosts(post.slug);
  const metaDate = formatBlogDateLong(post.published_at).toUpperCase();

  return (
    <article className="bg-[color:var(--color-background)] pb-16 pt-4 sm:pb-24 sm:pt-6 md:pt-10">
      <div className="mx-auto w-full max-w-[1180px] px-4 sm:px-5 md:px-8">
        <Link
          href="/#latest-news"
          className="mb-6 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--color-text-dimmed)] transition-colors hover:text-[color:var(--color-primary)] sm:mb-10 md:mb-14"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to news
        </Link>

        <header className="mx-auto max-w-[920px] text-center">
          <h1
            className="text-balance text-[1.75rem] font-semibold leading-[1.2] tracking-tight text-[color:var(--color-text)] sm:text-[2rem] md:text-[2.5rem] lg:text-[3.25rem] lg:leading-[1.15]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {post.title}
          </h1>

          <p className="mt-4 text-[10px] font-medium uppercase tracking-[0.16em] text-[color:var(--color-text-dimmed)] sm:mt-6 sm:text-[11px] sm:tracking-[0.18em] md:text-xs md:tracking-[0.2em]">
            <time dateTime={post.published_at}>{metaDate}</time>
          </p>

          <BlogShareButton
            title={post.title}
            excerpt={post.excerpt}
            slug={post.slug}
            align="center"
            className="mt-4 sm:mt-5"
          />
        </header>

        <div className="relative mx-auto mt-8 aspect-[4/3] w-full max-w-[1100px] overflow-hidden sm:mt-10 sm:aspect-[16/10] md:mt-14 md:aspect-[16/9]">
          <Image
            src={post.cover_image}
            alt={post.title}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1180px) 100vw, 1100px"
          />
        </div>

        <div className="mx-auto mt-8 max-w-[720px] sm:mt-12 md:mt-16">
          <p className="mb-7 text-[16px] leading-[1.8] text-[color:var(--color-text-dimmed)] sm:mb-10 sm:text-[17px] sm:leading-[1.85] md:text-[18px] md:leading-[1.9]">
            {post.excerpt}
          </p>

          <div
            className={BLOG_PROSE_CLASS}
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          <BlogShareButton
            title={post.title}
            excerpt={post.excerpt}
            slug={post.slug}
            align="center"
            className="mt-10 sm:mt-12 sm:justify-end"
          />

          <BlogPostNav previous={previous} next={next} />
        </div>
      </div>
    </article>
  );
}
