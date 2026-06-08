"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  siteEssentialsKeys,
  useSiteEssentialsBySlugQuery,
  useSiteEssentialsMutation,
  useSiteEssentialsQuery,
} from "@/app/(protected)/_shared/sites-essentials/_lib/queries";
import { Skeleton } from "@/components/ui/skeleton";
import { PreviewProvider } from "@/contexts/preview-context";
import { PreviewThemeCustomizer } from "@/components/preview/preview-theme-customizer";
import { themeKeys } from "@/hooks/use-theme-query";
import { useToast } from "@/components/ui/use-toast";
import { resolveHasMultipleLocations } from "@/app/(protected)/_shared/sites-essentials/_lib/use-has-multiple-locations";
import { mergeSiteEssentialsPreviewWithApi } from "@/app/(protected)/_shared/sites-essentials/_lib/merge-preview-with-api";
import { mergeGlobalWithLocationSiteEssentials } from "@/app/(protected)/_shared/sites-essentials/_lib/merge-location-preview";
import {
  allPreviewLocationsApproved,
  previewLocationSlugsKey,
  resolvePreviewLocationCount,
  resolvePreviewLocationList,
} from "@/app/(protected)/_shared/sites-essentials/_lib/preview-locations";
import { useSwitchLocation } from "@/app/(protected)/vendor/venue-locations/_lib/hooks";
import { useVendorLocationsList } from "@/app/(protected)/vendor/venue-locations/_lib/queries";

export default function SitePreviewPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const { toast } = useToast();
  const { mutate: switchLocation } = useSwitchLocation();
  const { data: siteEssentialsFromApi } = useSiteEssentialsQuery();
  const { locations: venueLocations, isLoading: isLoadingVenueLocations } =
    useVendorLocationsList();
  const { mutateAsync: saveSiteEssentials, isPending: isSaving } =
    useSiteEssentialsMutation();
  const {
    previewData,
    reviewStep,
    mainPageApproved,
    previewLocations,
    previewVendorKey,
    currentLocationIndex,
    approvedLocationSlugs,
    setPreviewData,
    setReviewStep,
    setMainPageApproved,
    setCurrentLocationIndex,
    approveLocationSlug,
  } = useSitePreviewStore();

  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<SiteEssentialsFormValues | null>(
    null,
  );

  const resolvedGlobalData = useMemo(() => {
    if (!formData) return null;
    return mergeSiteEssentialsPreviewWithApi(
      formData,
      siteEssentialsFromApi ?? undefined,
    );
  }, [formData, siteEssentialsFromApi]);

  const safePreviewLocations = previewLocations ?? [];
  const safeApprovedSlugs = approvedLocationSlugs ?? [];

  const effectiveVenueLocations = useMemo(() => {
    if (venueLocations.length > 0) return venueLocations;
    if (session?.user?.venue_locations?.length) {
      return session.user.venue_locations;
    }
    if (session?.user?.default_venue_location) {
      return [session.user.default_venue_location];
    }
    return [];
  }, [
    venueLocations,
    session?.user?.venue_locations,
    session?.user?.default_venue_location,
  ]);

  const sessionLocationFallback = useMemo(
    () => ({
      vendor_location_id: session?.user?.vendor_location_id,
      slug: session?.user?.default_venue_location?.slug,
      name:
        session?.user?.default_venue_location?.city ??
        session?.user?.default_venue_location?.name ??
        resolvedGlobalData?.name,
    }),
    [
      session?.user?.vendor_location_id,
      session?.user?.default_venue_location,
      resolvedGlobalData?.name,
    ],
  );

  const apiSiteEssentialsLocations = siteEssentialsFromApi?.locations;

  /** Fresh API/session list — never trust stale persisted locations from another vendor. */
  const canonicalLocationList = useMemo(
    () =>
      resolvePreviewLocationList(
        apiSiteEssentialsLocations ?? resolvedGlobalData?.locations,
        effectiveVenueLocations,
        sessionLocationFallback,
      ),
    [
      apiSiteEssentialsLocations,
      resolvedGlobalData?.locations,
      effectiveVenueLocations,
      sessionLocationFallback,
    ],
  );

  const locationList = useMemo(() => {
    if (canonicalLocationList.length > 0) return canonicalLocationList;
    return safePreviewLocations;
  }, [canonicalLocationList, safePreviewLocations]);

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
      effectiveVenueLocations[0]?.city ??
      session?.user?.default_venue_location?.city ??
      resolvedGlobalData.name;

    const locationMergeOptions = {
      isSingleLocation: !hasMultipleLocations,
      previewSlug: currentSlug,
    };

    if (locationEssentialsFromApi) {
      return mergeGlobalWithLocationSiteEssentials(
        resolvedGlobalData,
        locationEssentialsFromApi,
        locationLabel,
        locationMergeOptions,
      );
    }

    const slugFetchSettled =
      !fetchLocationEssentialsBySlug ||
      isLocationEssentialsFetched ||
      isLocationEssentialsError;

    if (slugFetchSettled) {
      if (siteEssentialsFromApi) {
        return mergeGlobalWithLocationSiteEssentials(
          resolvedGlobalData,
          siteEssentialsFromApi,
          locationLabel,
          locationMergeOptions,
        );
      }
      return resolvedGlobalData;
    }

    return null;
  }, [
    resolvedGlobalData,
    effectiveReviewStep,
    locationEssentialsFromApi,
    currentLocation?.city,
    venueLocations,
    siteEssentialsFromApi,
    fetchLocationEssentialsBySlug,
    isLocationEssentialsFetched,
    isLocationEssentialsError,
    effectiveVenueLocations,
    session?.user?.default_venue_location?.city,
    hasMultipleLocations,
    currentSlug,
  ]);

  const isLoadingLocationPreview =
    fetchLocationEssentialsBySlug &&
    !isLocationEssentialsError &&
    (isLoadingLocationEssentials || isFetchingLocationEssentials);

  useEffect(() => {
    let isMounted = true;

    if (previewData) {
      try {
        const clonedData = JSON.parse(JSON.stringify(previewData));
        if (isMounted) {
          setFormData(clonedData);
        }
      } catch (error) {
        console.error("Error cloning preview data:", error);
        if (isMounted) {
          setFormData(previewData);
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
  }, [currentVendorKey, previewVendorKey, hasMultipleLocations]);

  /** Keep persisted review state in sync with the current vendor's locations. */
  useEffect(() => {
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
  ]);

  const handlePreviewValuesChange = useCallback(
    (next: SiteEssentialsFormValues) => {
      setFormData(next);
      setPreviewData(next);
    },
    [setPreviewData],
  );

  const handleGoBack = () => {
    router.back();
  };

  const handleEdit = () => {
    const loc = locationList[safeLocationIndex];
    if (reviewStep === "location" && loc?.id) {
      switchLocation(loc.id);
    }
    router.back();
  };

  const handleApproveMain = () => {
    setMainPageApproved(true);
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

      if (options?.approveMain && !mainPageApproved) {
        setMainPageApproved(true);
      }
      setReviewStep("location");
      setCurrentLocationIndex(index);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return true;
    },
    [
      locationList,
      mainPageApproved,
      setMainPageApproved,
      setReviewStep,
      setCurrentLocationIndex,
    ],
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
    goToLocationPreview(locationList[0].slug);
  };

  const handlePreviewLocationFromGrid = (slug: string) =>
    goToLocationPreview(slug, { approveMain: true });

  const handleApproveCurrentLocation = () => {
    if (!currentSlug) return;
    approveLocationSlug(currentSlug);
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
      setCurrentLocationIndex(safeLocationIndex + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePreviousLocation = () => {
    if (safeLocationIndex > 0) {
      setCurrentLocationIndex(safeLocationIndex - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSave = useCallback(async () => {
    const ready = hasMultipleLocations
      ? mainPageApproved &&
        allPreviewLocationsApproved(locationList, safeApprovedSlugs)
      : allPreviewLocationsApproved(locationList, safeApprovedSlugs);

    if (!resolvedGlobalData || !ready) {
      return;
    }

    try {
      await saveSiteEssentials({
        ...toSiteEssentialsUpdatePayload(resolvedGlobalData),
        _method: "PATCH",
      } as Partial<SiteEssentialsFormValues> & { _method: "PATCH" });
      await queryClient.invalidateQueries({ queryKey: themeKeys.all });
      await queryClient.invalidateQueries({
        queryKey: siteEssentialsKeys.details(),
      });
      locationList.forEach((loc) => {
        queryClient.invalidateQueries({
          queryKey: siteEssentialsKeys.bySlug(loc.slug),
        });
      });
      try {
        setPreviewData(structuredClone(resolvedGlobalData));
      } catch {
        setPreviewData(JSON.parse(JSON.stringify(resolvedGlobalData)));
      }
      toast({
        title: "Saved",
        description: "Site essentials were updated successfully.",
      });
      router.back();
    } catch {
      toast({
        title: "Could not save",
        description:
          "Please try again from Site Essentials or fix any validation errors.",
        variant: "destructive",
      });
    }
  }, [
    resolvedGlobalData,
    hasMultipleLocations,
    mainPageApproved,
    locationList,
    safeApprovedSlugs,
    queryClient,
    router,
    saveSiteEssentials,
    setPreviewData,
    toast,
  ]);

  const handleSaveTheme = useCallback(async () => {
    const dataForSave = locationPreviewData ?? resolvedGlobalData;
    if (!dataForSave) return;
    try {
      await saveSiteEssentials({
        ...toSiteEssentialsUpdatePayload(dataForSave),
        _method: "PATCH",
      } as Partial<SiteEssentialsFormValues> & { _method: "PATCH" });
      await queryClient.invalidateQueries({ queryKey: themeKeys.all });
      await queryClient.invalidateQueries({
        queryKey: siteEssentialsKeys.details(),
      });
      router.refresh();
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
    queryClient,
    router,
    saveSiteEssentials,
    toast,
  ]);

  const previewValuesForCustomizer = locationPreviewData ?? resolvedGlobalData;

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

  if (!resolvedGlobalData) {
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

  return (
    <PreviewProvider isPreviewMode={true}>
      <div className="relative min-h-screen pb-[5.5rem] sm:pb-24">
        {hasMultipleLocations && effectiveReviewStep === "main" ? (
          <MainLandingSitePreview
            formValues={resolvedGlobalData}
            onLocationSelect={handlePreviewLocationFromGrid}
          />
        ) : isLoadingLocationPreview ||
          (effectiveReviewStep === "location" &&
            locationList.length === 0 &&
            isLoadingVenueLocations) ? (
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-[var(--color-background)] text-[var(--color-text)]">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
            <p className="text-sm text-[var(--color-text-dimmed)]">
              Loading {currentLocation?.city ?? "location"} preview…
            </p>
          </div>
        ) : locationPreviewData || effectiveReviewStep === "location" ? (
          <SitePreview formValues={locationPreviewData ?? resolvedGlobalData} />
        ) : (
          <SitePreview formValues={resolvedGlobalData} />
        )}

        {previewValuesForCustomizer ? (
          <PreviewThemeCustomizer
            values={previewValuesForCustomizer}
            onValuesChange={handlePreviewValuesChange}
            brandName={resolvedGlobalData.name?.trim() || "Site preview"}
            onSaveTheme={handleSaveTheme}
            isSavingTheme={isSaving}
            sheetDescription="Adjust colors or fonts. Approve each location page, then save."
          />
        ) : null}

        <div className="fixed top-4 left-4 z-[60] isolate">
          <Button
            variant="event-primary"
            onClick={handleGoBack}
            size="sm"
            className="shadow-md ring-1 ring-black/10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Editor
          </Button>
        </div>

        <SitePreviewReviewChrome
          hasMultipleLocations={hasMultipleLocations}
          reviewStep={effectiveReviewStep}
          mainPageApproved={mainPageApproved}
          previewLocations={locationList}
          currentLocationIndex={safeLocationIndex}
          approvedLocationSlugs={safeApprovedSlugs}
          isSaving={isSaving}
          isLoadingLocation={isLoadingLocationPreview}
          onEdit={handleEdit}
          onApproveMain={handleApproveMain}
          onApproveCurrentLocation={handleApproveCurrentLocation}
          onContinueFromMain={handleContinueFromMain}
          onNextLocation={handleNextLocation}
          onPreviousLocation={handlePreviousLocation}
          onSave={() => void handleSave()}
          onBackToMain={
            hasMultipleLocations
              ? () => {
                  setReviewStep("main");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              : undefined
          }
        />
      </div>
    </PreviewProvider>
  );
}
