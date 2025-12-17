import { Shell } from "@/components/shell";
import React from "react";
import { SearchParams } from "./_lib/types";
import { PageLoader } from "@/components/ui/page-loader";
import Payments from "./_components";

interface PageProps {
  searchParams: Promise<SearchParams>;
}
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export default async function Page(props: PageProps) {
  await delay(4000);
  const searchParams = await props.searchParams;
  return (
    <section className="page">
      <Shell className="gap-2">
        <React.Suspense fallback={<PageLoader />}>
          <section className="w-full">
            <Payments />
          </section>
        </React.Suspense>
      </Shell>
    </section>
  );
}
