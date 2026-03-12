export default function TrustedBy() {
  const partners = [
    "The Blazing Donkey",
    "The Merry Fiddlers",
    "Theydon Oak",
    "HAM Hideaway",
    "SB",
    "Three Rivers Golf & Country Club",
  ];

  return (
    <section className="py-16 bg-[color:var(--color-background)]">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-[color:var(--color-text)] mb-3">
          Trusted By
        </h2>
        <p className="text-[color:var(--color-text-dimmed)] mb-10 max-w-lg mx-auto">
          Don&apos;t just take our word for it. We&apos;re trusted by venues and
          businesses across the UK.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
          {partners.map((name) => (
            <div
              key={name}
              className="bg-[color:var(--color-surface)] rounded-lg p-5 flex items-center justify-center shadow-sm hover:shadow-md transition-shadow min-h-[80px]"
            >
              <span className="text-sm font-medium text-[color:var(--color-text)] text-center">
                {name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
