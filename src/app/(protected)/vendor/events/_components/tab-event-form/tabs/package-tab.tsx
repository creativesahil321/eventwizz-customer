"use client";

import React, { useCallback, useState, useEffect } from "react";
import {
  useForm,
  useFieldArray,
  useWatch,
  type FieldErrors,
  type Resolver,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { FileUploader } from "@/components/ui/file-uploader";
import { GripVertical, Loader2, PlusCircle, Trash } from "lucide-react";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useEventFormContext } from "../../events-form-provider";
import { StepTwoType, stepTwoSchema } from "../schema";
import { eventsService } from "@/services/vendor/events/events.service";
import { addCacheBusting } from "@/lib/image-utils";
import { GalleryCopyrightNotice } from "@/components/gallery-copyright-notice";
import { useCurrencySymbol } from "@/hooks/use-currency-format";
import {
  EVENT_PACKAGE_MAIN_HEADING_MAX_CHARS,
  EVENT_PACKAGE_SUB_HEADING_MAX_CHARS,
  PACKAGE_DETAIL_LINE_MAX_CHARS,
  EVENT_GALLERY_MAX_IMAGES,
  EVENT_ROOM_MAX_COUNT,
  EVENT_ROOM_MIN_COUNT,
  capEventRoomList,
  collectPersistedEventRoomIds,
  computeRemovedRoomIds,
  createDefaultPackageDetailRow,
  extractRoomIdsFromStepTwoRooms,
  normalizeVendorStepTwoRooms,
  packageDetailLabel,
  packageDetailPlaceholder,
} from "@/lib/event-form-limits";
import {
  EVENT_GALLERY_MIN_IMAGES_WHEN_USED,
  EVENT_GALLERY_PARTIAL_COUNT_MESSAGE,
} from "@/lib/event-gallery-count";
import { useEventData } from "../../../_lib/hooks/useEventData";
import {
  notifyVendorEventRoomSystemChanged,
  setVendorEventRoomSystemFlags,
} from "../../../_lib/vendor-room-system-toggle";
import {
  isVendorEventStructureLocked,
  vendorEventStructureLockMessage,
} from "../../../_lib/vendor-event-lifecycle";
import { patchEventPayloadFromApi } from "../../../_lib/hydrate-event-from-api";
import {
  EVENT_GALLERY_IMAGE_CROP,
  EVENT_PACKAGE_IMAGE_CROP,
  EVENT_SCHEDULER_BG_CROP,
} from "@/lib/event-image-crop-presets";
import { mapGlobalStepTwoToLocal } from "../../../_lib/map-global-step-to-local";
import {
  filterSchedulerRowsForApi,
  isVendorRoomPackageStepComplete,
  normalizePackageDetails,
  normalizeSchedulerRows,
} from "../../../_lib/normalize-step-two-fields";
import { useSyncStepFormFromGlobal } from "../../../_lib/use-sync-step-form-from-global";

// Define interfaces for gallery items and files with preview
interface FileWithPreview extends File {
  preview?: string;
}

interface GalleryItem {
  id: number;
  url: string;
  preview?: string;
}

const collectFormErrorMessages = (errors: FieldErrors): string[] => {
  const messages: string[] = [];
  const walk = (node: FieldErrors | undefined) => {
    if (!node) return;
    Object.values(node).forEach((value) => {
      if (!value) return;
      if (
        typeof value === "object" &&
        "message" in value &&
        typeof value.message === "string" &&
        value.message
      ) {
        messages.push(value.message);
        return;
      }
      if (typeof value === "object") {
        walk(value as FieldErrors);
      }
    });
  };
  walk(errors);
  return messages;
};

const getFirstErrorFieldPath = (
  errors: FieldErrors,
  prefix = "",
): string | null => {
  for (const [key, value] of Object.entries(errors)) {
    if (!value) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (
      typeof value === "object" &&
      "message" in value &&
      typeof value.message === "string"
    ) {
      return path;
    }
    if (typeof value === "object") {
      const nested = getFirstErrorFieldPath(value as FieldErrors, path);
      if (nested) return nested;
    }
  }
  return null;
};

const focusFirstValidationError = (
  errors: FieldErrors,
  setActiveField: (field: string) => void,
) => {
  const messages = collectFormErrorMessages(errors);
  if (messages.length > 0) {
    toast.error(messages.slice(0, 3).join("; "));
  }

  const firstPath = getFirstErrorFieldPath(errors);
  if (!firstPath) return;

  setActiveField(firstPath.split(".")[0] ?? firstPath);
  const errorElement = document.querySelector(`[name="${firstPath}"]`);
  if (errorElement) {
    (errorElement as HTMLElement).focus();
    errorElement.scrollIntoView({ behavior: "smooth", block: "center" });
  }
};

type RoomFormSnapshotInput = {
  package_image?: unknown;
  package_title?: string;
  package_description?: string;
  package_button_link?: string;
  package_details?: Array<{ title?: string } | undefined>;
  event_schedular_title?: string;
  event_schedule_subtitle?: string;
  event_schedular_background_image?: unknown;
  gallery?: Array<File | { id?: number; url?: string } | undefined>;
  event_schedular?: Array<{ title?: string; time?: string } | undefined>;
};

export default function PackageTab() {
  const currencySymbol = useCurrencySymbol();
  // Access the GLOBAL form context
  const {
    form: globalForm,
    advanceStep,
    markEventFormSaved,
    isLoading: globalLoading,
    setActiveField,
    readOnly,
    persistedHydrated,
    discardEpoch,
  } = useEventFormContext();

  const getEventId = (): number => {
    const stepOne = globalForm.getValues().stepOne;
    if (stepOne && typeof stepOne === "object" && "event_id" in stepOne) {
      return Number(stepOne.event_id) || 0;
    }
    return 0;
  };

  const lockStructure = isVendorEventStructureLocked({
    is_live: globalForm.watch("is_live"),
    has_bookings: globalForm.watch("has_bookings"),
  });

  const eventIdForQuery = getEventId();
  const isRoomsEnabled = useWatch({
    control: globalForm.control,
    name: "stepTwo.is_rooms",
  });
  const { eventData: persistedEventQuery, invalidateCache } = useEventData(
    eventIdForQuery > 0 ? String(eventIdForQuery) : undefined,
    isRoomsEnabled === 1,
    { enabled: eventIdForQuery > 0 },
  );

  // Create a LOCAL form instance with its own validation
  const form = useForm<StepTwoType>({
    resolver: zodResolver(stepTwoSchema) as Resolver<StepTwoType>,
    defaultValues: {
      step: 2,
      event_id: getEventId(),
      is_rooms: globalForm.getValues().stepTwo?.is_rooms === 1 ? 1 : 0,
      active_room_index: globalForm.getValues().stepTwo?.active_room_index || 0,
      rooms: globalForm.getValues().stepTwo?.rooms || [],
      package_image: globalForm.getValues().stepTwo?.package_image,
      package_title: globalForm.getValues().stepTwo?.package_title || "",
      package_description:
        globalForm.getValues().stepTwo?.package_description || "",
      package_details: globalForm.getValues().stepTwo?.package_details || [
        createDefaultPackageDetailRow(0),
      ],
      event_schedular_title:
        globalForm.getValues().stepTwo?.event_schedular_title || "",
      event_schedule_subtitle:
        globalForm.getValues().stepTwo?.event_schedule_subtitle || "",
      event_schedular_background_image:
        globalForm.getValues().stepTwo?.event_schedular_background_image ||
        null,
      event_schedular: globalForm.getValues().stepTwo?.event_schedular || [
        { title: "", time: "" },
      ],
      gallery: globalForm.getValues().stepTwo?.gallery || [],
    },
    mode: "onChange",
    reValidateMode: "onChange",
  });

  useSyncStepFormFromGlobal({
    globalForm,
    localForm: form,
    stepKey: "stepTwo",
    enabled: persistedHydrated,
    resyncKey: discardEpoch,
    toLocalValues: (stepTwo) => mapGlobalStepTwoToLocal(stepTwo, getEventId()),
    onAfterSync: (values) => {
      const pkg = values.package_image;
      if (typeof pkg === "string" && pkg) {
        setPackageImageUrl(pkg);
        setPackageImage([]);
      }
      const schedBg = values.event_schedular_background_image;
      if (schedBg instanceof File) {
        setEventSchedulerBgFile([schedBg]);
      } else {
        setEventSchedulerBgFile(null);
      }
    },
  });

  // Setup field array for package details
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "package_details",
  });
  const {
    fields: schedulerFields,
    append: appendScheduler,
    remove: removeScheduler,
  } = useFieldArray({
    control: form.control,
    name: "event_schedular",
  });

  // State for file management
  const [packageImage, setPackageImage] = useState<FileWithPreview[]>([]);
  const [packageImageUrl, setPackageImageUrl] = useState<string | null>(null);
  const [packageImageBusy, setPackageImageBusy] = useState(false);
  const [eventSchedulerBgFile, setEventSchedulerBgFile] = useState<
    File[] | null
  >(null);

  // Drag & drop state for gallery reordering
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [draggedOverItem, setDraggedOverItem] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const watchedStepTwoRooms = useWatch({
    control: globalForm.control,
    name: "stepTwo.rooms",
  });
  const watchedPackageTitle = useWatch({
    control: form.control,
    name: "package_title",
  });
  const watchedPackageDescription = useWatch({
    control: form.control,
    name: "package_description",
  });
  const watchedPackageDetails = useWatch({
    control: form.control,
    name: "package_details",
  });
  const watchedPackageImage = useWatch({
    control: form.control,
    name: "package_image",
  });
  const watchedSchedularTitle = useWatch({
    control: form.control,
    name: "event_schedular_title",
  });
  const watchedSchedular = useWatch({
    control: form.control,
    name: "event_schedular",
  });

  const canApplyToAllRooms = React.useMemo(() => {
    if (isRoomsEnabled !== 1) return false;
    const roomCount = capEventRoomList(
      normalizeVendorStepTwoRooms(watchedStepTwoRooms),
    ).length;
    if (roomCount < 2) return false;

    const resolvedPackageImage =
      packageImage.length > 0
        ? packageImage[0]
        : (watchedPackageImage ?? packageImageUrl);

    return isVendorRoomPackageStepComplete({
      package_title: watchedPackageTitle,
      package_description: watchedPackageDescription,
      package_details: watchedPackageDetails,
      package_image: resolvedPackageImage,
      event_schedular_title: watchedSchedularTitle,
      event_schedular: watchedSchedular,
    });
  }, [
    isRoomsEnabled,
    watchedStepTwoRooms,
    watchedPackageTitle,
    watchedPackageDescription,
    watchedPackageDetails,
    watchedPackageImage,
    watchedSchedularTitle,
    watchedSchedular,
    packageImage,
    packageImageUrl,
  ]);

  const activeRoomIndex = useWatch({
    control: globalForm.control,
    name: "stepTwo.active_room_index",
  });
  const getResolvedRoomIndex = useCallback(
    (rooms: NonNullable<StepTwoType["rooms"]>) => {
      return typeof activeRoomIndex === "number" && activeRoomIndex >= 0
        ? Math.min(activeRoomIndex, rooms.length - 1)
        : 0;
    },
    [activeRoomIndex],
  );

  const syncActiveRoomPackageImage = useCallback(
    (image: StepTwoType["package_image"]) => {
      if (isRoomsEnabled !== 1) return;

      const rooms = capEventRoomList(
        normalizeVendorStepTwoRooms(globalForm.getValues().stepTwo?.rooms),
      );
      if (!rooms.length) return;

      const idx = getResolvedRoomIndex(rooms);
      const updatedRooms = rooms.map((room, roomIndex) =>
        roomIndex === idx ? { ...room, package_image: image ?? null } : room,
      );

      globalForm.setValue("stepTwo.rooms", updatedRooms, {
        shouldDirty: true,
        shouldTouch: false,
      });
    },
    [globalForm, isRoomsEnabled, getResolvedRoomIndex],
  );

  const buildRoomSnapshotFromForm = useCallback(
    (
      room: NonNullable<StepTwoType["rooms"]>[number] | undefined,
      source: RoomFormSnapshotInput,
    ) => ({
      ...room,
      package_image:
        source.package_image === undefined
          ? (room?.package_image ?? null)
          : (source.package_image as StepTwoType["package_image"]),
      package_title: source.package_title ?? room?.package_title ?? "",
      package_description:
        source.package_description ?? room?.package_description ?? "",
      package_button_link:
        source.package_button_link ?? room?.package_button_link ?? "",
      package_details: normalizePackageDetails(
        source.package_details ?? room?.package_details,
      ),
      event_schedular_title:
        source.event_schedular_title ?? room?.event_schedular_title ?? "",
      event_schedule_subtitle:
        source.event_schedule_subtitle ?? room?.event_schedule_subtitle ?? "",
      event_schedular_background_image:
        source.event_schedular_background_image === undefined
          ? (room?.event_schedular_background_image ?? null)
          : (source.event_schedular_background_image as StepTwoType["event_schedular_background_image"]),
      event_schedular: normalizeSchedulerRows(
        source.event_schedular ?? room?.event_schedular,
      ),
      gallery:
        (source.gallery
          ?.filter((item): item is File | { id: number; url: string } => {
            if (!item) return false;
            if (item instanceof File) return true;
            return typeof item.id === "number" && typeof item.url === "string";
          })
          .slice(0, EVENT_GALLERY_MAX_IMAGES) as StepTwoType["gallery"]) ??
        room?.gallery ??
        ([] as NonNullable<StepTwoType["gallery"]>),
    }),
    [],
  );

  // Sync local form changes to global form
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (!name) return;

      const fieldName = name.split(".")[0] as keyof StepTwoType;
      globalForm.setValue("stepTwo", {
        ...globalForm.getValues().stepTwo,
        [fieldName]: value[fieldName],
      });

      if (isRoomsEnabled === 1) {
        const rooms = capEventRoomList(
          normalizeVendorStepTwoRooms(globalForm.getValues().stepTwo?.rooms),
        );
        if (rooms.length > 0) {
          const idx = getResolvedRoomIndex(rooms);
          const updatedRooms = rooms.map((room, roomIndex) =>
            roomIndex === idx
              ? buildRoomSnapshotFromForm(room, value as RoomFormSnapshotInput)
              : room,
          );
          globalForm.setValue("stepTwo.rooms", updatedRooms, {
            shouldDirty: true,
            shouldTouch: false,
          });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [
    form,
    globalForm,
    isRoomsEnabled,
    buildRoomSnapshotFromForm,
    getResolvedRoomIndex,
  ]);

  useEffect(() => {
    if (isRoomsEnabled !== 1) return;
    const rooms = normalizeVendorStepTwoRooms(
      globalForm.getValues().stepTwo?.rooms,
    );
    if (!rooms.length) return;
    const cappedRooms = capEventRoomList(rooms);
    const idx = getResolvedRoomIndex(cappedRooms);
    const room = cappedRooms[idx];
    if (!room) return;

    form.setValue("rooms", cappedRooms, {
      shouldDirty: false,
      shouldTouch: false,
    });
    form.setValue("active_room_index", idx, {
      shouldDirty: false,
      shouldTouch: false,
    });

    const roomPackageImage = room.package_image ?? null;
    const roomSchedulerBg = room.event_schedular_background_image ?? null;
    const roomGallery = (room.gallery ?? []) as StepTwoType["gallery"];

    form.setValue("package_image", roomPackageImage, {
      shouldDirty: false,
      shouldTouch: false,
    });
    form.setValue("package_title", room.package_title || "", {
      shouldDirty: false,
      shouldTouch: false,
    });
    form.setValue("package_description", room.package_description || "", {
      shouldDirty: false,
      shouldTouch: false,
    });
    form.setValue("package_button_link", room.package_button_link || "", {
      shouldDirty: false,
      shouldTouch: false,
    });
    form.setValue(
      "package_details",
      normalizePackageDetails(
        room.package_details as
          | Array<{ title?: string } | undefined>
          | undefined,
      ),
      { shouldDirty: false, shouldTouch: false },
    );
    form.setValue("event_schedular_title", room.event_schedular_title || "", {
      shouldDirty: false,
      shouldTouch: false,
    });
    form.setValue(
      "event_schedule_subtitle",
      room.event_schedule_subtitle || "",
      {
        shouldDirty: false,
        shouldTouch: false,
      },
    );
    form.setValue("event_schedular_background_image", roomSchedulerBg, {
      shouldDirty: false,
      shouldTouch: false,
    });
    form.setValue(
      "event_schedular",
      normalizeSchedulerRows(
        room.event_schedular as
          | Array<{ title?: string; time?: string }>
          | undefined,
      ),
      {
        shouldDirty: false,
        shouldTouch: false,
      },
    );
    form.setValue("gallery", roomGallery || [], {
      shouldDirty: false,
      shouldTouch: false,
    });

    if (typeof roomPackageImage === "string" && roomPackageImage) {
      setPackageImageUrl(roomPackageImage);
      setPackageImage([]);
    } else if (roomPackageImage instanceof File) {
      setPackageImageUrl(null);
      setPackageImage([roomPackageImage as FileWithPreview]);
    } else {
      setPackageImageUrl(null);
      setPackageImage([]);
    }

    if (typeof roomSchedulerBg === "string" && roomSchedulerBg) {
      setEventSchedulerBgFile(null);
    } else if (roomSchedulerBg instanceof File) {
      setEventSchedulerBgFile([roomSchedulerBg]);
    } else {
      setEventSchedulerBgFile(null);
    }
  }, [isRoomsEnabled, activeRoomIndex, globalForm, form, getResolvedRoomIndex]);

  // Initialize URL value from form on mount
  useEffect(() => {
    const packageImageValue = form.watch("package_image");
    const schedulerBackgroundValue = form.watch(
      "event_schedular_background_image",
    );

    // Check if value is a string URL
    if (typeof packageImageValue === "string" && packageImageValue) {
      setPackageImageUrl(packageImageValue);
    } else if (packageImageValue instanceof File) {
      setPackageImage([packageImageValue]);
    }

    if (schedulerBackgroundValue) {
      if (typeof schedulerBackgroundValue === "string") {
        setEventSchedulerBgFile(null);
      } else if (schedulerBackgroundValue instanceof File) {
        setEventSchedulerBgFile([schedulerBackgroundValue]);
      }
    } else {
      setEventSchedulerBgFile(null);
    }
  }, [form]);

  // Handle field focus for tracking active field
  const handleFieldFocus = useCallback(
    (fieldName: string) => {
      setActiveField?.(fieldName);
    },
    [setActiveField],
  );

  // Handle file change for package image
  const handleFileChange = useCallback(
    (files: FileWithPreview[], onFieldChange?: (file: File) => void) => {
      if (!files.length) return;

      const file = files[0];

      // Validate file is actually an image
      if (!file.type.startsWith("image/")) {
        toast.error(
          "Only image files are allowed. Please select a JPG, PNG, or other image file.",
        );
        return;
      }

      // Create a preview URL if it doesn't exist
      if (!file.preview) {
        file.preview = URL.createObjectURL(file);
      }

      setPackageImage(files);
      setPackageImageUrl(null); // Clear URL when new file is uploaded

      onFieldChange?.(file);

      // Update form state and re-run validation so the required error clears.
      form.setValue("package_image", file, {
        shouldDirty: true,
        shouldValidate: true,
      });

      globalForm.setValue("stepTwo.package_image", file, {
        shouldDirty: true,
      });
      syncActiveRoomPackageImage(file);
    },
    [form, globalForm, syncActiveRoomPackageImage],
  );

  // Handle removing package image
  const handleRemovePackage = useCallback(() => {
    // Clean up preview URLs
    if (packageImage.length > 0 && packageImage[0].preview) {
      URL.revokeObjectURL(packageImage[0].preview);
    }

    setPackageImage([]);
    setPackageImageUrl(null);
    setPackageImageBusy(false);

    form.setValue("package_image", null, {
      shouldDirty: true,
      shouldValidate: true,
    });
    globalForm.setValue("stepTwo.package_image", null, { shouldDirty: true });
    syncActiveRoomPackageImage(null);
  }, [packageImage, form, globalForm, syncActiveRoomPackageImage]);

  // Clean up preview URLs when component unmounts
  useEffect(() => {
    return () => {
      if (packageImage.length > 0 && packageImage[0].preview) {
        URL.revokeObjectURL(packageImage[0].preview);
      }
    };
  }, [packageImage]);

  // Drag & drop handlers for gallery reordering
  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    index: number,
  ) => {
    e.dataTransfer.effectAllowed = "move";
    setDraggedItem(index);
    // Hide the default drag ghost
    e.dataTransfer.setDragImage(new window.Image(), 0, 0);
  };

  const handleDragEnter = (index: number) => {
    if (draggedItem === null || draggedItem === index) return;
    setDraggedOverItem(index);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>,
    gallery: Array<File | GalleryItem>,
  ) => {
    e.preventDefault();

    if (
      draggedItem === null ||
      draggedOverItem === null ||
      draggedItem === draggedOverItem
    ) {
      setDraggedItem(null);
      setDraggedOverItem(null);
      return;
    }

    // Reorder the items
    const items = [...gallery];
    const item = items[draggedItem];
    items.splice(draggedItem, 1);
    items.splice(draggedOverItem, 0, item);

    // Update form state
    form.setValue("gallery", items);
    globalForm.setValue("stepTwo.gallery", items);

    // Reset drag state
    setDraggedItem(null);
    setDraggedOverItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDraggedOverItem(null);
  };

  const handleSubmit = useCallback(
    async (
      data: StepTwoType,
      options?: {
        applyToAllRooms?: boolean;
      },
    ) => {
      const applyToAllRooms = options?.applyToAllRooms === true;
      setIsLoading(true);

      try {
        // Manually re-trigger validation on all fields to force error display
        const isValid = await form.trigger();

        // If form is not valid, highlight fields and show a toast (room buttons used to fail silently).
        if (!isValid) {
          focusFirstValidationError(form.formState.errors, setActiveField);
          setIsLoading(false);
          return;
        }

        // SAFETY CHECK: Ensure package image is included if we have it in state
        if (packageImage.length > 0 && !data.package_image) {
          data.package_image = packageImage[0];
        }

        let payload: StepTwoType = { ...data };
        let mergedRoomsForGlobal: NonNullable<StepTwoType["rooms"]> | undefined;
        if (isRoomsEnabled === 1) {
          const existingRooms = (globalForm.getValues().stepTwo?.rooms ||
            []) as NonNullable<StepTwoType["rooms"]>;
          if (existingRooms.length < EVENT_ROOM_MIN_COUNT) {
            toast.error(
              `Please create at least ${EVENT_ROOM_MIN_COUNT} rooms first.`,
            );
            setIsLoading(false);
            return;
          }
          if (existingRooms.length > EVENT_ROOM_MAX_COUNT) {
            toast.error(`Maximum ${EVENT_ROOM_MAX_COUNT} rooms are allowed.`);
            setIsLoading(false);
            return;
          }

          const idx = getResolvedRoomIndex(existingRooms);
          const activeRoom = existingRooms[idx];
          const activeSnapshotRaw = buildRoomSnapshotFromForm(activeRoom, data);
          const activeSnapshot = {
            ...activeSnapshotRaw,
            event_schedular: filterSchedulerRowsForApi(
              activeSnapshotRaw.event_schedular,
            ),
          };

          if (
            filterSchedulerRowsForApi(activeSnapshot.event_schedular).length ===
            0
          ) {
            const roomLabel =
              String(activeSnapshot.name || activeRoom?.name || "").trim() ||
              "this room";
            toast.error(
              `Add at least one schedule time and title for "${roomLabel}".`,
            );
            setIsLoading(false);
            return;
          }

          let roomsForApi: NonNullable<StepTwoType["rooms"]>;

          if (applyToAllRooms) {
            mergedRoomsForGlobal = existingRooms.map((room, roomIndex) =>
              roomIndex === idx
                ? activeSnapshot
                : {
                    ...room,
                    package_image: activeSnapshot.package_image,
                    package_title: activeSnapshot.package_title,
                    package_description: activeSnapshot.package_description,
                    package_button_link: activeSnapshot.package_button_link,
                    package_details: activeSnapshot.package_details,
                    event_schedular_title: activeSnapshot.event_schedular_title,
                    event_schedule_subtitle:
                      activeSnapshot.event_schedule_subtitle,
                    event_schedular_background_image:
                      activeSnapshot.event_schedular_background_image,
                    event_schedular: activeSnapshot.event_schedular,
                    gallery: activeSnapshot.gallery,
                  },
            );
            roomsForApi = mergedRoomsForGlobal.map((room) => ({
              ...room,
              event_schedular: filterSchedulerRowsForApi(room.event_schedular),
            }));

            const roomMissingAnySchedule = roomsForApi.find(
              (room) =>
                filterSchedulerRowsForApi(room.event_schedular).length === 0,
            );
            if (roomMissingAnySchedule) {
              const roomLabel =
                String(roomMissingAnySchedule.name || "").trim() || "each room";
              toast.error(
                `Complete schedule details for "${roomLabel}" before saving (switch room in the sidebar).`,
              );
              setIsLoading(false);
              return;
            }
          } else {
            roomsForApi = [activeSnapshot];
            mergedRoomsForGlobal = existingRooms.map((room, roomIndex) =>
              roomIndex === idx ? activeSnapshot : room,
            );
          }

          const persistedRoot = persistedEventQuery?.data as
            | {
                stepTwo?: { rooms?: unknown };
                stepThree?: { rooms?: unknown };
                stepFour?: { rooms?: unknown };
                stepFive?: { rooms?: unknown };
                stepSix?: { rooms?: unknown };
              }
            | undefined;
          const persistedRoomIds = collectPersistedEventRoomIds(
            persistedRoot ?? {},
          );
          const selectedRoomIds = extractRoomIdsFromStepTwoRooms(
            capEventRoomList(existingRooms),
          );
          const removed_room_ids = computeRemovedRoomIds(
            persistedRoomIds,
            selectedRoomIds,
          );

          payload = {
            ...data,
            is_rooms: 1,
            rooms: roomsForApi,
            active_room_index: idx,
            ...(removed_room_ids.length > 0 ? { removed_room_ids } : {}),
          };
        } else {
          payload = {
            ...data,
            is_rooms: 0,
          };
        }

        if (isRoomsEnabled === 1 && mergedRoomsForGlobal) {
          globalForm.setValue("stepTwo.rooms", mergedRoomsForGlobal, {
            shouldDirty: true,
            shouldTouch: false,
          });
          globalForm.setValue(
            "stepTwo.active_room_index",
            payload.active_room_index ?? 0,
            {
              shouldDirty: false,
              shouldTouch: false,
            },
          );
        } else if (isRoomsEnabled !== 1) {
          globalForm.setValue("stepTwo", {
            ...globalForm.getValues().stepTwo,
            ...payload,
          });
        }

        const response = await eventsService.storeStepTwoData(payload);

        if (response && response.status) {
          const responseData = response.data as
            | {
                gallery?: Array<{ id: number; url: string }>;
                rooms?: Record<string, Record<string, unknown>>;
              }
            | undefined;

          if (
            payload.is_rooms !== 1 &&
            responseData?.gallery &&
            Array.isArray(responseData.gallery)
          ) {
            const cappedGallery = responseData.gallery.slice(
              0,
              EVENT_GALLERY_MAX_IMAGES,
            );
            globalForm.setValue("stepTwo.gallery", cappedGallery);
            form.setValue("gallery", cappedGallery);
          }

          if (payload.is_rooms === 1 && responseData?.rooms) {
            const hydratedFromApi = capEventRoomList(
              normalizeVendorStepTwoRooms(responseData.rooms).map((room) => ({
                ...room,
                package_details: normalizePackageDetails(room.package_details),
                event_schedular: normalizeSchedulerRows(room.event_schedular),
              })),
            );

            if (!applyToAllRooms && hydratedFromApi.length > 0) {
              const savedRoom = hydratedFromApi[0];
              const savedRoomId = Number(savedRoom.room_id);
              const currentRooms = capEventRoomList(
                normalizeVendorStepTwoRooms(
                  globalForm.getValues().stepTwo?.rooms,
                ),
              );
              const mergedRooms = currentRooms.map((room) =>
                Number(room.room_id) === savedRoomId
                  ? { ...room, ...savedRoom }
                  : room,
              );
              globalForm.setValue("stepTwo.rooms", mergedRooms, {
                shouldDirty: false,
                shouldTouch: false,
              });
            } else {
              globalForm.setValue("stepTwo.rooms", hydratedFromApi, {
                shouldDirty: false,
                shouldTouch: false,
              });
            }
          }

          if (payload.is_rooms === 1) {
            const allRooms = capEventRoomList(
              normalizeVendorStepTwoRooms(
                globalForm.getValues().stepTwo?.rooms,
              ),
            );
            const currentIndex =
              typeof payload.active_room_index === "number"
                ? payload.active_room_index
                : 0;

            if (!applyToAllRooms) {
              const nextUnfilledIndex = allRooms.findIndex(
                (room, index) =>
                  index !== currentIndex &&
                  !isVendorRoomPackageStepComplete(room),
              );
              if (nextUnfilledIndex !== -1) {
                globalForm.setValue(
                  "stepTwo.active_room_index",
                  nextUnfilledIndex,
                  {
                    shouldDirty: false,
                    shouldTouch: false,
                  },
                );
                toast.info("Saved. Continue with the next room.");
                markEventFormSaved(2);
                return;
              }
            }
          }

          await advanceStep(2, response);
        } else {
          console.error("Error saving package details:", response);
        }
      } catch (error) {
        console.error("Error saving package details:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [
      form,
      globalForm,
      advanceStep,
      markEventFormSaved,
      setActiveField,
      packageImage,
      isRoomsEnabled,
      buildRoomSnapshotFromForm,
      getResolvedRoomIndex,
    ],
  );

  const syncLocalFormRoomContext = useCallback(() => {
    if (isRoomsEnabled !== 1) return;
    const cappedRooms = capEventRoomList(
      normalizeVendorStepTwoRooms(globalForm.getValues().stepTwo?.rooms),
    );
    const idx = getResolvedRoomIndex(cappedRooms);
    const activeRoom = cappedRooms[idx];
    const resolvedPackageImage =
      packageImage.length > 0
        ? packageImage[0]
        : (activeRoom?.package_image ?? form.getValues("package_image"));

    form.setValue("is_rooms", 1, { shouldValidate: false });
    form.setValue("rooms", cappedRooms, { shouldValidate: false });
    form.setValue("active_room_index", idx, { shouldValidate: false });
    form.setValue("package_image", resolvedPackageImage ?? null, {
      shouldValidate: false,
    });
  }, [form, globalForm, isRoomsEnabled, getResolvedRoomIndex, packageImage]);

  const resetLocalFormFromGlobalStepTwo = useCallback(() => {
    const mapped = mapGlobalStepTwoToLocal(
      globalForm.getValues().stepTwo,
      getEventId(),
    );
    form.reset(mapped, { keepDefaultValues: false });

    const pkg = mapped.package_image;
    if (typeof pkg === "string" && pkg) {
      setPackageImageUrl(pkg);
      setPackageImage([]);
    } else if (pkg instanceof File) {
      setPackageImageUrl(null);
      setPackageImage([pkg as FileWithPreview]);
    } else {
      setPackageImageUrl(null);
      setPackageImage([]);
    }

    const schedBg = mapped.event_schedular_background_image;
    if (schedBg instanceof File) {
      setEventSchedulerBgFile([schedBg]);
    } else {
      setEventSchedulerBgFile(null);
    }
  }, [globalForm, form]);

  const handleRoomSystemChange = useCallback(
    async (nextValue: 0 | 1) => {
      if (readOnly || lockStructure) return;

      const prevValue = globalForm.getValues().stepTwo?.is_rooms === 1 ? 1 : 0;
      if (nextValue === prevValue) return;

      const eventId = getEventId();
      setVendorEventRoomSystemFlags(globalForm, nextValue, {
        eventId,
        localForm: form,
      });

      notifyVendorEventRoomSystemChanged(invalidateCache, eventId);

      if (eventId <= 0) {
        resetLocalFormFromGlobalStepTwo();
        return;
      }

      try {
        const response = await eventsService.getEvent(eventId, {
          isRooms: nextValue === 1,
        });
        if (response?.status && response.data) {
          const patched = patchEventPayloadFromApi(
            response.data as unknown as Record<string, unknown>,
          );
          globalForm.setValue("stepTwo", patched.stepTwo, {
            shouldDirty: false,
            shouldTouch: false,
          });
          globalForm.setValue("stepOne.is_rooms", patched.stepOne.is_rooms, {
            shouldDirty: false,
            shouldTouch: false,
          });
        }
      } finally {
        resetLocalFormFromGlobalStepTwo();
      }
    },
    [
      readOnly,
      lockStructure,
      globalForm,
      form,
      resetLocalFormFromGlobalStepTwo,
      invalidateCache,
    ],
  );

  const attemptSubmit = useCallback(
    async (applyToAllRooms: boolean) => {
      syncLocalFormRoomContext();
      const isValid = await form.trigger();
      if (!isValid) {
        focusFirstValidationError(form.formState.errors, setActiveField);
        return;
      }
      await handleSubmit(form.getValues() as StepTwoType, { applyToAllRooms });
    },
    [form, syncLocalFormRoomContext, handleSubmit, setActiveField],
  );

  return (
    <div className="space-y-8">
      <Form {...form}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void attemptSubmit(false);
          }}
          className="space-y-6"
          noValidate
          autoComplete="off"
        >
          {/* Packages and Gallery Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold title-header">
                Packages &amp; Gallery
              </h2>
            </div>

            <FormField
              control={form.control}
              name="is_rooms"
              render={() => (
                <FormItem className="rounded-lg border border-[#E5E7EB] p-4 bg-[#FAFCFC]">
                  <FormLabel className="text-sm font-semibold">
                    Does your event use multiple rooms or areas?
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={String(isRoomsEnabled === 1 ? 1 : 0)}
                      onValueChange={(value) => {
                        if (readOnly || lockStructure) return;
                        void handleRoomSystemChange(value === "1" ? 1 : 0);
                      }}
                      disabled={readOnly || lockStructure}
                      className="flex items-center gap-6 pt-2"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem
                            value="1"
                            disabled={readOnly || lockStructure}
                          />
                        </FormControl>
                        <Label
                          className={
                            readOnly || lockStructure
                              ? "font-medium text-muted-foreground"
                              : "font-medium cursor-pointer"
                          }
                        >
                          Yes
                        </Label>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem
                            value="0"
                            disabled={readOnly || lockStructure}
                          />
                        </FormControl>
                        <Label
                          className={
                            readOnly || lockStructure
                              ? "font-medium text-muted-foreground"
                              : "font-medium cursor-pointer"
                          }
                        >
                          No
                        </Label>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <p className="text-xs leading-relaxed text-muted-foreground mt-1">
                    {lockStructure
                      ? vendorEventStructureLockMessage("rooms")
                      : "Choose Yes when rooms have different packages, dates, menus, drinks, or brochures. Choose No for one shared setup across the venue."}
                  </p>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Package Title */}
              <FormField
                control={form.control}
                name="package_title"
                render={({ field }) => {
                  const v = typeof field.value === "string" ? field.value : "";
                  const maxLength = EVENT_PACKAGE_MAIN_HEADING_MAX_CHARS;
                  return (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Main event heading{" "}
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., What's included"
                          className="h-11 bg-[#F9FAFB] border-[#E5E7EB]"
                          maxLength={maxLength}
                          onFocus={() => handleFieldFocus("package_title")}
                          onChange={(e) => {
                            field.onChange(e);
                            globalForm.setValue(
                              "stepTwo.package_title",
                              e.target.value,
                            );
                          }}
                          onBlur={field.onBlur}
                          value={v}
                        />
                      </FormControl>
                      <div className="text-xs text-gray-500 mt-1">
                        {v.length}/{maxLength} characters
                      </div>
                      <FormMessage className="text-red-500 font-semibold mt-1" />
                    </FormItem>
                  );
                }}
              />

              {/* Package Description */}
              <FormField
                control={form.control}
                name="package_description"
                render={({ field }) => {
                  const v = typeof field.value === "string" ? field.value : "";
                  const maxLength = EVENT_PACKAGE_SUB_HEADING_MAX_CHARS;
                  return (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Subheading <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={`e.g. Prices from ${currencySymbol}65 plus VAT. Includes:`}
                          className="h-10 bg-[#F9FAFB] border-[#E5E7EB]"
                          maxLength={maxLength}
                        />
                      </FormControl>
                      <div className="text-xs text-gray-500 mt-1">
                        {v.length}/{maxLength} characters
                      </div>
                      <FormMessage className="text-red-500 font-semibold mt-1" />
                    </FormItem>
                  );
                }}
              />
            </div>
          </div>

          {/* Package Image Section */}
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="package_image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    Highlights image
                  </FormLabel>
                  <FormControl>
                    <div className="relative min-h-[15rem]">
                      {packageImageBusy &&
                      !packageImageUrl &&
                      packageImage.length === 0 ? (
                        <div
                          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-primary/40 bg-background/95 px-4"
                          aria-live="polite"
                          aria-busy="true"
                        >
                          <Loader2
                            className="h-10 w-10 animate-spin text-primary"
                            aria-hidden="true"
                          />
                          <div className="space-y-1 text-center">
                            <p className="text-sm font-semibold text-foreground">
                              Processing package image…
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Crop & optimise dialog may open — please wait
                            </p>
                          </div>
                        </div>
                      ) : null}
                      {packageImageUrl ? (
                        <div className="relative w-full">
                          <img
                            src={addCacheBusting(
                              (packageImageUrl as string) || "",
                            )}
                            alt="Package Image"
                            width={400}
                            height={200}
                            className="max-h-60 object-contain mx-auto mb-2"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setPackageImageUrl(null);
                              setPackageImage([]);
                              field.onChange(null);
                              form.setValue("package_image", null, {
                                shouldDirty: true,
                                shouldValidate: true,
                              });
                              globalForm.setValue(
                                "stepTwo.package_image",
                                null,
                                {
                                  shouldDirty: true,
                                },
                              );
                              syncActiveRoomPackageImage(null);
                            }}
                            className="mt-2"
                          >
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <FileUploader
                          value={packageImage}
                          onValueChange={(files) =>
                            handleFileChange(files, field.onChange)
                          }
                          onBusyChange={setPackageImageBusy}
                          maxFileCount={1}
                          maxSize={10 * 1024 * 1024}
                          onRemove={handleRemovePackage}
                          className="h-60"
                          accept={{ "image/*": [] }}
                          enableCropping={true}
                          autoCompress={false}
                          aspectRatio={EVENT_PACKAGE_IMAGE_CROP.aspectRatio}
                          cropConfig={EVENT_PACKAGE_IMAGE_CROP}
                        />
                      )}
                    </div>
                  </FormControl>
                  <FormMessage className="text-red-500 font-semibold mt-1" />
                </FormItem>
              )}
            />
          </div>

          {/* Package Details Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold title-header">
                What guests can expect
              </h3>
              {fields.length < 10 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newDetail = createDefaultPackageDetailRow(
                      fields.length,
                    );
                    append(newDetail);

                    // Sync with global form
                    const currentDetails =
                      globalForm.getValues().stepTwo?.package_details || [];
                    globalForm.setValue("stepTwo.package_details", [
                      ...currentDetails,
                      newDetail,
                    ]);
                  }}
                  className="bg-white border-gray-200 text-gray-700"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add detail
                </Button>
              )}
            </div>

            {fields.map((item, index) => (
              <Card
                key={item.id}
                className="p-4 border border-gray-200 shadow-sm rounded-lg bg-white"
              >
                <CardContent className="p-0 flex items-center gap-4">
                  <FormField
                    control={form.control}
                    name={`package_details.${index}.title`}
                    render={({ field }) => {
                      const val = field.value || "";
                      const maxLength = PACKAGE_DETAIL_LINE_MAX_CHARS;
                      return (
                        <FormItem className="flex-1">
                          <FormLabel className="text-sm font-medium">
                            {packageDetailLabel(index)}
                          </FormLabel>
                          <FormControl>
                            <div className="w-full">
                              <Input
                                {...field}
                                placeholder={packageDetailPlaceholder(index)}
                                className="h-11 bg-[#F9FAFB] border-[#E5E7EB]"
                                maxLength={maxLength}
                                onFocus={() =>
                                  handleFieldFocus(
                                    `package_details.${index}.title`,
                                  )
                                }
                                onChange={(e) => {
                                  field.onChange(e);
                                  const currentDetails = [
                                    ...(globalForm.getValues().stepTwo
                                      ?.package_details || []),
                                  ];
                                  if (currentDetails[index]) {
                                    currentDetails[index].title =
                                      e.target.value;
                                    globalForm.setValue(
                                      "stepTwo.package_details",
                                      currentDetails,
                                    );
                                  }
                                }}
                                onBlur={field.onBlur}
                                value={val}
                              />
                              <div className="text-xs text-gray-500 mt-1">
                                {val.length}/{maxLength} characters
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage className="text-red-500 font-semibold mt-1" />
                        </FormItem>
                      );
                    }}
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      // Check if this would leave us with no package details
                      if (fields.length <= 1) {
                        toast.error("At least one package detail is required");
                        return;
                      }

                      remove(index);

                      // Sync with global form
                      const currentDetails = [
                        ...(globalForm.getValues().stepTwo?.package_details ||
                          []),
                      ];
                      currentDetails.splice(index, 1);
                      globalForm.setValue(
                        "stepTwo.package_details",
                        currentDetails,
                      );
                    }}
                    disabled={fields.length <= 1}
                    className="text-red-500 h-11 w-11 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Event Scheduler Section */}
          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center gap-3 title-header">
              <h3 className="text-lg font-semibold">Event Schedule</h3>
            </div>

            <FormField
              control={form.control}
              name="event_schedular_title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Event schedule title{" "}
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g. Event Schedule"
                      className="h-11 bg-[#F9FAFB] border-[#E5E7EB]"
                      onFocus={() => handleFieldFocus("event_schedular_title")}
                      onChange={(e) => {
                        field.onChange(e);
                        globalForm.setValue(
                          "stepTwo.event_schedular_title",
                          e.target.value,
                        );
                      }}
                    />
                  </FormControl>
                  <FormMessage className="text-red-500 font-semibold mt-1" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="event_schedule_subtitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Timeline Subtitle
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Set the flow for your guests, from doors open to final call."
                      className="h-11 bg-[#F9FAFB] border-[#E5E7EB]"
                      onFocus={() =>
                        handleFieldFocus("event_schedule_subtitle")
                      }
                      onChange={(e) => {
                        field.onChange(e);
                        globalForm.setValue(
                          "stepTwo.event_schedule_subtitle",
                          e.target.value,
                        );
                      }}
                    />
                  </FormControl>
                  <FormMessage className="text-red-500 font-semibold mt-1" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="event_schedular_background_image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    Event schedule background image
                  </FormLabel>
                  <FormControl>
                    {typeof field.value === "string" && field.value ? (
                      <div className="relative w-full">
                        <img
                          src={addCacheBusting(field.value)}
                          alt="Scheduler Background"
                          width={400}
                          height={200}
                          className="max-h-60 object-contain mx-auto mb-2"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            field.onChange(null);
                            setEventSchedulerBgFile(null);
                            globalForm.setValue(
                              "stepTwo.event_schedular_background_image",
                              null,
                            );
                          }}
                          className="mt-2"
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <FileUploader
                        value={eventSchedulerBgFile || []}
                        onValueChange={(files) => {
                          if (files.length > 0) {
                            setEventSchedulerBgFile(files);
                            field.onChange(files[0]);
                            globalForm.setValue(
                              "stepTwo.event_schedular_background_image",
                              files[0],
                            );
                          }
                        }}
                        maxFileCount={1}
                        maxSize={2 * 1024 * 1024}
                        onRemove={() => {
                          field.onChange(undefined);
                          setEventSchedulerBgFile(null);
                          globalForm.setValue(
                            "stepTwo.event_schedular_background_image",
                            undefined as unknown as File,
                          );
                        }}
                        accept={{
                          "image/png": [".png"],
                          "image/jpeg": [".jpg", ".jpeg"],
                          "image/webp": [".webp"],
                        }}
                        enableCropping={true}
                        autoCompress={false}
                        aspectRatio={undefined}
                        cropConfig={EVENT_SCHEDULER_BG_CROP}
                      />
                    )}
                  </FormControl>
                  <FormMessage className="text-red-500 font-semibold mt-1" />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              {schedulerFields.map((schedulerField, index) => (
                <div
                  key={schedulerField.id}
                  className="flex items-center justify-between gap-4 p-4 border border-[#E5E7EB] rounded-md bg-white"
                >
                  <div className="flex-1">
                    <FormField
                      control={form.control}
                      name={`event_schedular.${index}.title`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Event Title"
                              className="h-11 bg-[#F9FAFB] border-[#E5E7EB]"
                              onFocus={() =>
                                handleFieldFocus("event_schedular")
                              }
                              onChange={(e) => {
                                field.onChange(e);
                                const currentSchedulers =
                                  form.getValues("event_schedular") || [];
                                globalForm.setValue(
                                  "stepTwo.event_schedular",
                                  currentSchedulers,
                                );
                              }}
                            />
                          </FormControl>
                          <FormMessage className="text-red-500 font-semibold mt-1" />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex-1">
                    <FormField
                      control={form.control}
                      name={`event_schedular.${index}.time`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              {...field}
                              type="time"
                              className="h-11 bg-[#F9FAFB] border-[#E5E7EB]"
                              onFocus={() =>
                                handleFieldFocus("event_schedular")
                              }
                              onChange={(e) => {
                                field.onChange(e.target.value);
                                const currentSchedulers =
                                  form.getValues("event_schedular") || [];
                                globalForm.setValue(
                                  "stepTwo.event_schedular",
                                  currentSchedulers,
                                );
                              }}
                            />
                          </FormControl>
                          <FormMessage className="text-red-500 font-semibold mt-1" />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (schedulerFields.length === 1) return;
                      removeScheduler(index);
                      const updatedSchedulers = (
                        form.getValues("event_schedular") || []
                      ).filter((_, i) => i !== index);
                      globalForm.setValue(
                        "stepTwo.event_schedular",
                        updatedSchedulers,
                      );
                    }}
                    disabled={schedulerFields.length === 1}
                    className="h-11 w-11 p-0 text-red-500 hover:bg-red-50"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const newItem = { title: "", time: "" };
                appendScheduler(newItem);
                const updatedSchedulers = [
                  ...(form.getValues("event_schedular") || []),
                  newItem,
                ];
                globalForm.setValue(
                  "stepTwo.event_schedular",
                  updatedSchedulers,
                );
                handleFieldFocus("event_schedular");
              }}
              className="flex items-center gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              Add Schedule
            </Button>
          </div>

          {/* Gallery Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold title-header">
              Gallery images
            </h3>
            <p className="text-sm text-muted-foreground">
              Optional. Skip the gallery, or add at least{" "}
              {EVENT_GALLERY_MIN_IMAGES_WHEN_USED} photos.
            </p>
            <GalleryCopyrightNotice />
            <FormField
              control={form.control}
              name="gallery"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="space-y-4">
                      {/* Display gallery preview grid */}
                      {field.value && field.value.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                          {field.value.map(
                            (
                              item: File | GalleryItem | string,
                              index: number,
                            ) => (
                              <div
                                key={index}
                                className={`relative aspect-square rounded-md overflow-hidden border ${
                                  index === draggedOverItem
                                    ? "border-blue-500 border-2"
                                    : index === 0
                                      ? "border-green-500"
                                      : "border-gray-200"
                                } ${
                                  draggedItem === index
                                    ? "opacity-50"
                                    : "opacity-100"
                                } transition-all cursor-move`}
                                draggable
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragEnter={() => handleDragEnter(index)}
                                onDragOver={handleDragOver}
                                onDragEnd={handleDragEnd}
                                onDrop={(e) => handleDrop(e, field.value || [])}
                              >
                                {/* Drag handle */}
                                <div className="absolute top-2 left-2 z-10 bg-white/80 rounded-full p-1 shadow-sm">
                                  <GripVertical className="h-4 w-4 text-gray-600" />
                                </div>

                                <img
                                  src={addCacheBusting(
                                    typeof item === "string"
                                      ? (item as string)
                                      : (((item as GalleryItem).url ||
                                          (item as FileWithPreview).preview ||
                                          "") as string),
                                  )}
                                  alt={`Gallery image ${index + 1}`}
                                  width={200}
                                  height={200}
                                  className="w-full h-full object-cover"
                                />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  className="absolute top-2 right-2 h-6 w-6 rounded-full"
                                  onClick={() => {
                                    const updatedItems = (
                                      field.value || []
                                    ).filter(
                                      (_: File | GalleryItem, i: number) =>
                                        i !== index,
                                    );
                                    field.onChange(updatedItems);

                                    // Sync with global form
                                    globalForm.setValue(
                                      "stepTwo.gallery",
                                      updatedItems,
                                    );
                                  }}
                                >
                                  <Trash className="h-3 w-3" />
                                </Button>
                                {index === 0 && (
                                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs py-1 px-2 text-center">
                                    Main image
                                  </div>
                                )}
                              </div>
                            ),
                          )}
                        </div>
                      )}

                      {/* File Uploader */}
                      {(!field.value ||
                        field.value.length < EVENT_GALLERY_MAX_IMAGES) && (
                        <FileUploader
                          value={[]}
                          onValueChange={(files) => {
                            const currentItems = field.value || [];
                            const newItems = [...currentItems, ...files];
                            const limitedItems = newItems.slice(
                              0,
                              EVENT_GALLERY_MAX_IMAGES,
                            );

                            field.onChange(limitedItems);

                            // Sync with global form
                            globalForm.setValue(
                              "stepTwo.gallery",
                              limitedItems,
                            );
                          }}
                          maxFileCount={
                            EVENT_GALLERY_MAX_IMAGES -
                            (field.value?.length || 0)
                          }
                          maxSize={5 * 1024 * 1024}
                          moreLabel
                          accept={{
                            "image/png": [],
                            "image/jpeg": [],
                            "image/jpg": [],
                            "image/webp": [],
                          }}
                          enableCropping={true}
                          autoCompress={false}
                          aspectRatio={undefined}
                          cropConfig={EVENT_GALLERY_IMAGE_CROP}
                        />
                      )}

                      {field.value &&
                        field.value.length > 0 &&
                        field.value.length <
                          EVENT_GALLERY_MIN_IMAGES_WHEN_USED && (
                          <p className="text-red-500 text-sm font-medium mt-2">
                            {EVENT_GALLERY_PARTIAL_COUNT_MESSAGE}
                          </p>
                        )}

                      {field.value &&
                        field.value.length >= EVENT_GALLERY_MAX_IMAGES && (
                          <p className="text-amber-600 text-sm mt-2">
                            Maximum of {EVENT_GALLERY_MAX_IMAGES} images
                            reached. Remove some images to add more.
                          </p>
                        )}

                      {field.value && field.value.length > 0 && (
                        <p className="text-gray-600 text-sm mt-2">
                          <strong>Tip:</strong> The first image will be used as
                          the main image.
                        </p>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage className="text-red-500 font-semibold mt-1" />
                </FormItem>
              )}
            />
          </div>

          {/* Submit Buttons */}
          <div className="space-y-2">
            {form.formState.errors.rooms?.message ? (
              <p className="text-red-500 text-sm font-semibold text-right">
                {String(form.formState.errors.rooms.message)}
              </p>
            ) : null}
            {form.formState.errors.event_schedular?.message ? (
              <p className="text-red-500 text-sm font-semibold text-right">
                {String(form.formState.errors.event_schedular.message)}
              </p>
            ) : null}
            {form.formState.errors.package_image?.message ? (
              <p className="text-red-500 text-sm font-semibold text-right">
                {String(form.formState.errors.package_image.message)}
              </p>
            ) : null}
            <div className="flex justify-end mt-6 gap-2">
              {canApplyToAllRooms && (
                <Button
                  type="button"
                  disabled={isLoading || globalLoading || readOnly}
                  variant="outline"
                  onClick={() => void attemptSubmit(true)}
                >
                  {isLoading || globalLoading
                    ? "Saving..."
                    : "Apply to all rooms"}
                </Button>
              )}
              <Button
                type={isRoomsEnabled === 1 ? "button" : "submit"}
                onClick={
                  isRoomsEnabled === 1
                    ? () => void attemptSubmit(false)
                    : undefined
                }
                disabled={isLoading || globalLoading || readOnly}
                variant="event-primary"
              >
                {readOnly
                  ? "View only"
                  : isLoading || globalLoading
                    ? "Saving..."
                    : isRoomsEnabled === 1
                      ? "Apply to this room only"
                      : "Save & Next"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
