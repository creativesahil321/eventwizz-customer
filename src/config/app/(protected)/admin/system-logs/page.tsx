import { Shell } from "@/components/shell";
import React from "react";
import SystemLogs from "./_components";
import { PageLoader } from "@/components/ui/page-loader";

export default async function Page() {
  return (
    <section className="page overflow-x-auto text-black min-w-0">
      <Shell className="gap-2 overflow-visible">
        <React.Suspense fallback={<PageLoader />}>
          <section className="w-full min-w-0">
            <SystemLogs />
          </section>
        </React.Suspense>
      </Shell>
    </section>
  );
}
