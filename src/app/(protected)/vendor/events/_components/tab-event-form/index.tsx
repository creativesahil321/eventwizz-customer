"use client";

import React, {
  useState,
  useEffect,
  lazy,
  Suspense,
  useMemo,
  useCallback,
} from "react";
import { ArrowLeft, CheckCircle2, Plus, Pencil, Trash2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FormProvider as RHFFormProvider, useWatch } from "react-hook-form";
import { useEventFormContext } from "../events-form-provider";
import { roomService } from "@/services/vendor/onboarding/room.service";
import { toast } from "sonner";

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
import { useParams } from "next/navigation";

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
  { id: 2, label: "Package", icon: <Package size={16} />, value: "package" },
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

type StepTwoRoom = {
  room_id?: number;
  name?: string;
  package_title?: string;
  package_description?: string;
  package_button_name?: string;
  package_button_link?: string;
  package_details?: Array<{ title?: string }>;
};

const isRoomPackageFilled = (room: StepTwoRoom | undefined): boolean => {
  if (!room) return false;
  const hasTitle = String(room.package_title || "").trim().length > 0;
  const hasDescription =
    String(room.package_description || "").trim().length > 0;
  const hasButtonName =
    String(room.package_button_name || "").trim().length > 0;
  const hasDetails = Array.isArray(room.package_details)
    ? room.package_details.some(
        (detail) => String(detail?.title || "").trim().length > 0
      )
    : false;
  return hasTitle && hasDescription && hasButtonName && hasDetails;
};

const ROOM_ENABLED_TABS = new Set(["package", "dates", "menu", "more-info"]);

const isMeaningfulValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number" || typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.some((item) => isMeaningfulValue(item));
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
    menu: [data.stepFour?.rooms, data.stepSix?.rooms],
    "more-info": [data.stepSix?.rooms, data.stepSeven?.rooms],
  };

  return (sources[tab] || []).find(
    (candidate) => candidate && Object.keys(candidate).length > 0
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

export default function TabEventForm() {
  const { form: formContext, currentStep, readOnly } = useEventFormContext();

  const [activeTab, setActiveTab] = useState("event-name");
  const [newRoomName, setNewRoomName] = useState("");
  const [editingRoomIndex, setEditingRoomIndex] = useState<number | null>(null);
  const [editingRoomName, setEditingRoomName] = useState("");
  const localIsRooms = useWatch({
    control: formContext.control,
    name: "stepTwo.is_rooms",
  });
  const watchedStepTwoRooms = useWatch({
    control: formContext.control,
    name: "stepTwo.rooms",
  }) as StepTwoRoom[] | undefined;
  const activeRoomIndex = useWatch({
    control: formContext.control,
    name: "stepTwo.active_room_index",
  });

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
  const { eventData } = useEventData(eventId);

  const normalizedEventData = useMemo(() => {
    const apiResponse = (eventData || {}) as { data?: EventEnvelope };
    const levelOne = apiResponse.data || {};
    const levelTwo = (levelOne as { data?: EventDataLike }).data;

    // API shape may be either { data: event } or { data: { data: event } }.
    return (levelTwo || levelOne || {}) as EventDataLike;
  }, [eventData]);

  const roomRecords = useMemo<RoomRecord[]>(() => {
    if (localIsRooms === 1) {
      const formRooms = watchedStepTwoRooms ?? [];
      return formRooms.map((room, index) => {
        const resolvedName =
          String(room?.name || "").trim() || `Room ${index + 1}`;
        return {
          name: resolvedName,
          roomId: room?.room_id,
          isComplete: isRoomPackageFilled(room),
        };
      });
    }

    const roomsForActiveTab = getStepRoomsForTab(normalizedEventData, activeTab);
    if (!roomsForActiveTab) return [];

    return Object.entries(roomsForActiveTab).map(([name, payload]) => {
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
  }, [normalizedEventData, activeTab, localIsRooms, watchedStepTwoRooms]);

  const isRoomsFlagRaw = normalizedEventData.is_rooms;
  const isRoomsFlag =
    isRoomsFlagRaw === true ||
    isRoomsFlagRaw === 1 ||
    isRoomsFlagRaw === "1";

  const isRoomsMode =
    isRoomsFlag || localIsRooms === 1 || roomRecords.length > 0;
  const showRoomSidebar = isRoomsMode && ROOM_ENABLED_TABS.has(activeTab);
  const canAddRoom = localIsRooms === 1 && roomRecords.length < 3;
  const canDeleteRoom = localIsRooms === 1 && roomRecords.length > 2;
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
    [formContext, localIsRooms]
  );

  const addRoom = useCallback(async () => {
    if (localIsRooms !== 1) return;
    const name = newRoomName.trim();
    if (!name) return;

    const existingRooms = (formContext.getValues("stepTwo.rooms") ||
      []) as StepTwoRoom[];
    if (existingRooms.length >= 3) {
      toast.error("Maximum 3 rooms allowed.");
      return;
    }

    const nextIndex = existingRooms.length;
    const draftRoom: StepTwoRoom = {
      name,
      package_title: "",
      package_description: "",
      package_button_name: "",
      package_button_link: "",
      package_details: [{ title: "" }],
    };

    formContext.setValue("stepTwo.rooms", [...existingRooms, draftRoom], {
      shouldDirty: true,
      shouldTouch: false,
    });
    formContext.setValue("stepTwo.active_room_index", nextIndex, {
      shouldDirty: false,
      shouldTouch: false,
    });
    setNewRoomName("");

    try {
      const response = await roomService.create({ name });
      const createdId = Number(response?.data?.id);
      if (!Number.isFinite(createdId) || createdId <= 0) return;
      const latest = (formContext.getValues("stepTwo.rooms") || []) as StepTwoRoom[];
      if (!latest[nextIndex]) return;
      const updated = latest.map((room, idx) =>
        idx === nextIndex ? { ...room, room_id: createdId } : room
      );
      formContext.setValue("stepTwo.rooms", updated, {
        shouldDirty: true,
        shouldTouch: false,
      });
    } catch (error) {
      console.error("Failed to create room:", error);
      toast.error("Unable to create room right now.");
    }
  }, [formContext, localIsRooms, newRoomName]);

  const startRenameRoom = useCallback(
    (index: number) => {
      const rooms = (formContext.getValues("stepTwo.rooms") || []) as StepTwoRoom[];
      const target = rooms[index];
      if (!target) return;
      setEditingRoomIndex(index);
      setEditingRoomName(String(target.name || "").trim());
    },
    [formContext]
  );

  const renameRoom = useCallback(
    async (index: number, name: string) => {
      if (localIsRooms !== 1) return;
      const rooms = (formContext.getValues("stepTwo.rooms") || []) as StepTwoRoom[];
      const target = rooms[index];
      if (!target) return;
      const nextName = String(name || "").trim();
      if (!nextName || nextName === target.name) return;

      const updatedRooms = rooms.map((room, idx) =>
        idx === index ? { ...room, name: nextName } : room
      );
      formContext.setValue("stepTwo.rooms", updatedRooms, {
        shouldDirty: true,
        shouldTouch: false,
      });

      if (target.room_id) {
        try {
          await roomService.update(target.room_id, { name: nextName });
        } catch (error) {
          console.error("Failed to rename room:", error);
          toast.error("Room rename failed.");
        }
      }
    },
    [formContext, localIsRooms]
  );

  const commitRenameRoom = useCallback(async () => {
    if (editingRoomIndex === null) return;
    const idx = editingRoomIndex;
    const nextName = editingRoomName.trim();
    setEditingRoomIndex(null);
    setEditingRoomName("");
    if (!nextName) return;
    await renameRoom(idx, nextName);
  }, [editingRoomIndex, editingRoomName, renameRoom]);

  const cancelRenameRoom = useCallback(() => {
    setEditingRoomIndex(null);
    setEditingRoomName("");
  }, []);

  const deleteRoom = useCallback(
    async (index: number) => {
      if (localIsRooms !== 1) return;
      const rooms = (formContext.getValues("stepTwo.rooms") || []) as StepTwoRoom[];
      const target = rooms[index];
      if (!target) return;
      if (rooms.length <= 2) {
        toast.error("Minimum 2 rooms are required in room system mode.");
        return;
      }

      const updatedRooms = rooms.filter((_, idx) => idx !== index);
      const nextIndex = Math.max(
        0,
        Math.min(
          resolvedActiveRoomIndex > index
            ? resolvedActiveRoomIndex - 1
            : resolvedActiveRoomIndex,
          updatedRooms.length - 1
        )
      );
      formContext.setValue("stepTwo.rooms", updatedRooms, {
        shouldDirty: true,
        shouldTouch: false,
      });
      formContext.setValue("stepTwo.active_room_index", nextIndex, {
        shouldDirty: false,
        shouldTouch: false,
      });

      if (target.room_id) {
        try {
          await roomService.remove(target.room_id);
        } catch (error) {
          console.error("Failed to delete room:", error);
          toast.error("Room delete failed.");
        }
      }
    },
    [formContext, localIsRooms, resolvedActiveRoomIndex]
  );

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
            className="w-full"
          >
            <div className="flex justify-between items-center mb-4">
              <div className="w-full overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-500 -mx-1 px-1 md:overflow-x-visible">
                <TabsList className="inline-flex md:flex w-max md:w-full bg-background p-1 h-auto rounded-lg gap-1.5 md:gap-2">
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

            <Card className="shadow-sm overflow-hidden">
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
                    <div className="space-y-2">
                      {roomRecords.map((room, index) => (
                        <div
                          key={`${room.roomId ?? room.name}-${room.name}`}
                          className={`w-full rounded-xl border px-3 py-2.5 text-left transition-all ${
                            index === resolvedActiveRoomIndex
                              ? "border-[var(--color-primary)] bg-white shadow-sm"
                              : "border-transparent hover:border-[#D6ECEF] bg-white/70"
                          }`}
                        >
                          {editingRoomIndex === index ? (
                            <div className="space-y-2">
                              <input
                                value={editingRoomName}
                                onChange={(e) => setEditingRoomName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    void commitRenameRoom();
                                  }
                                  if (e.key === "Escape") {
                                    e.preventDefault();
                                    cancelRenameRoom();
                                  }
                                }}
                                maxLength={40}
                                className="h-8 w-full rounded-md border border-[#D6ECEF] bg-white px-2 text-sm outline-none focus:border-[var(--color-primary)]"
                                autoFocus
                              />
                              <div className="flex justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs"
                                  onClick={cancelRenameRoom}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="button"
                                  variant="event-primary"
                                  className="h-7 px-2 text-xs"
                                  onClick={() => void commitRenameRoom()}
                                  disabled={editingRoomName.trim().length === 0}
                                >
                                  Save
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setActiveRoom(index)}
                              className="w-full text-left"
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
                          )}
                          {localIsRooms === 1 && editingRoomIndex !== index && (
                            <div className="mt-2 flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => startRenameRoom(index)}
                                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[#0B6A75] hover:bg-[#EAF7F8]"
                                aria-label="Rename room"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              {canDeleteRoom && (
                                <button
                                  type="button"
                                  onClick={() => void deleteRoom(index)}
                                  className="inline-flex h-6 w-6 items-center justify-center rounded-md text-rose-500 hover:bg-rose-50"
                                  aria-label="Delete room"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                      {roomRecords.length === 0 && (
                        <div className="rounded-xl border border-dashed border-[#D6ECEF] bg-white px-3 py-4 text-center">
                          <p className="text-sm font-medium text-[#0F172A]">
                            Room system enabled
                          </p>
                          <p className="text-[11px] mt-1 text-muted-foreground">
                            Add rooms to start room-wise configuration.
                          </p>
                        </div>
                      )}
                    </div>
                    {canAddRoom && (
                      <div className="mt-4 space-y-2">
                        <input
                          value={newRoomName}
                          onChange={(e) => setNewRoomName(e.target.value)}
                          maxLength={40}
                          placeholder="Room name"
                          className="h-9 w-full rounded-md border border-[#D6ECEF] bg-white px-2 text-sm outline-none focus:border-[var(--color-primary)]"
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="event-primary"
                            className="h-8 flex-1"
                            onClick={() => void addRoom()}
                            disabled={newRoomName.trim().length === 0}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-8"
                            onClick={() => setNewRoomName("")}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                    <p className="mt-4 rounded-lg bg-[#EAF7F8] px-3 py-2 text-[11px] text-[#0B6A75]">
                      Each room has its own package, dates, menu and brochure.
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
                  <div className="flex justify-between mt-6">
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

                    {/* Show current step info */}
                    {currentStep && (
                      <div className="text-xs sm:text-sm text-muted-foreground flex items-center">
                        <span className="hidden sm:inline">Step </span>
                        {currentStep}/8
                      </div>
                    )}
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
