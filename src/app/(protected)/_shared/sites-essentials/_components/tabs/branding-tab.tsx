"use client";

import { useEffect, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { SiteEssentialsFormValues } from "../../_lib/hooks";
import { BANNER_SUB_HEADING_MAX_CHARS } from "../../_lib/schema";
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
import { SectionTitle } from "../ui/section-title";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TiptapEditor } from "@/components/ui/tiptap-editor";
import { VideoFormatInfo } from "@/components/shared/video-format-info";
import { addCacheBusting } from "@/lib/image-utils";
import { LocationIndicator } from "@/components/location-indicator";
import { MapPin } from "lucide-react";
import {
  BANNER_HEADING_MAX_WORDS,
  countWords,
  truncateToMaxWordsForInput,
} from "@/lib/word-count";
import { useSiteEssentialsUpdateGate } from "../../_lib/site-essentials-update-context";
import { useLogoUploadProcessor } from "@/hooks/use-logo-upload-processor";
import { Loader2, Sparkles } from "lucide-react";
import { defaultThemeConstants } from "@/services/common/theme/constants/theme";
import { ensureFilePreview, revokeFilePreview } from "@/lib/file-preview";
import { Button } from "@/components/ui/button";
import { optimizeLogoFromSources, isLocalLogoUrl } from "@/lib/logo/optimize-logo-from-sources";

interface BrandingTabProps {
  /** Server values from API – source of truth after location switch so UI updates immediately */
  serverCoverImage?: string;
  serverCoverVideo?: string;
}

export function BrandingTab({
  serverCoverImage,
  serverCoverVideo,
}: BrandingTabProps) {
  const { readOnly } = useSiteEssentialsUpdateGate();
  const form = useFormContext<SiteEssentialsFormValues>();
  const headerBackgroundColor =
    useWatch({ control: form.control, name: "colors.header" }) ??
    defaultThemeConstants.colors.header;
  const { processUpload: processLogoUpload, reprocessExistingUrl, isProcessing: isProcessingLogo } =
    useLogoUploadProcessor({ headerBackgroundColor });

  // File objects for new uploads
  const [logoFiles, setLogoFiles] = useState<File[]>([]);
  const [faviconFiles, setFaviconFiles] = useState<File[]>([]);
  const [landingPageImageFiles, setLandingPageImageFiles] = useState<File[]>(
    [],
  );
  const [landingPageVideoFiles, setLandingPageVideoFiles] = useState<File[]>(
    [],
  );

  // URL strings from backend
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [faviconUrl, setFaviconUrl] = useState<string>("");
  const [landingPageImageUrl, setLandingPageImageUrl] = useState<string>("");
  const [landingPageVideoUrl, setLandingPageVideoUrl] = useState<string>("");

  const [bannerType, setBannerType] = useState<"image" | "video">("image");
  const [isValidatingVideo, setIsValidatingVideo] = useState(false);

  // Sync banner state from SERVER props first (runs as soon as location data refetches – no form timing issues)
  useEffect(() => {
    const hasImage = Boolean(serverCoverImage && serverCoverImage.length > 0);
    const hasVideo = Boolean(serverCoverVideo && serverCoverVideo.length > 0);
    setLandingPageImageFiles([]);
    setLandingPageVideoFiles([]);
    if (hasImage) {
      setLandingPageImageUrl(serverCoverImage!);
    } else {
      setLandingPageImageUrl("");
    }
    if (hasVideo) {
      setLandingPageVideoUrl(serverCoverVideo!);
    } else {
      setLandingPageVideoUrl("");
    }
    setBannerType(hasVideo ? "video" : "image");
  }, [serverCoverImage, serverCoverVideo]);

  // Watch form for logo/favicon and for when user uploads new file (form then has File; we don’t overwrite with server in that case)
  const watchedLogo = form.watch("logo");
  const watchedFavicon = form.watch("favicon");
  const watchedCoverImage = form.watch("cover_image");
  const watchedCoverVideo = form.watch("cover_video");

  // Sync logo/favicon from form; for cover_image/cover_video only sync when user has selected a File (so we show their upload), otherwise server props drive banner
  useEffect(() => {
    if (watchedLogo instanceof File) {
      setLogoFiles([ensureFilePreview(watchedLogo)]);
      setLogoUrl("");
    } else if (typeof watchedLogo === "string" && watchedLogo) {
      setLogoFiles([]);
      setLogoUrl(watchedLogo);
    } else if (watchedLogo !== undefined) {
      setLogoFiles([]);
      setLogoUrl("");
    }
    if (typeof watchedFavicon === "string" && watchedFavicon) {
      setFaviconFiles([]);
      setFaviconUrl(watchedFavicon);
    } else if (
      watchedFavicon !== undefined &&
      !(watchedFavicon instanceof File)
    ) {
      setFaviconFiles([]);
      setFaviconUrl("");
    }
    // Only sync banner from form when value is a File (user just picked a file); otherwise server props are source of truth
    if (watchedCoverImage instanceof File) {
      setLandingPageImageFiles([watchedCoverImage]);
      setLandingPageImageUrl("");
      setLandingPageVideoFiles([]);
      setLandingPageVideoUrl("");
      setBannerType("image");
    }
    if (watchedCoverVideo instanceof File) {
      setLandingPageVideoFiles([watchedCoverVideo]);
      setLandingPageVideoUrl("");
      setLandingPageImageFiles([]);
      setLandingPageImageUrl("");
      setBannerType("video");
    }
  }, [watchedLogo, watchedFavicon, watchedCoverImage, watchedCoverVideo]);

  const handleLogoFileChange = async (files: File[]) => {
    if (!files.length) return;

    const processed = await processLogoUpload(files[0]);
    const fileWithPreview = ensureFilePreview(processed);
    setLogoFiles([fileWithPreview]);
    setLogoUrl("");
    form.setValue("logo", fileWithPreview);
  };

  const handleOptimizeExistingLogo = async () => {
    if (readOnly || isProcessingLogo) return;

    const formLogo = form.getValues("logo");
    const logoFile =
      logoFiles[0] ?? (formLogo instanceof File ? formLogo : null);

    if (!logoFile && !logoUrl) return;

    try {
      const processed = await optimizeLogoFromSources({
        logoUrl: logoUrl || undefined,
        logoFile,
        processUpload: processLogoUpload,
        reprocessExistingUrl,
      });

      if (!processed) return;

      revokeFilePreview(logoFiles[0]);
      const fileWithPreview = ensureFilePreview(processed);
      setLogoFiles([fileWithPreview]);
      setLogoUrl("");
      form.setValue("logo", fileWithPreview);
    } catch (error) {
      console.error("Logo optimize failed:", error);
      const { toast } = await import("sonner");
      toast.error("Could not optimize logo", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const handleFaviconFileChange = (files: File[]) => {
    setFaviconFiles(files);
    setFaviconUrl(""); // Clear URL when new file is uploaded
    form.setValue("favicon", files.length > 0 ? files[0] : null);
  };

  const handleLandingPageImageChange = (files: File[]) => {
    setLandingPageImageFiles(files);
    setLandingPageImageUrl(""); // Clear URL when new file is uploaded
    setLandingPageVideoFiles([]); // Clear video files
    setLandingPageVideoUrl(""); // Clear video URL
    setBannerType("image");

    form.setValue("cover_image", files.length > 0 ? files[0] : null);
    form.setValue("cover_video", null); // Clear video
  };

  const handleLandingPageVideoChange = async (files: File[]) => {
    if (files.length === 0) return;

    // Prevent duplicate validation calls
    if (isValidatingVideo) return;
    setIsValidatingVideo(true);

    const file = files[0];

    try {
      // Validate video compatibility
      const { validateVideo } = await import("@/utils/video-validator");
      const validation = await validateVideo(file, 10);

      if (!validation.isValid) {
        const toast = (await import("sonner")).toast;
        // Use a unique toast ID to prevent duplicates
        const toastId = `video-validation-error-${file.name}-${file.size}`;

        // Combine all errors into a single message
        const errorMessage =
          validation.errors.length > 0
            ? validation.errors[0] // Show only the first (most important) error
            : "Invalid video file";

        // Show single toast with unique ID to prevent duplicates
        toast.error(errorMessage, {
          id: toastId,
          description:
            "Please upload an MP4 video with H.264 codec for best compatibility.",
        });
        setIsValidatingVideo(false);
        return;
      }

      // Show warnings if any (e.g., HEVC detected)
      if (validation.warnings.length > 0) {
        const toast = (await import("sonner")).toast;
        toast.warning("Video compatibility warning", {
          description: validation.warnings[0],
        });
      }

      setLandingPageVideoFiles(files);
      setLandingPageVideoUrl(""); // Clear URL when new file is uploaded
      setLandingPageImageFiles([]); // Clear image files
      setLandingPageImageUrl(""); // Clear image URL
      setBannerType("video");

      form.setValue("cover_video", file);
      form.setValue("cover_image", null); // Clear image
    } catch (error) {
      console.error("Error validating video:", error);
      const toast = (await import("sonner")).toast;
      toast.error("Failed to process video", {
        description:
          "Please ensure the video is in MP4 format with H.264 codec.",
      });
    } finally {
      setIsValidatingVideo(false);
    }
  };

  const handleRemoveLogo = () => {
    revokeFilePreview(logoFiles[0]);
    setLogoFiles([]);
    setLogoUrl("");
    form.setValue("logo", null);
  };

  const handleRemoveFavicon = () => {
    setFaviconFiles([]);
    setFaviconUrl("");
    form.setValue("favicon", null);
  };

  const handleRemoveLandingPageImage = () => {
    setLandingPageImageFiles([]);
    setLandingPageImageUrl("");
    form.setValue("cover_image", null);
  };

  const handleRemoveLandingPageVideo = () => {
    setLandingPageVideoFiles([]);
    setLandingPageVideoUrl("");
    form.setValue("cover_video", null);
    setBannerType("image");
  };

  // Cleanup object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      landingPageVideoFiles.forEach((file) => {
        if (file instanceof File) {
          URL.revokeObjectURL(URL.createObjectURL(file));
        }
      });
    };
  }, [landingPageVideoFiles]);

  return (
    <div className="space-y-8">
      {/* ============================================ */}
      {/* GLOBAL BRANDING SECTION - Applies to ALL Locations */}
      {/* ============================================ */}
      <div className="rounded-lg border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 p-6 space-y-6">
        <div className="space-y-2">
          <SectionTitle
            title="Global Site Branding"
            description="These settings apply to all locations"
          />
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-md">
            <span className="font-medium">🌍 Global</span>
            <span>·</span>
            <span>Same across all locations</span>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Site Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="EventWizz"
                    {...field}
                    disabled
                    readOnly
                    className="bg-muted text-muted-foreground cursor-not-allowed"
                  />
                </FormControl>
                <FormDescription>
                  Site Name is system-managed and cannot be edited here.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="copyright"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Copyright Text</FormLabel>
                <FormControl>
                  <Input
                    placeholder="© 2023 EventWizz, All Rights Reserved"
                    disabled={readOnly}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="logo"
            render={() => (
              <FormItem>
                <FormLabel>Logo</FormLabel>
                <FormDescription>
                  Upload your site logo (PNG or JPG, max 2MB). We automatically
                  remove the background and adjust contrast for your header
                  color. Recommended dimensions: 240×60px.
                </FormDescription>
                <FormControl>
                  {isProcessingLogo ? (
                    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-10 text-sm text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      Optimizing logo for header…
                    </div>
                  ) : logoUrl ? (
                    <div className="space-y-2">
                      <div
                        className="rounded-lg border p-4"
                        style={{ backgroundColor: headerBackgroundColor }}
                      >
                        <img
                          src={
                            isLocalLogoUrl(logoUrl)
                              ? logoUrl
                              : addCacheBusting(logoUrl)
                          }
                          alt="Logo preview"
                          className="max-h-40 w-full object-contain"
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={readOnly || isProcessingLogo}
                          onClick={() => void handleOptimizeExistingLogo()}
                        >
                          <Sparkles className="mr-1.5 h-4 w-4" />
                          Optimize for header
                        </Button>
                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={handleRemoveLogo}
                          className="text-red-500 text-sm underline disabled:pointer-events-none disabled:opacity-50"
                        >
                          Remove Logo
                        </button>
                      </div>
                    </div>
                  ) : logoFiles.length > 0 ? (
                    <div className="space-y-2">
                      <div
                        className="rounded-lg border p-4"
                        style={{ backgroundColor: headerBackgroundColor }}
                      >
                        <img
                          src={
                            (logoFiles[0] as File & { preview?: string })
                              .preview ?? ""
                          }
                          alt="Logo preview"
                          className="max-h-40 w-full object-contain"
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={readOnly || isProcessingLogo}
                          onClick={() => void handleOptimizeExistingLogo()}
                        >
                          <Sparkles className="mr-1.5 h-4 w-4" />
                          Optimize for header
                        </Button>
                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={handleRemoveLogo}
                          className="text-red-500 text-sm underline disabled:pointer-events-none disabled:opacity-50"
                        >
                          Remove Logo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <FileUploader
                      value={logoFiles}
                      onValueChange={(files) => void handleLogoFileChange(files)}
                      maxFileCount={1}
                      maxSize={2 * 1024 * 1024} // 2MB
                      onRemove={handleRemoveLogo}
                      disabled={readOnly || isProcessingLogo}
                      accept={{
                        "image/png": [],
                        "image/jpeg": [],
                        "image/jpg": [],
                        "image/webp": [],
                      }}
                    />
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="favicon"
            render={() => (
              <FormItem>
                <FormLabel>Favicon</FormLabel>
                <FormDescription>
                  Upload your site favicon (PNG, max 1MB). Recommended
                  dimensions: 32×32px or 64×64px square image.
                </FormDescription>
                <FormControl>
                  {faviconUrl ? (
                    <div className="space-y-2">
                      <img
                        src={addCacheBusting(faviconUrl)}
                        alt="Favicon preview"
                        className="max-h-16 object-contain mx-auto"
                      />
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={handleRemoveFavicon}
                        className="text-red-500 text-sm underline disabled:pointer-events-none disabled:opacity-50"
                      >
                        Remove Favicon
                      </button>
                    </div>
                  ) : (
                    <FileUploader
                      value={faviconFiles}
                      onValueChange={handleFaviconFileChange}
                      maxFileCount={1}
                      maxSize={1 * 1024 * 1024} // 1MB
                      onRemove={handleRemoveFavicon}
                      disabled={readOnly}
                      accept={{
                        "image/png": [],
                        "image/x-icon": [],
                        "image/ico": [],
                        "image/webp": [],
                      }}
                    />
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* ============================================ */}
      {/* LOCATION-SPECIFIC SECTION - Eye-catching so vendors don't miss it */}
      {/* ============================================ */}
      <div className="relative rounded-xl border-2 border-blue-400 dark:border-blue-600 bg-gradient-to-br from-blue-50 to-slate-50 dark:from-blue-950/50 dark:to-slate-900/50 p-0 overflow-hidden shadow-sm">
        {/* Thick left accent */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500 dark:bg-blue-400"
          aria-hidden
        />

        {/* Unmissable top banner */}
        <div className="flex flex-wrap items-center gap-3 px-6 py-4 bg-blue-100/90 dark:bg-blue-900/60 border-b border-blue-200 dark:border-blue-700">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500 dark:bg-blue-600 text-white shadow-sm">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                For this location only
              </p>
              <p className="text-sm font-bold text-blue-900 dark:text-blue-100">
                All fields below apply only to this location
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto rounded-lg bg-white dark:bg-slate-800 px-3 py-2 border border-blue-200 dark:border-blue-700 shadow-sm">
            <span className="text-xs font-medium text-muted-foreground">
              Editing:
            </span>
            <LocationIndicator variant="light" />
          </div>
        </div>

        <div className="p-6 space-y-6">
          <Separator className="my-0 -mx-6" />

          <SectionTitle
            title="Landing Page Content"
            description="Heading and subheading copy below. Hero text position (horizontal and vertical) for location pages is set from the Try theme sidebar on the Presets tab preview, or from Try theme on site/event preview — not here."
          />

          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="banner_heading"
              render={({ field }) => {
                const wc = countWords(field.value || "");
                return (
                  <FormItem>
                    <FormLabel>Landing Page Heading</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="EventWizz Events"
                        disabled={readOnly}
                        {...field}
                        value={field.value || ""}
                        onChange={(e) =>
                          field.onChange(
                            truncateToMaxWordsForInput(
                              e.target.value,
                              BANNER_HEADING_MAX_WORDS
                            )
                          )
                        }
                      />
                    </FormControl>
                    <div className="text-xs text-muted-foreground mt-1">
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
              name="banner_sub_heading"
              render={({ field }) => {
                const currentLength = field.value?.length || 0;
                const maxLength = BANNER_SUB_HEADING_MAX_CHARS;
                return (
                  <FormItem>
                    <FormLabel>Landing Page Subheading</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Discover amazing events"
                        disabled={readOnly}
                        {...field}
                        value={field.value || ""}
                        maxLength={maxLength}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <div className="text-xs text-muted-foreground mt-1">
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

          <Separator className="my-4" />

          <SectionTitle
            title="Landing Page Banner"
            description="Choose how you want to display your landing page banner"
          />

          <div className="space-y-4">
            <Tabs
              value={bannerType}
              onValueChange={(v) => setBannerType(v as "image" | "video")}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="image">Image Banner</TabsTrigger>
                <TabsTrigger value="video">Video Banner</TabsTrigger>
              </TabsList>

              <TabsContent value="image">
                <FormField
                  control={form.control}
                  name="cover_image"
                  render={() => (
                    <FormItem>
                      <FormLabel>Banner Image</FormLabel>
                      <FormDescription>
                        Upload a static image for your landing page banner
                        (recommended size: 1200 x 600px)
                      </FormDescription>
                      <FormControl>
                        {landingPageImageUrl ? (
                          <div className="space-y-2">
                            <img
                              src={addCacheBusting(landingPageImageUrl)}
                              alt="Landing page image preview"
                              className="max-h-40 object-contain mx-auto"
                            />
                            <button
                              type="button"
                              disabled={readOnly}
                              onClick={handleRemoveLandingPageImage}
                              className="text-red-500 text-sm underline disabled:pointer-events-none disabled:opacity-50"
                            >
                              Remove Image
                            </button>
                          </div>
                        ) : (
                          <FileUploader
                            value={landingPageImageFiles}
                            onValueChange={handleLandingPageImageChange}
                            maxFileCount={1}
                            maxSize={2 * 1024 * 1024} // 2MB
                            onRemove={handleRemoveLandingPageImage}
                            disabled={readOnly}
                            accept={{
                              "image/png": [],
                              "image/jpeg": [],
                              "image/jpg": [],
                              "image/webp": [],
                            }}
                            enableCropping={true}
                            aspectRatio={16 / 9}
                            cropConfig={{
                              maxSizeKB: 500,
                              quality: 0.9,
                              maxWidth: 1920,
                              maxHeight: 1080,
                            }}
                          />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="video">
                <FormField
                  control={form.control}
                  name="cover_video"
                  render={() => (
                    <FormItem>
                      <FormLabel>Banner Video</FormLabel>
                      <FormDescription>
                        Upload a video for your landing page banner (MP4 format,
                        max 10MB)
                      </FormDescription>
                      <FormControl>
                        <div className="space-y-4">
                          {landingPageVideoUrl ? (
                            <div
                              className="space-y-2"
                              key={landingPageVideoUrl}
                            >
                              <video
                                controls
                                className="w-full h-auto max-h-[200px] object-contain bg-gray-100 rounded-lg"
                                key={landingPageVideoUrl}
                              >
                                <source
                                  src={landingPageVideoUrl}
                                  type="video/mp4"
                                />
                                Your browser does not support the video tag.
                              </video>
                              <button
                                type="button"
                                disabled={readOnly}
                                onClick={handleRemoveLandingPageVideo}
                                className="text-red-500 text-sm underline disabled:pointer-events-none disabled:opacity-50"
                              >
                                Remove Video
                              </button>
                            </div>
                          ) : (
                            <>
                              <FileUploader
                                value={landingPageVideoFiles}
                                onValueChange={handleLandingPageVideoChange}
                                maxFileCount={1}
                                maxSize={10 * 1024 * 1024} // 10MB for banner video
                                onRemove={handleRemoveLandingPageVideo}
                                disabled={readOnly}
                                accept={{
                                  "video/mp4": [],
                                }}
                              />

                              {/* Format Guide - Show when no video uploaded */}
                              {landingPageVideoFiles.length === 0 &&
                                !landingPageVideoUrl && (
                                  <div className="mt-3">
                                    <VideoFormatInfo variant="compact" />
                                  </div>
                                )}

                              {/* Video Preview for uploaded files */}
                              {landingPageVideoFiles.length > 0 &&
                                landingPageVideoFiles[0] instanceof File && (
                                  <div className="relative mt-4 rounded-lg overflow-hidden border">
                                    <video
                                      controls
                                      className="w-full h-auto max-h-[200px] object-contain bg-gray-100"
                                    >
                                      <source
                                        src={URL.createObjectURL(
                                          landingPageVideoFiles[0],
                                        )}
                                        type="video/mp4"
                                      />
                                      Your browser does not support the video
                                      tag.
                                    </video>
                                  </div>
                                )}
                            </>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>
          </div>

          <Separator className="my-4" />

          <SectionTitle
            title="About Section"
            description="Configure the about section on your homepage"
          />

          <Separator className="my-4" />

          <FormField
            control={form.control}
            name="about_title"
            render={({ field }) => {
              const currentLength = field.value?.length || 0;
              const maxLength = 40;
              return (
                <FormItem>
                  <FormLabel>About Section Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="About Us"
                      disabled={readOnly}
                      {...field}
                      value={field.value || ""}
                      maxLength={maxLength}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <div className="text-xs text-muted-foreground mt-1">
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

          <FormField
            control={form.control}
            name="about_description"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-base font-medium">
                  About Section Description
                </FormLabel>
                <FormControl>
                  <TiptapEditor
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder="Write a compelling description about your business..."
                    maxLength={340}
                    maxWords={50}
                    className="min-h-[120px]"
                    readOnly={readOnly}
                    aiContext={{
                      title: form.watch("about_title") || undefined,
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Separator className="my-4" />

          <SectionTitle
            title="Event Sections"
            description="Configure event section titles (location-specific)"
          />

          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="event_title_1"
              render={({ field }) => {
                const currentLength = field.value?.length || 0;
                const maxLength = 40;
                return (
                  <FormItem>
                    <FormLabel>Event Section 1 Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Upcoming Events"
                        disabled={readOnly}
                        {...field}
                        value={field.value || ""}
                        maxLength={maxLength}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <div className="text-xs text-muted-foreground mt-1">
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

            <FormField
              control={form.control}
              name="event_title_2"
              render={({ field }) => {
                const currentLength = field.value?.length || 0;
                const maxLength = 40;
                return (
                  <FormItem>
                    <FormLabel>Event Section 2 Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Top Picks"
                        disabled={readOnly}
                        {...field}
                        value={field.value || ""}
                        maxLength={maxLength}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <div className="text-xs text-muted-foreground mt-1">
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

          <Separator className="my-4" />

          <SectionTitle
            title="Gallery Section"
            description="Configure the gallery section on your homepage (location-specific)"
          />

          <div className="grid gap-6">
            <FormField
              control={form.control}
              name="event_gallery_title"
              render={({ field }) => {
                const currentLength = field.value?.length || 0;
                const maxLength = 40;
                return (
                  <FormItem>
                    <FormLabel>Event Gallery Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Event Gallery"
                        disabled={readOnly}
                        {...field}
                        value={field.value || ""}
                        maxLength={maxLength}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <div className="text-xs text-muted-foreground mt-1">
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
        </div>
      </div>
    </div>
  );
}
