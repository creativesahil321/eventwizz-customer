import { Skeleton } from "@/components/ui/skeleton";
import { pageCardClassName } from "@/app/(protected)/_components/page-header-card";

/** Rows shaped like a discount card: icon tile, text block, row actions. */
export function DiscountRowsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <ul className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <li
          key={i}
          className="flex flex-col gap-3 rounded-xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 items-start gap-3">
            <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-4 w-44 max-w-full" />
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3 w-64 max-w-full" />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
            <Skeleton className="h-8 w-16 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Whole-page fallback: header, category pills, filters and rows. */
export function DiscountsListSkeleton() {
  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <div className={pageCardClassName("flex flex-wrap items-start justify-between gap-4")}>
        <div className="min-w-0 space-y-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
        <Skeleton className="h-10 w-36 shrink-0 rounded-md" />
      </div>

      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-28 rounded-full" />
        ))}
      </div>

      <div className={pageCardClassName("space-y-4")}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <Skeleton className="h-9 min-w-0 flex-1" />
          <Skeleton className="h-9 w-full lg:w-[160px]" />
        </div>
        <DiscountRowsSkeleton />
      </div>
    </div>
  );
}
