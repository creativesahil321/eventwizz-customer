import Image from "next/image";
import { ArrowRight } from "lucide-react";
import type { AdminHomeContent } from "@/lib/admin-cms-content";

const NEWS_ARTICLES = [
  {
    title: "How to Plan a Perfect Corporate Christmas Party",
    excerpt:
      "Planning a corporate Christmas party can be stressful — but with the right tools and checklist, it doesn't have to be.",
    date: "23 Nov, 2024",
    image: "/assets/images/admin/news-christmas.jpg",
    category: "Event Planning",
  },
  {
    title: "Top Tips for Running Unforgettable Venue Events",
    excerpt:
      "From guest management to menu planning, discover how leading venues keep their guests coming back year after year.",
    date: "15 Oct, 2024",
    image: "/assets/images/admin/news-venue.jpg",
    category: "Venue Management",
  },
  {
    title: "Why Automated Ticketing Transforms Event Revenue",
    excerpt:
      "Manual ticketing is costing venues time and money. See how automation changes the game for event profitability.",
    date: "02 Sep, 2024",
    image: "/assets/images/admin/news-ticketing.jpg",
    category: "Ticketing",
  },
];

export default function NewsSection({
  content,
}: {
  content: AdminHomeContent["news"];
}) {
  return (
    <section className="py-20 bg-[color:var(--color-background)]">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[color:var(--color-text)] mb-3">
            {content.title}
          </h2>
          <p className="text-[color:var(--color-text-dimmed)]">
            {content.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {NEWS_ARTICLES.map((article) => (
            <article
              key={article.title}
              className="bg-[color:var(--color-surface)] rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group cursor-pointer"
            >
              {/* Image */}
              <div className="relative h-52 overflow-hidden">
                <Image
                  src={article.image}
                  alt={article.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                {/* Category pill */}
                <div className="absolute top-3 left-3 bg-[color:var(--color-primary)] text-[color:var(--color-primary-foreground)] text-xs font-semibold px-3 py-1 rounded-full shadow">
                  {article.category}
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-xs text-[color:var(--color-text)] mb-2 font-medium">
                  {article.date}
                </p>
                <h3 className="font-bold text-[color:var(--color-text)] mb-2 leading-snug group-hover:text-[color:var(--color-primary)] transition-colors line-clamp-2">
                  {article.title}
                </h3>
                <p className="text-sm text-[color:var(--color-text)] mb-4 leading-relaxed line-clamp-3">
                  {article.excerpt}
                </p>
                <div className="flex items-center gap-1.5 text-sm font-semibold text-[color:var(--color-primary)] group-hover:gap-2.5 transition-all">
                  <span>Read Article</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
