import { Shell } from "@/components/shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminEventReviewLoading() {
  return (
    <section className="page min-w-0 text-black">
      <Shell className="gap-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-full max-w-2xl" />
          <Skeleton className="min-h-[420px] w-full rounded-lg" />
        </div>
      </Shell>
    </section>
  );
}
