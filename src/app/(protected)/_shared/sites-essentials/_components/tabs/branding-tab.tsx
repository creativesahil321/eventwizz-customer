"use client";

import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { SiteEssentialsFormValues } from "../../_lib/hooks";
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

interface BrandingTabProps {
  shouldResetImages?: boolean;
}

export function BrandingTab({ shouldResetImages = false }: BrandingTabProps) {
  const form = useFormContext<SiteEssentialsFormValues>();

  // File objects for new uploads
  const [logoFiles, setLogoFiles] = useState<File[]>([]);
  const [faviconFiles, setFaviconFiles] = useState<File[]>([]);
  const [landingPageImageFiles, setLandingPageImageFiles] = useState<File[]>(
    []
  );
  const [landingPageVideoFiles, setLandingPageVideoFiles] = useState<File[]>(
    []
  );

  // URL strings from backend
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [faviconUrl, setFaviconUrl] = useState<string>("");
  const [landingPageImageUrl, setLandingPageImageUrl] = useState<string>("");
  const [landingPageVideoUrl, setLandingPageVideoUrl] = useState<string>("");

  const [bannerType, setBannerType] = useState<"image" | "video">("image");
  const [isValidatingVideo, setIsValidatingVideo] = useState(false);

  // Initialize URL states from form values if they exist
  useEffect(() => {
    const logoValue = form.getValues("logo");
    const faviconValue = form.getValues("favicon");
    const coverImageValue = form.getValues("cover_image");
    const coverVideoValue = form.getValues("cover_video");

    // Initialize URL states if the form contains string URLs
    if (typeof logoValue === "string" && logoValue) {
      setLogoUrl(logoValue);
    }
    if (typeof faviconValue === "string" && faviconValue) {
      setFaviconUrl(faviconValue);
    }
    if (typeof coverImageValue === "string" && coverImageValue) {
      setLandingPageImageUrl(coverImageValue);
      setBannerType("image");
    }
    if (typeof coverVideoValue === "string" && coverVideoValue) {
      setLandingPageVideoUrl(coverVideoValue);
      setBannerType("video");
    }
  }, [form]);

  const handleLogoFileChange = (files: File[]) => {
    setLogoFiles(files);
    setLogoUrl(""); // Clear URL when new file is uploaded
    form.setValue("logo", files.length > 0 ? files[0] : null);
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

  // Reset file states when shouldResetImages changes to true
  useEffect(() => {
    if (shouldResetImages) {
      // Clear all file states and reset to URL states if available
      setLogoFiles([]);
      setFaviconFiles([]);
      setLandingPageImageFiles([]);
      setLandingPageVideoFiles([]);

      // Reinitialize URL states from current form values
      const logoValue = form.getValues("logo");
      const faviconValue = form.getValues("favicon");
      const coverImageValue = form.getValues("cover_image");
      const coverVideoValue = form.getValues("cover_video");

      if (typeof logoValue === "string" && logoValue) {
        setLogoUrl(logoValue);
      } else {
        setLogoUrl("");
      }

      if (typeof faviconValue === "string" && faviconValue) {
        setFaviconUrl(faviconValue);
      } else {
        setFaviconUrl("");
      }

      if (typeof coverImageValue === "string" && coverImageValue) {
        setLandingPageImageUrl(coverImageValue);
        setBannerType("image");
      } else {
        setLandingPageImageUrl("");
      }

      if (typeof coverVideoValue === "string" && coverVideoValue) {
        setLandingPageVideoUrl(coverVideoValue);
        setBannerType("video");
      } else {
        setLandingPageVideoUrl("");
      }
    }
  }, [shouldResetImages, form]);

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
      <SectionTitle
        title="Site Branding"
        description="Configure your site identity"
      />
      <Separator className="my-4" />

      <div className="grid gap-6 md:grid-cols-2">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Site Name</FormLabel>
              <FormControl>
                <Input placeholder="EventWizz" {...field} />
              </FormControl>
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
                Upload your site logo (PNG or JPG, max 2MB). Recommended
                dimensions: 240×60px. Images will be constrained to a reasonable
                size on the site.
              </FormDescription>
              <FormControl>
                {logoUrl ? (
                  <div className="space-y-2">
                    <img
                      src={addCacheBusting(logoUrl)}
                      alt="Logo preview"
                      className="max-h-40 object-contain mx-auto"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="text-red-500 text-sm underline"
                    >
                      Remove Logo
                    </button>
                  </div>
                ) : (
                  <FileUploader
                    value={logoFiles}
                    onValueChange={handleLogoFileChange}
                    maxFileCount={1}
                    maxSize={2 * 1024 * 1024} // 2MB
                    onRemove={handleRemoveLogo}
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
                Upload your site favicon (PNG, max 1MB). Recommended dimensions:
                32×32px or 64×64px square image.
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
                      onClick={handleRemoveFavicon}
                      className="text-red-500 text-sm underline"
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

      <Separator className="my-4" />

      <SectionTitle
        title="Landing Page Content"
        description="Configure your website landing page content"
      />

      <div className="grid gap-6 md:grid-cols-2">
        <FormField
          control={form.control}
          name="banner_heading"
          render={({ field }) => {
            const currentLength = field.value?.length || 0;
            const maxLength = 50;
            return (
              <FormItem>
                <FormLabel>Landing Page Heading</FormLabel>
                <FormControl>
                  <Input
                    placeholder="EventWizz Events"
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
          name="banner_sub_heading"
          render={({ field }) => {
            const currentLength = field.value?.length || 0;
            const maxLength = 80;
            return (
              <FormItem>
                <FormLabel>Landing Page Subheading</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Discover amazing events"
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
                          onClick={handleRemoveLandingPageImage}
                          className="text-red-500 text-sm underline"
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
                    Upload a video for your landing page banner (MP4 format, max
                    10MB)
                  </FormDescription>
                  <FormControl>
                    <div className="space-y-4">
                      {landingPageVideoUrl ? (
                        <div className="space-y-2">
                          <video
                            controls
                            className="w-full h-auto max-h-[200px] object-contain bg-gray-100 rounded-lg"
                          >
                            <source
                              src={landingPageVideoUrl}
                              type="video/mp4"
                            />
                            Your browser does not support the video tag.
                          </video>
                          <button
                            type="button"
                            onClick={handleRemoveLandingPageVideo}
                            className="text-red-500 text-sm underline"
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
                            maxSize={100 * 1024 * 1024} // 100MB - Custom validation in handler
                            onRemove={handleRemoveLandingPageVideo}
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
                                      landingPageVideoFiles[0]
                                    )}
                                    type="video/mp4"
                                  />
                                  Your browser does not support the video tag.
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
                aiContext={{
                  title: form.watch("about_title") || undefined,
                  ctaText: form.watch("about_link_title") || undefined,
                  ctaUrl: form.watch("about_cta_link") || undefined,
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <FormField
          control={form.control}
          name="about_link_title"
          render={({ field }) => {
            const currentLength = field.value?.length || 0;
            const maxLength = 18;
            return (
              <FormItem>
                <FormLabel>About Section CTA Text</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Learn More"
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
          name="about_cta_link"
          render={({ field }) => (
            <FormItem>
              <FormLabel>About Section CTA URL</FormLabel>
              <FormControl>
                <Input
                  placeholder="/about"
                  {...field}
                  value={field.value || ""}
                  onChange={(e) => field.onChange(e.target.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <Separator className="my-4" />

      <SectionTitle
        title="Event Sections"
        description="Configure event section titles"
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
        description="Configure the gallery section on your homepage"
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
  );
}
