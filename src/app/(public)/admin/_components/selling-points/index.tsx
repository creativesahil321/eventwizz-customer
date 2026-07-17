import type { AdminHomeContent } from "@/lib/admin-cms-content";
import { getAdminHomeIcon } from "@/lib/admin-home-icons";

export default function SellingPoints({
  content,
}: {
  content: AdminHomeContent["features"];
}) {
  return (
    <section className="py-20 bg-[color:var(--color-surface)]">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-[color:var(--color-text)] mb-3">
            {content.title}
          </h2>
          <p className="text-[color:var(--color-text-dimmed)] max-w-xl mx-auto">
            {content.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
          {content.items.map((point, idx) => {
            const Icon = getAdminHomeIcon(point.icon);
            return (
              <div
                key={`${point.title}-${idx}`}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col items-center text-center hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="rounded-full bg-[color:var(--color-primary)]/10 w-12 h-12 flex items-center justify-center mb-4">
                  <Icon className="h-5 w-5 text-[color:var(--color-primary)]" />
                </div>
                <h3 className="text-sm font-semibold text-gray-800">
                  {point.title}
                </h3>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
