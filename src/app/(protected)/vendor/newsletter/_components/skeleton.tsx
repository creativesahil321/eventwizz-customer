import { Skeleton } from "@/components/ui/skeleton";
import { pageCardClassName } from "@/app/(protected)/_components/page-header-card";

export function NewsletterFormSkeleton() {
  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <div className={pageCardClassName("min-w-0")}>
        <div className="flex min-w-0 flex-col gap-3">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
      </div>

      <div className={pageCardClassName("min-w-0")}>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:gap-4">
          <div className="grid w-full gap-2 lg:min-w-64">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="grid w-full gap-2 lg:min-w-64">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="grid w-full gap-2 lg:min-w-64">
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="grid w-full gap-2 lg:min-w-48">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-24 shrink-0 rounded-md" />
        </div>
      </div>
    </div>
  );
}
