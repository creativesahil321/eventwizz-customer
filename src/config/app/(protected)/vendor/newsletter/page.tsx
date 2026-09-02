import { Shell } from "@/components/shell";
import { Suspense } from "react";
import NewsletterManager from "./_components/newsletter-manager";
import { NewsletterManagerSkeleton } from "./_components/skeleton";
import { PermissionRoute } from "@/components/permission";

export default function Page() {
  return (
    <PermissionRoute
      permissionKey="read-newsletter"
      fallbackPath="/vendor/dashboard"
    >
      <section className="page min-w-0 text-black">
        <Shell className="gap-2">
          <Suspense fallback={<NewsletterManagerSkeleton />}>
            <NewsletterManager />
          </Suspense>
        </Shell>
      </section>
    </PermissionRoute>
  );
}
