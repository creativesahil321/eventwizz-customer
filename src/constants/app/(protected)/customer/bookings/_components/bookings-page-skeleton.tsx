import { Skeleton } from "@/components/ui/skeleton";
import BookingsSkeleton from "./bookings-skeleton";

export default function BookingsPageSkeleton() {
  return (
    <section className="w-full space-y-6">
      <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="min-w-0">
            <Skeleton className="h-7 w-44 rounded-md" />
            <Skeleton className="h-4 w-64 mt-2 rounded-md" />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full lg:w-auto">
            <div className="relative flex-1 min-w-0 sm:min-w-[280px]">
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <Skeleton className="h-10 w-full sm:w-[160px] lg:w-[180px] rounded-md" />
          </div>
        </div>
      </div>

      <BookingsSkeleton count={10} />
    </section>
  );
}

