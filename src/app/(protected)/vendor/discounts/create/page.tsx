import { Shell } from "@/components/shell";
import { BackButton } from "@/components/ui/back-button";
import { ProtectedPageHeader } from "@/app/(protected)/_components/page-header-card";
import { DiscountFormWizard } from "../_components/discount-form";
import { DUMMY_EVENTS } from "../_lib/dummy-data";
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
  const locationId = params.locationId
    ? Number(params.locationId)
    : DUMMY_EVENTS.find((e) => e.id === eventId)?.location_id ?? 0;

  const initialValues: Partial<DiscountFormValues> = {
    ...defaultDiscountFormValues,
    event_ids:
      Number.isFinite(eventId) && eventId > 0 ? [eventId] : [],
    location_ids:
      Number.isFinite(locationId) && locationId > 0 ? [locationId] : [],
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
              ? `Creating a promotion for ${params.eventName}. Pick a category, set the value, then activate.`
              : "Pick a category, set where it applies, choose the value, then set expiry and activate."
          }
        />
        <DiscountFormWizard mode="create" initialValues={initialValues} />
      </Shell>
    </section>
  );
}
