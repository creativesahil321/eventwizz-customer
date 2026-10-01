"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { ArrowLeft, Loader2, Rocket, RotateCcw, Save } from "lucide-react";
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
import { hydrateMenuChoicesReminderDays } from "@/app/(protected)/vendor/events/_lib/menu-choices-reminder-days";
import { PreviewProvider } from "@/contexts/preview-context";
import { EVENT_PREVIEW_REVIEW_CHROME_CLASSNAME } from "@/app/preview/event/event-preview-review-chrome";
import { useEventPreviewSiteEssentials } from "@/app/(protected)/_shared/sites-essentials/_lib/use-event-preview-site-essentials";
import { SiteEssentialsFormValues } from "@/app/(protected)/_shared/sites-essentials/_lib/schema";
import { toast } from "sonner";
import {
  clearVendorEventPreviewDraft,
  loadVendorEventDraft,
  mergeVendorLivePreviewData,
  VENDOR_EVENT_PREVIEW_DRAFT_CHANGED,
} from "@/app/(protected)/vendor/events/_lib/vendor-event-preview-live-data";
import {
  requestVendorEventDiscard,
  vendorPreviewDraftHasUnsavedEdits,
} from "@/app/(protected)/vendor/events/_lib/event-form-discard";
import { patchEventPayloadFromApi } from "@/app/(protected)/vendor/events/_lib/hydrate-event-from-api";
import type { EventSchemaType } from "@/app/(protected)/vendor/events/_components/tab-event-form/schema";
import {
  getVendorPublishCopy,
  resolveVendorEventLifecycle,
} from "@/app/(protected)/vendor/events/_lib/vendor-event-lifecycle";

function resolveEventPreviewLocationSlug(
  data: EventDetailData | undefined,
  siteEssentials: SiteEssentialsFormValues | null,
): string | null {
  const locationId =
    data?.stepOne?.vendor_location_id ?? data?.vendor_location_id;
  const locations = siteEssentials?.locations ?? [];
  if (locationId == null || locations.length === 0) return null;
  const idNum = Number(locationId);
  const matched = locations.find(
    (loc) => loc.id != null && Number(loc.id) === idNum,
  );
  return matched?.slug?.trim() || null;
}

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
    const onPersistenceChanged = (event: Event) => {
      const changedEventId = (
        event as CustomEvent<{ eventId?: string } | undefined>
      ).detail?.eventId;
      if (
        changedEventId &&
        eventId &&
        String(changedEventId) !== String(eventId)
      ) {
        return;
      }
      void refetch();
    };
    window.addEventListener("event-data-changed", onPersistenceChanged);
    return () =>
      window.removeEventListener("event-data-changed", onPersistenceChanged);
  }, [eventId, refetch]);

  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [previewDraft, setPreviewDraft] = useState<Partial<EventSchemaType> | null>(
    null,
  );
  const [previewDraftReady, setPreviewDraftReady] = useState(false);

  const siteEssentials = useEventPreviewSiteEssentials();

  useEffect(() => {
    if (!eventId || !/^\d+$/.test(eventId)) {
      setPreviewDraft(null);
      setPreviewDraftReady(true);
      return;
    }

    let cancelled = false;
    setPreviewDraftReady(false);

    const refreshDraft = async () => {
      const draft = await loadVendorEventDraft(eventId);
      if (cancelled) return;
      setPreviewDraft(draft);
      setPreviewDraftReady(true);
    };

    void refreshDraft();

    const onStorage = (event: StorageEvent) => {
      if (
        event.key === `vendor-event-preview-draft:${eventId}` ||
        event.key == null
      ) {
        void refreshDraft();
      }
    };
    const onDraftChanged = (event: Event) => {
      const changedId = (
        event as CustomEvent<{ eventId?: string } | undefined>
      ).detail?.eventId;
      if (changedId && changedId !== String(eventId)) return;
      void refreshDraft();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(VENDOR_EVENT_PREVIEW_DRAFT_CHANGED, onDraftChanged);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(
        VENDOR_EVENT_PREVIEW_DRAFT_CHANGED,
        onDraftChanged,
      );
    };
  }, [eventId]);

  const handleDiscardPreviewDraft = async () => {
    if (!eventId || !/^\d+$/.test(eventId)) return;
    setIsDiscarding(true);
    try {
      await clearVendorEventPreviewDraft(eventId);
      requestVendorEventDiscard(eventId);
      await refetch();
      setPreviewDraft(null);
      setDiscardDialogOpen(false);
      toast.success("Changes discarded", {
        description: "Preview now shows the last saved event.",
      });
    } catch {
      toast.error("Could not discard changes", {
        description: "Try again, or go back to the editor.",
      });
    } finally {
      setIsDiscarding(false);
    }
  };

  const handleGoBack = () => {
    if (eventId && /^\d+$/.test(eventId)) {
      router.push(`/vendor/events/${eventId}`);
      return;
    }
    router.back();
  };

  const eventPayloadRoot = eventData?.data as EventDetailData | undefined;
  const isLiveEvent =
    resolveVendorEventLifecycle(eventData).isLive ||
    resolveVendorEventLifecycle(eventPayloadRoot).isLive;
  const publishCopy = getVendorPublishCopy(isLiveEvent);
  const savedPreviewForm = useMemo(() => {
    if (!eventPayloadRoot || typeof eventPayloadRoot !== "object") return null;
    return patchEventPayloadFromApi(
      eventPayloadRoot as unknown as Record<string, unknown>,
    );
  }, [eventPayloadRoot]);
  const hasUnsavedPreviewDraft = useMemo(
    () => vendorPreviewDraftHasUnsavedEdits(savedPreviewForm, previewDraft),
    [savedPreviewForm, previewDraft],
  );
  const livePreviewData = useMemo(
    () => mergeVendorLivePreviewData(eventPayloadRoot, previewDraft),
    [eventPayloadRoot, previewDraft],
  );
  const isEventCancelled =
    eventPayloadRoot &&
    typeof eventPayloadRoot === "object" &&
    "status" in eventPayloadRoot &&
    typeof (eventPayloadRoot as { status: string }).status === "string"
      ? (eventPayloadRoot as { status: string }).status === "cancelled"
      : false;

  const handlePublishEvent = async () => {
    if (!eventId || !/^\d+$/.test(eventId) || !eventPayloadRoot) {
      toast.error(isLiveEvent ? "Cannot save" : "Cannot publish", {
        description: "Event data is not loaded. Go back to the editor and try again.",
      });
      return;
    }
    if (isEventCancelled) {
      toast.error("Event is cancelled", {
        description: isLiveEvent
          ? "Cancelled events cannot be saved from preview."
          : "Cancelled events cannot be published.",
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
      reminder_menu_choices_before_days: hydrateMenuChoicesReminderDays(
        eventPayloadRoot.stepEight?.reminder_menu_choices_before_days,
      ),
      submit_type: "active" as const,
      is_duplicate: false,
    };

    const parsed = stepEightSchema.safeParse(stepEightPayload);
    if (!parsed.success) {
      toast.error(
        isLiveEvent
          ? "Cannot save from preview"
          : "Cannot publish from preview",
        { description: "Complete the Publish tab in the event editor (e.g. duplicate location fields) and submit from there." },
      );
      setPublishDialogOpen(false);
      return;
    }

    setIsPublishing(true);
    try {
      const response = await eventsService.storeStepEightData(parsed.data);
      if (response?.status) {
        invalidateCache?.();
        setPublishDialogOpen(false);
        toast.success(publishCopy.toastActive, {
          description: isLiveEvent
            ? "Your live event was updated. Redirecting to events…"
            : "Your event was submitted as live. Redirecting to events…",
        });
        router.push("/vendor/events");
      } else {
        toast.error(isLiveEvent ? "Save failed" : "Publish failed", {
          description: response?.message ||
            "Use the Publish tab in the editor to fix any issues and try again.",
        });
      }
    } catch {
      toast.error(isLiveEvent ? "Save failed" : "Publish failed", {
        description: "Use the Publish tab in the editor or try again shortly.",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  if (isLoading || !previewDraftReady) {
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

  const previewEventData = livePreviewData;
  const previewLocationSlug = resolveEventPreviewLocationSlug(
    previewEventData,
    siteEssentials,
  );
  const previewLocations =
    siteEssentials?.locations
      ?.filter((loc) => Boolean(loc.slug?.trim()))
      .map((loc) => ({
        id: loc.id,
        slug: loc.slug,
        city: loc.city,
        total_events: loc.total_events,
      })) ?? [];

  return (
    <PreviewProvider
      isPreviewMode={true}
      previewLocations={previewLocations}
      activePreviewLocationSlug={previewLocationSlug ?? undefined}
    >
      {/*
        Viewport-height shell (no device frame). Theme FX use absolute inset:0 inside
        the scroll container — without a fixed height they stretch over the full page.
      */}
      <div className="relative flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-[var(--color-background)]">
        <div
          data-event-preview-chrome=""
          className={EVENT_PREVIEW_REVIEW_CHROME_CLASSNAME}
        >
          <Button
            type="button"
            variant="event-primary"
            onClick={handleGoBack}
            size="sm"
            className="pointer-events-auto relative z-[1] shrink-0 shadow-md ring-1 ring-black/10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            <span className="sm:hidden">Back</span>
            <span className="hidden sm:inline">Back to Editor</span>
          </Button>
          <div className="pointer-events-auto relative z-[1] flex min-w-0 shrink-0 items-center justify-end gap-2">
            {hasUnsavedPreviewDraft ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isDiscarding || isPublishing}
                onClick={() => setDiscardDialogOpen(true)}
                className="bg-white shadow-md ring-1 ring-black/10"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                <span className="sm:hidden">Discard</span>
                <span className="hidden sm:inline">Discard changes</span>
              </Button>
            ) : null}
            <Button
              type="button"
              variant="event-primary"
              size="sm"
              disabled={!eventPayloadRoot || isEventCancelled || isPublishing}
              onClick={() => setPublishDialogOpen(true)}
              className="shadow-md ring-1 ring-black/10"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>{publishCopy.busyActive}</span>
                </>
              ) : (
                <>
                  {isLiveEvent ? (
                    <Save className="mr-2 h-4 w-4" />
                  ) : (
                    <Rocket className="mr-2 h-4 w-4" />
                  )}
                  <span className="sm:hidden">
                    {publishCopy.previewActionShort}
                  </span>
                  <span className="hidden sm:inline">
                    {publishCopy.actionActive}
                  </span>
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <EventPreview
            data={previewEventData}
            siteEssentials={siteEssentials}
            locationSlug={previewLocationSlug}
            embedInShell
            previewBackButtonOffset={false}
          />
        </div>

        <AlertDialog
          open={discardDialogOpen}
          onOpenChange={setDiscardDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
              <AlertDialogDescription>
                Revert all unsaved edits on this event? The preview and the
                editor will return to the last saved version.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDiscarding}>
                Cancel
              </AlertDialogCancel>
              <Button
                type="button"
                variant="event-primary"
                disabled={isDiscarding}
                onClick={() => void handleDiscardPreviewDraft()}
              >
                {isDiscarding ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Discard changes
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={publishDialogOpen}
          onOpenChange={setPublishDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{publishCopy.previewDialogTitle}</AlertDialogTitle>
              <AlertDialogDescription>
                {publishCopy.previewDialogDescription}
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
                {isPublishing ? publishCopy.busyActive : publishCopy.previewConfirm}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PreviewProvider>
  );
}
