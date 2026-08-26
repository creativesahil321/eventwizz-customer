import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";

export function NewsletterManagerSkeleton() {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="mb-4 min-w-0 rounded-lg border border-[var(--color-border)] bg-white p-6 shadow-md">
        <div className="flex flex-col flex-wrap items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <div className="flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
            <Skeleton className="h-10 w-full sm:w-60" />
            <Skeleton className="h-10 w-[180px]" />
            <Skeleton className="h-9 w-28 shrink-0" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--color-border)] pt-4 sm:gap-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex min-h-[72px] items-center gap-3 rounded-lg border border-[var(--color-border)] p-3 sm:p-4"
            >
              <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-6 w-10" />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-lg border border-[var(--color-border)] p-4 sm:p-5">
          <Skeleton className="h-4 w-52" />
          <Skeleton className="mt-2 h-3 w-full max-w-md" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex gap-3 rounded-md border border-[var(--color-border)] p-3"
              >
                <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <DataTableSkeleton
        columnCount={8}
        cellWidths={[
          "12rem",
          "18rem",
          "10rem",
          "8rem",
          "8rem",
          "8rem",
          "10rem",
          "6rem",
        ]}
        shrinkZero
        withViewOptions={false}
      />
    </div>
  );
}
