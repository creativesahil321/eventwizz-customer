"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FormProvider } from "react-hook-form";
import {
  Loader2,
  Save,
  AlertCircle,
  Eye,
  RotateCcw,
  Globe,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { useSiteEssentials } from "../_lib/hooks";
import {
  resolveHasMultipleLocations,
  useHasMultipleLocations,
} from "../_lib/use-has-multiple-locations";
import { mergeSiteEssentialsPreviewWithApi } from "../_lib/merge-preview-with-api";
import {
  resolvePreviewLocationCount,
  resolvePreviewLocationList,
} from "../_lib/preview-locations";
import { useVendorLocationsList } from "@/app/(protected)/vendor/venue-locations/_lib/queries";
import { useSession } from "next-auth/react";
import { resolveDefaultVenueLocation } from "@/lib/auth/session-location";
import { SiteEssentialsFormValues } from "../_lib/schema";
import { BrandingTab } from "./tabs/branding-tab";
import { ColorsTab } from "./tabs/colors-tab";
import { TypographyTab } from "./tabs/typography-tab";
import { SeoTab } from "./tabs/seo-tab";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useSitePreviewStore } from "@/store/site-preview.store";
import { SocialMediaTab } from "./tabs/social-media-tab";
import { ThemePresetsTab } from "./tabs/theme-presets-tab";
import {
  SiteEssentialsUpdateProvider,
  useSiteEssentialsUpdateGate,
} from "../_lib/site-essentials-update-context";
import { toMutableSiteEssentialsFormValues } from "../_lib/to-mutable-form-values";
import { ImportWebsiteModal } from "./import-website-modal";

export function SiteEssentialsForm() {
  return (
    <SiteEssentialsUpdateProvider>
      <SiteEssentialsFormInner />
    </SiteEssentialsUpdateProvider>
  );
}

function SiteEssentialsFormInner() {
  const { readOnly } = useSiteEssentialsUpdateGate();
  const { form, onSubmit, isLoading, siteEssentials, fetchSiteEssentials } =
    useSiteEssentials();
  // The admin/main marketing site has no public "site preview" experience, so
  // the whole preview flow is hidden for it. Vendor sites keep it.
  const isAdminSite = form.watch("website_role") === "admin";
  const hasMultipleLocations = useHasMultipleLocations();
  const [submitting, setSubmitting] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const {
    setPreviewData,
    previewData,
    previewFresh,
    clearPreviewData,
    startPreviewReview,
    previewScope,
  } = useSitePreviewStore();
  const { data: session } = useSession();
  const { locations: venueLocations } = useVendorLocationsList();
  const defaultVenueLocation = resolveDefaultVenueLocation(
    venueLocations,
    venueLocations.find(
      (loc) => String(loc.id) === String(session?.user?.vendor_location_id ?? ""),
    ),
  );

  // Track validation errors by tab
  const [tabsWithErrors, setTabsWithErrors] = useState<Record<string, boolean>>(
    {},
  );
  const [showErrorSummary, setShowErrorSummary] = useState(false);
  const [activeTab, setActiveTab] = useState("presets");

  // The Colors tab lets users fine-tune every theme token, which can easily break
  // the palette. Keep it out of the normal tab bar and only reveal it when the URL
  // carries the `?advanced=colors` flag (a deliberate, hard-to-stumble-into entry).
  const [colorsUnlocked, setColorsUnlocked] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("advanced") === "colors") setColorsUnlocked(true);
  }, []);

  // Never leave the user stranded on a hidden tab (e.g. the flag is removed after
  // navigation): fall back to Presets if Colors becomes unreachable.
  useEffect(() => {
    if (!colorsUnlocked && activeTab === "colors") {
      setActiveTab("presets");
    }
  }, [colorsUnlocked, activeTab]);

  // Admin Site Essentials must never use the vendor preview round-trip or
  // `site-preview-storage` — clear any stale snapshot and drop the key.
  useEffect(() => {
    if (!isAdminSite) return;
    clearPreviewData();
    if (typeof window !== "undefined") {
      localStorage.removeItem("site-preview-storage");
    }
  }, [isAdminSite, clearPreviewData]);

  // Restore preview snapshot into the form ONLY when it was set during the
  // current session (the editor → preview → editor round-trip). A persisted
  // snapshot left over from a previous session/reload is stale and must never
  // override the fresh server data — we discard it so the API values load.
  // Vendor sites only — admin has no preview flow.
  useEffect(() => {
    if (isAdminSite) return;
    if (!previewData) return;

    if (!previewFresh) {
      // Stale localStorage snapshot from a prior session — drop it and let the
      // server-data effect below populate the form from the latest API response.
      clearPreviewData();
      return;
    }

    try {
      const currentFormValues = form.getValues();

      // Check if form already has File objects uploaded
      const hasFileUploads =
        currentFormValues.logo instanceof File ||
        currentFormValues.favicon instanceof File ||
        currentFormValues.cover_image instanceof File ||
        currentFormValues.cover_video instanceof File ||
        currentFormValues.main_landing_cover_image instanceof File;

      // Only reset with preview data if no files are currently uploaded
      // This prevents overriding File objects with preview store data (object URLs)
      if (!hasFileUploads) {
        // Coalesce with the fresh server data so any field the snapshot is
        // missing/empty (e.g. omitted Info Pages content) is filled from the API,
        // while still honouring in-session preview edits that DO have a value.
        form.reset(
          toMutableSiteEssentialsFormValues(
            mergeSiteEssentialsPreviewWithApi(previewData, siteEssentials),
          ),
        );
      }
    } catch (error) {
      console.error("Error resetting form with preview data:", error);
    }
  }, [
    form,
    previewData,
    previewFresh,
    siteEssentials,
    clearPreviewData,
    isAdminSite,
  ]);

  // Reset form when siteEssentials data changes (e.g., after location switch)
  // This ensures the form always reflects the current location's data
  useEffect(() => {
    if (siteEssentials && (isAdminSite || !previewData)) {
      try {
        // Reset form with fresh server data (mutable clone — query cache is frozen)
        form.reset(toMutableSiteEssentialsFormValues(siteEssentials), {
          keepErrors: false,
          keepDirty: false,
          keepIsSubmitted: false,
          keepTouched: false,
          keepIsValid: false,
          keepSubmitCount: false,
        });
      } catch (error) {
        console.error("Error resetting form with site essentials data:", error);
      }
    }
  }, [siteEssentials, previewData, form, isAdminSite]);

  // Combined useEffect for form validation and error tracking
  useEffect(() => {
    const errors = form.formState.errors;
    const errorsByTab: Record<string, boolean> = {};

    // Check for errors in Branding tab fields
    if (errors.logo || errors.favicon || errors.copyright) {
      errorsByTab.branding = true;
    }

    // Check for errors in Colors tab fields
    if (errors.colors) {
      errorsByTab.colors = true;
    }

    // Check for errors in Typography tab fields
    if (errors.typography) {
      errorsByTab.typography = true;
    }

    // Check for errors in Social Media tab fields
    if (
      errors.socialLinks?.facebook ||
      errors.socialLinks?.twitter ||
      errors.socialLinks?.instagram ||
      errors.socialLinks?.linkedin ||
      errors.socialLinks?.youtube
    ) {
      errorsByTab.socialMedia = true;
    }

    // Check for errors in SEO tab fields
    if (errors.seo) {
      errorsByTab.seo = true;
    }

    setTabsWithErrors(errorsByTab);
  }, [form.formState.errors]);

  // Function to handle preview button click
  const handlePreviewClick = (e: React.MouseEvent) => {
    // Prevent any form submission
    e.preventDefault();

    // Set loading state
    setPreviewLoading(true);

    try {
      const rawFormValues = form.getValues();
      const openOnLocation = previewScope === "location";
      const activeLocationSlug =
        defaultVenueLocation?.slug?.trim() || rawFormValues.slug?.trim();
      const previewSnapshot: SiteEssentialsFormValues = openOnLocation
        ? {
            ...rawFormValues,
            slug: activeLocationSlug || rawFormValues.slug,
          }
        : rawFormValues;
      const completeFormValues = mergeSiteEssentialsPreviewWithApi(
        previewSnapshot,
        siteEssentials ?? undefined,
      );
      const previewLocationList = resolvePreviewLocationList(
        siteEssentials?.locations ?? completeFormValues.locations,
        venueLocations,
        {
          vendor_location_id: session?.user?.vendor_location_id,
          slug: defaultVenueLocation?.slug,
          name:
            defaultVenueLocation?.city ??
            defaultVenueLocation?.name ??
            completeFormValues.name,
        },
      );
      const multi = resolveHasMultipleLocations(
        resolvePreviewLocationCount(
          siteEssentials?.locations,
          previewLocationList.length,
        ),
      );

      const vendorKey =
        siteEssentials?.domain?.trim() ||
        completeFormValues.domain?.trim() ||
        completeFormValues.name?.trim() ||
        null;
      const initialLocationIndex = activeLocationSlug
        ? previewLocationList.findIndex((loc) => loc.slug === activeLocationSlug)
        : 0;

      startPreviewReview(multi, previewLocationList, vendorKey ?? undefined, {
        openOnLocation,
        initialLocationIndex:
          initialLocationIndex >= 0 ? initialLocationIndex : 0,
      });
      setPreviewData(completeFormValues);

      // Add a small delay to show loading state
      setTimeout(() => {
        // Navigate to the preview page
        router.push("/preview/site");

        // Reset loading state after a timeout in case navigation takes too long
        // This ensures the button doesn't stay in loading state indefinitely
        setTimeout(() => {
          setPreviewLoading(false);
        }, 3000);
      }, 500);
    } catch (error) {
      console.error("Preview navigation error:", error);
      router.push("/preview/site");
      setPreviewLoading(false);
      toast({
        title: "Error",
        description: "Failed to open preview",
        variant: "destructive",
      });
    }
  };

  // Handle form submission
  const handleSubmit = async (values: SiteEssentialsFormValues) => {
    if (readOnly) return;

    setSubmitting(true);
    setShowErrorSummary(false);

    try {
      // Don't use JSON.parse(JSON.stringify()) as it destroys File objects
      // File objects need to be preserved for binary upload
      const { ...restValues } = values;
      const payload = {
        ...restValues,
        _method: "PATCH",
      };

      const result = await onSubmit(payload);
      if (result) {
        // Update the preview store with saved form values so theme colors are
        // available for the (vendor-only) preview experience. The admin site has
        // no preview, so we skip this to avoid persisting unused preview state.
        if (!isAdminSite) {
          const completeFormValues = form.getValues();
          setPreviewData(completeFormValues);
        }

        router.refresh();
        toast({
          title: "Success",
          description: "Site essentials updated successfully",
          variant: "default",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to update site essentials",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle form validation failure
  const handleInvalid = () => {
    setShowErrorSummary(true);
    toast({
      title: "Validation Error",
      description: "Please complete all required fields in highlighted tabs",
      variant: "destructive",
    });

    // Switch to the first tab with errors
    const errorTabs = Object.keys(tabsWithErrors);
    if (errorTabs.length > 0) {
      setActiveTab(errorTabs[0]);
    }
  };

  // Count total errors for error summary
  const errorCount = Object.keys(tabsWithErrors).length;

  // Subscribe so the Discard button re-renders when the form becomes dirty
  const { isDirty } = form.formState;

  const handleDiscardChanges = async () => {
    if (readOnly) return;

    try {
      // First, refetch the latest data from the server
      await fetchSiteEssentials();

      if (siteEssentials) {
        // Reset form to the server data and clear all form state
        form.reset(toMutableSiteEssentialsFormValues(siteEssentials), {
          keepErrors: false,
          keepDirty: false,
          keepIsSubmitted: false,
          keepTouched: false,
          keepIsValid: false,
          keepSubmitCount: false,
        });

        // Clear preview data (vendor preview round-trip only)
        if (!isAdminSite) {
          clearPreviewData();
        }

        // Clear any error states
        setShowErrorSummary(false);

        toast({
          title: "Changes discarded",
          description: "The form was restored to your last saved values.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error discarding form changes:", error);
      toast({
        title: "Error",
        description: "Failed to discard your unsaved changes",
        variant: "destructive",
      });
    }
  };

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit, handleInvalid)}
        className="w-full max-w-full"
      >
        {showErrorSummary && errorCount > 0 && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please complete all required fields in the{" "}
              {errorCount === 1
                ? "highlighted tab"
                : `${errorCount} highlighted tabs`}{" "}
              before saving.
            </AlertDescription>
          </Alert>
        )}

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full gap-0"
        >
          <Card className="shadow-sm overflow-hidden p-0 gap-0 py-0">
            <div className="border-b bg-card px-2 sm:px-3 md:px-4 pt-3 pb-3">
              <div className="w-full overflow-x-auto no-scrollbar">
                <TabsList className="flex w-max min-w-full bg-muted/60 p-1 h-auto rounded-lg gap-1">
                  <TabsTrigger
                    value="presets"
                    className="px-3 sm:px-4 py-1 h-8 text-xs font-medium whitespace-nowrap relative rounded-md data-[state=active]:bg-[var(--color-primary)] data-[state=active]:text-white data-[state=active]:shadow-sm mx-0.5"
                  >
                    Presets
                  </TabsTrigger>
                  <TabsTrigger
                    value="branding"
                    className="px-3 sm:px-4 py-1 h-8 text-xs font-medium whitespace-nowrap relative rounded-md data-[state=active]:bg-[var(--color-primary)] data-[state=active]:text-white data-[state=active]:shadow-sm mx-0.5"
                  >
                    Branding
                    {tabsWithErrors.branding && (
                      <span className="absolute -right-1 -top-1 flex h-2 w-2">
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
                      </span>
                    )}
                  </TabsTrigger>
                  {colorsUnlocked && (
                    <TabsTrigger
                      value="colors"
                      className="px-3 sm:px-4 py-1 h-8 text-xs font-medium whitespace-nowrap relative rounded-md data-[state=active]:bg-[var(--color-primary)] data-[state=active]:text-white data-[state=active]:shadow-sm mx-0.5"
                    >
                      Colors
                      {tabsWithErrors.colors && (
                        <span className="absolute -right-1 -top-1 flex h-2 w-2">
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
                        </span>
                      )}
                    </TabsTrigger>
                  )}
                  <TabsTrigger
                    value="typography"
                    className="px-3 sm:px-4 py-1 h-8 text-xs font-medium whitespace-nowrap relative rounded-md data-[state=active]:bg-[var(--color-primary)] data-[state=active]:text-white data-[state=active]:shadow-sm mx-0.5"
                  >
                    Typography
                    {tabsWithErrors.typography && (
                      <span className="absolute -right-1 -top-1 flex h-2 w-2">
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="social-media"
                    className="px-3 sm:px-4 py-1 h-8 text-xs font-medium whitespace-nowrap relative rounded-md data-[state=active]:bg-[var(--color-primary)] data-[state=active]:text-white data-[state=active]:shadow-sm mx-0.5"
                  >
                    Social Media
                    {tabsWithErrors.socialMedia && (
                      <span className="absolute -right-1 -top-1 flex h-2 w-2">
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger
                    value="seo"
                    className="px-3 sm:px-4 py-1 h-8 text-xs font-medium whitespace-nowrap relative rounded-md data-[state=active]:bg-[var(--color-primary)] data-[state=active]:text-white data-[state=active]:shadow-sm mx-0.5"
                  >
                    SEO
                    {tabsWithErrors.seo && (
                      <span className="absolute -right-1 -top-1 flex h-2 w-2">
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>

            <div className="space-y-6 p-6 pb-6">
              <TabsContent value="presets" className="mt-0 w-full">
                <div className="bg-white rounded-lg p-3 sm:p-6">
                  <ThemePresetsTab
                    onGoToColors={() => {
                      setColorsUnlocked(true);
                      setActiveTab("colors");
                    }}
                    onGoToTypography={() => setActiveTab("typography")}
                    onGoToBranding={() => setActiveTab("branding")}
                  />
                </div>
              </TabsContent>

              <TabsContent value="branding" className="mt-0 w-full">
                {tabsWithErrors.branding && (
                  <Badge variant="destructive" className="mb-3">
                    Required fields missing
                  </Badge>
                )}
                <div className="bg-white rounded-lg p-3 sm:p-6">
                  <BrandingTab
                    hasMultipleLocations={hasMultipleLocations}
                    serverCoverImage={
                      typeof siteEssentials?.cover_image === "string"
                        ? siteEssentials.cover_image
                        : undefined
                    }
                    serverCoverVideo={
                      typeof siteEssentials?.cover_video === "string"
                        ? siteEssentials.cover_video
                        : undefined
                    }
                    serverMainLandingCoverImage={
                      typeof siteEssentials?.main_landing_cover_image ===
                      "string"
                        ? siteEssentials.main_landing_cover_image
                        : undefined
                    }
                  />
                </div>
              </TabsContent>

              {colorsUnlocked && (
                <TabsContent value="colors" className="mt-0 w-full">
                  {tabsWithErrors.colors && (
                    <Badge variant="destructive" className="mb-3">
                      Required fields missing
                    </Badge>
                  )}
                  <div className="bg-white rounded-lg p-3 sm:p-6">
                    <ColorsTab />
                  </div>
                </TabsContent>
              )}

              <TabsContent value="typography" className="mt-0 w-full">
                {tabsWithErrors.typography && (
                  <Badge variant="destructive" className="mb-3">
                    Required fields missing
                  </Badge>
                )}
                <div className="bg-white rounded-lg p-3 sm:p-6">
                  <TypographyTab />
                </div>
              </TabsContent>

              <TabsContent value="social-media" className="mt-0 w-full">
                {tabsWithErrors.socialMedia && (
                  <Badge variant="destructive" className="mb-3">
                    Required fields missing
                  </Badge>
                )}
                <div className="bg-white rounded-lg p-3 sm:p-6">
                  <SocialMediaTab />
                </div>
              </TabsContent>

              <TabsContent value="seo" className="mt-0 w-full">
                {tabsWithErrors.seo && (
                  <Badge variant="destructive" className="mb-3">
                    Required fields missing
                  </Badge>
                )}
                <div className="bg-white rounded-lg p-3 sm:p-6">
                  <SeoTab />
                </div>
              </TabsContent>

            </div>

            {/* Actions sit on white, directly under tab content — avoids teal page chrome eating contrast */}
            <div className="border-t border-border bg-white px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end sm:gap-3">
                {!isAdminSite && !readOnly && (
                  <Button
                    variant="outline"
                    onClick={() => setImportOpen(true)}
                    type="button"
                    disabled={submitting || previewLoading}
                    className="flex items-center justify-center gap-2 border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
                  >
                    <Globe className="h-4 w-4" />
                    Import from website
                  </Button>
                )}
                {!isAdminSite && (
                  <Button
                    variant="outline"
                    onClick={handlePreviewClick}
                    type="button"
                    disabled={previewLoading}
                    className="flex items-center justify-center gap-2 border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
                  >
                    {previewLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    {previewLoading ? "Loading..." : "Preview"}
                  </Button>
                )}
                {isDirty && !readOnly && (
                  <Button
                    variant="outline"
                    type="button"
                    onClick={handleDiscardChanges}
                    disabled={previewLoading || submitting}
                    className="flex items-center justify-center gap-2 border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
                  >
                    <RotateCcw className="h-4 w-4" /> Discard changes
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={
                    readOnly || submitting || isLoading || previewLoading
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[var(--color-primary-hover)] disabled:opacity-50 sm:min-w-[120px] sm:w-auto"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {readOnly ? "View only" : "Save"}
                </Button>
              </div>
            </div>
          </Card>
        </Tabs>
      </form>

      {!isAdminSite && (
        <ImportWebsiteModal open={importOpen} onOpenChange={setImportOpen} />
      )}
    </FormProvider>
  );
}
