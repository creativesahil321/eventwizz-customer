"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, Globe, Loader2, MapPin } from "lucide-react";
import { PreviewProvider } from "@/contexts/preview-context";
import { PreviewDeviceToolbar } from "@/components/preview/preview-device-toolbar";
import { PreviewDeviceFrame } from "@/components/preview/preview-device-frame";
import { SitePreview } from "@/app/(protected)/_shared/sites-essentials/_components/site-preview";
import { MainLandingSitePreview } from "@/app/(protected)/_shared/sites-essentials/_components/main-landing-site-preview";
import { SiteEssentialsFormValues } from "@/app/(protected)/_shared/sites-essentials/_lib/schema";
import { EventPreview } from "@/app/(protected)/vendor/events/_components/event-preview";
import { EventDetailData } from "@/services/vendor/events/type";
import { useToast } from "@/components/ui/use-toast";
import {
  useOnboardingPreviewMainQuery,
  useOnboardingPreviewLocationQuery,
  useOnboardingPreviewEventQuery,
} from "./_lib/use-onboarding-preview-queries";
import { mapOnboardingEventToDetailData } from "./_lib/map-onboarding-event-to-detail";
import {
  OnboardingPreviewReviewChrome,
  type OnboardingPreviewTab,
} from "./_components/onboarding-preview-review-chrome";

/* ──────────────────────────── types & constants ──────────────────────────── */
type PreviewTab = OnboardingPreviewTab;

const REVIEW_STEPS = {
  multi: ["main-landing", "location", "event"] as PreviewTab[],
  single: ["location", "event"] as PreviewTab[],
};

const EMPTY_APPROVAL_STATE: Record<PreviewTab, boolean> = {
  "main-landing": false,
  location: false,
  event: false,
};

/* ──────────────────────────── loading shell ──────────────────────────── */
function OnboardingPreviewLoadingShell() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 text-gray-300 animate-spin" />
        <p className="text-gray-400 text-sm">Preparing your site preview…</p>
      </div>
    </div>
  );
}

/* ──────────────────────────── tab config ─────────────────────── */
const TAB_META: Record<
  PreviewTab,
  { label: string; shortLabel: string; icon: React.ReactNode }
> = {
  "main-landing": {
    label: "Main Landing Page",
    shortLabel: "Landing",
    icon: <Globe className="h-3.5 w-3.5" />,
  },
  location: {
    label: "Location Page",
    shortLabel: "Location",
    icon: <MapPin className="h-3.5 w-3.5" />,
  },
  event: {
    label: "Event Page",
    shortLabel: "Event",
    icon: <Calendar className="h-3.5 w-3.5" />,
  },
};

/* ──────────────────────────── entry ──────────────────────────── */
export default function OnboardingPreviewPage() {
  return (
    <Suspense fallback={<OnboardingPreviewLoadingShell />}>
      <OnboardingPreviewContent />
    </Suspense>
  );
}

/* ──────────────────────────── main content ───────────────────── */
function OnboardingPreviewContent() {
  const router = useRouter();
  const { toast } = useToast();

  /* ── API: Main Landing (also provides locations list, multi-location flag) ── */
  const { data: mainData, isLoading: isLoadingMain } =
    useOnboardingPreviewMainQuery();

  /* ── Derive multi-location + default location slug from API response ── */
  const hasMultipleLocations = useMemo(() => {
    if (!mainData?.locations) return false;
    return mainData.locations.length > 1;
  }, [mainData?.locations]);

  const defaultLocationSlug = useMemo(() => {
    if (!mainData?.locations?.length) return undefined;
    return mainData.locations[0]?.slug;
  }, [mainData?.locations]);

  const [selectedLocationSlug, setSelectedLocationSlug] = useState<
    string | undefined
  >();
  const activeLocationSlug = selectedLocationSlug ?? defaultLocationSlug;

  /* ── Derive event slug from location API response ── */
  const [activeEventSlug, setActiveEventSlug] = useState<string | undefined>();

  /* ── API: Location Page — only fetch when user reaches location tab ── */
  const [hasVisitedLocationTab, setHasVisitedLocationTab] = useState(false);
  const { data: locationData, isLoading: isLoadingLocation } =
    useOnboardingPreviewLocationQuery(
      activeLocationSlug,
      hasVisitedLocationTab && Boolean(activeLocationSlug?.trim()),
    );

  const eventSlugFromLocation = useMemo(() => {
    if (activeEventSlug) return activeEventSlug;
    const firstEvent =
      locationData?.latest_events?.[0] ?? locationData?.upcoming_events?.[0];
    return firstEvent?.slug;
  }, [locationData, activeEventSlug]);

  /* ── API: Event Page — only fetch when user navigates to event tab ── */
  const [hasVisitedEventTab, setHasVisitedEventTab] = useState(false);
  const { data: eventApiData, isLoading: isLoadingEvent } =
    useOnboardingPreviewEventQuery(
      eventSlugFromLocation,
      hasVisitedEventTab && Boolean(eventSlugFromLocation?.trim()),
    );

  /* ── Transform event API data into EventDetailData ── */
  const eventDetailData = useMemo<EventDetailData | null>(() => {
    if (!eventApiData) return null;
    return mapOnboardingEventToDetailData(eventApiData);
  }, [eventApiData]);

  /* ── Site essentials as form values (for MainLanding & SitePreview) ── */
  const mainPreviewData = mainData as SiteEssentialsFormValues | undefined;
  const locationPreviewData = locationData as
    | SiteEssentialsFormValues
    | undefined;

  /* ── Location label ── */
  const locationLabel = useMemo(() => {
    if (!activeLocationSlug || !mainData?.locations) return "Location";
    const loc = mainData.locations.find(
      (l) => l.slug === activeLocationSlug,
    );
    return loc?.city?.trim() || "Location";
  }, [activeLocationSlug, mainData?.locations]);

  /* ── Event label ── */
  const eventLabel = useMemo(() => {
    return eventApiData?.event?.event_name?.trim() || "Event";
  }, [eventApiData?.event?.event_name]);

  /* ── Tab state ── */
  const availableTabs = useMemo<PreviewTab[]>(() => {
    const tabs: PreviewTab[] = [];
    if (hasMultipleLocations) tabs.push("main-landing");
    tabs.push("location");
    tabs.push("event");
    return tabs;
  }, [hasMultipleLocations]);

  const [activeTab, setActiveTab] = useState<PreviewTab>("main-landing");
  const [approved, setApproved] =
    useState<Record<PreviewTab, boolean>>(EMPTY_APPROVAL_STATE);
  const hasInitializedRef = useRef(false);

  const reviewSteps = hasMultipleLocations
    ? REVIEW_STEPS.multi
    : REVIEW_STEPS.single;

  /* ── Initialize tab once data arrives ── */
  useEffect(() => {
    if (isLoadingMain || hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    if (hasMultipleLocations) {
      setActiveTab("main-landing");
      setApproved(EMPTY_APPROVAL_STATE);
    } else {
      setActiveTab("location");
      setHasVisitedLocationTab(true);
      setApproved({ ...EMPTY_APPROVAL_STATE, "main-landing": true });
    }
  }, [isLoadingMain, hasMultipleLocations]);

  useEffect(() => {
    if (!availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0]);
    }
  }, [availableTabs, activeTab]);

  /* ── Navigation handlers ── */
  const handleContinue = useCallback(() => {
    router.push("/welcome/select-location?onboarded=true");
  }, [router]);

  const handleTabChange = useCallback((tab: PreviewTab) => {
    if (tab === "location") setHasVisitedLocationTab(true);
    if (tab === "event") setHasVisitedEventTab(true);
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handlePreviewLocationFromGrid = useCallback(
    (slug: string) => {
      if (!slug.trim()) return false;
      setSelectedLocationSlug(slug);
      setHasVisitedLocationTab(true);
      setApproved((prev) => ({ ...prev, "main-landing": true }));
      setActiveTab("location");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return true;
    },
    [],
  );

  const handlePreviewEventFromCard = useCallback((eventSlug: string) => {
    if (!eventSlug.trim()) return;
    setActiveEventSlug(eventSlug);
    setHasVisitedEventTab(true);
    setApproved((prev) => ({ ...prev, location: true }));
    setActiveTab("event");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handlePrimaryAction = useCallback(() => {
    const stepIndex = reviewSteps.indexOf(activeTab);
    const isLastStep = stepIndex === reviewSteps.length - 1;
    const alreadyApproved = approved[activeTab];

    if (!alreadyApproved) {
      setApproved((prev) => ({ ...prev, [activeTab]: true }));

      const toastTitle =
        activeTab === "main-landing"
          ? "Main landing approved"
          : activeTab === "location"
            ? `${locationLabel} approved`
            : `${eventLabel} approved`;

      const nextStep = reviewSteps[stepIndex + 1];
      const toastDescription = isLastStep
        ? "You can continue to your dashboard."
        : nextStep === "location"
          ? `Next, review your ${locationLabel} page.`
          : nextStep === "event"
            ? "Next, review your event page."
            : "Continue to the next page.";

      toast({ title: toastTitle, description: toastDescription });
    }

    if (isLastStep) {
      handleContinue();
      return;
    }

    const nextTab = reviewSteps[stepIndex + 1];
    if (nextTab) {
      if (nextTab === "location") setHasVisitedLocationTab(true);
      if (nextTab === "event") setHasVisitedEventTab(true);
      setActiveTab(nextTab);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [
    activeTab,
    approved,
    eventLabel,
    handleContinue,
    locationLabel,
    reviewSteps,
    toast,
  ]);

  const handleEdit = useCallback(() => {
    if (activeTab === "main-landing") {
      router.push("/vendor/sites-essentials");
    } else if (activeTab === "location") {
      router.push("/vendor/sites-essentials");
    } else if (activeTab === "event") {
      router.push("/vendor/events");
    }
  }, [activeTab, router]);

  const previewLocationOptions = useMemo(() => {
    if (!hasMultipleLocations || !mainData?.locations?.length) return undefined;
    return mainData.locations
      .filter((loc) => typeof loc.slug === "string" && loc.slug.trim().length > 0)
      .map((loc) => ({
        id: loc.id,
        slug: loc.slug.trim(),
        city: loc.city?.trim() || loc.slug,
      }));
  }, [hasMultipleLocations, mainData?.locations]);

  /* ── Loading state ── */
  if (isLoadingMain) {
    return <OnboardingPreviewLoadingShell />;
  }

  if (!mainPreviewData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white p-4">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Preview Unavailable
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            We couldn't load your site preview. You can continue to the
            dashboard and edit your pages there.
          </p>
          <Button
            type="button"
            size="sm"
            onClick={handleContinue}
            className="gap-1.5 bg-slate-900 text-white hover:bg-slate-800"
          >
            Continue to Dashboard
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <PreviewProvider
      isPreviewMode={true}
      onEventSelect={handlePreviewEventFromCard}
      previewLocations={previewLocationOptions}
      activePreviewLocationSlug={
        activeTab === "location" ? activeLocationSlug : undefined
      }
      onPreviewLocationSelect={
        hasMultipleLocations ? handlePreviewLocationFromGrid : undefined
      }
    >
      <div className="flex min-h-screen flex-col bg-slate-900 pb-28 sm:pb-32">
        <div className="fixed inset-x-0 top-4 z-[60] flex justify-center px-4">
          <PreviewDeviceToolbar />
        </div>
        <PreviewDeviceFrame
          stageClassName="min-h-screen items-stretch bg-slate-900 px-2 pb-8 pt-16 sm:px-4"
          frameClassName="min-h-[calc(100vh-4rem)]"
        >
          {/* Main Landing Page */}
          {activeTab === "main-landing" && mainPreviewData && (
            <MainLandingSitePreview
              formValues={mainPreviewData}
              onLocationSelect={handlePreviewLocationFromGrid}
            />
          )}

          {/* Location Page */}
          {activeTab === "location" && (
            <>
              {isLoadingLocation && !locationPreviewData ? (
                <div className="flex items-center justify-center min-h-[60vh]">
                  <Loader2 className="h-8 w-8 text-gray-300 animate-spin" />
                </div>
              ) : locationPreviewData ? (
                <SitePreview formValues={locationPreviewData} />
              ) : mainPreviewData ? (
                <SitePreview formValues={mainPreviewData} />
              ) : null}
            </>
          )}

          {/* Event Page */}
          {activeTab === "event" && (
            <>
              {isLoadingEvent && !eventDetailData ? (
                <div className="flex items-center justify-center min-h-[60vh]">
                  <Loader2 className="h-8 w-8 text-gray-300 animate-spin" />
                </div>
              ) : eventDetailData ? (
                <EventPreview
                  data={eventDetailData}
                  siteEssentials={
                    (locationPreviewData ?? mainPreviewData) as
                      | SiteEssentialsFormValues
                      | undefined
                  }
                />
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
                  <Calendar className="h-12 w-12 text-gray-200 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    Event Preview Unavailable
                  </h3>
                  <p className="text-gray-400 text-sm text-center max-w-sm">
                    Your event data couldn't be loaded. You can view and edit
                    your event from the dashboard.
                  </p>
                </div>
              )}
            </>
          )}
        </PreviewDeviceFrame>

        <OnboardingPreviewReviewChrome
          hasMultipleLocations={hasMultipleLocations}
          activeTab={activeTab}
          availableTabs={availableTabs}
          approved={approved}
          tabMeta={TAB_META}
          locationLabel={locationLabel}
          eventLabel={eventLabel}
          onTabChange={handleTabChange}
          onEdit={handleEdit}
          onPrimaryAction={handlePrimaryAction}
        />
      </div>
    </PreviewProvider>
  );
}
