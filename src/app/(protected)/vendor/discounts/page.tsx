import { Suspense } from "react";
import { Shell } from "@/components/shell";
import { DiscountsList } from "./_components/discounts-list";
import { DiscountsListSkeleton } from "./_components/discounts-list-skeleton";

export default function DiscountsPage() {
  return (
    <section className="page bg-[var(--color-background,#f3f4f6)]">
      <Shell className="items-start gap-4 pb-4">
        <Suspense fallback={<DiscountsListSkeleton />}>
          <DiscountsList />
        </Suspense>
      </Shell>
    </section>
  );
}
