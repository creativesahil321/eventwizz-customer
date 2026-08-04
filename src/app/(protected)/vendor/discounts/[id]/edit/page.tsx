"use client";

import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Shell } from "@/components/shell";
import { BackButton } from "@/components/ui/back-button";
import { ProtectedPageHeader } from "@/app/(protected)/_components/page-header-card";
import { DiscountFormWizard } from "../../_components/discount-form";
import { useDiscount } from "../../_lib/queries";

export default function EditDiscountPage() {
  const params = useParams<{ id: string }>();
  const { data: discount, isLoading, isError, error } = useDiscount(params.id);

  if (isLoading) {
    return (
      <section className="page bg-[var(--color-background,#f3f4f6)]">
        <Shell className="items-start gap-4 pb-4">
          <BackButton href="/vendor/discounts" label="Back to Discounts" />
          <div className="flex w-full items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading discount…
          </div>
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
          title="Edit Discount"
          description="Update discount settings. Save will call the update API when store/update contracts are confirmed."
        />
        <DiscountFormWizard mode="edit" initialDiscount={discount} />
      </Shell>
    </section>
  );
}
