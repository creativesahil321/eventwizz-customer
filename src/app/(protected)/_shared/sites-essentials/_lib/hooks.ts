"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { themeKeys } from "@/hooks/use-theme-query";
import {
  useSiteEssentialsBySlugQuery,
  useSiteEssentialsQuery,
  useSiteEssentialsMutation,
} from "./queries";
import { siteEssentialsFormSchema, SiteEssentialsFormValues } from "./schema";
import { mergeGlobalWithLocationSiteEssentials } from "./merge-location-preview";
import { resolvePreviewLocationList } from "./preview-locations";
import { toMutableSiteEssentialsFormValues } from "./to-mutable-form-values";
import { useVendorLocationsList } from "@/app/(protected)/vendor/venue-locations/_lib/queries";
import { resolveDefaultVenueLocation } from "@/lib/auth/session-location";
import { defaultThemeConstants } from "@/services/common/theme/constants/theme";

export type { SiteEssentialsFormValues };

export const useSiteEssentials = () => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const {
    data: globalSiteEssentials,
    isLoading: isGlobalLoading,
    refetch: refetchGlobal,
  } = useSiteEssentialsQuery();
  const { locations: venueLocations } = useVendorLocationsList();

  const defaultVenueLocation = useMemo(
    () =>
      resolveDefaultVenueLocation(
        venueLocations,
        venueLocations.find(
          (loc) =>
            String(loc.id) === String(session?.user?.vendor_location_id ?? ""),
        ),
      ),
    [venueLocations, session?.user?.vendor_location_id],
  );

  const singleLocationSlug = useMemo(() => {
    const fromApi = resolvePreviewLocationList(
      globalSiteEssentials?.locations,
      venueLocations,
      {
        slug: defaultVenueLocation?.slug,
        name: defaultVenueLocation?.city ?? defaultVenueLocation?.name,
        vendor_location_id: session?.user?.vendor_location_id,
      },
    );
    return fromApi.length === 1 ? fromApi[0].slug : undefined;
  }, [
    globalSiteEssentials?.locations,
    venueLocations,
    defaultVenueLocation,
    session?.user?.vendor_location_id,
  ]);

  const {
    data: locationSiteEssentials,
    isLoading: isLocationLoading,
    refetch: refetchLocation,
  } = useSiteEssentialsBySlugQuery(
    singleLocationSlug,
    Boolean(singleLocationSlug?.trim()),
  );

  const siteEssentials = useMemo(() => {
    if (!globalSiteEssentials) return undefined;
    if (!singleLocationSlug || !locationSiteEssentials) {
      return globalSiteEssentials;
    }

    const locationLabel =
      locationSiteEssentials.locations?.[0]?.city ??
      globalSiteEssentials.locations?.[0]?.city ??
      globalSiteEssentials.name;

    return mergeGlobalWithLocationSiteEssentials(
      globalSiteEssentials as SiteEssentialsFormValues,
      locationSiteEssentials,
      locationLabel,
      { isSingleLocation: true, previewSlug: singleLocationSlug },
    );
  }, [globalSiteEssentials, singleLocationSlug, locationSiteEssentials]);

  const isQueryLoading =
    isGlobalLoading ||
    (Boolean(singleLocationSlug) && isLocationLoading && !locationSiteEssentials);

  const refetch = async () => {
    const results = await Promise.all([
      refetchGlobal(),
      singleLocationSlug ? refetchLocation() : Promise.resolve(),
    ]);
    return results[0];
  };

  // Use TanStack Mutation for updating data
  const { mutateAsync: updateEssentials, isPending: isMutationLoading } =
    useSiteEssentialsMutation();

  // Determine overall loading state
  const isLoading = isQueryLoading || isMutationLoading;

  const mutableFormValues = useMemo(
    () =>
      siteEssentials
        ? toMutableSiteEssentialsFormValues(siteEssentials)
        : undefined,
    [siteEssentials],
  );

  // Set up form with react-hook-form
  const form = useForm<SiteEssentialsFormValues>({
    resolver: zodResolver(siteEssentialsFormSchema),
    // `values` re-syncs the form whenever the server data reference changes
    // (location `?slug=` query settling, mutation cache updates, invalidations,
    // reconnect refetch). Without `keepDirtyValues` that re-sync silently wipes
    // the vendor's unsaved edits/imports — the "data vanishes / fluctuates" bug.
    // Keeping dirty values means only untouched fields are refreshed from the
    // server, so typed content, imported colors/fonts and uploaded media stick.
    resetOptions: {
      keepDirtyValues: true,
      keepErrors: true,
    },
    defaultValues: {
      colors: {
        primary: "",
        secondary: "",
        header: "",
        footer: "",
        background: "",
        surface: "",
        text: "",
        textDimmed: "",
        socialLogin: {
          google: "",
          microsoft: "",
        },
      },
      typography: {
        fontFamily: {
          heading: defaultThemeConstants.typography.fontFamily.heading,
          body: defaultThemeConstants.typography.fontFamily.body,
        },
        customFontStylesheetUrls: [],
        headingEmphasis: "uniform",
      },

      socialLinks: {
        facebook: "",
        twitter: "",
        instagram: "",
        linkedin: "",
        youtube: "",
      },
      seo: {
        title: "",
        description: "",
        keywords: "",
      },
      name: "",
      website_role: "",
      copyright: "",
      footer_brand_description: "",
      logo: null,
      favicon: null,
      banner_heading: "",
      banner_heading_accent: "",
      banner_heading_align: "center",
      banner_heading_valign: "center",
      banner_sub_heading: "",
      cover_image: null,
      cover_video: null,
      about_title: "",
      about_description: "",
      about_link_title: "",
      about_cta_link: "",
      terms_and_conditions: "",
      privacy_policy: "",
      refund_policy: "",
      cookie_policy: "",
      vendor_terms: "",
      about_page_content: "",
      how_it_works_page_content: "",
      contact_page_content: "",
      company_legal_name: "",
      company_number: "",
      company_registered_office: "",
      company_phone: "",
      company_email: "",
      event_title_1: "",
      event_title_2: "",
      event_gallery_title: "",
      main_landing_cover_image: null,
      main_landing_banner_heading: "",
      main_landing_banner_sub_heading: "",
      main_landing_locations_list_title: "",
      main_landing_locations_list_subtitle: "",
      home_hero_eyebrow: "",
      home_hero_title: "",
      home_hero_subtitle: "",
      home_hero_primary_cta: "",
      home_hero_secondary_cta: "",
      home_hero_primary_cta_link: "",
      home_hero_secondary_cta_link: "",
      home_hero_background_image: null,
      home_intro_title: "",
      home_intro_body: "",
      home_partners_title: "",
      home_partners_subtitle: "",
      home_partner_logo_1: null,
      home_partner_logo_2: null,
      home_partner_logo_3: null,
      home_partner_logo_4: null,
      home_partner_logo_5: null,
      home_partner_logo_6: null,
      home_audience_title: "",
      home_audience_subtitle: "",
      home_audience_1_title: "",
      home_audience_1_description: "",
      home_audience_1_image: null,
      home_audience_2_title: "",
      home_audience_2_description: "",
      home_audience_2_image: null,
      home_audience_3_title: "",
      home_audience_3_description: "",
      home_audience_3_image: null,
      home_audience_4_title: "",
      home_audience_4_description: "",
      home_audience_4_image: null,
      home_audience_5_title: "",
      home_audience_5_description: "",
      home_audience_5_image: null,
      home_audience_6_title: "",
      home_audience_6_description: "",
      home_audience_6_image: null,
      home_features_title: "",
      home_features_subtitle: "",
      home_feature_1_title: "",
      home_feature_1_icon: "",
      home_feature_2_title: "",
      home_feature_2_icon: "",
      home_feature_3_title: "",
      home_feature_3_icon: "",
      home_feature_4_title: "",
      home_feature_4_icon: "",
      home_feature_5_title: "",
      home_feature_5_icon: "",
      home_feature_6_title: "",
      home_feature_6_icon: "",
      home_feature_7_title: "",
      home_feature_7_icon: "",
      home_feature_8_title: "",
      home_feature_8_icon: "",
      home_feature_9_title: "",
      home_feature_9_icon: "",
      home_feature_10_title: "",
      home_feature_10_icon: "",
      home_showcase_title: "",
      home_showcase_body: "",
      home_showcase_checklist_title: "",
      home_showcase_cta: "",
      home_showcase_cta_link: "",
      home_showcase_image: null,
      home_showcase_video_url: "",
      home_news_title: "",
      home_news_subtitle: "",
      home_faq_title: "",
      home_faq_subtitle: "",
      home_faq_items: [],
    },
    values: mutableFormValues,
  });

  // Handle form submission
  const onSubmit = async (
    values: SiteEssentialsFormValues
  ): Promise<boolean> => {
    try {
      await updateEssentials(values);
      // Theme (colors, typography, etc.) is a separate query; without this the
      // shell keeps stale CSS variables until a full reload.
      await queryClient.invalidateQueries({ queryKey: themeKeys.all });
      return true;
    } catch (err) {
      console.error("Error updating site essentials:", err);
      return false;
    }
  };

  return {
    siteEssentials,
    isLoading,
    form,
    onSubmit,
    fetchSiteEssentials: refetch,
  };
};
