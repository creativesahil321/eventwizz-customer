"use client";

import React, {
  useState,
  useEffect,
  lazy,
  Suspense,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { ArrowLeft, CheckCircle2, Eye } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FormProvider as RHFFormProvider, useWatch } from "react-hook-form";
import { useEventFormContext } from "../events-form-provider";
import { toast } from "sonner";
import {
  EventRoomMultiSelect,
  type VendorRoomOption,
} from "../ai-event-creation/event-room-multi-select";
import { roomService } from "@/services/vendor/onboarding/room.service";

// Lazy load Tab Components for better performance and smooth transitions
const EventNameTab = lazy(() => import("./tabs/event-name-tab"));
const PackageTab = lazy(() => import("./tabs/package-tab"));
const DatesTab = lazy(() => import("./tabs/dates-tab"));
const CateringTab = lazy(() => import("./tabs/catering-tab"));
const DrinksTab = lazy(() => import("./tabs/drinks-tab"));
const MoreInfoTab = lazy(() => import("./tabs/more-info-tab"));
const FaqsTab = lazy(() => import("./tabs/faqs-tab"));
const PublishTab = lazy(() => import("./tabs/publish-tab"));
import { EventPreview } from "../event-preview";
import { useEventData } from "../../_lib/hooks/useEventData";
import { useEventPreviewNavigation } from "../../_lib/use-event-preview-navigation";
import { useParams } from "next/navigation";
import {
  capEventRoomList,
  EVENT_ROOM_MAX_COUNT,
  EVENT_ROOM_MIN_COUNT,
  extractRoomIdsFromStepTwoRooms,
  normalizeVendorStepTwoRooms,
  parseEventIsRoomsFlag,
  enrichStepTwoRoomsFromVenueCatalog,
  resolveStepTwoRoomsForEditor,
  stepTwoRoomsDifferFromCatalogEnrichment,
  syncStepTwoRoomsFromCatalogSelection,
  type VendorStepTwoRoomForm,
} from "@/lib/event-form-limits";
import { isVendorRoomPackageStepComplete } from "../../_lib/normalize-step-two-fields";
import {
  hasMeaningfulVendorDates,
  normalizeVendorStepThreeRooms,
  type VendorStepThreeRoomEntry,
} from "../../_lib/vendor-step-three-rooms";
import {
  findStepFourMenuForRoom,
  isVendorRoomMenuStepComplete,
  normalizeVendorStepFourRooms,
} from "../../_lib/vendor-step-four-rooms";
import {
  findStepFiveBrochureForRoom,
  normalizeVendorStepFiveRooms,
} from "../../_lib/vendor-step-five-rooms";
import {
  findStepSixDrinksForRoom,
  isVendorRoomDrinksStepComplete,
  normalizeVendorStepSixRooms,
} from "../../_lib/vendor-step-six-rooms";

// Import Step Icons
import {
  PartyPopper,
  Package,
  CalendarDays,
  Utensils,
  Wine,
  Info,
  HelpCircle,
  UploadCloud,
} from "lucide-react";

// Define steps for the tabs
const steps = [
  {
    id: 1,
    label: "Event name",
    icon: <PartyPopper size={16} />,
    value: "event-name",
  },
  {
    id: 2,
    label: "Timeline & package",
    icon: <Package size={16} />,
    value: "package",
  },
  { id: 3, label: "Dates", icon: <CalendarDays size={16} />, value: "dates" },
  { id: 4, label: "Menu", icon: <Utensils size={16} />, value: "menu" },
  {
    id: 5,
    label: "Brochure Info",
    icon: <Info size={16} />,
    value: "more-info",
  },
  { id: 6, label: "Other Packages", icon: <Wine size={16} />, value: "drinks" },

  { id: 7, label: "FAQs", icon: <HelpCircle size={16} />, value: "faqs" },
  {
    id: 8,
    label: "Publish",
    icon: <UploadCloud size={16} />,
    value: "publish",
  },
];

type RoomRecord = {
  name: string;
  roomId?: number;
  isComplete: boolean;
};

type EventDataLike = {
  is_rooms?: boolean | number | string;
  stepTwo?: { rooms?: Record<string, unknown> };
  stepThree?: { rooms?: Record<string, unknown> };
  stepFour?: { rooms?: Record<string, unknown> };
  stepFive?: { rooms?: Record<string, unknown> };
  stepSix?: { rooms?: Record<string, unknown> };
  stepSeven?: { rooms?: Record<string, unknown> };
};

type EventEnvelope = {
  data?: EventDataLike;
  is_rooms?: boolean | number | string;
  stepTwo?: { rooms?: Record<string, unknown> };
  stepThree?: { rooms?: Record<string, unknown> };
  stepFour?: { rooms?: Record<string, unknown> };
  stepFive?: { rooms?: Record<string, unknown> };
  stepSix?: { rooms?: Record<string, unknown> };
  stepSeven?: { rooms?: Record<string, unknown> };
};

type StepTwoRoom = VendorStepTwoRoomForm;

const isRoomDatesFilled = (
  roomId: number | undefined,
  stepThreeRooms: VendorStepThreeRoomEntry[],
): boolean => {
  if (!roomId) return false;
  const entry = stepThreeRooms.find(
    (room) => Number(room.room_id) === Number(roomId),
  );
  return hasMeaningfulVendorDates(entry?.dates);
};

const isRoomPackageFilled = (room: StepTwoRoom | undefined): boolean =>
  room ? isVendorRoomPackageStepComplete(room) : false;

const ROOM_ENABLED_TABS = new Set([
  "package",
  "dates",
  "menu",
  "more-info",
  "drinks",
]);
/** Venue room multiselect is only editable on step 2 (Package). */
const ROOM_SELECTION_TAB = "package";

const isMeaningfulValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number" || typeof value === "boolean") return true;
  if (Array.isArray(value))
    return value.some((item) => isMeaningfulValue(item));
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key !== "room_id" && key !== "id")
      .some(([, nested]) => isMeaningfulValue(nested));
  }
  return false;
};

const getStepRoomsForTab = (data: EventDataLike, tab: string) => {
  const sources: Record<string, Array<Record<string, unknown> | undefined>> = {
    package: [data.stepTwo?.rooms, data.stepFour?.rooms],
    dates: [data.stepThree?.rooms, data.stepFive?.rooms],
    menu: [data.stepFour?.rooms],
    "more-info": [data.stepFive?.rooms],
    drinks: [data.stepSix?.rooms],
  };

  return (sources[tab] || []).find(
    (candidate) => candidate && Object.keys(candidate).length > 0,
  );
};

// Loading skeleton for tab content - matches onboarding pattern
const TabContentLoader = () => (
  <div className="w-full animate-fadeIn">
    <div className="bg-white rounded-lg p-2 sm:p-4 md:p-6 space-y-6">
      {/* Header skeleton */}
      <div className="mb-6">
        <Skeleton className="h-7 w-2/3 rounded-lg" />
      </div>
      {/* Form fields skeleton */}
      {[1, 2, 3, 4].map((field, index) => (
        <div
          key={field}
          className="space-y-2"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <Skeleton className="h-4 w-1/4 rounded-md" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ))}
      {/* Action buttons skeleton */}
      <div className="flex justify-end gap-3 mt-8">
        <Skeleton className="h-10 w-24 rounded-md" />
        <Skeleton className="h-10 w-24 rounded-md" />
      </div>
    </div>
  </div>
);

const TAB_TO_STEP: Record<string, number> = {
  "event-name": 1,
  package: 2,
  dates: 3,
  menu: 4,
  "more-info": 5,
  drinks: 6,
  faqs: 7,
  publish: 8,
};

export default function TabEventForm() {
  const {
    form: formContext,
    currentStep,
    readOnly,
    persistedHydrated,
    setActiveStep,
  } = useEventFormContext();
  const { openEventPreview, canPreview } = useEventPreviewNavigation();

  const [activeTab, setActiveTab] = useState("event-name");
  const [vendorRooms, setVendorRooms] = useState<VendorRoomOption[]>([]);
  const [vendorRoomsLoading, setVendorRoomsLoading] = useState(false);
  const localIsRooms = useWatch({
    control: formContext.control,
    name: "stepTwo.is_rooms",
  });
  const stepOneIsRooms = useWatch({
    control: formContext.control,
    name: "stepOne.is_rooms",
  });
  const watchedStepTwoRooms = useWatch({
    control: formContext.control,
    name: "stepTwo.rooms",
  }) as StepTwoRoom[] | Record<string, unknown> | undefined;
  const activeRoomIndex = useWatch({
    control: formContext.control,
    name: "stepTwo.active_room_index",
  });
  const watchedStepThreeRooms = useWatch({
    control: formContext.control,
    name: "stepThree.rooms",
  });
  const watchedStepFourRooms = useWatch({
    control: formContext.control,
    name: "stepFour.rooms",
  });
  const watchedStepFiveRooms = useWatch({
    control: formContext.control,
    name: "stepFive.rooms",
  });
  const watchedStepSixRooms = useWatch({
    control: formContext.control,
    name: "stepSix.rooms",
  });
  const excessRoomsTrimmedRef = useRef(false);
  const apiExcessRoomsWarnedRef = useRef(false);

  const getStepTwoRooms = useCallback((): StepTwoRoom[] => {
    return normalizeVendorStepTwoRooms(formContext.getValues("stepTwo.rooms"));
  }, [formContext]);

  // Set active tab based on current step from server data
  useEffect(() => {
    if (currentStep && currentStep > 0) {
      const stepToTabMap: { [key: number]: string } = {
        1: "event-name",
        2: "package",
        3: "dates",
        4: "menu",
        5: "more-info",
        6: "drinks",
        7: "faqs",
        8: "publish",
      };

      const targetTab = stepToTabMap[currentStep];

      if (targetTab) {
        setActiveTab(targetTab);
      }
    }
  }, [currentStep]);

  // Handle tab navigation
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const step = TAB_TO_STEP[value];
    if (step) {
      void setActiveStep(step);
    }
  };

  const navigateToPreviousTab = () => {
    const currentIndex = steps.findIndex((step) => step.value === activeTab);
    if (currentIndex > 0) {
      setActiveTab(steps[currentIndex - 1].value);
    }
  };

  const params = useParams<{ eventID: string }>();
  const eventId = Array.isArray(params?.eventID)
    ? params?.eventID[0]
    : params?.eventID;
  const fetchWithRoomPayload = localIsRooms === 1 || stepOneIsRooms === 1;
  const { eventData } = useEventData(eventId, fetchWithRoomPayload);

  const normalizedEventData = useMemo(() => {
    const apiResponse = (eventData || {}) as { data?: EventEnvelope };
    const levelOne = apiResponse.data || {};
    const levelTwo = (levelOne as { data?: EventDataLike }).data;

    // API shape may be either { data: event } or { data: { data: event } }.
    return (levelTwo || levelOne || {}) as EventDataLike;
  }, [eventData]);

  const resolvedStepTwoRooms = useMemo(
    () =>
      resolveStepTwoRoomsForEditor(
        watchedStepTwoRooms,
        normalizedEventData.stepTwo?.rooms,
        vendorRooms,
      ),
    [watchedStepTwoRooms, normalizedEventData.stepTwo?.rooms, vendorRooms],
  );

  const stepThreeRoomsNormalized = useMemo(
    () =>
      normalizeVendorStepThreeRooms(
        watchedStepThreeRooms ?? normalizedEventData.stepThree?.rooms,
      ),
    [watchedStepThreeRooms, normalizedEventData.stepThree?.rooms],
  );

  const stepFourRoomsNormalized = useMemo(
    () =>
      normalizeVendorStepFourRooms(
        watchedStepFourRooms ?? normalizedEventData.stepFour?.rooms,
      ),
    [watchedStepFourRooms, normalizedEventData.stepFour?.rooms],
  );

  const stepFiveRoomsNormalized = useMemo(
    () =>
      normalizeVendorStepFiveRooms(
        watchedStepFiveRooms ?? normalizedEventData.stepFive?.rooms,
      ),
    [watchedStepFiveRooms, normalizedEventData.stepFive?.rooms],
  );

  const stepSixRoomsNormalized = useMemo(
    () =>
      normalizeVendorStepSixRooms(
        watchedStepSixRooms ?? normalizedEventData.stepSix?.rooms,
      ),
    [watchedStepSixRooms, normalizedEventData.stepSix?.rooms],
  );

  const roomRecords = useMemo<RoomRecord[]>(() => {
    if (localIsRooms === 1) {
      return resolvedStepTwoRooms.slice(0, EVENT_ROOM_MAX_COUNT).map((room, index) => {
        const resolvedName =
          String(room?.name || "").trim() || `Room ${index + 1}`;
        const isComplete =
          activeTab === "dates"
            ? isRoomDatesFilled(room?.room_id, stepThreeRoomsNormalized)
            : activeTab === "menu"
              ? isVendorRoomMenuStepComplete(
                  findStepFourMenuForRoom(
                    stepFourRoomsNormalized,
                    Number(room?.room_id),
                  ),
                )
              : activeTab === "more-info"
                ? String(
                    formContext.getValues("stepFive.event_address") ?? "",
                  ).trim().length > 0
                : activeTab === "drinks"
                  ? isVendorRoomDrinksStepComplete(
                      findStepSixDrinksForRoom(
                        stepSixRoomsNormalized,
                        Number(room?.room_id),
                      ),
                    )
                  : isRoomPackageFilled(room);
        return {
          name: resolvedName,
          roomId: room?.room_id,
          isComplete,
        };
      });
    }

    const roomsForActiveTab = getStepRoomsForTab(
      normalizedEventData,
      activeTab,
    );
    if (!roomsForActiveTab) return [];

    return Object.entries(roomsForActiveTab)
      .slice(0, EVENT_ROOM_MAX_COUNT)
      .map(([name, payload]) => {
        const payloadObj = (payload || {}) as Record<string, unknown>;
        const roomId =
          typeof payloadObj.room_id === "number"
            ? payloadObj.room_id
            : typeof payloadObj.room_id === "string"
              ? Number(payloadObj.room_id)
              : undefined;

        return {
          name,
          roomId,
          isComplete: isMeaningfulValue(payloadObj),
        };
      });
  }, [
    normalizedEventData,
    activeTab,
    localIsRooms,
    resolvedStepTwoRooms,
    stepThreeRoomsNormalized,
    stepFourRoomsNormalized,
    stepFiveRoomsNormalized,
    stepSixRoomsNormalized,
    formContext,
    activeTab,
  ]);

  const showRoomSidebar =
    localIsRooms === 1 && ROOM_ENABLED_TABS.has(activeTab);
  const selectedRoomIds = useMemo(
    () => extractRoomIdsFromStepTwoRooms(resolvedStepTwoRooms),
    [resolvedStepTwoRooms],
  );
  const resolvedActiveRoomIndex =
    typeof activeRoomIndex === "number" && activeRoomIndex >= 0
      ? Math.min(activeRoomIndex, Math.max(roomRecords.length - 1, 0))
      : 0;
  const activeRoomName = roomRecords[resolvedActiveRoomIndex]?.name || "";

  useEffect(() => {
    if (localIsRooms !== 1) return;
    if (!roomRecords.length) return;
    if (resolvedActiveRoomIndex === activeRoomIndex) return;
    formContext.setValue("stepTwo.active_room_index", resolvedActiveRoomIndex, {
      shouldDirty: false,
      shouldTouch: false,
    });
  }, [
    localIsRooms,
    roomRecords.length,
    resolvedActiveRoomIndex,
    activeRoomIndex,
    formContext,
  ]);

  const setActiveRoom = useCallback(
    (index: number) => {
      if (localIsRooms !== 1) return;
      formContext.setValue("stepTwo.active_room_index", index, {
        shouldDirty: false,
        shouldTouch: false,
      });
    },
    [formContext, localIsRooms],
  );

  const handleVenueRoomCreated = useCallback((room: VendorRoomOption) => {
    setVendorRooms((prev) => {
      if (prev.some((r) => r.id === room.id)) return prev;
      if (prev.length >= EVENT_ROOM_MAX_COUNT) return prev;
      return [...prev, room]
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, EVENT_ROOM_MAX_COUNT);
    });
  }, []);

  const showRoomPicker =
    localIsRooms === 1 &&
    (activeTab === ROOM_SELECTION_TAB ||
      selectedRoomIds.length < EVENT_ROOM_MAX_COUNT);

  const handleRoomSelectionChange = useCallback(
    (ids: number[]) => {
      if (localIsRooms !== 1) return;
      const existing = getStepTwoRooms();
      const updated = syncStepTwoRoomsFromCatalogSelection(
        ids,
        vendorRooms,
        existing,
      );
      const prevIndex = formContext.getValues("stepTwo.active_room_index");
      const safePrevIndex =
        typeof prevIndex === "number" && prevIndex >= 0 ? prevIndex : 0;
      const activeRoomId = existing[safePrevIndex]?.room_id;
      let nextIndex = updated.findIndex(
        (room) => Number(room.room_id) === Number(activeRoomId),
      );
      if (nextIndex < 0) {
        nextIndex = Math.max(0, updated.length - 1);
      }

      formContext.setValue("stepTwo.rooms", updated, {
        shouldDirty: true,
        shouldTouch: false,
      });
      formContext.setValue("stepTwo.active_room_index", nextIndex, {
        shouldDirty: false,
        shouldTouch: false,
      });
    },
    [formContext, getStepTwoRooms, localIsRooms, vendorRooms],
  );

  useEffect(() => {
    if (localIsRooms !== 1) {
      setVendorRooms([]);
      setVendorRoomsLoading(false);
      return;
    }

    let cancelled = false;
    setVendorRoomsLoading(true);

    void roomService
      .listVendorRooms()
      .then((res) => {
        if (cancelled) return;
        const data = Array.isArray(res?.data) ? res.data : [];
        const fromApi: VendorRoomOption[] = data
          .map((room, index) => {
            const id = Number(room.id);
            const name = String(room?.name ?? "").trim() || `Room ${index + 1}`;
            return { id, name };
          })
          .filter(
            (room) =>
              room.name.length > 0 && Number.isFinite(room.id) && room.id > 0,
          );
        setVendorRooms(fromApi.slice(0, EVENT_ROOM_MAX_COUNT));
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to load venue rooms:", error);
        setVendorRooms([]);
        toast.error("Unable to load venue rooms.");
      })
      .finally(() => {
        if (!cancelled) setVendorRoomsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [localIsRooms]);

  useEffect(() => {
    if (localIsRooms !== 1 || vendorRooms.length === 0) return;

    const current = getStepTwoRooms();
    if (current.length === 0) return;

    const enriched = enrichStepTwoRoomsFromVenueCatalog(current, vendorRooms);
    if (!stepTwoRoomsDifferFromCatalogEnrichment(current, enriched)) return;

    formContext.setValue("stepTwo.rooms", enriched, {
      shouldDirty: false,
      shouldTouch: false,
    });
  }, [
    localIsRooms,
    vendorRooms,
    watchedStepTwoRooms,
    getStepTwoRooms,
    formContext,
  ]);

  useEffect(() => {
    excessRoomsTrimmedRef.current = false;
    apiExcessRoomsWarnedRef.current = false;
  }, [eventId]);

  useEffect(() => {
    if (localIsRooms !== 1) return;
    const rooms = getStepTwoRooms();
    if (rooms.length <= EVENT_ROOM_MAX_COUNT) return;

    const trimmed = capEventRoomList(rooms);
    const currentIndex = formContext.getValues("stepTwo.active_room_index");
    const nextIndex = Math.min(
      typeof currentIndex === "number" ? currentIndex : 0,
      Math.max(trimmed.length - 1, 0),
    );
    formContext.setValue("stepTwo.rooms", trimmed, {
      shouldDirty: false,
      shouldTouch: false,
    });
    formContext.setValue("stepTwo.active_room_index", nextIndex, {
      shouldDirty: false,
      shouldTouch: false,
    });

    if (!excessRoomsTrimmedRef.current) {
      excessRoomsTrimmedRef.current = true;
      toast.warning(
        `Only ${EVENT_ROOM_MAX_COUNT} rooms can be managed per event. Extra rooms were hidden from this editor.`,
      );
    }
  }, [localIsRooms, watchedStepTwoRooms, formContext, getStepTwoRooms]);

  useEffect(() => {
    if (localIsRooms !== 1) return;

    const apiRoomsRaw = normalizedEventData.stepTwo?.rooms;
    if (!apiRoomsRaw) return;

    const mappedRooms = capEventRoomList(
      normalizeVendorStepTwoRooms(apiRoomsRaw),
    );
    const apiRoomCount = Array.isArray(apiRoomsRaw)
      ? apiRoomsRaw.length
      : Object.keys(apiRoomsRaw as Record<string, unknown>).length;

    if (
      apiRoomCount > EVENT_ROOM_MAX_COUNT &&
      !apiExcessRoomsWarnedRef.current
    ) {
      apiExcessRoomsWarnedRef.current = true;
      toast.warning(
        `This event has ${apiRoomCount} rooms. Only the first ${EVENT_ROOM_MAX_COUNT} are shown and editable.`,
      );
    }

    if (mappedRooms.length === 0) return;

    const currentRooms = getStepTwoRooms();
    const formHasRoomIds = currentRooms.some(
      (room) => Number(room.room_id) > 0,
    );
    if (formHasRoomIds) return;

    formContext.setValue("stepTwo.rooms", mappedRooms, {
      shouldDirty: false,
      shouldTouch: false,
    });
    formContext.setValue("stepTwo.active_room_index", 0, {
      shouldDirty: false,
      shouldTouch: false,
    });
  }, [
    localIsRooms,
    normalizedEventData.stepTwo?.rooms,
    formContext,
    getStepTwoRooms,
    persistedHydrated,
  ]);

  return (
    <>
      <div className="flex flex-col space-y-6 w-full max-w-full px-2 sm:px-4 md:px-6 relative mx-auto pb-24 overflow-x-hidden">
        {readOnly && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50 px-4 py-2 text-sm text-amber-800 dark:text-amber-200">
            View only — you can review all event details but cannot save
            changes.
          </div>
        )}
        {/* Wrap all tabs in the FormProvider from react-hook-form */}
        <RHFFormProvider {...formContext}>
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="w-full gap-0"
          >
            <Card className="shadow-sm overflow-hidden gap-0 py-0">
              <div className="border-b bg-card px-2 sm:px-3 md:px-4 pt-3 pb-3">
                <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-500 md:overflow-x-visible">
                  <TabsList className="inline-flex md:flex w-max md:w-full bg-muted/60 p-1 h-auto rounded-lg gap-1.5 md:gap-2">
                    {steps.map((step) => {
                      // Disable tabs that are beyond the current step
                      const isDisabled = currentStep
                        ? step.id > currentStep
                        : false;

                      return (
                        <TabsTrigger
                          key={step.id}
                          value={step.value}
                          disabled={isDisabled}
                          className={`px-2 sm:px-3 md:px-4 lg:px-5 py-1.5 h-auto text-xs sm:text-sm font-medium whitespace-nowrap rounded-md data-[state=active]:bg-[var(--color-primary)] data-[state=active]:text-white data-[state=active]:shadow-sm flex items-center justify-center gap-1 sm:gap-1.5 flex-shrink-0 md:flex-1 md:min-w-0 transition-all duration-300 ease-in-out ${
                            isDisabled ? "opacity-50 cursor-not-allowed" : ""
                          } ${
                            currentStep && step.id === currentStep
                              ? "ring-2 ring-blue-500"
                              : ""
                          }`}
                        >
                          {step.icon}
                          <span className="whitespace-nowrap truncate">
                            {step.label}
                          </span>
                          {currentStep && step.id === currentStep && (
                            <span className="ml-1 text-xs bg-blue-100 text-blue-800 px-1 sm:px-1.5 py-0.5 rounded-full hidden sm:inline whitespace-nowrap flex-shrink-0">
                              Current
                            </span>
                          )}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </div>
              </div>

              <div
                className={`${
                  showRoomSidebar
                    ? "grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]"
                    : "block"
                }`}
              >
                {showRoomSidebar && (
                  <aside className="border-b lg:border-b-0 lg:border-r bg-[#FAFCFC] p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        Event Rooms
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {roomRecords.length}
                      </span>
                    </div>
                    {showRoomPicker && (
                      <div className="mb-4">
                        <EventRoomMultiSelect
                          variant="light"
                          rooms={vendorRooms}
                          value={selectedRoomIds}
                          onChange={handleRoomSelectionChange}
                          onRoomCreated={handleVenueRoomCreated}
                          disabled={readOnly}
                          loading={vendorRoomsLoading}
                          minSelection={EVENT_ROOM_MIN_COUNT}
                          maxSelection={EVENT_ROOM_MAX_COUNT}
                          placeholder="Select venue rooms"
                        />
                      </div>
                    )}
                    {localIsRooms === 1 &&
                      !showRoomPicker &&
                      roomRecords.length > 0 && (
                        <div className="mb-4 flex flex-wrap gap-1.5">
                          {roomRecords.map((room) => (
                            <span
                              key={`${room.roomId ?? room.name}-badge`}
                              className="inline-flex max-w-full items-center rounded-full border border-[#D6ECEF] bg-[#EAF7F8] px-2.5 py-1 text-xs font-medium text-[#0B6A75]"
                            >
                              <span className="truncate">{room.name}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    <div className="space-y-2">
                      {roomRecords.map((room, index) => (
                        <button
                          key={`${room.roomId ?? room.name}-${room.name}`}
                          type="button"
                          onClick={() => setActiveRoom(index)}
                          className={`w-full rounded-xl border px-3 py-2.5 text-left transition-all ${
                            index === resolvedActiveRoomIndex
                              ? "border-[var(--color-primary)] bg-white shadow-sm"
                              : "border-transparent hover:border-[#D6ECEF] bg-white/70"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-[#0F172A] truncate">
                              {room.name}
                            </p>
                            {room.isComplete && (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] mt-1 text-muted-foreground">
                            {room.isComplete ? "Complete" : "Incomplete"}
                          </p>
                        </button>
                      ))}
                      {roomRecords.length === 0 && (
                        <div className="rounded-xl border border-dashed border-[#D6ECEF] bg-white px-3 py-4 text-center">
                          <p className="text-sm font-medium text-[#0F172A]">
                            {localIsRooms === 1
                              ? "No rooms selected"
                              : "Room system enabled"}
                          </p>
                          <p className="text-[11px] mt-1 text-muted-foreground">
                            {localIsRooms === 1
                              ? `Choose ${EVENT_ROOM_MIN_COUNT}–${EVENT_ROOM_MAX_COUNT} venue rooms on the Package tab, or use the room picker above when fewer than ${EVENT_ROOM_MAX_COUNT} are selected.`
                              : "Enable room system and select venue rooms to start."}
                          </p>
                        </div>
                      )}
                    </div>
                    <p className="mt-4 rounded-lg bg-[#EAF7F8] px-3 py-2 text-[11px] text-[#0B6A75]">
                      {localIsRooms === 1
                        ? selectedRoomIds.length < EVENT_ROOM_MAX_COUNT
                          ? `Each room has its own package, dates, menu, and brochure (${EVENT_ROOM_MIN_COUNT}–${EVENT_ROOM_MAX_COUNT} per event). Select from your venue rooms — new rooms can only be created if you have fewer than ${EVENT_ROOM_MAX_COUNT} in total.`
                          : `Each room has its own package, dates, menu, other packages, and brochure. Use ${EVENT_ROOM_MIN_COUNT}–${EVENT_ROOM_MAX_COUNT} rooms per event.`
                        : "Click a room below to edit its details for this step. Change room selection on the Package tab."}
                    </p>
                  </aside>
                )}

                <div className="p-2 sm:p-4 md:p-6">
                  {showRoomSidebar && activeRoomName && (
                    <div className="mb-4 flex justify-end">
                      <span className="inline-flex items-center rounded-full bg-[#EAF7F8] px-3 py-1 text-xs font-medium text-[#0B6A75]">
                        Editing: {activeRoomName}
                      </span>
                    </div>
                  )}

              <div className="space-y-6 relative min-h-[400px]">
                    <TabsContent value="event-name" className="mt-0 w-full">
                      <div className="bg-white rounded-lg">
                    <Suspense fallback={<TabContentLoader />}>
                      <EventNameTab />
                    </Suspense>
                  </div>
                </TabsContent>

                    <TabsContent value="package" className="mt-0 w-full">
                      <div className="bg-white rounded-lg">
                    <Suspense fallback={<TabContentLoader />}>
                      <PackageTab />
                    </Suspense>
                  </div>
                </TabsContent>

                    <TabsContent value="dates" className="mt-0 w-full">
                      <div className="bg-white rounded-lg">
                    <Suspense fallback={<TabContentLoader />}>
                      <DatesTab />
                    </Suspense>
                  </div>
                </TabsContent>

                    <TabsContent value="menu" className="mt-0 w-full">
                      <div className="bg-white rounded-lg">
                    <Suspense fallback={<TabContentLoader />}>
                      <CateringTab />
                    </Suspense>
                  </div>
                </TabsContent>

                    <TabsContent value="more-info" className="mt-0 w-full">
                      <div className="bg-white rounded-lg">
                    <Suspense fallback={<TabContentLoader />}>
                          <MoreInfoTab />
                    </Suspense>
                  </div>
                </TabsContent>

                    <TabsContent value="drinks" className="mt-0 w-full">
                      <div className="bg-white rounded-lg">
                    <Suspense fallback={<TabContentLoader />}>
                          <DrinksTab />
                    </Suspense>
                  </div>
                </TabsContent>

                    <TabsContent value="faqs" className="mt-0 w-full">
                      <div className="bg-white rounded-lg">
                    <Suspense fallback={<TabContentLoader />}>
                      <FaqsTab />
                    </Suspense>
                  </div>
                </TabsContent>

                    <TabsContent value="publish" className="mt-0 w-full">
                      <div className="bg-white rounded-lg">
                    <Suspense fallback={<TabContentLoader />}>
                      <PublishTab />
                    </Suspense>
                  </div>
                </TabsContent>

                {/* Live Preview (read-only) */}
                    <TabsContent value="preview" className="mt-0 w-full">
                  <div className="bg-white rounded-lg p-0 sm:p-0">
                    <EventPreview
                      data={(eventData as { data?: object })?.data || {}}
                      embedInShell
                    />
                  </div>
                </TabsContent>
              </div>

              {/* Tab Navigation */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={navigateToPreviousTab}
                  disabled={activeTab === "event-name"}
                  className="flex items-center gap-2 text-xs sm:text-sm"
                  size="sm"
                >
                  <ArrowLeft size={14} />
                  <span className="hidden sm:inline">Previous</span>
                  <span className="sm:hidden">Prev</span>
                </Button>

                    <div className="flex items-center gap-3">
                      {currentStep ? (
                  <div className="text-xs sm:text-sm text-muted-foreground flex items-center">
                    <span className="hidden sm:inline">Step </span>
                    {currentStep}/8
                        </div>
                      ) : null}
                      <Button
                        type="button"
                        variant="event-outline"
                        size="sm"
                        className="flex items-center gap-2 text-xs sm:text-sm"
                        disabled={!canPreview}
                        onClick={openEventPreview}
                        title={
                          canPreview
                            ? "Preview how this event will look to customers"
                            : "Save step 1 to enable preview"
                        }
                      >
                        <Eye size={14} />
                        Preview
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </Tabs>
        </RHFFormProvider>
      </div>
    </>
  );
}
