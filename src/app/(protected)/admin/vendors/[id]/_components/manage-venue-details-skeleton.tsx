import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton loader for Manage Venue Details page.
 * Mirrors the consolidated layout: one top card (header + identity + login/security),
 * then two-column grid (left: Contact & Business + Events & Notes; right: Location + Financial).
 */
export function ManageVenueDetailsSkeleton() {
  return (
    <div className="flex flex-col gap-6 text-black min-w-0">
      {/* Top card: header (title + actions) + identity + login/security row */}
      <Card className="bg-white border-[var(--color-border)] shadow-sm overflow-hidden">
        <CardHeader className="py-4 px-4 sm:px-6 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
            <Skeleton className="h-7 w-48" />
            <div className="flex items-center gap-1.5 shrink-0">
              <Skeleton className="h-7 w-32 rounded-md" />
              <Skeleton className="h-7 w-28 rounded-md" />
              <Skeleton className="h-7 w-7 rounded-md" />
              <Skeleton className="h-7 w-7 rounded-md" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5 px-4 sm:px-6 pb-5 space-y-0">
          {/* Venue identity row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-4">
            <Skeleton className="h-12 w-12 shrink-0 rounded-lg" />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-5 w-16 rounded-md" />
              </div>
            </div>
          </div>
          {/* Login & Security row */}
          <div className="border-t border-slate-100 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <Skeleton className="h-4 w-32" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-9 w-28 rounded-md" />
              <Skeleton className="h-9 w-24 rounded-md" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two columns: left 2 cards, right 1 card (with 2 sections) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left: Contact & Business + Events & Admin Notes */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white border-[var(--color-border)] shadow-sm">
            <CardHeader className="pb-4">
              <Skeleton className="h-5 w-52" />
            </CardHeader>
            <CardContent className="space-y-5 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-14" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-[90%]" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-16 rounded-md" />
                  <Skeleton className="h-9 w-28 rounded-md mt-1" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-[var(--color-border)] shadow-sm">
            <CardHeader className="pb-4">
              <Skeleton className="h-5 w-44" />
            </CardHeader>
            <CardContent className="space-y-5 pt-0">
              <div>
                <Skeleton className="h-3 w-36 mb-3" />
                <div className="space-y-2.5">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-[85%]" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
                <Skeleton className="h-9 w-32 rounded-md mt-3" />
              </div>
              <div className="border-t border-slate-100 pt-5">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-4/5 mb-4" />
                <Skeleton className="h-[72px] w-full rounded-md" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: single card with Event Location + Financial sections */}
        <div className="space-y-0">
          <Card className="bg-white border-[var(--color-border)] shadow-sm overflow-hidden">
            <CardHeader className="space-y-0 pb-5">
              <Skeleton className="h-5 w-48" />
            </CardHeader>
            <CardContent className="space-y-5 pt-0">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </CardContent>
            <div className="border-t border-slate-200 bg-slate-50/30">
              <CardHeader className="space-y-0 py-5">
                <Skeleton className="h-5 w-52" />
                <Skeleton className="h-3 w-24 mt-1" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                    <div key={j} className="space-y-1">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="flex justify-end gap-3">
        <Skeleton className="h-10 w-24 rounded-md" />
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>
    </div>
  );
}
