"use client";

import { useParams } from "next/navigation";
import { Shell } from "@/components/shell";
import { BackButton } from "@/components/ui/back-button";
import { ProtectedPageHeader } from "@/app/(protected)/_components/page-header-card";
import { DiscountFormWizard } from "../../_components/discount-form";
import { DiscountFormSkeleton } from "../../_components/discount-form-skeleton";
import { useDiscount } from "../../_lib/queries";

export default function EditDiscountPage() {
  const params = useParams<{ id: string }>();
  const { data: discount, isLoading, isError, error } = useDiscount(params.id);

  if (isLoading) {
    return (
      <section className="page bg-[var(--color-background,#f3f4f6)]">
        <Shell className="items-start gap-4 pb-4">
          <BackButton href="/vendor/discounts" label="Back to Discounts" />
          <DiscountFormSkeleton />
        </Shell>
      </section>
    );
  }

  if (isError || !discount) {
    return (
      <section className="page bg-[var(--color-background,#f3f4f6)]">
        <Shell className="items-start gap-4 pb-4">
          <BackButton href="/vendor/discounts" label="Back to Discounts" />
          <ProtectedPageHeader
            title="Discount not found"
            description={
              error instanceof Error
                ? error.message
                : "Could not load this discount from the API."
            }
          />
        </Shell>
      </section>
    );
  }

  return (
    <section className="page bg-[var(--color-background,#f3f4f6)]">
      <Shell className="items-start gap-4 pb-4">
        <BackButton href="/vendor/discounts" label="Back to Discounts" />
        <ProtectedPageHeader
          title={
            discount.category === "coupon_code"
              ? "Edit Coupon Code"
              : "Edit Discount"
          }
          description="Update the offer scope, value, schedule, status, or customer audience."
        />
        <DiscountFormWizard mode="edit" initialDiscount={discount} />
      </Shell>
    </section>
  );
}
