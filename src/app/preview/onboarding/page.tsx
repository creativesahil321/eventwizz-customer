"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, Globe, Loader2, MapPin } from "lucide-react";
import { PreviewProvider } from "@/contexts/preview-context";
import { SitePreview } from "@/app/(protected)/_shared/sites-essentials/_components/site-preview";
import { MainLandingSitePreview } from "@/app/(protected)/_shared/sites-essentials/_components/main-landing-site-preview";
import {
  useSiteEssentialsQuery,
  useSiteEssentialsBySlugQuery,
} from "@/app/(protected)/_shared/sites-essentials/_lib/queries";
import { SiteEssentialsFormValues } from "@/app/(protected)/_shared/sites-essentials/_lib/schema";
import type { SiteEssentials } from "@/services/common/site-essentials/type";
import { EventPreview } from "@/app/(protected)/vendor/events/_components/event-preview";
import { EventDetailData } from "@/services/vendor/events/type";
import { useEventData } from "@/app/(protected)/vendor/events/_lib/hooks/useEventData";
import {
  resolvePreviewRoomsForFetch,
} from "@/app/(protected)/vendor/events/_lib/open-event-preview-tab";
import { mergeGlobalWithLocationSiteEssentials } from "@/app/(protected)/_shared/sites-essentials/_lib/merge-location-preview";
import { useSwitchLocation } from "@/app/(protected)/vendor/venue-locations/_lib/hooks";
import { useOnboardingPersistence } from "./_lib/use-onboarding-persistence";
import { normalizeStepOneFromApi } from "@/app/(on-boarding)/on-boarding/_components/form-provider/schema";
import { getHasMultipleLocationsChoiceFromPersistence } from "@/app/(on-boarding)/on-boarding/_components/form-provider/hydrate-onboarding-from-api";
import { useVendorLocationsList } from "@/app/(protected)/vendor/venue-locations/_lib/queries";
import { useToast } from "@/components/ui/use-toast";
import {
  OnboardingPreviewReviewChrome,
  type OnboardingPreviewTab,
} from "./_components/onboarding-preview-review-chrome";

/* ──────────────────────────── types ──────────────────────────── */
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

/* ──────────────────────────── loading shell ──────────────────── */
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
  const { data: session } = useSession();
  const { toast } = useToast();
  const { mutate: switchLocation } = useSwitchLocation();
  const { locations: venueLocations, isLoading: isLoadingVenueLocations } =
    useVendorLocationsList();

  /* ── persistence data (onboarding API) ── */
  const { persistenceData, isLoading: isLoadingPersistence } =
    useOnboardingPersistence();

  /* ── site essentials (global) ── */
  const { data: siteEssentialsFromApi, isLoading: isLoadingSiteEssentials } =
    useSiteEssentialsQuery();

  /* ── resolve flags from persistence ── */
  const hasMultipleLocations = useMemo(() => {
    const choice = getHasMultipleLocationsChoiceFromPersistence(persistenceData);
    if (choice === false) return false;
    if (choice === true) return true;

    if (venueLocations.length > 1) return true;

    if (persistenceData) {
      const locations = (persistenceData as Record<string, unknown>)
        .venue_locations;
      if (Array.isArray(locations) && locations.length > 1) return true;
    }

    return false;
  }, [persistenceData, venueLocations.length]);

  const eventId = useMemo(() => {
    if (!persistenceData) return undefined;
    const raw = persistenceData as Record<string, unknown>;
    const stepThree = raw.stepThree as Record<string, unknown> | undefined;
    const id =
      stepThree?.event_id ??
      (raw.stepFour as Record<string, unknown> | undefined)?.event_id ??
      (raw.stepFive as Record<string, unknown> | undefined)?.event_id;
    return id ? String(id) : undefined;
  }, [persistenceData]);

  const defaultLocationSlug = useMemo(() => {
    if (!persistenceData) return undefined;
    const raw = persistenceData as Record<string, unknown>;
    const defaultLoc = raw.default_venue_location as
      | Record<string, unknown>
      | undefined;
    return defaultLoc?.slug as string | undefined;
  }, [persistenceData]);

  const [selectedLocationSlug, setSelectedLocationSlug] = useState<
    string | undefined
  >();

  const activeLocationSlug = selectedLocationSlug ?? defaultLocationSlug;

  const isRooms = useMemo(() => {
    if (!persistenceData) return undefined;
    const raw = persistenceData as Record<string, unknown>;
    if (raw.is_rooms === true || raw.is_rooms === 1 || raw.is_rooms === "true")
      return true;
    if (
      raw.is_rooms === false ||
      raw.is_rooms === 0 ||
      raw.is_rooms === "false"
    )
      return false;
    return undefined;
  }, [persistenceData]);

  /* ── event data ── */
  const isRoomsForFetch = useMemo(() => {
    if (!eventId) return undefined;
    return resolvePreviewRoomsForFetch(eventId, isRooms ? "true" : "false");
  }, [eventId, isRooms]);

  const { eventData, isLoading: isLoadingEvent } = useEventData(
    eventId,
    isRoomsForFetch,
    { allowFetchInPreview: true, alwaysFresh: true },
  );

  /* ── location-specific site essentials ── */
  const { data: locationEssentialsFromApi } = useSiteEssentialsBySlugQuery(
    activeLocationSlug,
    Boolean(activeLocationSlug?.trim()),
  );

  /* ── resolved preview data ── */
  const globalPreviewData = useMemo<SiteEssentialsFormValues | null>(() => {
    // Start with API data, or initialize with defaults if not present
    let baseData: SiteEssentialsFormValues;
    if (siteEssentialsFromApi) {
      baseData = JSON.parse(JSON.stringify(siteEssentialsFromApi)) as SiteEssentialsFormValues;
    } else if (persistenceData) {
      baseData = {
        colors: {
          primary: "#4747d1",
          secondary: "#f4f4f5",
          header: "#ffffff",
          footer: "#f4f4f5",
          background: "#ffffff",
          surface: "#ffffff",
          text: "#17171c",
          textDimmed: "#71717a",
          socialLogin: { google: "#4285F4", microsoft: "#1877f2" },
        },
        typography: {
          fontFamily: {
            heading: "Space Grotesk, sans-serif",
            body: "Inter, sans-serif",
          },
          customFontStylesheetUrls: [],
          headingEmphasis: "uniform",
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
        copyright: `© ${new Date().getFullYear()} EventWizz. All rights reserved.`,
        logo: "",
        favicon: "",
        locations: [],
      };
    } else {
      return null;
    }

    if (!persistenceData) return baseData;

    const raw = persistenceData as Record<string, any>;

    // 1. Merge name
    const stepOne = raw.stepOne ? normalizeStepOneFromApi(raw.stepOne) : {};
    const name = (raw.name || stepOne.name || baseData.name || "").trim();
    if (name) baseData.name = name;

    // 2. Merge theme colors
    const theme = raw.default_theme || {};
    if (theme.colors) {
      baseData.colors = {
        ...baseData.colors,
        ...theme.colors,
        socialLogin: {
          ...(baseData.colors?.socialLogin || {}),
          ...(theme.colors.socialLogin || {}),
        },
      };
    }

    // 3. Merge theme typography
    if (theme.typography) {
      baseData.typography = {
        ...baseData.typography,
        ...theme.typography,
        fontFamily: {
          ...(baseData.typography?.fontFamily || {}),
          ...(theme.typography.fontFamily || {}),
        },
      };
    }

    // 4. Merge social links
    const socialLinks = raw.social_links || raw.socialLinks || {};
    baseData.socialLinks = {
      facebook: socialLinks.facebook || baseData.socialLinks?.facebook || "",
      twitter: socialLinks.twitter || baseData.socialLinks?.twitter || "",
      instagram: socialLinks.instagram || baseData.socialLinks?.instagram || "",
      linkedin: socialLinks.linkedin || baseData.socialLinks?.linkedin || "",
      youtube: socialLinks.youtube || baseData.socialLinks?.youtube || "",
    };

    // 5. Merge locations from venue_locations
    const venueLocations = raw.venue_locations;
    if (Array.isArray(venueLocations) && venueLocations.length > 0) {
      baseData.locations = venueLocations.map((loc: any) => ({
        id: loc.id,
        city: (loc.city?.trim() || loc.name?.trim() || loc.slug || "").trim(),
        slug: loc.slug?.trim() || "",
        cover_image: loc.cover_image || null,
        total_events: typeof loc.total_events === "number" ? loc.total_events : 0,
        latest_upcoming_event: loc.latest_upcoming_event ? {
          name: loc.latest_upcoming_event.name,
          date: loc.latest_upcoming_event.date,
        } : undefined,
      }));
    }

    // 6. Merge content fields from stepTwo if empty
    const stepTwo = raw.stepTwo || {};
    if (stepTwo.logo && !baseData.logo) {
      baseData.logo = stepTwo.logo;
    }
    if (stepTwo.cover_image && !baseData.cover_image) {
      baseData.cover_image = stepTwo.cover_image;
    }
    if (stepTwo.banner_heading && !baseData.banner_heading) {
      baseData.banner_heading = stepTwo.banner_heading;
    }
    if (stepTwo.banner_sub_heading && !baseData.banner_sub_heading) {
      baseData.banner_sub_heading = stepTwo.banner_sub_heading;
    }
    if (stepTwo.about_title && !baseData.about_title) {
      baseData.about_title = stepTwo.about_title;
    }
    if (stepTwo.about_description && !baseData.about_description) {
      baseData.about_description = stepTwo.about_description;
    }

    // Copy to main landing page fields for multi-location fallback
    if (baseData.banner_heading && !baseData.main_landing_banner_heading) {
      baseData.main_landing_banner_heading = baseData.banner_heading;
    }
    if (baseData.banner_sub_heading && !baseData.main_landing_banner_sub_heading) {
      baseData.main_landing_banner_sub_heading = baseData.banner_sub_heading;
    }
    if (baseData.cover_image && !baseData.main_landing_cover_image) {
      baseData.main_landing_cover_image = baseData.cover_image;
    }

    return baseData;
  }, [siteEssentialsFromApi, persistenceData]);

  const resolveLocationMeta = useCallback(
    (slug: string | undefined) => {
      if (!slug?.trim()) {
        return { label: "Location", id: undefined as number | undefined };
      }

      const fromGlobal = globalPreviewData?.locations?.find(
        (loc) => loc.slug === slug,
      );
      const fromVenue = venueLocations.find((loc) => loc.slug === slug);
      const fromPersistence = (
        (persistenceData as Record<string, unknown> | null)?.venue_locations as
          | Array<Record<string, unknown>>
          | undefined
      )?.find((loc) => loc.slug === slug);

      const label =
        fromGlobal?.city?.trim() ||
        fromVenue?.city?.trim() ||
        fromVenue?.name?.trim() ||
        (fromPersistence?.city as string | undefined)?.trim() ||
        (fromPersistence?.name as string | undefined)?.trim() ||
        slug;

      const id =
        fromVenue?.id ??
        (typeof fromPersistence?.id === "number"
          ? fromPersistence.id
          : Number(fromPersistence?.id));

      return {
        label,
        id: Number.isFinite(id) && id > 0 ? id : undefined,
      };
    },
    [globalPreviewData?.locations, venueLocations, persistenceData],
  );

  const activeLocationMeta = useMemo(
    () => resolveLocationMeta(activeLocationSlug),
    [resolveLocationMeta, activeLocationSlug],
  );

  const locationPreviewData = useMemo<SiteEssentialsFormValues | null>(() => {
    if (!globalPreviewData) return null;

    const apiForLocation = locationEssentialsFromApi ?? siteEssentialsFromApi;
    if (apiForLocation) {
      return mergeGlobalWithLocationSiteEssentials(
        globalPreviewData,
        apiForLocation as SiteEssentials,
        activeLocationMeta.label,
        {
          isSingleLocation: !hasMultipleLocations,
          previewSlug: activeLocationSlug,
        },
      );
    }

    return globalPreviewData;
  }, [
    globalPreviewData,
    locationEssentialsFromApi,
    siteEssentialsFromApi,
    hasMultipleLocations,
    activeLocationSlug,
    activeLocationMeta.label,
  ]);

  /* ── tab state ── */
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
  const hasInitializedReviewRef = useRef(false);
  const prevHasMultipleLocationsRef = useRef<boolean | null>(null);

  const reviewSteps = hasMultipleLocations
    ? REVIEW_STEPS.multi
    : REVIEW_STEPS.single;

  const locationLabel = activeLocationMeta.label;

  useEffect(() => {
    if (defaultLocationSlug && !selectedLocationSlug) {
      setSelectedLocationSlug(defaultLocationSlug);
    }
  }, [defaultLocationSlug, selectedLocationSlug]);

  const eventLabel = useMemo(() => {
    const detail = eventData?.data as EventDetailData | undefined;
    const fromEvent = detail?.stepOne?.event_name?.trim();
    if (fromEvent) return fromEvent;

    const stepOne = (persistenceData as Record<string, unknown> | null)
      ?.stepOne as { event_name?: string } | undefined;
    return stepOne?.event_name?.trim() || "Event";
  }, [eventData?.data, persistenceData]);

  const isLocationScopeReady = useMemo(() => {
    if (isLoadingPersistence) return false;

    const choice = getHasMultipleLocationsChoiceFromPersistence(persistenceData);
    if (choice !== null) return true;

    const persistedVenueLocations = (
      persistenceData as Record<string, unknown> | null
    )?.venue_locations;
    if (
      Array.isArray(persistedVenueLocations) &&
      persistedVenueLocations.length > 0
    ) {
      return true;
    }

    return !isLoadingVenueLocations;
  }, [isLoadingPersistence, persistenceData, isLoadingVenueLocations]);

  useEffect(() => {
    if (!isLocationScopeReady) return;

    const prevMulti = prevHasMultipleLocationsRef.current;
    prevHasMultipleLocationsRef.current = hasMultipleLocations;

    if (!hasInitializedReviewRef.current) {
      hasInitializedReviewRef.current = true;
      if (hasMultipleLocations) {
        setActiveTab("main-landing");
        setApproved(EMPTY_APPROVAL_STATE);
      } else {
        setActiveTab("location");
        setApproved({ ...EMPTY_APPROVAL_STATE, "main-landing": true });
      }
      return;
    }

    // Venue list can load after persistence — undo mistaken single-location init.
    if (prevMulti === false && hasMultipleLocations) {
      setActiveTab("main-landing");
      setApproved(EMPTY_APPROVAL_STATE);
    }
  }, [isLocationScopeReady, hasMultipleLocations]);

  useEffect(() => {
    if (!availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0]);
    }
  }, [availableTabs, activeTab]);

  /* ── navigation handlers ── */
  const handleContinue = useCallback(() => {
    router.push("/welcome/select-location?onboarded=true");
  }, [router]);

  const handleTabChange = useCallback((tab: PreviewTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handlePreviewLocationFromGrid = useCallback(
    (slug: string) => {
      const normalized = slug.trim();
      if (!normalized) return false;

      const existsInPreview =
        globalPreviewData?.locations?.some((loc) => loc.slug === normalized) ||
        venueLocations.some((loc) => loc.slug === normalized);

      if (!existsInPreview) return false;

      setSelectedLocationSlug(normalized);
      setApproved((prev) => ({ ...prev, "main-landing": true }));
      setActiveTab("location");

      const { id } = resolveLocationMeta(normalized);
      if (id) {
        switchLocation(id);
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
      return true;
    },
    [
      globalPreviewData?.locations,
      venueLocations,
      resolveLocationMeta,
      switchLocation,
    ],
  );

  const ensureLocationSlugForReview = useCallback(() => {
    if (activeLocationSlug?.trim()) return activeLocationSlug;
    const firstSlug =
      globalPreviewData?.locations?.find((loc) => loc.slug?.trim())?.slug ||
      venueLocations.find((loc) => loc.slug?.trim())?.slug;
    if (firstSlug) {
      setSelectedLocationSlug(firstSlug);
      return firstSlug;
    }
    return undefined;
  }, [activeLocationSlug, globalPreviewData?.locations, venueLocations]);

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
      if (nextTab === "location") {
        ensureLocationSlugForReview();
      }
      setActiveTab(nextTab);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [
    activeTab,
    approved,
    ensureLocationSlugForReview,
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
      if (activeLocationMeta.id) {
        switchLocation(activeLocationMeta.id);
      }
      router.push("/vendor/sites-essentials");
    } else if (activeTab === "event") {
      if (eventId) {
        router.push(`/vendor/events/${eventId}`);
      } else {
        router.push("/vendor/events");
      }
    }
  }, [activeTab, router, eventId, activeLocationMeta.id, switchLocation]);

  /* ── loading state ── */
  const isInitialLoading =
    isLoadingPersistence ||
    isLoadingSiteEssentials ||
    !isLocationScopeReady;

  if (isInitialLoading) {
    return <OnboardingPreviewLoadingShell />;
  }

  /* ── no data fallback ── */
  if (!globalPreviewData && !eventData?.data) {
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
    <PreviewProvider isPreviewMode={true}>
      <div className="min-h-screen bg-white pb-28 sm:pb-32">
        <div className="min-h-screen">
          {/* Main Landing Page */}
          {activeTab === "main-landing" && globalPreviewData && (
            <MainLandingSitePreview
              formValues={globalPreviewData}
              onLocationSelect={handlePreviewLocationFromGrid}
            />
          )}

          {/* Location Page */}
          {activeTab === "location" && (
            <>
              {locationPreviewData ? (
                <SitePreview formValues={locationPreviewData} />
              ) : globalPreviewData ? (
                <SitePreview formValues={globalPreviewData} />
              ) : (
                <div className="flex items-center justify-center min-h-[60vh]">
                  <Loader2 className="h-8 w-8 text-gray-300 animate-spin" />
                </div>
              )}
            </>
          )}

          {/* Event Page */}
          {activeTab === "event" && (
            <>
              {isLoadingEvent ? (
                <div className="flex items-center justify-center min-h-[60vh]">
                  <Loader2 className="h-8 w-8 text-gray-300 animate-spin" />
                </div>
              ) : eventData?.data ? (
                <EventPreview
                  data={eventData.data as EventDetailData}
                  siteEssentials={
                    (siteEssentialsFromApi as unknown as SiteEssentialsFormValues) ?? null
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
        </div>

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
