import { Suspense } from "react";
import { Shell } from "@/components/shell";
import { PageLoader } from "@/components/ui/page-loader";
import { DiscountsList } from "./_components/discounts-list";

export default function DiscountsPage() {
  return (
    <section className="page bg-[var(--color-background,#f3f4f6)]">
      <Shell className="items-start gap-4 pb-4">
        <Suspense fallback={<PageLoader />}>
          <DiscountsList />
        </Suspense>
      </Shell>
    </section>
  );
}
