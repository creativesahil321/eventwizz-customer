"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { themeKeys } from "@/hooks/use-theme-query";
import { useSiteEssentialsQuery, useSiteEssentialsMutation } from "./queries";
import { siteEssentialsFormSchema, SiteEssentialsFormValues } from "./schema";

export type { SiteEssentialsFormValues };

export const useSiteEssentials = () => {
  const queryClient = useQueryClient();

  // Use TanStack Query for data fetching with caching
  const {
    data: siteEssentials,
    isLoading: isQueryLoading,
    refetch,
  } = useSiteEssentialsQuery();

  // Use TanStack Mutation for updating data
  const { mutateAsync: updateEssentials, isPending: isMutationLoading } =
    useSiteEssentialsMutation();

  // Determine overall loading state
  const isLoading = isQueryLoading || isMutationLoading;

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
      banner_sub_heading: "",
      cover_image: null,
      cover_video: null,
      about_title: "",
      about_description: "",
      about_link_title: "",
      about_cta_link: "",
      event_title_1: "",
      event_title_2: "",
      event_gallery_title: "",
    },
    values: siteEssentials as SiteEssentialsFormValues,
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
