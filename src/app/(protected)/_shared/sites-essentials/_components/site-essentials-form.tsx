"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormProvider, type FieldErrors } from "react-hook-form";
import {
  Loader2,
  Save,
  AlertCircle,
  Eye,
  RotateCcw,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
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
import {
  SiteEssentialsUpdateProvider,
  useSiteEssentialsUpdateGate,
} from "../_lib/site-essentials-update-context";
import { toMutableSiteEssentialsFormValues } from "../_lib/to-mutable-form-values";
import { hydratePreviewMediaForSave } from "../_lib/hydrate-preview-media-for-save";

const SITE_ESSENTIALS_TABS = [
  "branding",
  "colors",
  "typography",
  "social-media",
  "seo",
] as const;

type SiteEssentialsTab = (typeof SITE_ESSENTIALS_TABS)[number];

function isSiteEssentialsTab(value: string | null): value is SiteEssentialsTab {
  return (
    value !== null &&
    (SITE_ESSENTIALS_TABS as readonly string[]).includes(value)
  );
}

function resolveTabForErrorField(fieldName: string): SiteEssentialsTab {
  if (fieldName === "colors") return "colors";
  if (fieldName === "typography") return "typography";
  if (fieldName === "socialLinks") return "social-media";
  if (fieldName === "seo") return "seo";
  return "branding";
}

function extractFirstErrorMessage(errors: unknown): string {
  if (!errors || typeof errors !== "object") return "";
  const record = errors as Record<string, unknown>;
  if (typeof record.message === "string" && record.message.trim()) {
    return record.message.trim();
  }
  for (const val of Object.values(record)) {
    const nested = extractFirstErrorMessage(val);
    if (nested) return nested;
  }
  return "";
}

export function SiteEssentialsForm() {
  return (
    <Suspense fallback={null}>
      <SiteEssentialsUpdateProvider>
        <SiteEssentialsFormInner />
      </SiteEssentialsUpdateProvider>
    </Suspense>
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
  const router = useRouter();
  const {
    setPreviewData,
    clearPreviewData,
    consumePreviewFresh,
    startPreviewReview,
    previewScope,
  } = useSitePreviewStore();
  const { data: session } = useSession();
  const { locations: venueLocations } = useVendorLocationsList();
  const defaultVenueLocation = resolveDefaultVenueLocation(
    venueLocations,
    venueLocations.find(
      (loc) =>
        String(loc.id) === String(session?.user?.vendor_location_id ?? ""),
    ),
  );

  // Keep form.slug aligned with the active venue — Import/preview overlays need it
  // to paint the unsaved cover onto the correct Main home city card.
  useEffect(() => {
    const slug = defaultVenueLocation?.slug?.trim();
    if (!slug) return;
    if (form.getValues("slug")?.trim() === slug) return;
    form.setValue("slug", slug, { shouldDirty: false, shouldValidate: false });
  }, [defaultVenueLocation?.slug, form]);

  // Track validation errors by tab
  const [tabsWithErrors, setTabsWithErrors] = useState<Record<string, boolean>>(
    {},
  );
  const [showErrorSummary, setShowErrorSummary] = useState(false);
  const [activeTab, setActiveTab] = useState("branding");
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");

  // The Colors tab lets users fine-tune every theme token, which can easily break
  // the palette. Keep it out of the normal tab bar and only reveal it when the URL
  // carries the `?advanced=colors` flag (a deliberate, hard-to-stumble-into entry).
  const [colorsUnlocked, setColorsUnlocked] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("advanced") === "colors") setColorsUnlocked(true);
  }, []);

  // Honour `?tab=` from deep links (e.g. onboarding Edit → Branding).
  useEffect(() => {
    if (!isSiteEssentialsTab(tabFromUrl)) return;
    if (tabFromUrl === "colors" && !colorsUnlocked) {
      setActiveTab("branding");
      return;
    }
    setActiveTab(tabFromUrl);
  }, [tabFromUrl, colorsUnlocked]);

  // Never leave the user stranded on a hidden tab (e.g. the flag is removed after
  // navigation): fall back to Branding if Colors becomes unreachable.
  useEffect(() => {
    if (!colorsUnlocked && activeTab === "colors") {
      setActiveTab("branding");
    }
  }, [colorsUnlocked, activeTab]);

  // Admin Site Essentials must never use the vendor preview round-trip or
  // `site-preview-storage` — clear any stale snapshot and drop the key.
  useEffect(() => {
    if (!isAdminSite) return;
    clearPreviewData();
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("site-preview-storage");
      try {
        localStorage.removeItem("site-preview-storage");
      } catch {
        // ignore
      }
    }
  }, [isAdminSite, clearPreviewData]);

  // Restore the preview snapshot into the form ONLY when this editor instance
  // mounts after an unsaved editor → preview → editor round-trip.
  //
  // Critical: do NOT re-run on `previewData` / `previewFresh` updates while still
  // mounted (Preview click). That used to consume `previewFresh` before
  // navigation, so the remounted editor never restored and showed the old API image.
  //
  // While `previewRequiresSave` is true we keep `previewData` and re-apply it on
  // every mount (React Strict Mode remounts included). Media edits must call
  // `syncSitePreviewFormIfNeeded` so Remove/replace is not undone on remount.
  //
  // Baseline server hydration is owned by react-hook-form's `values` option
  // (see `useSiteEssentials`); this effect is only the preview-restore overlay.
  // Vendor sites only — admin has no preview flow.
  useEffect(() => {
    if (isAdminSite) return;

    const {
      previewData: snapshot,
      previewFresh: fresh,
      previewRequiresSave: requiresSave,
    } = useSitePreviewStore.getState();

    if (!snapshot) return;

    // Rehydrated snapshot from a prior reload (both flags false) — drop it.
    if (!fresh && !requiresSave) {
      clearPreviewData();
      return;
    }

    // View-only Preview: keep the snapshot for `/preview/site`, do not overlay.
    if (!requiresSave) return;

    try {
      const currentFormValues = form.getValues();

      // Still on the editor with live File uploads (Preview just clicked) —
      // leave Files alone; remount after Preview will restore blob URLs.
      const hasFileUploads =
        currentFormValues.logo instanceof File ||
        currentFormValues.favicon instanceof File ||
        currentFormValues.cover_image instanceof File ||
        currentFormValues.cover_video instanceof File ||
        currentFormValues.main_landing_cover_image instanceof File;

      if (hasFileUploads) return;

      // keepDefaultValues: true keeps server defaults so the restored snapshot
      // stays dirty. A pristine reset would let RHF `values` + keepDirtyValues
      // re-apply stale API media and wipe Preview blob:/data: URLs.
      form.reset(
        toMutableSiteEssentialsFormValues(
          mergeSiteEssentialsPreviewWithApi(snapshot, siteEssentials),
        ),
        { keepDefaultValues: true },
      );
      if (fresh) {
        consumePreviewFresh();
      }
    } catch (error) {
      console.error("Error resetting form with preview data:", error);
    }
    // Mount-only on purpose — see comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminSite]);

  // Combined useEffect for form validation and error tracking
  useEffect(() => {
    const errors = form.formState.errors;
    const errorsByTab: Record<string, boolean> = {};

    for (const key of Object.keys(errors)) {
      const tab = resolveTabForErrorField(key);
      errorsByTab[tab] = true;
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
      // Prefer form slug (set when editing a location); fall back to active session venue
      const activeLocationSlug =
        rawFormValues.slug?.trim() ||
        defaultVenueLocation?.slug?.trim() ||
        undefined;
      // Always tag the snapshot with the active location slug so Main home
      // city cards can show unsaved Import/upload covers before Save.
      const previewSnapshot: SiteEssentialsFormValues = {
        ...rawFormValues,
        slug: activeLocationSlug || rawFormValues.slug,
      };
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
        ? previewLocationList.findIndex(
            (loc) => loc.slug === activeLocationSlug,
          )
        : 0;

      startPreviewReview(multi, previewLocationList, vendorKey ?? undefined, {
        openOnLocation,
        initialLocationIndex:
          initialLocationIndex >= 0 ? initialLocationIndex : 0,
        // View-only when the editor has no unsaved changes. Use `dirtyFields`
        // (genuine user edits) rather than `isDirty`, which RHF can report stale
        // during a server `values` re-sync — that opened Preview in save mode
        // after a pristine load.
        requiresSave: hasRealEdits,
      });
      setPreviewData(completeFormValues);

      // If the form is pristine, ensure we never restore-as-dirty on return
      if (!hasRealEdits) {
        useSitePreviewStore.getState().setPreviewRequiresSave(false);
      }

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
      toast.error("Error", { description: "Failed to open preview" });
    }
  };

  // Handle form submission
  const handleSubmit = async (values: SiteEssentialsFormValues) => {
    if (readOnly) return;

    setSubmitting(true);
    setShowErrorSummary(false);

    try {
      // Don't use JSON.parse(JSON.stringify()) as it destroys File objects.
      // Preview persistence can turn uploaded media into `blob:` URLs (e.g. after
      // an Import → Preview → back round-trip); convert those back to Files so the
      // API actually receives the binary instead of silently dropping the image.
      const hydratedValues = await hydratePreviewMediaForSave(values);
      const payload = {
        ...hydratedValues,
        _method: "PATCH",
      };

      const result = await onSubmit(payload);
      if (result) {
        // Drop any preview snapshot after a successful save. Keeping it with
        // `previewFresh: true` made Sites Essentials re-apply a stale overlay
        // (old logo / copyright) on top of the fresh API response. Preview
        // rebuilds from the current form when the user clicks Preview again.
        if (!isAdminSite) {
          clearPreviewData();
        }

        // Mark the form pristine so the server `values` re-sync (with
        // `keepDirtyValues`) can adopt the canonical saved data and the
        // Discard button correctly disappears.
        form.reset(form.getValues(), { keepValues: true });

        router.refresh();
        toast.success("Success", {
          description: "Site essentials updated successfully",
        });
      }
    } catch (error) {
      console.error(error);
      toast.error("Error", { description: "Failed to update site essentials" });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle form validation failure
  const handleInvalid = (errors: FieldErrors<SiteEssentialsFormValues>) => {
    console.warn("Site essentials validation errors:", errors);
    setShowErrorSummary(true);

    const firstErrorMessage = extractFirstErrorMessage(errors);

    const errorTabs: SiteEssentialsTab[] = [];
    for (const key of Object.keys(errors)) {
      const tab = resolveTabForErrorField(key);
      if (!errorTabs.includes(tab)) {
        errorTabs.push(tab);
      }
    }

    toast.error("Validation Error", {
      description: firstErrorMessage ||
        "Please complete all required fields in highlighted tabs",
    });

    // Switch to the first tab with errors
    if (errorTabs.length > 0) {
      setActiveTab(errorTabs[0]);
    }
  };

  // Count total errors for error summary
  const errorCount = Object.keys(tabsWithErrors).length;

  // `isDirty` can flip true transiently while react-hook-form re-syncs the
  // server `values` (keepDirtyValues) — e.g. when switching Main home ⇄ Location
  // scope or when a refetch settles — even though the user changed nothing. That
  // made "Discard changes" appear on a plain visit. `dirtyFields` only lists
  // fields the user genuinely edited, so it's the reliable "has real edits" gate.
  const { dirtyFields } = form.formState;
  const hasRealEdits = Object.keys(dirtyFields).length > 0;

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

        toast.success("Changes discarded", {
          description: "The form was restored to your last saved values.",
        });
      }
    } catch (error) {
      console.error("Error discarding form changes:", error);
      toast.error("Error", {
        description: "Failed to discard your unsaved changes",
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
          <Card className="min-w-0 gap-0 overflow-hidden p-0 py-0 shadow-sm">
            <div className="border-b bg-card px-2 pb-3 pt-3 sm:px-3 md:px-4">
              <div className="w-full min-w-0 overflow-x-auto no-scrollbar">
                <TabsList className="flex h-auto w-max min-w-full gap-1 rounded-lg bg-muted/60 p-1">
                  <TabsTrigger
                    value="branding"
                    className="relative mx-0.5 h-8 shrink-0 whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium data-[state=active]:bg-[var(--color-primary)] data-[state=active]:text-white data-[state=active]:shadow-sm sm:px-4"
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
                      className="relative mx-0.5 h-8 shrink-0 whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium data-[state=active]:bg-[var(--color-primary)] data-[state=active]:text-white data-[state=active]:shadow-sm sm:px-4"
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
                    className="relative mx-0.5 h-8 shrink-0 whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium data-[state=active]:bg-[var(--color-primary)] data-[state=active]:text-white data-[state=active]:shadow-sm sm:px-4"
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
                    className="relative mx-0.5 h-8 shrink-0 whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium data-[state=active]:bg-[var(--color-primary)] data-[state=active]:text-white data-[state=active]:shadow-sm sm:px-4"
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
                    className="relative mx-0.5 h-8 shrink-0 whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium data-[state=active]:bg-[var(--color-primary)] data-[state=active]:text-white data-[state=active]:shadow-sm sm:px-4"
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

            <div className="min-w-0 space-y-4 p-3 pb-4 sm:space-y-6 sm:p-6 sm:pb-6">
              <TabsContent value="branding" className="mt-0 w-full min-w-0">
                {tabsWithErrors.branding && (
                  <Badge variant="destructive" className="mb-3">
                    Required fields missing
                  </Badge>
                )}
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
                  serverLogo={
                    typeof siteEssentials?.logo === "string"
                      ? siteEssentials.logo
                      : undefined
                  }
                  serverFavicon={
                    typeof siteEssentials?.favicon === "string"
                      ? siteEssentials.favicon
                      : undefined
                  }
                />
              </TabsContent>

              {colorsUnlocked && (
                <TabsContent value="colors" className="mt-0 w-full min-w-0">
                  {tabsWithErrors.colors && (
                    <Badge variant="destructive" className="mb-3">
                      Required fields missing
                    </Badge>
                  )}
                  <ColorsTab />
                </TabsContent>
              )}

              <TabsContent value="typography" className="mt-0 w-full min-w-0">
                {tabsWithErrors.typography && (
                  <Badge variant="destructive" className="mb-3">
                    Required fields missing
                  </Badge>
                )}
                <TypographyTab />
              </TabsContent>

              <TabsContent value="social-media" className="mt-0 w-full min-w-0">
                {tabsWithErrors.socialMedia && (
                  <Badge variant="destructive" className="mb-3">
                    Required fields missing
                  </Badge>
                )}
                <SocialMediaTab />
              </TabsContent>

              <TabsContent value="seo" className="mt-0 w-full min-w-0">
                {tabsWithErrors.seo && (
                  <Badge variant="destructive" className="mb-3">
                    Required fields missing
                  </Badge>
                )}
                <SeoTab />
              </TabsContent>
            </div>

            {/* Actions sit on white, directly under tab content — avoids teal page chrome eating contrast */}
            <div className="border-t border-border bg-white px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end sm:gap-3">
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
                {hasRealEdits && !readOnly && (
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
    </FormProvider>
  );
}
