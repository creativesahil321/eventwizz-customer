const NEWS_ARTICLES = [
  {
    title: "How to Plan a Perfect Corporate Christmas Party",
    excerpt:
      "Planning a corporate Christmas party can be stressful — but with the right tools and checklist, it doesn't have to be.",
    date: "23 Nov, 2024",
  },
  {
    title: "Top Tips for Running Unforgettable Venue Events",
    excerpt:
      "From guest management to menu planning, discover how leading venues keep their guests coming back year after year.",
    date: "15 Oct, 2024",
  },
  {
    title: "Why Automated Ticketing Transforms Event Revenue",
    excerpt:
      "Manual ticketing is costing venues time and money. See how automation changes the game for event profitability.",
    date: "02 Sep, 2024",
  },
];

export default function NewsSection() {
  return (
    <section className="py-20 bg-[color:var(--color-background)]">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[color:var(--color-text)] mb-3">
            Latest News & Articles
          </h2>
          <p className="text-[color:var(--color-text-dimmed)]">
            Insights, tips, and best practices from the EventWizz team
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {NEWS_ARTICLES.map((article) => (
            <article
              key={article.title}
              className="bg-[color:var(--color-surface)] rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow group"
            >
              <div className="h-48 bg-gradient-to-br from-[color:var(--color-primary)]/20 to-[color:var(--color-secondary)]/20" />
              <div className="p-6">
                <p className="text-xs text-[color:var(--color-text-dimmed)] mb-2">
                  {article.date}
                </p>
                <h3 className="font-semibold text-[color:var(--color-text)] mb-2 group-hover:text-[color:var(--color-primary)] transition-colors">
                  {article.title}
                </h3>
                <p className="text-sm text-[color:var(--color-text-dimmed)] mb-4 leading-relaxed">
                  {article.excerpt}
                </p>
                <span className="text-sm font-medium text-[color:var(--color-primary)]">
                  Read Article &rarr;
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
