"use client";

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
          <div className="bg-background p-3 sm:p-6 border rounded-lg mb-4 sm:mb-6">
            <div className="flex flex-1 items-start justify-start flex-col relative text-black">
              <h2 className="text-xl sm:text-2xl mb-1 title-header font-bold">
                Site Essentials
              </h2>
            </div>
          </div>

          <SiteEssentialsForm />
        </>
      )}
    </div>
  );
}
