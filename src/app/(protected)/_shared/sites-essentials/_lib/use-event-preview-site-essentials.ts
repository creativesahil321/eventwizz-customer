"use client";

import { useMemo } from "react";
import { useSitePreviewStore } from "@/store/site-preview.store";
import { firstFooterBrandDescription } from "@/lib/footer-brand-description";
import { useSiteEssentialsQuery } from "./queries";
import type { SiteEssentialsFormValues } from "./schema";

/**
 * Site essentials for event previews: unsaved editor snapshot, then GET.
 * Always coalesces `footer_brand_description` so a stale snapshot cannot
 * hide a value the API already returned.
 */
export function useEventPreviewSiteEssentials(): SiteEssentialsFormValues | null {
  const { previewData: storeSiteEssentials } = useSitePreviewStore();
  const { data: apiSiteEssentials } = useSiteEssentialsQuery();

  return useMemo(() => {
    const apiValues = apiSiteEssentials as SiteEssentialsFormValues | undefined;
    const base = storeSiteEssentials ?? apiValues ?? null;
    if (!base) return null;
    return {
      ...base,
      footer_brand_description:
        firstFooterBrandDescription(
          storeSiteEssentials?.footer_brand_description,
          apiValues?.footer_brand_description,
          base.footer_brand_description,
        ) ?? "",
    };
  }, [storeSiteEssentials, apiSiteEssentials]);
}
