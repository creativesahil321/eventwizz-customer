interface DashboardItem {
  title: string;
  value: number;
  link?: string;
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
              {items?.map((data: DashboardItem, index: number) => (
                <article
                  key={index}
                  className="w-full bg-background items-center border shadow-sm p-6 rounded-sm"
                >
                  <section className="w-full flex items-start lg:items-end justify-start lg:justify-end flex-col">
                    <p className="text-base">{data.title}</p>
                    <p className="text-2xl font-bold text-black">{data.value}</p>
                  </section>
                </article>
              ))}
            </section>
          </main>
        </section>
      </section>
    </>
  );
}
