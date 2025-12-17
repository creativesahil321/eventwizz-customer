import { PageLoader } from "@/components/ui/page-loader";
import { Suspense } from "react";

interface PageProps {
  searchParams: Record<string, string | string[] | undefined>;
}
export default async function Page(props: PageProps) {
  return (
    <Suspense fallback={<PageLoader />}>
      <section className="w-full relative flex flex-col space-y-8">
        {JSON.stringify(props, null, 5)}
      </section>
    </Suspense>
  );
}
