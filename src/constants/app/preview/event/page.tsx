"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Loader2, Rocket } from "lucide-react";
import { EventPreview } from "@/app/(protected)/vendor/events/_components/event-preview";
import { Skeleton } from "@/components/ui/skeleton";
import { EventDetailData } from "@/services/vendor/events/type";
import { useEventData } from "@/app/(protected)/vendor/events/_lib/hooks/useEventData";
import {
  subscribeVendorEventIsRoomsFlag,
} from "@/app/(protected)/vendor/events/_lib/vendor-event-is-rooms";
import {
  getEventPreviewUrl,
  parsePreviewRoomsSearchParam,
  resolvePreviewRoomsForFetch,
} from "@/app/(protected)/vendor/events/_lib/open-event-preview-tab";
import { eventsService } from "@/services/vendor/events/events.service";
import { stepEightSchema } from "@/app/(protected)/vendor/events/_components/tab-event-form/schema";
import { useSitePreviewStore } from "@/store/site-preview.store";
import { PreviewProvider } from "@/contexts/preview-context";
import {
  siteEssentialsKeys,
  useSiteEssentialsMutation,
  useSiteEssentialsQuery,
} from "@/app/(protected)/_shared/sites-essentials/_lib/queries";
import { SiteEssentialsFormValues } from "@/app/(protected)/_shared/sites-essentials/_lib/schema";
import { PreviewThemeCustomizer } from "@/components/preview/preview-theme-customizer";
import { themeKeys } from "@/hooks/use-theme-query";
import { useToast } from "@/components/ui/use-toast";

function EventPreviewPageLoadingShell() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function EventPreviewPage() {
  return (
    <Suspense fallback={<EventPreviewPageLoadingShell />}>
      <EventPreviewPageContent />
    </Suspense>
  );
}

function EventPreviewPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { mutateAsync: saveSiteEssentials, isPending: isSavingTheme } =
    useSiteEssentialsMutation();

  const eventId = searchParams.get("id");
  const urlRoomsParam = searchParams.get("rooms");
  const [isRoomsForFetch, setIsRoomsForFetch] = useState<boolean | undefined>(
    () => {
      if (!eventId || !/^\d+$/.test(eventId)) return undefined;
      return resolvePreviewRoomsForFetch(eventId, urlRoomsParam);
    },
  );

  useEffect(() => {
    if (!eventId || !/^\d+$/.test(eventId)) return;

    const resolved = resolvePreviewRoomsForFetch(eventId, urlRoomsParam);
    setIsRoomsForFetch(resolved);

    if (typeof resolved === "boolean") {
      const urlValue = parsePreviewRoomsSearchParam(urlRoomsParam);
      if (urlValue !== resolved) {
        router.replace(getEventPreviewUrl(eventId, resolved), { scroll: false });
      }
    }
  }, [eventId, urlRoomsParam, router]);

  useEffect(() => {
    if (!eventId || !/^\d+$/.test(eventId)) return;

    return subscribeVendorEventIsRoomsFlag(eventId, (next) => {
      setIsRoomsForFetch(next);
      router.replace(getEventPreviewUrl(eventId, next), { scroll: false });
    });
  }, [eventId, router]);

  const { eventData, isLoading, invalidateCache, refetch } = useEventData(
    eventId || undefined,
    isRoomsForFetch,
    { allowFetchInPreview: true, alwaysFresh: true },
  );

  const prevRoomsForFetchRef = useRef<boolean | undefined>(undefined);

  // Room mode changed (URL, storage, or editor toggle) → fresh persistence GET.
  useEffect(() => {
    if (!eventId || !/^\d+$/.test(eventId)) return;
    if (typeof isRoomsForFetch !== "boolean") return;

    if (prevRoomsForFetchRef.current === undefined) {
      prevRoomsForFetchRef.current = isRoomsForFetch;
      return;
    }

    if (prevRoomsForFetchRef.current === isRoomsForFetch) return;

    prevRoomsForFetchRef.current = isRoomsForFetch;
    void refetch();
  }, [eventId, isRoomsForFetch, refetch]);

  useEffect(() => {
    const onPersistenceChanged = () => {
      void refetch();
    };
    window.addEventListener("event-data-changed", onPersistenceChanged);
    return () =>
      window.removeEventListener("event-data-changed", onPersistenceChanged);
  }, [refetch]);

  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Get site essentials from Zustand store (populated after save or preview click)
  const { previewData: storeSiteEssentials, setPreviewData } =
    useSitePreviewStore();

  // Fetch from API as a fallback for vendors who haven't interacted with the
  // site essentials form in the current session (store would be empty)
  const { data: apiSiteEssentials } = useSiteEssentialsQuery();

  // Prefer the store (reflects unsaved in-progress edits); fall back to the
  // API response so that already-saved colors always show in the preview
  const baseSiteEssentials: SiteEssentialsFormValues | null =
    storeSiteEssentials ??
    (apiSiteEssentials as SiteEssentialsFormValues | null) ??
    null;

  const [themeTweak, setThemeTweak] = useState<SiteEssentialsFormValues | null>(
    null,
  );

  const siteEssentials: SiteEssentialsFormValues | null = useMemo(() => {
    return themeTweak ?? baseSiteEssentials;
  }, [themeTweak, baseSiteEssentials]);

  useEffect(() => {
    setThemeTweak(null);
  }, [eventId]);

  /** Match site preview: persist Try theme tweaks so Site Essentials / site preview stay in sync. */
  const handleThemeValuesChange = useCallback(
    (next: SiteEssentialsFormValues) => {
      setThemeTweak(next);
      setPreviewData(next);
    },
    [setPreviewData],
  );

  const handleGoBack = () => {
    if (eventId && /^\d+$/.test(eventId)) {
      router.push(`/vendor/events/${eventId}`);
      return;
    }
    router.back();
  };

  /** Persist current preview theme (colors, fonts, hero align) like Site Essentials → Save. */
  const handleSaveTheme = async () => {
    if (!siteEssentials) return;
    try {
      await saveSiteEssentials({
        ...siteEssentials,
        _method: "PATCH",
      } as Partial<SiteEssentialsFormValues> & { _method: "PATCH" });
      await queryClient.invalidateQueries({ queryKey: themeKeys.all });
      await queryClient.invalidateQueries({
        queryKey: siteEssentialsKeys.details(),
      });
      try {
        setPreviewData(structuredClone(siteEssentials));
      } catch {
        setPreviewData(JSON.parse(JSON.stringify(siteEssentials)));
      }
      setThemeTweak(null);
      router.refresh();
      toast({
        title: "Theme saved",
        description:
          "Site Essentials were updated. Live site and previews will use these colors and fonts.",
      });
    } catch {
      toast({
        title: "Could not save theme",
        description:
          "Open Site Essentials and use Save there, or try again in a moment.",
        variant: "destructive",
      });
    }
  };

  const eventPayloadRoot = eventData?.data as EventDetailData | undefined;
  const isEventCancelled =
    eventPayloadRoot &&
    typeof eventPayloadRoot === "object" &&
    "status" in eventPayloadRoot &&
    typeof (eventPayloadRoot as { status: string }).status === "string"
      ? (eventPayloadRoot as { status: string }).status === "cancelled"
      : false;

  const handlePublishEvent = async () => {
    if (!eventId || !/^\d+$/.test(eventId) || !eventPayloadRoot) {
      toast({
        title: "Cannot publish",
        description:
          "Event data is not loaded. Go back to the editor and try again.",
        variant: "destructive",
      });
      return;
    }
    if (isEventCancelled) {
      toast({
        title: "Event is cancelled",
        description: "Cancelled events cannot be published.",
        variant: "destructive",
      });
      return;
    }

    const numericId = parseInt(eventId, 10);
    const stepEventId = eventPayloadRoot.stepOne?.event_id ?? numericId;

    const stepEightPayload = {
      step: 8 as const,
      event_id: Number(stepEventId),
      reminder_email_before_days:
        eventPayloadRoot.stepEight?.reminder_email_before_days ?? 10,
      submit_type: "active" as const,
      is_duplicate: false,
    };

    const parsed = stepEightSchema.safeParse(stepEightPayload);
    if (!parsed.success) {
      toast({
        title: "Cannot publish from preview",
        description:
          "Complete the Publish tab in the event editor (e.g. duplicate location fields) and submit from there.",
        variant: "destructive",
      });
      setPublishDialogOpen(false);
      return;
    }

    setIsPublishing(true);
    try {
      const response = await eventsService.storeStepEightData(parsed.data);
      if (response?.status) {
        invalidateCache?.();
        setPublishDialogOpen(false);
        toast({
          title: "Event published",
          description:
            "Your event was submitted as live. Redirecting to events…",
        });
        router.push("/vendor/events");
      } else {
        toast({
          title: "Publish failed",
          description:
            response?.message ||
            "Use the Publish tab in the editor to fix any issues and try again.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Publish failed",
        description: "Use the Publish tab in the editor or try again shortly.",
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-50 min-h-screen text-black">
        {/* Header Skeleton */}
        <div className="fixed top-0 left-0 right-0 bg-white border-b z-50 shadow-sm px-4 py-3 flex justify-between items-center text-black">
          <div className="flex items-center space-x-3">
            <Button variant="event-primary" onClick={handleGoBack} size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Editor
            </Button>
            <div className="h-6 w-[1px] bg-gray-200 mx-2"></div>
            <Skeleton className="h-4 w-40" />
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="pt-16">
          <div className="w-full">
            {/* Website Header Skeleton */}
            <div className="w-full flex justify-between items-center mb-6 p-4 border-b">
              <Skeleton className="h-10 w-32" /> {/* Logo */}
              <div className="flex space-x-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>

            {/* Hero Section Skeleton */}
            <div className="w-full aspect-[21/9] relative mb-8">
              <Skeleton className="h-full w-full absolute" />
              <div className="absolute inset-0 flex flex-col justify-center items-center p-6">
                <Skeleton className="h-10 w-3/4 max-w-md mb-4" />
                <Skeleton className="h-6 w-2/3 max-w-sm" />
              </div>
            </div>

            {/* Content Blocks */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 px-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col">
                  <Skeleton className="h-40 w-full mb-4" />
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-5/6 mb-2" />
                  <Skeleton className="h-4 w-4/6" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-2 flex justify-center">
          <p className="text-xs text-gray-500">Preview Mode • Desktop View</p>
        </div>
      </div>
    );
  }

  if (!eventData?.data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <h1 className="text-2xl font-bold mb-4">No Preview Data Available</h1>
        <p className="text-gray-500 mb-6 text-center">
          Please go back to the Event page and click the Preview button.
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
      <div className="relative min-h-screen">
        {/* Event Preview - Full screen without any wrapper controls */}
        <EventPreview
          data={eventData.data as EventDetailData}
          siteEssentials={siteEssentials}
        />

        {siteEssentials ? (
          <PreviewThemeCustomizer
            values={siteEssentials}
            onValuesChange={handleThemeValuesChange}
            brandName={siteEssentials.name?.trim() || "Event preview"}
            sheetDescription="Open Try theme to adjust fonts, colors, and hero layout. Save theme in that panel writes Site Essentials. Use Publish event (top right) to go live — same as the Publish tab. Event copy still saves in the editor."
            onSaveTheme={handleSaveTheme}
            isSavingTheme={isSavingTheme}
          />
        ) : null}

        <AlertDialog
          open={publishDialogOpen}
          onOpenChange={setPublishDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Publish this event?</AlertDialogTitle>
              <AlertDialogDescription>
                This uses the same action as the editor&apos;s Publish tab: the
                event will be submitted as{" "}
                <span className="font-medium text-foreground">live</span>{" "}
                (reminder email settings from your last saved publish step
                apply). You can still edit the event later from Events.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPublishing}>
                Cancel
              </AlertDialogCancel>
              <Button
                type="button"
                variant="event-primary"
                disabled={isPublishing}
                onClick={() => void handlePublishEvent()}
              >
                {isPublishing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Publish now
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="pointer-events-none fixed left-4 right-4 top-4 z-[60] flex flex-wrap items-start justify-between gap-3 isolate sm:right-6 sm:left-6">
          <Button
            variant="event-primary"
            onClick={handleGoBack}
            size="sm"
            className="pointer-events-auto shrink-0 shadow-md ring-1 ring-black/10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Editor
          </Button>
          <div className="pointer-events-auto flex shrink-0 items-center justify-end">
            <Button
              type="button"
              variant="event-primary"
              size="sm"
              disabled={!eventPayloadRoot || isEventCancelled || isPublishing}
              onClick={() => setPublishDialogOpen(true)}
              className="shadow-md ring-1 ring-black/10"
            >
              <Rocket className="mr-2 h-4 w-4" />
              Publish event
            </Button>
          </div>
        </div>
      </div>
    </PreviewProvider>
  );
}
