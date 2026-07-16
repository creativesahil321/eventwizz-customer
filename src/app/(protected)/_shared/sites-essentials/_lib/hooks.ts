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
          heading: "",
          body: "",
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
      copyright: "",
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
