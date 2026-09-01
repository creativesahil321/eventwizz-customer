import { lowestBookableFromPrice, lowestPositivePrice } from "@/lib/event-room-chooser-item";
import {
  ONBOARDING_PREVIEW_EDITOR_TARGETS,
  type PreviewEditorTarget,
} from "../_components/form-preview/preview-edit-hit";

/** Where preview “Prices from” should jump — mirrors live event page pricing sources. */
export function resolveOnboardingPreviewPriceEditTarget(options: {
  datePrices?: Array<string | number | null | undefined>;
  packagePrices?: Array<string | number | null | undefined>;
}): PreviewEditorTarget {
  if (lowestPositivePrice(options.datePrices ?? []) != null) {
    return ONBOARDING_PREVIEW_EDITOR_TARGETS.dates;
  }
  if (lowestPositivePrice(options.packagePrices ?? []) != null) {
    return ONBOARDING_PREVIEW_EDITOR_TARGETS.drinks;
  }
  return ONBOARDING_PREVIEW_EDITOR_TARGETS.dates;
}

export function resolveOnboardingPreviewBrochureFromPrice(options: {
  datePrices?: Array<string | number | null | undefined>;
  packagePrices?: Array<string | number | null | undefined>;
}): number | null {
  return lowestBookableFromPrice(options);
}

export function formatOnboardingPreviewBrochurePriceDescription(
  amount: number | null,
  formatPrice: (value: number) => string,
): string {
  return amount != null ? `${formatPrice(amount)} per person` : "See dates below";
}
