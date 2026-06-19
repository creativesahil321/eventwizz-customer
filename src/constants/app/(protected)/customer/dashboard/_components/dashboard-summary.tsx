import Link from "next/link";
import { Calendar, History } from "lucide-react";

interface DashboardItem {
  title: string;
  value: number;
  link: string;
  icon?: string;
}

interface DashboardSummaryProps {
  title: string;
  items: DashboardItem[];
}

const getIcon = (index: number) => {
  const icons = [Calendar, History];
  const Icon = icons[index] || Calendar;
  return <Icon className="h-5 w-5 text-[var(--color-primary)]" />;
};

export default function DashboardSummary({
  title,
  items,
}: DashboardSummaryProps) {
  return (
    <>
      <section className="w-full flex items-center justify-between relative">
        <section className="w-full relative bg-background dark:border p-4 sm:p-6 rounded-md">
          <header className="w-full mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl title-header font-bold text-black">
              {title || "Summary"}
            </h2>
          </header>
          <main className="w-full">
            <section className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2">
              {items?.map((data: DashboardItem, index: number) => {
                const { title, value, link } = data;
                return (
                  <Link
                    href={link}
                    className="w-full bg-background items-center hover:scale-[1.02] transition-transform"
                    key={index}
                  >
                    <article className="border shadow-sm p-4 sm:p-6 rounded-lg hover:shadow-md transition-shadow">
                      <section className="w-full flex items-start justify-between gap-4">
                        <div className="flex flex-col gap-2 min-w-0 flex-1">
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {title}
                          </p>
                          <p className="text-2xl sm:text-3xl font-bold text-black">
                            {value}
                          </p>
                        </div>
                        <div className="p-2 sm:p-3 bg-[var(--color-primary)]/10 rounded-lg flex-shrink-0">
                          {getIcon(index)}
                        </div>
                      </section>
                    </article>
                  </Link>
                );
              })}
            </section>
          </main>
        </section>
      </section>
    </>
  );
}
