import { useSitePreviewStore } from "@/store/site-preview.store";
import type { SiteEssentialsFormValues } from "./schema";

/**
 * After Preview → Editor restore, the snapshot stays in the store until Save.
 * Push the latest form values into it whenever media changes so a remount
 * (or React Strict Mode remount) does not resurrect a removed/replaced image.
 */
export function syncSitePreviewFormIfNeeded(
  values: SiteEssentialsFormValues,
): void {
  useSitePreviewStore.getState().syncPreviewData(values);
}
