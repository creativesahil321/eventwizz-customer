"use client";

import { pageCardClassName } from "@/app/(protected)/_components/page-header-card";
import { LocationIndicator } from "@/components/location-indicator";
import { useSiteEssentials } from "./_lib/hooks";
import { SiteEssentialsForm } from "./_components/site-essentials-form";
import { SiteEssentialsFormSkeleton } from "./_components/skeleton";

export default function SiteEssentialsPage() {
  const { isLoading } = useSiteEssentials();

  return (
    <div className="px-4 sm:px-6 max-w-full overflow-x-hidden">
      {isLoading ? (
        <SiteEssentialsFormSkeleton />
      ) : (
        <>
          <div className={pageCardClassName("mb-4 sm:mb-6 min-w-0")}>
            <div className="flex flex-1 items-start justify-start flex-col relative text-black gap-3">
              <h1 className="text-xl sm:text-2xl title-header font-bold">
                Site Essentials
              </h1>
              <LocationIndicator variant="card" context="Site settings" />
            </div>
          </div>

          <SiteEssentialsForm />
        </>
      )}
    </div>
  );
}
