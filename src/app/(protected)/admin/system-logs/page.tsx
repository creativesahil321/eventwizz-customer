import { Shell } from "@/components/shell";
import React from "react";
import { SearchParams } from "./_lib/types";
import SystemLogs from "./_components";
import { PageLoader } from "@/components/ui/page-loader";

interface PageProps {
  searchParams: Promise<SearchParams>;
}
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export default async function Page(props: PageProps) {
  await delay(4000);
  await props.searchParams; // Wait for searchParams
  return (
    <section className="page overflow-x-auto">
      <Shell className="gap-2 overflow-visible">
        <React.Suspense fallback={<PageLoader />}>
          <section className="w-full">
            <SystemLogs />
          </section>
        </React.Suspense>
      </Shell>
    </section>
  );
}
