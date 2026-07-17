"use client";

import { useEffect, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { SiteEssentialsFormValues } from "../../_lib/hooks";
import {
  BANNER_SUB_HEADING_MAX_CHARS,
  COPYRIGHT_MAX_TEXT_CHARS,
} from "../../_lib/schema";
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
import { AdminHomePageSection } from "./admin-home-page-section";
import { InfoPagesTab } from "./info-pages-tab";
import { SectionCard } from "../ui/section-card";
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
import { getFriendlyLogoOptimizeErrorMessage } from "@/lib/logo/logo-process-notices";
import {
  LOGO_SUPPORTED_ACCEPT,
  LOGO_SUPPORTED_FORMATS_LABEL,
  LOGO_UPLOAD_HINT,
} from "@/lib/logo/supported-formats";
import { MainLandingPageSection } from "./main-landing-page-section";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import {
  useSitePreviewStore,
  type SitePreviewScope,
} from "@/store/site-preview.store";

interface BrandingTabProps {
  /** When false, location page is the public home — hide main home tab & fields */
  hasMultipleLocations: boolean;
  /** Server values from API – source of truth after location switch so UI updates immediately */
  serverCoverImage?: string;
  serverCoverVideo?: string;
  serverMainLandingCoverImage?: string;
}

type BrandingScopeTab =
  | "site-identity"
  | "main-home"
  | "location-page"
  | "info-pages";

const BRANDING_SCOPE_TO_PREVIEW: Record<BrandingScopeTab, SitePreviewScope> = {
  "site-identity": "main",
  "main-home": "main",
  "location-page": "location",
  "info-pages": "main",
};

export function BrandingTab({
  hasMultipleLocations,
  serverCoverImage,
  serverCoverVideo,
  serverMainLandingCoverImage,
}: BrandingTabProps) {
  const { readOnly } = useSiteEssentialsUpdateGate();
  const { setPreviewScope } = useSitePreviewStore();
  const [brandingScope, setBrandingScope] = useState<BrandingScopeTab>(() =>
    hasMultipleLocations ? "main-home" : "site-identity",
  );
  const form = useFormContext<SiteEssentialsFormValues>();
  // The admin/main marketing site edits a fixed set of home sections (no
  // per-location vendor fields), so we swap in a dedicated editor.
  const isAdmin = form.watch("website_role") === "admin";

  const previewScopeForTab = (tab: BrandingScopeTab): SitePreviewScope => {
    if (!hasMultipleLocations) {
      return "location";
    }
    return BRANDING_SCOPE_TO_PREVIEW[tab];
  };

  const handleBrandingScopeChange = (value: string) => {
    const scope = value as BrandingScopeTab;
    if (!hasMultipleLocations && scope === "main-home") {
      return;
    }
    setBrandingScope(scope);
    setPreviewScope(previewScopeForTab(scope));
  };

  useEffect(() => {
    if (!hasMultipleLocations && brandingScope === "main-home") {
      setBrandingScope("location-page");
      setPreviewScope("location");
      return;
    }
    setPreviewScope(previewScopeForTab(brandingScope));
  }, [brandingScope, hasMultipleLocations, setPreviewScope]);
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
      toast.message("Could not optimize logo", {
        description: getFriendlyLogoOptimizeErrorMessage(error),
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
    <div className="space-y-6">
      <Alert className="border-slate-200 bg-slate-50 text-slate-800">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          {isAdmin ? (
            <>
              Edit your marketing site here. <strong>Site identity</strong>{" "}
              (logo, favicon, copyright) applies everywhere;{" "}
              <strong>Home page</strong> controls each section of your public
              home.
            </>
          ) : hasMultipleLocations ? (
            <>
              Use the tabs below to edit each part of your public site.{" "}
              <strong>Site identity</strong> applies everywhere;{" "}
              <strong>Main home page</strong> is shown before guests pick a
              location; <strong>Location page</strong> is unique to the venue
              selected in the header.
            </>
          ) : (
            <>
              You have a single location — your public home page is edited under{" "}
              <strong>Home page</strong>. <strong>Site identity</strong> (logo,
              favicon, copyright) applies everywhere.
            </>
          )}
        </AlertDescription>
      </Alert>

      <Tabs value={brandingScope} onValueChange={handleBrandingScopeChange}>
        <TabsList
          className={`grid h-auto w-full gap-1 bg-muted/60 p-1 ${
            hasMultipleLocations ? "grid-cols-4" : "grid-cols-3"
          }`}
        >
          <TabsTrigger
            value="site-identity"
            className="text-xs sm:text-sm data-[state=active]:bg-[var(--color-primary)] data-[state=active]:text-white"
          >
            Site identity
          </TabsTrigger>
          {hasMultipleLocations ? (
            <TabsTrigger
              value="main-home"
              className="text-xs sm:text-sm data-[state=active]:bg-[var(--color-primary)] data-[state=active]:text-white"
            >
              Main home page
            </TabsTrigger>
          ) : null}
          <TabsTrigger
            value="location-page"
            className="text-xs sm:text-sm data-[state=active]:bg-[var(--color-primary)] data-[state=active]:text-white"
          >
            {hasMultipleLocations ? "Location page" : "Home page"}
          </TabsTrigger>
          <TabsTrigger
            value="info-pages"
            className="text-xs sm:text-sm data-[state=active]:bg-[var(--color-primary)] data-[state=active]:text-white"
          >
            Info pages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="site-identity" className="mt-6 space-y-6">
      <div className="rounded-lg border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 p-6 space-y-6">
        <div className="space-y-2">
          <SectionTitle
            title="Logo & site identity"
            description="Logo, favicon, and copyright — shared across all locations and pages."
          />
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
                <FormLabel>Copyright &amp; Disclaimer</FormLabel>
                <FormControl>
                  <TiptapEditor
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder="© 2023 EventWizz. All Rights Reserved. Add any legal disclaimer here…"
                    maxLength={COPYRIGHT_MAX_TEXT_CHARS}
                    className="min-h-[120px]"
                    readOnly={readOnly}
                    showAIButton={false}
                  />
                </FormControl>
                <FormDescription>
                  Shown at the very bottom of your public site. You can include both a
                  legal disclaimer and the copyright line here.
                </FormDescription>
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
                  Upload your site logo ({LOGO_SUPPORTED_FORMATS_LABEL}, max 2MB).
                  We automatically remove the background and adjust contrast for
                  your header color. {LOGO_UPLOAD_HINT} Recommended size:
                  240×60px.
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
                      accept={LOGO_SUPPORTED_ACCEPT}
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
        </TabsContent>

        {hasMultipleLocations ? (
          <TabsContent value="main-home" className="mt-6">
            <MainLandingPageSection
              serverMainLandingCoverImage={serverMainLandingCoverImage}
            />
          </TabsContent>
        ) : null}

        <TabsContent value="location-page" className="mt-6">
          {isAdmin ? (
            <AdminHomePageSection />
          ) : (
      <div className="space-y-6">
        {/* Location context banner */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 dark:border-blue-800 dark:bg-blue-950/40">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500 text-white">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">
              {hasMultipleLocations
                ? "For this location only"
                : "Your public home page"}
            </p>
            <p className="text-sm font-bold text-blue-900 dark:text-blue-100">
              {hasMultipleLocations
                ? "All fields below apply only to this location"
                : "Hero, banner, and sections visitors see on your site home"}
            </p>
          </div>
          {hasMultipleLocations ? (
            <div className="ml-auto flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 shadow-sm dark:border-blue-700 dark:bg-slate-800">
              <span className="text-xs font-medium text-muted-foreground">
                Editing:
              </span>
              <LocationIndicator variant="light" />
            </div>
          ) : null}
        </div>

        <SectionCard
          title={
            hasMultipleLocations
              ? "Location page hero text"
              : "Home page hero text"
          }
          description={
            hasMultipleLocations
              ? "Heading and subheading on this location’s public page. Text position is set from Try theme on the Presets tab or preview — not here."
              : "Heading and subheading on your site home. Text position is set from Try theme on the Presets tab or preview — not here."
          }
        >
          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="banner_heading"
              render={({ field }) => {
                const wc = countWords(field.value || "");
                return (
                  <FormItem>
                    <FormLabel>Location page heading</FormLabel>
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
                    <FormLabel>Location page subheading</FormLabel>
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
        </SectionCard>

        <SectionCard
          title="Location page banner"
          description="Image or video hero for this location’s page only"
        >
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
                        Upload a static image for this location’s hero banner
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
        </SectionCard>

        <SectionCard
          title="About section"
          description="About block on this location’s page"
        >
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

        </SectionCard>

        <SectionCard
          title="Event sections"
          description="Section titles on this location’s page"
        >
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

        </SectionCard>

        <SectionCard
          title="Gallery section"
          description="Gallery title on this location’s page"
        >
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
        </SectionCard>
      </div>
          )}
        </TabsContent>

        <TabsContent value="info-pages" className="mt-6">
          <InfoPagesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
