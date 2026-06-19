import { Shell } from "@/components/shell";
import { Suspense } from "react";
import { SearchParams } from "@/types";
import { PageLoader } from "@/components/ui/page-loader";
import { PermissionRoute } from "@/components/permission";

interface PageProps {
  searchParams: Promise<SearchParams>;
}
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export default async function Page(props: PageProps) {
  await delay(4000);
  const searchParams = await props.searchParams;
  return (
    <PermissionRoute
      permissionKey="read-marketing"
      fallbackPath="/vendor/dashboard"
    >
      <section className="page">
        <Shell className="gap-2">
          <Suspense fallback={<PageLoader />}>
            <section className="w-full">
              <h1>MARKETING</h1>
              <pre>{JSON.stringify(searchParams, null, 3)}</pre>
            </section>
          </Suspense>
        </Shell>
      </section>
    </PermissionRoute>
  );
}
