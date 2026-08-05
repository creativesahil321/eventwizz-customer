import { Shell } from "@/components/shell";
import { BackButton } from "@/components/ui/back-button";
import { ProtectedPageHeader } from "@/app/(protected)/_components/page-header-card";
import { DiscountFormWizard } from "../_components/discount-form";
import type { DiscountFormValues } from "../_lib/schema";
import { defaultDiscountFormValues } from "../_lib/schema";

interface PageProps {
  searchParams: Promise<{
    eventId?: string;
    eventName?: string;
    locationId?: string;
  }>;
}

export default async function CreateDiscountPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const eventId = params.eventId ? Number(params.eventId) : 0;

  // Location always comes from the header selector (client-side store).
  const initialValues: Partial<DiscountFormValues> = {
    ...defaultDiscountFormValues,
    event_id: Number.isFinite(eventId) && eventId > 0 ? eventId : 0,
    name: params.eventName
      ? `${params.eventName} promo`
      : defaultDiscountFormValues.name,
  };

  const backHref =
    eventId > 0
      ? `/vendor/discounts?eventId=${eventId}${
          params.eventName
            ? `&eventName=${encodeURIComponent(params.eventName)}`
            : ""
        }`
      : "/vendor/discounts";

  return (
    <section className="page bg-[var(--color-background,#f3f4f6)]">
      <Shell className="items-start gap-4 pb-4">
        <BackButton href={backHref} label="Back to Discounts" />
        <ProtectedPageHeader
          title="Create Discount"
          description={
            params.eventName
              ? `Create a discount or coupon for ${params.eventName}. This uses the location selected in the header.`
              : "Select a discount or coupon, choose an event for your current location, then set the value and expiry."
          }
        />
        <DiscountFormWizard mode="create" initialValues={initialValues} />
      </Shell>
    </section>
  );
}
