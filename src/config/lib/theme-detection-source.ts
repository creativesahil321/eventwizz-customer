import type { ThemeDetectionInput } from "@/components/theme-animations/theme-detector";
import type { EventDetailData } from "@/services/vendor/events/type";
import type { StepThreeType } from "@/app/(on-boarding)/on-boarding/_components/form-provider/schema";

type VendorRootExtras = EventDetailData & {
  detected_theme?: string;
};

/** Map vendor event API / editor payload → theme detector input (step-based shape). */
export function themeDetectionFromVendorEventData(
  data: EventDetailData | null | undefined,
): ThemeDetectionInput | undefined {
  if (data == null) return undefined;
  const s1 = data.stepOne;
  const root = data as VendorRootExtras;
  return {
    slug: typeof data.slug === "string" ? data.slug : undefined,
    detected_theme: root.detected_theme,
    event_name: s1?.event_name,
    event_banner_heading: s1?.event_banner_heading,
    event_banner_sub_heading: s1?.event_banner_sub_heading,
    about_event_description: s1?.about_event_description,
  };
}

/** Map onboarding step 3 → theme detector input. */
export function themeDetectionFromOnboardingStepThree(
  stepThree: StepThreeType | null | undefined,
  options?: { slug?: string; detected_theme?: string },
): ThemeDetectionInput | undefined {
  if (stepThree == null) return undefined;
  return {
    slug: options?.slug,
    detected_theme: options?.detected_theme,
    event_name: stepThree.event_name,
    event_banner_heading: stepThree.event_banner_heading,
    event_banner_sub_heading: stepThree.event_banner_sub_heading,
    about_event_description: stepThree.about_event_description,
  };
}
