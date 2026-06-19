import { Shell } from "@/components/shell";
import React from "react";
// import { SearchParams } from "./_lib/types";
import { PageLoader } from "@/components/ui/page-loader";
import DisputeResolutionCentre from "./_components";

// interface PageProps {
//   searchParams: Promise<SearchParams>;
// }
//  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export default async function Page() {
  // await delay(4000);
  // const searchParams = await props.searchParams;
  return (
    <section className="page">
      <Shell className="gap-2"> 
        <React.Suspense fallback={<PageLoader />}>
          <section className="w-full">
            <DisputeResolutionCentre />
          </section>
        </React.Suspense>
      </Shell>
    </section>
  );
}
