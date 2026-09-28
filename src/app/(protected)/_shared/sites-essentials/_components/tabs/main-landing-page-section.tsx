"use client";

import { LongTextInput } from "@/components/ui/long-text-input";
import { BANNER_HEADING_MAX_CHARS } from "@/lib/hero-copy-limits";
import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { Home } from "lucide-react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { FileUploader } from "@/components/ui/file-uploader";
import { SectionCard } from "../ui/section-card";
import { SiteEssentialsFormValues } from "../../_lib/schema";
import { BANNER_SUB_HEADING_MAX_CHARS } from "../../_lib/schema";
import { addCacheBusting } from "@/lib/image-utils";
import {
  BANNER_HEADING_MAX_WORDS,
  countWords,
  truncateToMaxWordsForInput,
} from "@/lib/word-count";
import { useSiteEssentialsUpdateGate } from "../../_lib/site-essentials-update-context";
import { useSiteEssentialsQuery } from "../../_lib/queries";
import {
  SITE_HERO_BACKGROUND_CROP,
  SITE_HERO_UPLOAD_HINT,
} from "@/lib/event-image-crop-presets";
import { isUnsavedPreviewMedia } from "../../_lib/merge-preview-with-api";
import { syncSitePreviewFormIfNeeded } from "../../_lib/sync-preview-form";

interface MainLandingPageSectionProps {
  serverMainLandingCoverImage?: string;
}

export function MainLandingPageSection({
  serverMainLandingCoverImage,
}: MainLandingPageSectionProps) {
  const { readOnly } = useSiteEssentialsUpdateGate();
  const form = useFormContext<SiteEssentialsFormValues>();
  // Backend often overwrites cover at the same path — version so the editor preview refreshes.
  const { dataUpdatedAt: siteMediaVersion } = useSiteEssentialsQuery();

  const [coverImageFiles, setCoverImageFiles] = useState<File[]>([]);
  const [coverImageUrl, setCoverImageUrl] = useState<string>("");

  const watchedCover = form.watch("main_landing_cover_image");

  // Server refetch only — do not restore when the user cleared the field (form value is null)
  // or when Preview restored an unsaved blob:/data: URL for a new upload.
  useEffect(() => {
    const formCover = form.getValues("main_landing_cover_image");
    if (formCover instanceof File || formCover === null) return;
    if (isUnsavedPreviewMedia(formCover)) {
      setCoverImageFiles([]);
      setCoverImageUrl(String(formCover).trim());
      return;
    }

    const hasServer = Boolean(serverMainLandingCoverImage?.length);
    setCoverImageFiles([]);
    if (hasServer) {
      setCoverImageUrl(serverMainLandingCoverImage!);
    } else if (typeof formCover === "string" && formCover) {
      setCoverImageUrl(formCover);
    } else {
      setCoverImageUrl("");
    }
  }, [serverMainLandingCoverImage, form]);

  useEffect(() => {
    if (watchedCover instanceof File) {
      setCoverImageFiles([watchedCover]);
      setCoverImageUrl("");
      return;
    }

    setCoverImageFiles([]);

    if (watchedCover === null) {
      setCoverImageUrl("");
      return;
    }

    // Prefer form strings (incl. Preview blob URLs) over the previous API image.
    if (typeof watchedCover === "string" && watchedCover.trim()) {
      setCoverImageUrl(watchedCover.trim());
      return;
    }

    if (serverMainLandingCoverImage?.trim()) {
      setCoverImageUrl(serverMainLandingCoverImage);
    } else {
      setCoverImageUrl("");
    }
  }, [watchedCover, serverMainLandingCoverImage]);

  const handleCoverChange = (files: File[]) => {
    setCoverImageFiles(files);
    setCoverImageUrl("");
    form.setValue(
      "main_landing_cover_image",
      files.length > 0 ? files[0] : null,
      { shouldDirty: true, shouldTouch: true },
    );
    syncSitePreviewFormIfNeeded(form.getValues());
  };

  const handleRemoveCover = () => {
    setCoverImageFiles([]);
    setCoverImageUrl("");
    form.setValue("main_landing_cover_image", null, {
      shouldDirty: true,
      shouldTouch: true,
    });
    syncSitePreviewFormIfNeeded(form.getValues());
  };

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex items-start gap-3 rounded-xl border border-teal-200 bg-teal-50 p-3 dark:border-teal-800 dark:bg-teal-950/40 sm:items-center sm:p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-500 text-white sm:h-10 sm:w-10">
          <Home className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-300">
            Main home page
          </p>
          <p className="text-sm font-bold leading-snug text-teal-900 dark:text-teal-100">
            Shown before guests pick a location — same on every city
          </p>
        </div>
      </div>

      <SectionCard
        title="Hero & background"
        description="Headline, subline, and full-width background image on your multi-location home page."
      >
        <div className="grid gap-4 md:grid-cols-2 md:gap-6">
          <FormField
            control={form.control}
            name="main_landing_banner_heading"
            render={({ field }) => {
              const wc = countWords(field.value || "");
              return (
                <FormItem>
                  <FormLabel>Main page heading</FormLabel>
                  <FormControl>
                    <Input
                      maxLength={BANNER_HEADING_MAX_CHARS}
                      placeholder="Find Events Near You"
                      disabled={readOnly}
                      {...field}
                      value={field.value || ""}
                      onChange={(e) =>
                        field.onChange(
                          truncateToMaxWordsForInput(
                            e.target.value,
                            BANNER_HEADING_MAX_WORDS,
                          ),
                        )
                      }
                    />
                  </FormControl>
                  <div className="mt-1 text-xs text-muted-foreground">
                    <span>
                      {wc}/{BANNER_HEADING_MAX_WORDS} words
                    </span>
                  </div>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          <FormField
            control={form.control}
            name="main_landing_banner_sub_heading"
            render={({ field }) => {
              const currentLength = field.value?.length || 0;
              const maxLength = BANNER_SUB_HEADING_MAX_CHARS;
              return (
                <FormItem>
                  <FormLabel>Main page subheading</FormLabel>
                  <FormControl>
                    <LongTextInput
                      placeholder="Discover verified venues and curated events in your area."
                      disabled={readOnly}
                      {...field}
                      value={field.value || ""}
                      maxLength={maxLength}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <div className="mt-1 text-xs text-muted-foreground">
                    <span
                      className={
                        currentLength > maxLength ? "text-destructive" : ""
                      }
                    >
                      {currentLength}/{maxLength} characters
                    </span>
                  </div>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
        </div>

        <FormField
          control={form.control}
          name="main_landing_cover_image"
          render={() => (
            <FormItem>
              <FormLabel>Main home background image</FormLabel>
              <FormDescription>
                Full-width hero on the multi-location home page (before a city
                is chosen). {SITE_HERO_UPLOAD_HINT} Separate from each
                location’s cover image under Branding.
              </FormDescription>
              <FormControl>
                {coverImageUrl ? (
                  <div className="space-y-2">
                    <img
                      key={`main-cover-${siteMediaVersion}`}
                      src={addCacheBusting(coverImageUrl, siteMediaVersion)}
                      alt="Main landing background preview"
                      className="mx-auto aspect-video max-h-48 w-full rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={handleRemoveCover}
                      className="text-sm text-red-500 underline disabled:pointer-events-none disabled:opacity-50"
                    >
                      Remove image
                    </button>
                  </div>
                ) : (
                  <FileUploader
                    value={coverImageFiles}
                    onValueChange={handleCoverChange}
                    maxFileCount={1}
                    maxSize={2 * 1024 * 1024}
                    onRemove={handleRemoveCover}
                    disabled={readOnly}
                    accept={{
                      "image/png": [],
                      "image/jpeg": [],
                      "image/jpg": [],
                      "image/webp": [],
                    }}
                    enableCropping
                    aspectRatio={SITE_HERO_BACKGROUND_CROP.aspectRatio}
                    cropConfig={SITE_HERO_BACKGROUND_CROP}
                  />
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </SectionCard>

      <SectionCard
        title="Locations list"
        description="Title and subtitle above the city / location grid on the main home page."
      >
        <div className="grid gap-4 md:grid-cols-2 md:gap-6">
          <FormField
            control={form.control}
            name="main_landing_locations_list_title"
            render={({ field }) => {
              const currentLength = field.value?.length || 0;
              const maxLength = 60;
              return (
                <FormItem>
                  <FormLabel>Locations list title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Choose Your City"
                      disabled={readOnly}
                      {...field}
                      value={field.value || ""}
                      maxLength={maxLength}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {currentLength}/{maxLength} characters
                  </div>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          <FormField
            control={form.control}
            name="main_landing_locations_list_subtitle"
            render={({ field }) => {
              const currentLength = field.value?.length || 0;
              const maxLength = 120;
              return (
                <FormItem>
                  <FormLabel>Locations list subtitle</FormLabel>
                  <FormControl>
                    <LongTextInput
                      placeholder="Tap a city to see all upcoming events"
                      disabled={readOnly}
                      {...field}
                      value={field.value || ""}
                      maxLength={maxLength}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {currentLength}/{maxLength} characters
                  </div>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
        </div>
      </SectionCard>
    </div>
  );
}
