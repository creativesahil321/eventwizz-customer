import { Skeleton } from "@/components/ui/skeleton";
import { pageCardClassName } from "@/app/(protected)/_components/page-header-card";

/** Wizard card only: step pills, fields and footer. */
export function DiscountWizardSkeleton() {
  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <div className={pageCardClassName("min-w-0")}>
        <div className="mb-6 flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 shrink-0 rounded-full" />
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-11 w-full sm:h-10" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-11 w-full sm:h-10" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-11 w-full sm:h-10" />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Skeleton className="h-10 w-24 rounded-md" />
          <Skeleton className="h-10 w-24 rounded-md" />
        </div>
      </div>
    </div>
  );
}

/** Full page fallback: page header card plus the wizard card. */
export function DiscountFormSkeleton() {
  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <div className={pageCardClassName("space-y-3")}>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>
      <DiscountWizardSkeleton />
    </div>
  );
}
