import { Shell } from "@/components/shell";
import React from "react";
import SeoTools from "./_components";
import { PageLoader } from "@/components/ui/page-loader";
import { PermissionRoute } from "@/components/permission";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export default async function Page() {
  await delay(4000);
  return (
    <PermissionRoute
      permissionKey="read-seo-tool"
      fallbackPath="/vendor/dashboard"
    >
      <section className="page">
        <Shell className="gap-2">
          <React.Suspense
            fallback={
              <section className="flex min-h-screen bg-background rounded-md w-full items-center justify-center flex-col">
                <PageLoader />
              </section>
            }
          >
            <section className="w-full">
              <SeoTools />
            </section>
          </React.Suspense>
        </Shell>
      </section>
    </PermissionRoute>
  );
}
