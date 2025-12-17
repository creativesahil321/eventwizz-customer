import Link from "next/link";

interface DashboardItem {
  title: string;
  value: number;
  link: string;
}

interface DashboardSummaryProps {
  title: string;
  items: DashboardItem[];
}
export default function DashboardSummary({
  title,
  items,
}: DashboardSummaryProps) {
  return (
    <>
      <section className="w-full flex items-center justify-between relative">
        <section className="w-full relative bg-background dark:border p-6 rounded-md">
          <header className="w-full mb-6">
            <h2 className="text-2xl title-header font-bold text-black">
              {title || "Summary"}
            </h2>
          </header>
          <main className="w-full">
            <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {items?.map((data: DashboardItem, index: number) => {
                const { title, value, link } = data;
                return (
                  <Link
                    href={link}
                    className="w-full bg-background items-center"
                    key={index}
                  >
                    <article className="border shadow-sm p-6 rounded-sm">
                      <section className="w-full flex items-start lg:items-end justify-start lg:justify-end flex-col">
                        <p className="text-base">
                          {title}
                        </p>
                        <p className="text-2xl font-bold text-black">{value}</p>
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
