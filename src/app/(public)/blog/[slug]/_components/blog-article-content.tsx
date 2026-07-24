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
  "blog-prose text-[17px] leading-[1.85] text-[color:var(--color-text)] md:text-[18px] md:leading-[1.9] " +
  "[&_p]:mb-7 [&_p:last-child]:mb-0 " +
  "[&_strong]:font-semibold [&_strong]:text-[color:var(--color-text)] " +
  "[&_h2]:mb-5 [&_h2]:mt-14 [&_h2]:text-[1.35rem] [&_h2]:font-bold [&_h2]:leading-snug [&_h2]:text-[color:var(--color-text)] md:[&_h2]:text-[1.5rem] [&_h2:first-child]:mt-0 " +
  "[&_h3]:mb-4 [&_h3]:mt-10 [&_h3]:text-[1.15rem] [&_h3]:font-semibold [&_h3]:text-[color:var(--color-text)] md:[&_h3]:text-[1.25rem] [&_h3:first-child]:mt-0 " +
  "[&_em]:italic " +
  "[&_ul]:mb-7 [&_ul]:list-disc [&_ul]:space-y-3 [&_ul]:pl-6 " +
  "[&_ol]:mb-7 [&_ol]:list-decimal [&_ol]:space-y-3 [&_ol]:pl-6 " +
  "[&_li]:pl-1 " +
  "[&_a]:font-medium [&_a]:text-[color:var(--color-primary)] [&_a]:no-underline hover:[&_a]:underline hover:[&_a]:underline-offset-4 " +
  "[&_img]:my-10 [&_img]:h-auto [&_img]:w-full [&_img]:rounded-sm";

interface BlogArticleContentProps {
  post: BlogPost;
}

export default function BlogArticleContent({ post }: BlogArticleContentProps) {
  const { previous, next } = getAdjacentBlogPosts(post.slug);
  const metaDate = formatBlogDateLong(post.published_at).toUpperCase();

  return (
    <article className="bg-[color:var(--color-background)] pb-24 pt-6 md:pt-10">
      <div className="mx-auto w-full max-w-[1180px] px-5 sm:px-8">
        <Link
          href="/#latest-news"
          className="mb-10 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--color-text-dimmed)] transition-colors hover:text-[color:var(--color-primary)] md:mb-14"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to news
        </Link>

        <header className="mx-auto max-w-[920px] text-center">
          <h1
            className="text-balance text-[2rem] font-semibold leading-[1.2] tracking-tight text-[color:var(--color-text)] sm:text-[2.5rem] md:text-[3.25rem] md:leading-[1.15]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {post.title}
          </h1>

          <p className="mt-6 text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--color-text-dimmed)] sm:text-xs sm:tracking-[0.2em]">
            <time dateTime={post.published_at}>{metaDate}</time>
          </p>

          <BlogShareButton
            title={post.title}
            excerpt={post.excerpt}
            slug={post.slug}
            align="center"
            className="mt-5"
          />
        </header>

        <div className="relative mx-auto mt-10 aspect-[16/9] w-full max-w-[1100px] overflow-hidden md:mt-14">
          <Image
            src={post.cover_image}
            alt={post.title}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 1180px) 100vw, 1100px"
          />
        </div>

        <div className="mx-auto mt-12 max-w-[720px] md:mt-16">
          <p className="mb-10 text-[17px] leading-[1.85] text-[color:var(--color-text-dimmed)] md:text-[18px] md:leading-[1.9]">
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
            align="right"
            className="mt-12"
          />

          <BlogPostNav previous={previous} next={next} />
        </div>
      </div>
    </article>
  );
}
