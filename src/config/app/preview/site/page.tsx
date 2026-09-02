"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useSitePreviewStore } from "@/store/site-preview.store";
import { SitePreview } from "@/app/(protected)/_shared/sites-essentials/_components/site-preview";
import { MainLandingSitePreview } from "@/app/(protected)/_shared/sites-essentials/_components/main-landing-site-preview";
import { SitePreviewReviewChrome } from "@/app/(protected)/_shared/sites-essentials/_components/site-preview-review-chrome";
import { SiteEssentialsFormValues } from "@/app/(protected)/_shared/sites-essentials/_lib/schema";
import { toSiteEssentialsUpdatePayload } from "@/app/(protected)/_shared/sites-essentials/_lib/payload";
import { hydratePreviewMediaForSave } from "@/app/(protected)/_shared/sites-essentials/_lib/hydrate-preview-media-for-save";
import {
  fetchSiteEssentialsBySlugForPreview,
  SITE_ESSENTIALS_BY_SLUG_STALE_MS,
  siteEssentialsKeys,
  useSiteEssentialsBySlugQuery,
  useSiteEssentialsMutation,
  useSiteEssentialsQuery,
  useApplyThemePresetMutation,
} from "@/app/(protected)/_shared/sites-essentials/_lib/queries";
import { Skeleton } from "@/components/ui/skeleton";
import { PreviewProvider } from "@/contexts/preview-context";
import { PreviewThemeCustomizer } from "@/components/preview/preview-theme-customizer";
import { PreviewImportWebsiteControl } from "@/app/(protected)/_shared/sites-essentials/_components/preview-import-website-control";
import { RestoreDefaultThemeControl } from "@/app/(protected)/_shared/sites-essentials/_components/restore-default-theme-control";
import { themeKeys } from "@/hooks/use-theme-query";
import { useToast } from "@/components/ui/use-toast";
import { resolveHasMultipleLocations } from "@/app/(protected)/_shared/sites-essentials/_lib/use-has-multiple-locations";
import {
  mergeSiteEssentialsPreviewWithApi,
  withPreviewLocationSlug,
} from "@/app/(protected)/_shared/sites-essentials/_lib/merge-preview-with-api";
import { mergeGlobalWithLocationSiteEssentials } from "@/app/(protected)/_shared/sites-essentials/_lib/merge-location-preview";
import {
  allPreviewLocationsApproved,
  previewLocationSlugsKey,
  resolveMainLandingPreviewLocations,
  resolvePreviewLocationCount,
  resolvePreviewLocationList,
} from "@/app/(protected)/_shared/sites-essentials/_lib/preview-locations";
import type { LocationData } from "@/types/theme.types";
import { useSwitchLocation } from "@/app/(protected)/vendor/venue-locations/_lib/hooks";
import { useVendorLocationsList } from "@/app/(protected)/vendor/venue-locations/_lib/queries";
import { resolveDefaultVenueLocation } from "@/lib/auth/session-location";
import { cn } from "@/lib/utils";

/** Theme fields that count as a real preview edit (not browse/normalize noise). */
function previewThemeSliceChanged(
  prev: SiteEssentialsFormValues | null | undefined,
  next: SiteEssentialsFormValues,
): boolean {
  if (!prev) return true;
  try {
    const pick = (v: SiteEssentialsFormValues) => ({
      colors: v.colors,
      typography: v.typography,
      banner_heading_align: v.banner_heading_align ?? null,
      banner_heading_valign: v.banner_heading_valign ?? null,
    });
    return JSON.stringify(pick(prev)) !== JSON.stringify(pick(next));
  } catch {
    return true;
  }
}

function editorPathForSession(
  accountType: string | undefined,
): "/admin/sites-essentials" | "/vendor/sites-essentials" {
  return accountType === "admin"
    ? "/admin/sites-essentials"
    : "/vendor/sites-essentials";
}

export default function SitePreviewPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const { toast } = useToast();
  const { mutateAsync: switchLocation } = useSwitchLocation();
  const { data: siteEssentialsFromApi } = useSiteEssentialsQuery();
  const { locations: venueLocations, isLoading: isLoadingVenueLocations } =
    useVendorLocationsList();
  const { mutateAsync: saveSiteEssentials, isPending: isSaving } =
    useSiteEssentialsMutation();
  const { mutateAsync: applyThemePreset, isPending: isApplyingPreset } =
    useApplyThemePresetMutation();
  const {
    previewData,
    reviewStep,
    mainPageApproved,
    previewLocations,
    previewVendorKey,
    currentLocationIndex,
    approvedLocationSlugs,
    previewRequiresSave,
    setPreviewData,
    setPreviewRequiresSave,
    setReviewStep,
    setMainPageApproved,
    setCurrentLocationIndex,
    approveLocationSlug,
    clearPreviewData,
  } = useSitePreviewStore();

  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<SiteEssentialsFormValues | null>(
    null,
  );
  /** Prevents empty-state flash while router leaves after Approve & save. */
  const [isExiting, setIsExiting] = useState(false);
  /**
   * True only after an import / theme try / restore-default in THIS preview
   * visit. `previewRequiresSave` can already be true when opening from a dirty
   * editor — that must not show Discard by itself.
   */
  const [hasSessionEdits, setHasSessionEdits] = useState(false);
  /**
   * Snapshot from when this preview session started (or after Save theme).
   * Discard changes restores here so an unwanted import can be undone safely.
   */
  const sessionBaselineRef = useRef<SiteEssentialsFormValues | null>(null);
  /** `previewRequiresSave` at the moment the baseline was captured. */
  const baselineRequiresSaveRef = useRef(false);
  /**
   * Hold the last fully-ready location preview while the next slug fetches so
   * Approve → Next does not flash editorSnapshot → API content.
   */
  const pinnedLocationPreviewRef = useRef<{
    slug: string;
    values: SiteEssentialsFormValues;
  } | null>(null);
  const [pinnedLocationPreview, setPinnedLocationPreview] = useState<{
    slug: string;
    values: SiteEssentialsFormValues;
  } | null>(null);

  const safePreviewLocations = previewLocations ?? [];
  const safeApprovedSlugs = approvedLocationSlugs ?? [];

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

  const resolvedGlobalData = useMemo(() => {
    if (!formData) return null;
    // Persisted snapshots sometimes omit slug; fall back to the active venue so
    // unsaved cover_image still paints onto the correct Main home city card.
    const slugFallback =
      formData.slug?.trim() || defaultVenueLocation?.slug?.trim() || undefined;
    return mergeSiteEssentialsPreviewWithApi(
      slugFallback && !formData.slug?.trim()
        ? { ...formData, slug: slugFallback }
        : formData,
      siteEssentialsFromApi ?? undefined,
    );
  }, [formData, siteEssentialsFromApi, defaultVenueLocation?.slug]);

  const sessionLocationFallback = useMemo(
    () => ({
      vendor_location_id: session?.user?.vendor_location_id,
      slug: defaultVenueLocation?.slug,
      name:
        defaultVenueLocation?.city ??
        defaultVenueLocation?.name ??
        resolvedGlobalData?.name,
    }),
    [
      session?.user?.vendor_location_id,
      defaultVenueLocation,
      resolvedGlobalData?.name,
    ],
  );

  const apiSiteEssentialsLocations = siteEssentialsFromApi?.locations;

  /** Fresh API/session list — never trust stale persisted locations from another vendor. */
  const canonicalLocationList = useMemo(
    () =>
      resolvePreviewLocationList(
        apiSiteEssentialsLocations ?? resolvedGlobalData?.locations,
        venueLocations,
        sessionLocationFallback,
      ),
    [
      apiSiteEssentialsLocations,
      resolvedGlobalData?.locations,
      venueLocations,
      sessionLocationFallback,
    ],
  );

  const locationList = useMemo(() => {
    if (canonicalLocationList.length > 0) return canonicalLocationList;
    return safePreviewLocations;
  }, [canonicalLocationList, safePreviewLocations]);

  const mainLandingPreviewData = useMemo(() => {
    if (!resolvedGlobalData) return null;
    const formLocations = resolvedGlobalData.locations as
      | LocationData[]
      | undefined;
    if (formLocations?.length || locationList.length === 0) {
      return resolvedGlobalData;
    }
    return {
      ...resolvedGlobalData,
      locations: resolveMainLandingPreviewLocations(
        formLocations,
        locationList,
      ),
    };
  }, [resolvedGlobalData, locationList]);

  const hasMultipleLocations = useMemo(() => {
    const count = resolvePreviewLocationCount(
      apiSiteEssentialsLocations,
      locationList.length,
    );
    return resolveHasMultipleLocations(count);
  }, [apiSiteEssentialsLocations, locationList.length]);

  /** Single-location vendors skip main home — don't wait for persisted store sync. */
  const effectiveReviewStep = hasMultipleLocations
    ? reviewStep
    : ("location" as const);

  const safeLocationIndex = Math.min(
    currentLocationIndex ?? 0,
    Math.max(0, locationList.length - 1),
  );
  const currentLocation = locationList[safeLocationIndex];
  const currentSlug =
    effectiveReviewStep === "location" ? currentLocation?.slug : undefined;

  /** Location hero/about/events require `?slug=` even for a single location. */
  const fetchLocationEssentialsBySlug =
    effectiveReviewStep === "location" && Boolean(currentSlug?.trim());

  const {
    data: locationEssentialsFromApi,
    isLoading: isLoadingLocationEssentials,
    isFetching: isFetchingLocationEssentials,
    isError: isLocationEssentialsError,
    isFetched: isLocationEssentialsFetched,
  } = useSiteEssentialsBySlugQuery(currentSlug, fetchLocationEssentialsBySlug);

  const locationPreviewData = useMemo(() => {
    if (!resolvedGlobalData || effectiveReviewStep !== "location") {
      return null;
    }

    const locationLabel =
      currentLocation?.city ??
      venueLocations[0]?.city ??
      defaultVenueLocation?.city ??
      resolvedGlobalData.name;

    const locationMergeOptions = {
      isSingleLocation: !hasMultipleLocations,
      previewSlug: currentSlug,
    };

    const editorSnapshot = (): SiteEssentialsFormValues => {
      const base = withPreviewLocationSlug(resolvedGlobalData, currentSlug);
      return {
        ...base,
        name: locationLabel?.trim() || base.name,
      };
    };

    if (locationEssentialsFromApi) {
      return mergeGlobalWithLocationSiteEssentials(
        resolvedGlobalData,
        locationEssentialsFromApi,
        locationLabel,
        locationMergeOptions,
      );
    }

    // Show unsaved editor values immediately — never fall back to global site-essentials.
    return editorSnapshot();
  }, [
    resolvedGlobalData,
    effectiveReviewStep,
    locationEssentialsFromApi,
    currentLocation?.city,
    venueLocations,
    defaultVenueLocation?.city,
    hasMultipleLocations,
    currentSlug,
  ]);

  const locationPreviewFormValues = useMemo(() => {
    const data = locationPreviewData ?? resolvedGlobalData;
    if (!data) return null;
    const formLocations = data.locations as LocationData[] | undefined;
    if (formLocations?.length || locationList.length === 0) {
      return data;
    }
    return {
      ...data,
      locations: resolveMainLandingPreviewLocations(
        formLocations,
        locationList,
      ),
    };
  }, [locationPreviewData, resolvedGlobalData, locationList]);

  const locationApiPending =
    fetchLocationEssentialsBySlug &&
    !isLocationEssentialsError &&
    (isLoadingLocationEssentials || isFetchingLocationEssentials) &&
    !locationEssentialsFromApi;

  const isLoadingLocationPreview =
    fetchLocationEssentialsBySlug &&
    !locationPreviewData &&
    !isLocationEssentialsError &&
    (isLoadingLocationEssentials || isFetchingLocationEssentials);

  // Keep painting the previous location until the new slug's API merge is ready.
  useEffect(() => {
    if (effectiveReviewStep !== "location" || !currentSlug) {
      pinnedLocationPreviewRef.current = null;
      setPinnedLocationPreview(null);
      return;
    }
    if (!locationPreviewFormValues) return;

    if (locationApiPending) {
      // First location with nothing pinned yet — show editor snapshot immediately.
      if (!pinnedLocationPreviewRef.current) {
        const initial = {
          slug: currentSlug,
          values: locationPreviewFormValues,
        };
        pinnedLocationPreviewRef.current = initial;
        setPinnedLocationPreview(initial);
      }
      return;
    }

    const next = { slug: currentSlug, values: locationPreviewFormValues };
    pinnedLocationPreviewRef.current = next;
    setPinnedLocationPreview(next);
  }, [
    effectiveReviewStep,
    currentSlug,
    locationPreviewFormValues,
    locationApiPending,
  ]);

  const smoothLocationPreviewValues = useMemo(() => {
    if (effectiveReviewStep !== "location") {
      return locationPreviewFormValues;
    }
    if (
      pinnedLocationPreview &&
      locationApiPending &&
      pinnedLocationPreview.slug !== currentSlug
    ) {
      return pinnedLocationPreview.values;
    }
    return (
      (pinnedLocationPreview && pinnedLocationPreview.slug === currentSlug
        ? pinnedLocationPreview.values
        : null) ??
      locationPreviewFormValues ??
      resolvedGlobalData
    );
  }, [
    effectiveReviewStep,
    pinnedLocationPreview,
    locationApiPending,
    currentSlug,
    locationPreviewFormValues,
    resolvedGlobalData,
  ]);

  const prefetchLocationPreview = useCallback(
    (slug: string | undefined) => {
      const nextSlug = slug?.trim();
      if (!nextSlug) return;
      void queryClient.prefetchQuery({
        queryKey: siteEssentialsKeys.bySlug(nextSlug),
        queryFn: () => fetchSiteEssentialsBySlugForPreview(nextSlug),
        staleTime: SITE_ESSENTIALS_BY_SLUG_STALE_MS,
      });
    },
    [queryClient],
  );

  // Warm only the immediate neighbours (prev/next) so the common
  // "Next location" / arrow jumps land warm. Distant locations are warmed
  // on demand via hover/focus prefetch on the chips and dropdown — we do NOT
  // eagerly fetch the entire list, which floods the backend with a by-slug
  // request per location the moment a single location is opened.
  useEffect(() => {
    if (effectiveReviewStep !== "location" || locationList.length === 0) return;

    prefetchLocationPreview(locationList[safeLocationIndex - 1]?.slug);
    prefetchLocationPreview(locationList[safeLocationIndex + 1]?.slug);
  }, [
    effectiveReviewStep,
    locationList,
    safeLocationIndex,
    prefetchLocationPreview,
  ]);

  // Keep the active vendor location in sync with the location being previewed —
  // exactly like the dashboard LocationSelector. Selecting a tab / dropdown /
  // next-prev updates `currentLocation`, and this effect switches the session to
  // it so location-scoped operations (Import from website, Save theme) send the
  // correct X-Venue-Location-Id instead of the default location. `useSwitchLocation`
  // already preserves the preview snapshot while on /preview/site.
  const lastSyncedLocationIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (effectiveReviewStep !== "location") return;
    const targetId = currentLocation?.id;
    if (targetId == null) return;

    const sessionId = Number(session?.user?.vendor_location_id ?? 0);
    if (Number(targetId) === sessionId) {
      // Already active — record it so we don't re-fire after the session settles.
      lastSyncedLocationIdRef.current = Number(targetId);
      return;
    }
    // Guard against re-firing for a switch that's already in flight to this id.
    if (lastSyncedLocationIdRef.current === Number(targetId)) return;

    lastSyncedLocationIdRef.current = Number(targetId);
    void switchLocation(targetId);
  }, [
    effectiveReviewStep,
    currentLocation?.id,
    session?.user?.vendor_location_id,
    switchLocation,
  ]);

  useEffect(() => {
    let isMounted = true;

    if (previewData) {
      try {
        const clonedData = JSON.parse(JSON.stringify(previewData));
        if (isMounted) {
          setFormData(clonedData);
          // Capture once per preview visit — later imports/theme tries can Discard
          // back to this baseline without wiping a later Save theme (we refresh it).
          if (!sessionBaselineRef.current) {
            sessionBaselineRef.current = clonedData;
            baselineRequiresSaveRef.current =
              useSitePreviewStore.getState().previewRequiresSave;
          }
        }
      } catch (error) {
        console.error("Error cloning preview data:", error);
        if (isMounted) {
          setFormData(previewData);
          if (!sessionBaselineRef.current) {
            sessionBaselineRef.current = previewData;
            baselineRequiresSaveRef.current =
              useSitePreviewStore.getState().previewRequiresSave;
          }
        }
      }
    }

    if (isMounted) {
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [previewData]);

  const currentVendorKey =
    siteEssentialsFromApi?.domain?.trim() ||
    resolvedGlobalData?.domain?.trim() ||
    resolvedGlobalData?.name?.trim() ||
    null;

  /** Drop stale localStorage when vendor or location list no longer matches API. */
  useEffect(() => {
    if (isExiting) return;
    if (!currentVendorKey) return;

    const vendorMismatch =
      previewVendorKey != null && previewVendorKey !== currentVendorKey;

    if (vendorMismatch) {
      useSitePreviewStore.setState({
        previewVendorKey: currentVendorKey,
        previewLocations: [],
        approvedLocationSlugs: [],
        currentLocationIndex: 0,
        mainPageApproved: false,
        reviewStep: hasMultipleLocations ? "main" : "location",
        previewScope: hasMultipleLocations ? "main" : "location",
      });
    } else if (!previewVendorKey) {
      useSitePreviewStore.setState({ previewVendorKey: currentVendorKey });
    }
  }, [currentVendorKey, previewVendorKey, hasMultipleLocations, isExiting]);

  /** Keep persisted review state in sync with the current vendor's locations. */
  useEffect(() => {
    if (isExiting) return;
    if (canonicalLocationList.length === 0) return;

    const canonicalKey = previewLocationSlugsKey(canonicalLocationList);
    const storedKey = previewLocationSlugsKey(safePreviewLocations);
    const multi = resolveHasMultipleLocations(
      resolvePreviewLocationCount(
        apiSiteEssentialsLocations,
        canonicalLocationList.length,
      ),
    );
    const needsListSync = canonicalKey !== storedKey;
    const needsSingleLocationStep = !multi && reviewStep !== "location";

    if (!needsListSync && !needsSingleLocationStep) return;

    useSitePreviewStore.setState({
      previewLocations: canonicalLocationList,
      currentLocationIndex: Math.min(
        currentLocationIndex ?? 0,
        canonicalLocationList.length - 1,
      ),
      ...(needsListSync ? { approvedLocationSlugs: [] } : {}),
      ...(multi
        ? {}
        : {
            reviewStep: "location",
            previewScope: "location",
            mainPageApproved: true,
          }),
    });
  }, [
    canonicalLocationList,
    safePreviewLocations,
    reviewStep,
    currentLocationIndex,
    apiSiteEssentialsLocations,
    isExiting,
  ]);

  const handlePreviewValuesChange = useCallback(
    (next: SiteEssentialsFormValues) => {
      const prev = useSitePreviewStore.getState().previewData;
      setFormData(next);
      setPreviewData(next);
      // Only enter Approve & save mode when theme fields actually changed
      if (previewThemeSliceChanged(prev, next)) {
        setPreviewRequiresSave(true);
        setHasSessionEdits(true);
      }
    },
    [setPreviewData, setPreviewRequiresSave],
  );

  /**
   * Import from website can change content/images without touching theme keys.
   * Always mark dirty so Approve & save is available, and keep the preview
   * canvas in sync with the full post-apply snapshot (including File media).
   */
  const handleImportApplied = useCallback(
    (next: SiteEssentialsFormValues) => {
      // Prefer the location currently under review so location-scoped fields
      // (banner, cover, about) win over the API merge after import.
      const slug =
        next.slug?.trim() ||
        currentSlug?.trim() ||
        defaultVenueLocation?.slug?.trim() ||
        undefined;
      const withSlug = slug && !next.slug?.trim() ? { ...next, slug } : next;
      setFormData(withSlug);
      setPreviewData(withSlug);
      setPreviewRequiresSave(true);
      setHasSessionEdits(true);
    },
    [
      currentSlug,
      defaultVenueLocation?.slug,
      setPreviewData,
      setPreviewRequiresSave,
    ],
  );

  const handleDiscardPreviewChanges = useCallback(() => {
    const baseline = sessionBaselineRef.current;
    if (!baseline) {
      toast({
        title: "Nothing to discard",
        description: "There is no earlier preview snapshot to restore.",
      });
      return;
    }
    try {
      const restored = JSON.parse(
        JSON.stringify(baseline),
      ) as SiteEssentialsFormValues;
      setFormData(restored);
      setPreviewData(restored);
      setPreviewRequiresSave(baselineRequiresSaveRef.current);
      setHasSessionEdits(false);
      toast({
        title: "Changes discarded",
        description:
          "Import and theme tries were undone. The preview is back to how it looked when you opened it.",
      });
    } catch {
      toast({
        title: "Could not discard changes",
        variant: "destructive",
      });
    }
  }, [setPreviewData, setPreviewRequiresSave, toast]);

  const leavePreviewToEditor = useCallback(
    (options?: { keepUnsavedSnapshot?: boolean }) => {
      if (!options?.keepUnsavedSnapshot) {
        clearPreviewData();
      }
      router.replace(editorPathForSession(session?.user?.account_type));
    },
    [clearPreviewData, router, session?.user?.account_type],
  );

  const handleGoBack = () => {
    // View-only: leave pristine. Unsaved preview edits: keep snapshot for restore.
    leavePreviewToEditor({
      keepUnsavedSnapshot: Boolean(
        useSitePreviewStore.getState().previewRequiresSave,
      ),
    });
  };

  const handleClosePreview = useCallback(() => {
    leavePreviewToEditor({ keepUnsavedSnapshot: false });
  }, [leavePreviewToEditor]);

  const handleEdit = () => {
    const requiresSave = useSitePreviewStore.getState().previewRequiresSave;
    const loc = locationList[safeLocationIndex];
    const currentId = Number(session?.user?.vendor_location_id ?? 0);
    // Only switch when editing a different location — never for browse/close.
    if (
      requiresSave &&
      reviewStep === "location" &&
      loc?.id != null &&
      Number(loc.id) !== currentId
    ) {
      void switchLocation(loc.id);
    }
    leavePreviewToEditor({ keepUnsavedSnapshot: requiresSave });
  };

  const handleApproveMain = (options?: { silent?: boolean }) => {
    setMainPageApproved(true);
    if (options?.silent) return;
    toast({
      title: "Main home approved",
      description:
        locationList.length > 0
          ? `Next, review ${locationList.length} location page${locationList.length > 1 ? "s" : ""}.`
          : "Continue when ready.",
    });
  };

  const goToLocationPreview = useCallback(
    (slug: string, options?: { approveMain?: boolean }) => {
      const index = locationList.findIndex((loc) => loc.slug === slug);
      if (index < 0) return false;

      // Single store write — avoids double sessionStorage persist on each jump.
      useSitePreviewStore.setState({
        ...(options?.approveMain && !mainPageApproved
          ? { mainPageApproved: true }
          : {}),
        reviewStep: "location",
        previewScope: "location",
        currentLocationIndex: index,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return true;
    },
    [locationList, mainPageApproved],
  );

  const handleContinueFromMain = () => {
    if (!mainPageApproved) {
      setMainPageApproved(true);
    }
    if (locationList.length === 0) {
      toast({
        title: "No locations to review",
        description: "Add at least one event location first.",
        variant: "destructive",
      });
      return;
    }
    prefetchLocationPreview(locationList[0].slug);
    goToLocationPreview(locationList[0].slug);
  };

  const handlePreviewLocationFromGrid = (slug: string) =>
    goToLocationPreview(slug, { approveMain: true });

  const handleApproveCurrentLocation = (options?: { silent?: boolean }) => {
    if (!currentSlug) return;
    approveLocationSlug(currentSlug);
    if (options?.silent) return;
    toast({
      title: `${currentLocation?.city ?? "Location"} approved`,
      description: isLastLocation()
        ? "You can save your changes when ready."
        : "Continue to the next location.",
    });
  };

  const isLastLocation = () => safeLocationIndex >= locationList.length - 1;

  const handleNextLocation = () => {
    if (!isLastLocation()) {
      const nextSlug = locationList[safeLocationIndex + 1]?.slug;
      prefetchLocationPreview(nextSlug);
      setCurrentLocationIndex(safeLocationIndex + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePreviousLocation = () => {
    if (safeLocationIndex > 0) {
      const prevSlug = locationList[safeLocationIndex - 1]?.slug;
      prefetchLocationPreview(prevSlug);
      setCurrentLocationIndex(safeLocationIndex - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSave = useCallback(
    async (options?: { approveSlug?: string }) => {
      // View-only preview must never persist
      if (!useSitePreviewStore.getState().previewRequiresSave) {
        leavePreviewToEditor({ keepUnsavedSnapshot: false });
        return;
      }

      if (options?.approveSlug) {
        approveLocationSlug(options.approveSlug);
      }

      const approvedSlugs =
        options?.approveSlug && !safeApprovedSlugs.includes(options.approveSlug)
          ? [...safeApprovedSlugs, options.approveSlug]
          : safeApprovedSlugs;

      const ready = hasMultipleLocations
        ? mainPageApproved &&
          allPreviewLocationsApproved(locationList, approvedSlugs)
        : allPreviewLocationsApproved(locationList, approvedSlugs);

      if (!resolvedGlobalData) {
        toast({
          title: "Nothing to save",
          description: "Preview data is still loading. Try again in a moment.",
          variant: "destructive",
        });
        return;
      }

      if (!ready) {
        // Don't leave the user stuck — jump to the first page still needing approval.
        if (hasMultipleLocations && !mainPageApproved) {
          setReviewStep("main");
          window.scrollTo({ top: 0, behavior: "smooth" });
          toast({
            title: "Review Main home first",
            description:
              "Approve the main home page, then continue through each location.",
          });
          return;
        }

        const pendingIndex = locationList.findIndex(
          (loc) => !approvedSlugs.includes(loc.slug),
        );
        if (pendingIndex >= 0) {
          const pending = locationList[pendingIndex];
          setReviewStep("location");
          setCurrentLocationIndex(pendingIndex);
          window.scrollTo({ top: 0, behavior: "smooth" });
          toast({
            title: `Review ${pending.city}`,
            description:
              "This location was skipped — approve it here, then save again.",
          });
          return;
        }

        toast({
          title: "Approve all pages first",
          description: "Finish reviewing each page, then save.",
          variant: "destructive",
        });
        return;
      }

      try {
        // Switch session to the location that owns cover_image before PATCH
        const targetSlug =
          resolvedGlobalData.slug?.trim() ||
          options?.approveSlug ||
          currentSlug ||
          undefined;
        const targetLocation = locationList.find(
          (loc) => loc.slug === targetSlug,
        );
        const currentId = Number(session?.user?.vendor_location_id ?? 0);
        if (
          targetLocation?.id != null &&
          Number(targetLocation.id) !== currentId
        ) {
          await switchLocation(targetLocation.id);
        }

        const hydrated = await hydratePreviewMediaForSave(
          toSiteEssentialsUpdatePayload(resolvedGlobalData),
        );

        await saveSiteEssentials({
          ...hydrated,
          _method: "PATCH",
        } as Partial<SiteEssentialsFormValues> & { _method: "PATCH" });

        // Mark pristine before navigate so editor remount does not dirty-restore
        useSitePreviewStore.getState().setPreviewRequiresSave(false);
        useSitePreviewStore.getState().consumePreviewFresh();

        // Keep painting this preview until navigation finishes — clearing the
        // store first flashed "No Preview Data" / reset the review chrome.
        setIsExiting(true);
        toast({
          title: "Saved",
          description: "Site essentials were updated successfully.",
        });
        router.replace(editorPathForSession(session?.user?.account_type));

        // Refresh editor caches after leave; clear snapshot once we're off-page.
        void queryClient.invalidateQueries({ queryKey: themeKeys.all });
        void queryClient.invalidateQueries({
          queryKey: siteEssentialsKeys.details(),
        });
        locationList.forEach((loc) => {
          void queryClient.invalidateQueries({
            queryKey: siteEssentialsKeys.bySlug(loc.slug),
          });
        });
        window.setTimeout(() => {
          clearPreviewData();
        }, 400);
      } catch {
        setIsExiting(false);
        toast({
          title: "Could not save",
          description:
            "Please try again from Site Essentials or fix any validation errors.",
          variant: "destructive",
        });
      }
    },
    [
      resolvedGlobalData,
      hasMultipleLocations,
      mainPageApproved,
      locationList,
      safeApprovedSlugs,
      approveLocationSlug,
      setReviewStep,
      setCurrentLocationIndex,
      currentSlug,
      switchLocation,
      queryClient,
      router,
      saveSiteEssentials,
      clearPreviewData,
      session?.user?.account_type,
      session?.user?.vendor_location_id,
      toast,
      leavePreviewToEditor,
    ],
  );

  const handleSaveTheme = useCallback(async () => {
    // View-only browse must not PATCH theme
    if (!useSitePreviewStore.getState().previewRequiresSave) {
      toast({
        title: "Nothing to save",
        description: "Change a color or font first, then save the theme.",
      });
      return;
    }
    const dataForSave = locationPreviewData ?? resolvedGlobalData;
    if (!dataForSave) return;
    try {
      // A location theme/banner save must target the previewed location — not
      // the default session location. Without this switch the API interceptor
      // keeps sending X-Venue-Location-Id for the default location (e.g. 2),
      // so an imported banner for a non-default location is written to the
      // wrong location. Mirrors the switch in handleSave.
      if (effectiveReviewStep === "location") {
        const targetSlug =
          currentSlug?.trim() || dataForSave.slug?.trim() || undefined;
        const targetLocation = locationList.find(
          (loc) => loc.slug === targetSlug,
        );
        const currentId = Number(session?.user?.vendor_location_id ?? 0);
        if (
          targetLocation?.id != null &&
          Number(targetLocation.id) !== currentId
        ) {
          await switchLocation(targetLocation.id);
        }
      }

      const hydrated = await hydratePreviewMediaForSave(
        toSiteEssentialsUpdatePayload(dataForSave),
      );
      const recipeId = dataForSave.theme_preset_id?.trim();
      if (recipeId) {
        await applyThemePreset(recipeId);
        // Apply writes catalog tokens + id only. Hero layout still lives on PATCH.
        await saveSiteEssentials({
          banner_heading_align: dataForSave.banner_heading_align,
          banner_heading_valign: dataForSave.banner_heading_valign,
          _method: "PATCH",
        } as Partial<SiteEssentialsFormValues> & { _method: "PATCH" });
      } else {
        await saveSiteEssentials({
          ...hydrated,
          theme_preset_id: null,
          _method: "PATCH",
        } as Partial<SiteEssentialsFormValues> & { _method: "PATCH" });
      }
      await queryClient.invalidateQueries({ queryKey: themeKeys.all });
      await queryClient.invalidateQueries({
        queryKey: siteEssentialsKeys.details(),
      });
      router.refresh();
      // Refresh discard baseline so Discard no longer undoes a published theme.
      try {
        sessionBaselineRef.current = JSON.parse(
          JSON.stringify(dataForSave),
        ) as SiteEssentialsFormValues;
        baselineRequiresSaveRef.current =
          useSitePreviewStore.getState().previewRequiresSave;
      } catch {
        sessionBaselineRef.current = dataForSave;
      }
      setHasSessionEdits(false);
      toast({
        title: "Theme saved",
        description: "Colors and fonts were updated.",
      });
    } catch {
      toast({
        title: "Could not save theme",
        variant: "destructive",
      });
    }
  }, [
    locationPreviewData,
    resolvedGlobalData,
    effectiveReviewStep,
    currentSlug,
    locationList,
    switchLocation,
    session?.user?.vendor_location_id,
    queryClient,
    router,
    saveSiteEssentials,
    applyThemePreset,
    toast,
  ]);

  // Prefer the pinned/smooth canvas values so the customizer doesn't thrash to an
  // editor snapshot while a location fetch is still in flight.
  const previewValuesForCustomizer =
    (effectiveReviewStep === "location" ? smoothLocationPreviewValues : null) ??
    locationPreviewData ??
    resolvedGlobalData;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 text-black">
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b bg-white px-4 py-3 shadow-sm">
          <Button variant="event-primary" onClick={handleGoBack} size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Editor
          </Button>
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="pt-16 pb-28">
          <Skeleton className="mx-auto aspect-[21/9] max-w-7xl" />
        </div>
      </div>
    );
  }

  if (!resolvedGlobalData && !isExiting) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
        <h1 className="mb-4 text-2xl font-bold">No Preview Data Available</h1>
        <p className="mb-6 text-center text-gray-500">
          Open Site Essentials and click Preview to review your main home and
          each location page.
        </p>
        <Button variant="event-primary" onClick={handleGoBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  if (!resolvedGlobalData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-50 p-4">
        <Loader2 className="h-8 w-8 animate-spin text-slate-700" />
        <p className="text-sm text-slate-600">Returning to editor…</p>
      </div>
    );
  }

  const showInitialLocationLoader =
    (isLoadingLocationPreview ||
      (effectiveReviewStep === "location" &&
        locationList.length === 0 &&
        isLoadingVenueLocations)) &&
    !pinnedLocationPreview &&
    !smoothLocationPreviewValues;

  const isLocationSwapPending =
    effectiveReviewStep === "location" &&
    locationApiPending &&
    Boolean(pinnedLocationPreview) &&
    pinnedLocationPreview?.slug !== currentSlug;

  return (
    <PreviewProvider
      isPreviewMode={true}
      previewLocations={
        hasMultipleLocations && locationList.length > 0
          ? locationList
          : undefined
      }
      activePreviewLocationSlug={
        effectiveReviewStep === "location" ? currentSlug : undefined
      }
      onPreviewLocationSelect={
        hasMultipleLocations
          ? (slug) => {
              prefetchLocationPreview(slug);
              goToLocationPreview(slug);
            }
          : undefined
      }
      onPreviewLocationPrefetch={
        hasMultipleLocations ? prefetchLocationPreview : undefined
      }
    >
      <div className="relative flex min-h-screen w-full min-w-0 flex-col bg-[var(--color-background)]">
        {/* Top/bottom chrome overlays the site — clearance lives on the footer (footer bg)
            so we never leave a light gap under a dark footer. */}
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex items-start px-4 pt-4 sm:px-6">
          <Button
            variant="event-primary"
            onClick={handleGoBack}
            size="sm"
            disabled={isExiting || isSaving}
            className="pointer-events-auto shadow-md ring-1 ring-black/10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Editor
          </Button>
        </div>

        <div
            className={cn(
              "min-h-screen w-full min-w-0 transition-opacity duration-200 ease-out",
            isLocationSwapPending && "opacity-80",
          )}
        >
          {hasMultipleLocations && effectiveReviewStep === "main" ? (
            <MainLandingSitePreview
              formValues={mainLandingPreviewData ?? resolvedGlobalData}
              onLocationSelect={handlePreviewLocationFromGrid}
            />
          ) : showInitialLocationLoader ? (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-[var(--color-background)] text-[var(--color-text)]">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
              <p className="text-sm text-[var(--color-text-dimmed)]">
                Loading {currentLocation?.city ?? "location"} preview…
              </p>
            </div>
          ) : (
            <SitePreview
              formValues={
                smoothLocationPreviewValues ??
                locationPreviewFormValues ??
                resolvedGlobalData
              }
            />
          )}
        </div>

        {isLocationSwapPending ? (
          <div className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-0.5 overflow-hidden bg-transparent">
            <div className="h-full w-1/3 animate-pulse bg-slate-900/80" />
          </div>
        ) : null}

        {(isExiting || isSaving) && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center bg-white/55 backdrop-blur-[1px]">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-lg">
              <Loader2 className="h-4 w-4 animate-spin" />
              {isExiting ? "Saved — returning to editor…" : "Saving…"}
            </div>
          </div>
        )}

        {previewValuesForCustomizer && !isExiting ? (
          <PreviewThemeCustomizer
            values={previewValuesForCustomizer}
            onValuesChange={handlePreviewValuesChange}
            brandName={resolvedGlobalData.name?.trim() || "Site preview"}
            onSaveTheme={handleSaveTheme}
            isSavingTheme={isSaving || isApplyingPreset}
            showHeroLayoutControls={effectiveReviewStep === "location"}
            importSlot={
              session?.user?.account_type !== "admin" ? (
                <PreviewImportWebsiteControl
                  values={previewValuesForCustomizer}
                  onValuesChange={handleImportApplied}
                  locationLabel={
                    (effectiveReviewStep === "location"
                      ? currentLocation?.city
                      : undefined) ??
                    defaultVenueLocation?.city ??
                    defaultVenueLocation?.name
                  }
                  disabled={isSaving || isExiting}
                />
              ) : undefined
            }
            showDiscardChanges={hasSessionEdits}
            onDiscardChanges={handleDiscardPreviewChanges}
            sheetDescription={
              hasSessionEdits
                ? "Adjust colours or fonts. Don’t like an import or theme try? Use Discard changes."
                : previewRequiresSave
                  ? "Adjust colours or fonts. Approve each location page, then save."
                  : "Adjust colours or fonts. Editing will enable Approve & save."
            }
            footerSlot={
              <RestoreDefaultThemeControl
                presetCacheUserKey={
                  session?.user?.email?.trim() ||
                  (session?.user as { id?: string })?.id ||
                  "anonymous"
                }
                getValues={() =>
                  previewValuesForCustomizer ?? resolvedGlobalData
                }
                onApplied={(next) => {
                  handlePreviewValuesChange(next);
                }}
              />
            }
          />
        ) : null}

        <SitePreviewReviewChrome
          hasMultipleLocations={hasMultipleLocations}
          reviewStep={effectiveReviewStep}
          mainPageApproved={mainPageApproved}
          previewLocations={locationList}
          currentLocationIndex={safeLocationIndex}
          approvedLocationSlugs={safeApprovedSlugs}
          isSaving={isSaving || isExiting}
          isLoadingLocation={locationApiPending || isLoadingLocationPreview}
          viewOnly={!previewRequiresSave}
          onEdit={handleEdit}
          onApproveMain={handleApproveMain}
          onApproveCurrentLocation={handleApproveCurrentLocation}
          onContinueFromMain={handleContinueFromMain}
          onNextLocation={handleNextLocation}
          onPreviousLocation={handlePreviousLocation}
          onSave={(options) => {
            void handleSave(options);
          }}
          onClosePreview={handleClosePreview}
          onPrefetchLocation={prefetchLocationPreview}
          onGoToStep={(step) => {
            if (step === "main") {
              useSitePreviewStore.setState({
                reviewStep: "main",
                previewScope: "main",
              });
            } else {
              const slug = locationList[step.locationIndex]?.slug;
              prefetchLocationPreview(slug);
              useSitePreviewStore.setState({
                reviewStep: "location",
                previewScope: "location",
                currentLocationIndex: step.locationIndex,
              });
            }
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onBackToMain={
            hasMultipleLocations
              ? () => {
                  useSitePreviewStore.setState({
                    reviewStep: "main",
                    previewScope: "main",
                  });
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              : undefined
          }
        />
      </div>
    </PreviewProvider>
  );
}
