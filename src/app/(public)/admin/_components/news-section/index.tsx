import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { AdminHomeContent } from "@/lib/admin-cms-content";
import { SiteHeading } from "@/components/public/site-heading";
import { formatBlogDate, getPublishedBlogPosts } from "@/lib/blogs";

export default function NewsSection({
  content,
}: {
  content: AdminHomeContent["news"];
}) {
  const articles = getPublishedBlogPosts().slice(0, 3);

  return (
    <section
      id="latest-news"
      className="bg-[color:var(--color-background)] py-20"
    >
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <SiteHeading
            level={2}
            title={content.title}
            variant="onSurface"
            align="center"
            className="mb-3 !text-3xl !font-bold md:!text-4xl"
          />
          <p className="text-[color:var(--color-text-dimmed)]">
            {content.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {articles.map((article) => (
            <Link
              key={article.id}
              href={`/blog/${article.slug}`}
              className="group cursor-pointer overflow-hidden rounded-2xl bg-[color:var(--color-surface)] shadow-sm transition-all duration-300 hover:shadow-xl"
            >
              <article>
                <div className="relative h-52 overflow-hidden">
                  <Image
                    src={article.cover_image}
                    alt={article.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>

                <div className="p-6">
                  <p className="mb-2 text-xs font-medium text-[color:var(--color-text)]">
                    {formatBlogDate(article.published_at)}
                  </p>
                  <h3
                    className="mb-2 line-clamp-2 font-bold leading-snug text-[color:var(--color-text)] transition-colors group-hover:text-[color:var(--color-primary)]"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {article.title}
                  </h3>
                  <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-[color:var(--color-text)]">
                    {article.excerpt}
                  </p>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-[color:var(--color-primary)] transition-all group-hover:gap-2.5">
                    <span>Read Article</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
