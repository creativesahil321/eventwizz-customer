import { Suspense } from "react";
import type { Metadata } from "next";
import { DoorEntryLanding } from "./_components/door-entry-landing";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Door entry",
  robots: { index: false, follow: false },
};

function DoorEntryFallback() {
  return (
    <div className="mx-auto w-full max-w-lg space-y-4 px-4 py-16">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-12 w-48" />
    </div>
  );
}

export default function DoorEntryPage() {
  return (
    <Suspense fallback={<DoorEntryFallback />}>
      <DoorEntryLanding />
    </Suspense>
  );
}
