"use client";

import { pageCardClassName } from "@/app/(protected)/_components/page-header-card";
import { LocationScopedTitle } from "@/components/location-indicator";
import { useSiteEssentials } from "./_lib/hooks";
import { SiteEssentialsForm } from "./_components/site-essentials-form";
import { SiteEssentialsFormSkeleton } from "./_components/skeleton";

export default function SiteEssentialsPage() {
  const { isLoading } = useSiteEssentials();

  return (
    <div className="max-w-full min-w-0 overflow-x-hidden px-3 sm:px-6">
      {isLoading ? (
        <SiteEssentialsFormSkeleton />
      ) : (
        <>
          <div className={pageCardClassName("mb-4 sm:mb-6 min-w-0")}>
            <div className="flex flex-1 items-start justify-start flex-col relative text-black gap-3">
              <h1 className="text-xl sm:text-2xl title-header font-bold">
                <LocationScopedTitle title="Site Essentials" />
              </h1>
              <p className="text-sm text-muted-foreground">
                Branding and site content for this venue. Switch location in the
                header to edit another.
              </p>
            </div>
          </div>

          <SiteEssentialsForm />
        </>
      )}
    </div>
  );
}
