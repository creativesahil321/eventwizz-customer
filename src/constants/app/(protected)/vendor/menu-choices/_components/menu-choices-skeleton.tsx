import { Skeleton } from "@/components/ui/skeleton";

/**
 * Full page skeleton loader for Menu Choices page
 */
export function MenuChoicesPageSkeleton() {
  return (
    <section className="w-full relative flex flex-col space-y-5">
      {/* Header Skeleton */}
      <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-sm p-4 sm:p-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-4 w-96 mb-4" />
        <div className="flex items-center gap-4 pb-4 border-b">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-2 w-32" />
        </div>
        <div className="flex items-center gap-3 pt-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-8 w-32" />
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    </section>
  );
}

/**
 * Menu selection form skeleton loader
 */
export function MenuSelectionFormSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-lg p-6 space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}
