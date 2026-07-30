"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { Shell } from "@/components/shell";
import { BackButton } from "@/components/ui/back-button";
import { ProtectedPageHeader } from "@/app/(protected)/_components/page-header-card";
import { DiscountFormWizard } from "../../_components/discount-form";
import { DUMMY_DISCOUNTS } from "../../_lib/dummy-data";

export default function EditDiscountPage() {
  const params = useParams<{ id: string }>();
  const discount = useMemo(
    () => DUMMY_DISCOUNTS.find((d) => d.id === Number(params.id)),
    [params.id]
  );

  if (!discount) {
    return (
      <section className="page bg-[var(--color-background,#f3f4f6)]">
        <Shell className="items-start gap-4 pb-4">
          <BackButton href="/vendor/discounts" label="Back to Discounts" />
          <ProtectedPageHeader
            title="Discount not found"
            description="This dummy record does not exist. Use an ID from the list page (1–6)."
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
          description="Update discount settings. Saving still uses dummy data until the API is connected."
        />
        <DiscountFormWizard mode="edit" initialDiscount={discount} />
      </Shell>
    </section>
  );
}
