import { Skeleton } from "@/components/ui/skeleton";

function UpcomingEventsGridSkeleton({ cardCount = 6 }: { cardCount?: number }) {
  return (
    <section className="w-full flex items-center justify-between relative text-black">
      <section className="w-full relative bg-background dark:border p-4 sm:p-6 rounded-md">
        <header className="w-full mb-4 sm:mb-6">
          <Skeleton className="h-7 w-52 rounded-md" />
          <Skeleton className="h-4 w-64 mt-2 rounded-md" />
        </header>

        <main className="w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: cardCount }).map((_, i) => (
              <div
                // eslint-disable-next-line react/no-array-index-key
                key={i}
                className="rounded-lg border bg-card text-card-foreground shadow-sm h-full"
              >
                <div className="p-4 h-full flex flex-col">
                  <div className="space-y-3 flex-1">
                    <Skeleton className="h-5 w-4/5 rounded-md" />
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4 rounded" />
                        <Skeleton className="h-3 w-32 rounded-md" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4 rounded" />
                        <Skeleton className="h-3 w-24 rounded-md" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4 rounded" />
                        <Skeleton className="h-3 w-40 rounded-md" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t mt-auto">
                      <Skeleton className="h-5 w-24 rounded-md" />
                      <Skeleton className="h-7 w-16 rounded-md" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </section>
    </section>
  );
}

export function CustomerDashboardSkeleton() {
  return (
    <section className="w-full relative flex flex-col space-y-4 sm:space-y-6 lg:space-y-8">
      <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-4 sm:p-6">
        <div className="flex justify-between items-start sm:items-center flex-wrap gap-4">
          <div className="min-w-0 flex-1">
            <Skeleton className="h-7 w-56 rounded-md" />
            <Skeleton className="h-4 w-80 mt-3 rounded-md" />
          </div>
        </div>
      </div>

      <UpcomingEventsGridSkeleton />

      {/* Keep layout stability for the remaining sections */}
      <section className="w-full relative bg-background dark:border p-4 sm:p-6 rounded-md">
        <Skeleton className="h-7 w-52 rounded-md" />
        <Skeleton className="h-4 w-72 mt-2 rounded-md" />
        <div className="mt-6 space-y-3">
          <Skeleton className="h-12 w-full rounded-md" />
          <Skeleton className="h-12 w-full rounded-md" />
          <Skeleton className="h-12 w-full rounded-md" />
        </div>
      </section>
    </section>
  );
}

