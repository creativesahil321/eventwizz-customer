"use client";

import React, { useCallback, useState, useEffect, useRef, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  OnboardingCard,
} from "@/components/ui/card";
import { useFormContext } from "../../form-provider";
import {
  normalizeEventSchedularForSave,
  stepFourSchema,
  StepFourType,
} from "../../form-provider/schema";
import { FileUploader } from "@/components/ui/file-uploader";
import { Trash, PlusCircle } from "lucide-react";
import {
  OnboardingFieldGroupTitle,
  OnboardingTitle,
} from "@/components/ui/typography";
import { toast } from "sonner";
import { onboardingService } from "@/services/vendor/onboarding/onboarding.service";
import { roomService } from "@/services/vendor/onboarding/room.service";
import { Accept } from "react-dropzone";
import GalleryUploader from "./gallery-uploader";
import { useSession } from "next-auth/react";
import { useEventId } from "../../../_lib/hooks/useEventId";
import { addCacheBusting } from "@/lib/image-utils";
import { WholeStepGuidedShell } from "../../whole-step-guided-shell";
import { GuidedWholeStepBottomActions } from "../../guided-section-chips";
import { guidedOnboardingSkipButtonClass } from "../../guided-sticky-approval-bar";
import { guidedInsetSectionSurfaceClass } from "../../guided-section-surface";
import { useCurrencySymbol } from "@/hooks/use-currency-format";
import {
  createDefaultPackageDetailRow,
  EVENT_GALLERY_MAX_IMAGES,
  EVENT_PACKAGE_MAIN_HEADING_MAX_CHARS,
  EVENT_PACKAGE_SUB_HEADING_MAX_CHARS,
  PACKAGE_DETAIL_LINE_MAX_CHARS,
  packageDetailLabel,
  packageDetailPlaceholder,
  resolveEventSchedulerItems,
} from "@/lib/event-form-limits";
import {
  isRoomSectionComplete,
  canShowApplyToAllButton,
  useRoomManager,
} from "../../rooms/use-room-manager";
import { MultiSpaceHeader } from "../../rooms/multi-space-header";
import { selectOnboardingRoomsForApi } from "../../../_lib/onboarding-room-save";
import { focusNextIncompleteOnboardingRoom } from "../../../_lib/onboarding-multi-room-progress";
import { isVendorRoomPackageStepComplete } from "@/app/(protected)/vendor/events/_lib/normalize-step-two-fields";

/** IDs of persisted gallery rows still in the final list (backend `replace_gallery`). */
function collectReplaceGalleryIds(
  gallery: StepFourType["gallery"] | undefined,
): number[] {
  return (gallery ?? [])
    .filter(
      (item): item is { id: number; url: string } =>
        typeof item === "object" &&
        item !== null &&
        !(item instanceof File) &&
        "id" in item &&
        typeof (item as { id: unknown }).id === "number",
    )
    .map((item) => item.id);
}

// Define an interface for files with preview
interface FileWithPreview extends File {
  preview?: string;
}

const StepFour = () => {
  const currencySymbol = useCurrencySymbol();
  const {
    form: globalForm,
    save,
    setActiveStep,
    setActiveField,
    persistedProgressHydrated,
  } = useFormContext();

  // Multi-space ("event spaces") wiring. When `enabled` and at least one room exists, the form
  // below binds to `multiSpace.rooms[currentRoomIndex].package` instead of `stepFour`. The
  // single-room path is unchanged when `enabled` is false.
  const {
    enabled: multiSpaceEnabled,
    rooms,
    currentRoomIndex,
    currentRoom,
    setCurrentRoomIndex,
    roomsLoading,
  } = useRoomManager();
  const isMultiRoom = multiSpaceEnabled && rooms.length > 0;
  const isMultiSpaceWithoutRooms = multiSpaceEnabled && rooms.length === 0;
  const scopePrefix = isMultiRoom
    ? `multiSpace.rooms.${currentRoomIndex}.package`
    : "stepFour";

  /**
   * Scoped accessors. They rewrite `"stepFour.field"` into the active room's path when
   * multi-room mode is on, leaving the rest of the component unchanged. Casts to `never` are
   * required because the path is dynamic and React Hook Form's typings need a literal path.
   */
  const setScopedValue = useCallback(
    (field: string, value: unknown) => {
      globalForm.setValue(`${scopePrefix}.${field}` as never, value as never, {
        shouldDirty: true,
      });
    },
    [globalForm, scopePrefix],
  );
  const getScopedValue = useCallback(
    <T,>(field: string): T => {
      return globalForm.getValues(`${scopePrefix}.${field}` as never) as T;
    },
    [globalForm, scopePrefix],
  );

  const stepFourPersistedApproved = useWatch({
    control: globalForm.control,
    // In multi-room mode the per-room `isApprovedPackage` flag is the persistence signal
    // for the guided shell. Single-room mode keeps reading `stepFour.isApproved`.
    name: isMultiRoom
      ? (`multiSpace.rooms.${currentRoomIndex}.isApprovedPackage` as never)
      : "stepFour.isApproved",
  });
  const stepFourDefaults = isMultiRoom
    ? rooms[currentRoomIndex]?.package
    : globalForm.getValues("stepFour");
  const stepFourDefaultsLegacy = stepFourDefaults as typeof stepFourDefaults & {
    event_schedular_custom_copy?: string;
  };

  const { update: updateSession } = useSession();
  const eventId = useEventId(globalForm, "stepFour");

  const form = useForm<StepFourType>({
    resolver: zodResolver(stepFourSchema),
    defaultValues: {
      step: 4,
      event_id: eventId,
      package_title: stepFourDefaults?.package_title || "",
      package_description: stepFourDefaults?.package_description || "",
      package_image: stepFourDefaults?.package_image || null,
      package_button_name: stepFourDefaults?.package_button_name || "Book Now",
      package_details:
        stepFourDefaults?.package_details &&
        stepFourDefaults.package_details.length > 0
          ? stepFourDefaults.package_details
          : [createDefaultPackageDetailRow(0)],
      event_schedular_title: stepFourDefaults?.event_schedular_title || "",
      event_schedule_subtitle:
        stepFourDefaults?.event_schedule_subtitle ||
        stepFourDefaultsLegacy?.event_schedular_custom_copy ||
        "",
      event_schedular: resolveEventSchedulerItems(
        stepFourDefaults?.event_schedular,
      ),
      gallery: stepFourDefaults?.gallery || [],
    },
    mode: "onChange",
  });

  const [packageImage, setPackageImage] = useState<FileWithPreview[]>([]);
  const [packageImageUrl, setPackageImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteGalleryIds, setDeleteGalleryIds] = useState<number[]>([]);

  const prevRoomIndexRef = useRef<number | null>(null);
  const prevIsMultiRoomRef = useRef<boolean>(isMultiRoom);

  // Persist outgoing room's form data back into multiSpace before switching tabs,
  // then hydrate the incoming room. This mirrors what useRoomScopeSync does for Steps 5-7.
  useEffect(() => {
    const wasMultiRoom = prevIsMultiRoomRef.current;

    // When toggling out of multi-room mode, clear room-tab tracking so we don't
    // accidentally push single-room form values into a stale room slot on re-enable.
    if (!isMultiRoom) {
      prevRoomIndexRef.current = null;
      prevIsMultiRoomRef.current = false;
    }

    if (isMultiRoom) {
      const prevIndex = prevRoomIndexRef.current;
      if (
        wasMultiRoom &&
        prevIndex !== null &&
        prevIndex !== currentRoomIndex &&
        prevIndex >= 0 &&
        prevIndex < rooms.length
      ) {
        const currentFormValues = form.getValues();
        globalForm.setValue(
          `multiSpace.rooms.${prevIndex}.package` as never,
          {
            package_image: currentFormValues.package_image,
            package_title: currentFormValues.package_title,
            package_description: currentFormValues.package_description,
            package_button_name: currentFormValues.package_button_name,
            package_details: currentFormValues.package_details,
            event_schedular_title: currentFormValues.event_schedular_title,
            event_schedule_subtitle: currentFormValues.event_schedule_subtitle,
            event_schedular: currentFormValues.event_schedular,
            gallery: currentFormValues.gallery,
          } as never,
          { shouldDirty: false },
        );
      }
    }

    const nextDefaults = isMultiRoom
      ? rooms[currentRoomIndex]?.package
      : globalForm.getValues("stepFour");
    const nextDefaultsLegacy = nextDefaults as typeof nextDefaults & {
      event_schedular_custom_copy?: string;
    };
    form.reset({
      step: 4,
      event_id: eventId,
      package_title: nextDefaults?.package_title || "",
      package_description: nextDefaults?.package_description || "",
      package_image: nextDefaults?.package_image || null,
      package_button_name: nextDefaults?.package_button_name || "Book Now",
      package_details:
        nextDefaults?.package_details && nextDefaults.package_details.length > 0
          ? (nextDefaults.package_details as Array<{ title: string }>)
          : [createDefaultPackageDetailRow(0)],
      event_schedular_title: nextDefaults?.event_schedular_title || "",
      event_schedule_subtitle:
        nextDefaults?.event_schedule_subtitle ||
        nextDefaultsLegacy?.event_schedular_custom_copy ||
        "",
      event_schedular: resolveEventSchedulerItems(
        nextDefaults?.event_schedular as Array<{
          title: string;
          time: string;
        }> | undefined,
      ),
      gallery: (nextDefaults?.gallery as StepFourType["gallery"]) || [],
    });
    const img = nextDefaults?.package_image;
    if (typeof img === "string" && img) {
      setPackageImageUrl(img);
      setPackageImage([]);
    } else if (img instanceof File) {
      setPackageImageUrl(null);
      setPackageImage([img as FileWithPreview]);
    } else {
      setPackageImageUrl(null);
      setPackageImage([]);
    }

    if (isMultiRoom) {
      prevRoomIndexRef.current = currentRoomIndex;
      prevIsMultiRoomRef.current = true;
    }
    // We intentionally only react to scope changes, not every form keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopePrefix]);

  useEffect(() => {
    // Pending delete ids must not leak between room tabs.
    setDeleteGalleryIds([]);
  }, [scopePrefix]);

  // Clear active field when component unmounts
  useEffect(() => {
    return () => {
      setActiveField(null);
    };
  }, [setActiveField]);

  // Update form when eventId changes
  useEffect(() => {
    if (eventId > 0) {
      form.setValue("event_id", eventId);
    }
  }, [eventId, form]);

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

  const canApplyToAllRooms = useMemo(() => {
    if (!isMultiRoom || rooms.length < 2) return false;
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
    isMultiRoom,
    rooms.length,
    packageImage,
    watchedPackageTitle,
    watchedPackageDescription,
    watchedPackageDetails,
    watchedPackageImage,
    packageImageUrl,
    watchedSchedularTitle,
    watchedSchedular,
  ]);

  // Initialize URL value from the active scope (single-room or current room) on mount.
  useEffect(() => {
    const packageImageValue = getScopedValue<unknown>("package_image");

    if (typeof packageImageValue === "string" && packageImageValue) {
      setPackageImageUrl(packageImageValue);
    } else if (packageImageValue instanceof File) {
      setPackageImage([packageImageValue]);
    }
    // Only run on mount; subsequent scope changes are handled by the reset effect above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFieldFocus = (fieldName: string) => {
    setActiveField(fieldName);
  };

  const handleExistingGalleryRemove = useCallback(
    (item: { id: number; url: string }) => {
      if (!item?.id) return;
      setDeleteGalleryIds((prev) =>
        prev.includes(item.id) ? prev : [...prev, item.id],
      );
    },
    [],
  );

  const validateEditedSchedulerRows = useCallback(
    (schedules: StepFourType["event_schedular"] | undefined): boolean => {
      const rows = Array.isArray(schedules) ? schedules : [];
      const dirtyRows = form.formState.dirtyFields
        .event_schedular as Array<
        | {
            title?: boolean;
            time?: boolean;
          }
        | undefined
      >;

      form.clearErrors("event_schedular");

      let hasPartialEditedRow = false;

      rows.forEach((row, index) => {
        const rowDirty = dirtyRows?.[index];
        const touched = Boolean(rowDirty?.title || rowDirty?.time);
        if (!touched) return;

        const hasTitle = String(row?.title ?? "").trim().length > 0;
        const hasTime = String(row?.time ?? "").trim().length > 0;
        if (hasTitle === hasTime) return;

        hasPartialEditedRow = true;
        if (!hasTitle) {
          form.setError(`event_schedular.${index}.title`, {
            type: "manual",
            message: "Title is required when time is set",
          });
        }
        if (!hasTime) {
          form.setError(`event_schedular.${index}.time`, {
            type: "manual",
            message: "Time is required when title is set",
          });
        }
      });

      if (hasPartialEditedRow) {
        toast.error("Complete both title and time for each edited timeline row.");
      return false;
    }

    return true;
    },
    [form],
  );

  const handleSubmit = useCallback(
    async (data: StepFourType, options?: { applyToAllRooms?: boolean }) => {
      const applyToAllRooms = options?.applyToAllRooms === true;
      setLoading(true);
      try {
        if (!validateEditedSchedulerRows(data.event_schedular)) {
          setLoading(false);
          return;
        }

        const isValid = await form.trigger();
        if (!isValid) {
          const errors = form.formState.errors;
          const errorFields = Object.keys(errors);
          toast.error(
            `Please correct the highlighted fields:${errorFields.join(", ")}`,
          );
          setLoading(false);
          return;
        }

        // Safety: if the user uploaded an image but RHF lost it, restore from local state.
        if (packageImage.length > 0 && !data.package_image) {
          data.package_image = packageImage[0];
        }

        const payload = {
          ...data,
          isApproved: true as const,
          event_schedular: normalizeEventSchedularForSave(data.event_schedular),
        };

        if (isMultiRoom) {
          // ─── Multi-room path ────────────────────────────────────────────────────────
          if (rooms.length < 2) {
            toast.error("Please add at least 2 rooms to continue.");
            setLoading(false);
            return;
          }
          if (rooms.length > 3) {
            toast.error("You can add a maximum of 3 rooms.");
            setLoading(false);
            return;
          }

          // Backend expects a single Step 4 payload with `is_rooms: true` and a `rooms` map.
          // Rooms are created via `/vendor/rooms/*` (dynamic CRUD) and must have ids here.
          const missingId = rooms.some((r) => !r.id);
          if (missingId) {
            toast.error("Please create your rooms first (missing room id).");
            setLoading(false);
            return;
          }

          const nextPackageFromForm = {
            package_image: data.package_image,
            package_title: data.package_title,
            package_description: data.package_description,
            package_button_name: data.package_button_name,
            package_details: (data.package_details ?? []).map((d) => ({
              ...d,
            })),
            event_schedular_title: data.event_schedular_title,
            event_schedule_subtitle: data.event_schedule_subtitle,
            event_schedular: normalizeEventSchedularForSave(
              data.event_schedular,
            ),
            gallery: [...(data.gallery ?? [])],
          };

          // Flush the active room's latest form data into multiSpace so that
          // `rooms` is fresh before we build `stagedRooms`.
          globalForm.setValue(
            `multiSpace.rooms.${currentRoomIndex}.package` as never,
            nextPackageFromForm as never,
            { shouldDirty: false },
          );
          const freshRooms =
            (globalForm.getValues("multiSpace")?.rooms as typeof rooms) ??
            rooms;

          const stagedRooms = applyToAllRooms
            ? freshRooms.map((room) => ({
                ...room,
                package: {
                  ...room.package,
                  ...nextPackageFromForm,
                },
                isApprovedPackage: true,
              }))
            : freshRooms.map((room, index) =>
                index === currentRoomIndex
                  ? {
                      ...room,
                      package: {
                        ...room.package,
                        ...nextPackageFromForm,
                      },
                      isApprovedPackage: true,
                    }
                  : room,
              );

          const roomsForApi = selectOnboardingRoomsForApi(
            stagedRooms,
            currentRoomIndex,
            applyToAllRooms,
          );

          const response = await onboardingService.storeStepFourRoomsData({
            event_id: eventId,
            isApproved: true,
            currentRoomIndex,
            rooms: roomsForApi as typeof stagedRooms,
            delete_gallery: deleteGalleryIds,
            replace_gallery: collectReplaceGalleryIds(data.gallery),
          });

        if (response?.status) {
            setDeleteGalleryIds([]);
            const currentMultiSpace = globalForm.getValues("multiSpace");
            if (currentMultiSpace) {
              // Use the latest rooms from globalForm (preserves other step data) and
              // merge package updates from stagedRooms + set approval flags.
              const latestRooms = currentMultiSpace.rooms ?? [];
              const mergedRooms = latestRooms.map((existingRoom, index) => {
                const staged = stagedRooms[index];
                if (!staged) return existingRoom;
                return {
                  ...existingRoom,
                  package: staged.package,
                  isApprovedPackage: applyToAllRooms
                    ? isRoomSectionComplete(staged, "package")
                    : index === currentRoomIndex
                      ? true
                      : (existingRoom as typeof staged).isApprovedPackage === true,
                };
              });
              globalForm.setValue("multiSpace", {
                ...currentMultiSpace,
                rooms: mergedRooms as typeof stagedRooms,
              });
            }
            const updatedRooms =
              (globalForm.getValues("multiSpace")?.rooms as typeof rooms) ?? [];
            if (
              focusNextIncompleteOnboardingRoom(
                updatedRooms,
                "package",
                currentRoomIndex,
                setCurrentRoomIndex,
              )
            ) {
              return;
            }

            setActiveStep(5);
            Promise.all([updateSession({ on_boarding_step: 5 }), save()]).catch(
              (error) => {
                console.error("Background save error:", error);
              },
            );
          } else {
            console.error("Multi-room Step 4 API error:", response);
          }
          return;
        }

        // ─── Single-room (existing) path ────────────────────────────────────────────
        const response = await onboardingService.storeStepFourData({
          ...payload,
          delete_gallery: deleteGalleryIds,
          replace_gallery: collectReplaceGalleryIds(data.gallery),
        } as typeof payload & {
          delete_gallery: number[];
          replace_gallery: number[];
        });
        if (response?.status) {
          setDeleteGalleryIds([]);
          globalForm.setValue("stepFour", payload);
          const responseData = response.data as unknown as {
            id?: number;
            slug?: string;
            status?: number;
            package_image?: string;
            gallery?: Array<{ id: number; url: string } | File>;
            [key: string]: unknown;
          };

          if (
            responseData?.package_image &&
            typeof responseData.package_image === "string"
          ) {
            setPackageImageUrl(responseData.package_image);
            setPackageImage([]);
            globalForm.setValue(
              "stepFour.package_image",
              responseData.package_image,
            );
          }

          // Cap at max; backend may return more until delete logic is fixed.
          if (responseData?.gallery && Array.isArray(responseData.gallery)) {
            const cappedGallery = (
              responseData.gallery as (File | { id: number; url: string })[]
            ).slice(0, EVENT_GALLERY_MAX_IMAGES);
            globalForm.setValue("stepFour.gallery", cappedGallery);
          }

          setActiveStep(5);
          Promise.all([updateSession({ on_boarding_step: 5 }), save()]).catch(
            (error) => {
              console.error("Background save error:", error);
            },
          );
        } else {
          console.error("API Error:", response);
        }
      } catch (error) {
        console.error("Error during Step Four submission:", error);
      } finally {
        setLoading(false);
      }
    },
    [
      form,
      globalForm,
      save,
      setActiveStep,
      updateSession,
      isMultiRoom,
      rooms,
      currentRoomIndex,
      deleteGalleryIds,
      eventId,
      packageImage,
      setScopedValue,
      setCurrentRoomIndex,
      validateEditedSchedulerRows,
    ],
  );

  const handleContinue = useCallback(async () => {
    if (multiSpaceEnabled && rooms.length < 2) {
      toast.error("Please add at least 2 rooms to continue.");
      return;
    }
    setActiveField(null);
    await handleSubmit(form.getValues(), { applyToAllRooms: false });
  }, [
    setActiveField,
    handleSubmit,
    form,
    multiSpaceEnabled,
    rooms.length,
  ]);

  const handleApplyToAllRooms = useCallback(async () => {
    if (!isMultiRoom) return;
    setActiveField(null);
    await handleSubmit(form.getValues(), { applyToAllRooms: true });
  }, [form, handleSubmit, isMultiRoom, setActiveField]);

  const handleFileChange = useCallback(
    (files: FileWithPreview[], onChange: (file: File | null) => void) => {
      if (!files.length) return;

      const file = files[0];

      // Validate file is actually an image
      if (!file.type.startsWith("image/")) {
        toast.error(
          "Only image files are allowed. Please select a JPG, PNG, or other image file.",
        );
        return;
      }

      console.log("📸 Package image file received:", file);
      console.log("📸 Package image file type:", file.type);
      console.log("📸 Package image file size:", file.size);

      // Create a preview URL if it doesn't exist
      if (!file.preview) {
        file.preview = URL.createObjectURL(file);
      }

      setPackageImage(files);
      setPackageImageUrl(null); // Clear URL when new file is uploaded
      setActiveField("package_image");

      // Update form state immediately
      onChange(file);
      form.setValue("package_image", file);
      setScopedValue("package_image", file);

      console.log("✅ Package image set in form");
    },
    [form, setScopedValue, setActiveField],
  );

  const handleRemovePackage = useCallback(
    (onChange: (value: File | null) => void) => {
      if (packageImage.length > 0 && packageImage[0].preview) {
        URL.revokeObjectURL(packageImage[0].preview);
      }

      setPackageImage([]);
      setPackageImageUrl(null);
      onChange(null);
      setScopedValue("package_image", null);
    },
    [setScopedValue, packageImage],
  );

  // Clean up preview URLs when component unmounts
  React.useEffect(() => {
    return () => {
      if (packageImage.length > 0 && packageImage[0].preview) {
        URL.revokeObjectURL(packageImage[0].preview);
      }
    };
  }, [packageImage]);

  return (
    <div className="flex flex-col items-center justify-start w-full min-h-screen bg-transparent">
      <div className="w-full min-w-0 max-w-none mx-auto relative">
        <OnboardingCard className="w-full mx-auto shadow-sm mb-16">
          <CardHeader className="pb-2 pt-4">
            <OnboardingTitle>
              {isMultiSpaceWithoutRooms
                ? "Set up your event spaces"
                : isMultiRoom
                ? `Configure timeline & packages for ${rooms[currentRoomIndex]?.name || "this room"}`
                : "Timeline & packages"}
            </OnboardingTitle>
          </CardHeader>

          <CardContent className="px-6 py-2 pb-8">
            {/* Multi-space toggle + room tabs. Only Step 4 owns the toggle. */}
            <MultiSpaceHeader section="package" showToggle />

            {isMultiSpaceWithoutRooms ? (
              roomsLoading ? (
                <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-5">
                  <Skeleton className="mx-auto h-5 w-48 bg-white/10" />
                  <Skeleton className="mx-auto h-4 w-72 max-w-full bg-white/10" />
                  <Skeleton className="mx-auto h-10 w-40 rounded-full bg-white/10" />
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-5 py-8 text-center">
                  <h3 className="text-sm font-semibold text-slate-200">
                    Add a room to continue
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
                    Create at least one event space above. Timeline and package
                    details will appear here once a room is available.
                  </p>
                </div>
              )
            ) : (
            <Form {...form}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleContinue();
                }}
                className="flex flex-col gap-6"
              >
                <input type="hidden" {...form.register("step")} />
                <FormField
                  control={form.control}
                  name="event_id"
                  render={({ field }) => (
                    <FormItem className="hidden">
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <WholeStepGuidedShell
                  form={form}
                  sectionId="step-four-timeline-package"
                  chipLabel="Packages & timeline"
                  chipDescription="Schedule, package copy, image, details, and gallery."
                  persistenceHydrated={persistedProgressHydrated}
                  persistedStepApproved={stepFourPersistedApproved === true}
                  renderFooter={({ guided }) => (
                    <GuidedWholeStepBottomActions
                      guided={guided}
                      loading={loading}
                      alwaysShowReadyLabel={isMultiRoom}
                      labelWhenReady={
                        isMultiRoom ? "Apply to this room only" : "Save & continue"
                      }
                      onContinue={() => void handleContinue()}
                      extraActions={
                        canShowApplyToAllButton(rooms, canApplyToAllRooms) ? (
                          <Button
                            variant="event-outline"
                            type="button"
                            onClick={() => void handleApplyToAllRooms()}
                            className={guidedOnboardingSkipButtonClass}
                          >
                            Apply to all rooms
                          </Button>
                        ) : !isMultiRoom ? (
                          <Button
                            variant="event-outline"
                            type="button"
                            onClick={() => setActiveStep(5)}
                            className={guidedOnboardingSkipButtonClass}
                          >
                            Skip
                          </Button>
                        ) : null
                      }
                    />
                  )}
                >
                  {(_guided) => (
                    <>
                <section
                  className={guidedInsetSectionSurfaceClass(
                    "mb-4 w-full space-y-6",
                  )}
                >
                  <OnboardingFieldGroupTitle>Timeline</OnboardingFieldGroupTitle>
                  <div className="mt-4 space-y-4 min-w-0">
                    <FormField
                      control={form.control}
                      name="event_schedular_title"
                      render={({ field }) => {
                        const currentLength = field.value?.length || 0;
                        const maxLength = 40;
                        return (
                          <FormItem>
                            <FormLabel className="text-base font-medium">
                              Timeline title
                            </FormLabel>
                            <FormControl>
                              <Input
                                id="event-schedular-title"
                                placeholder="e.g. Event Night"
                                {...field}
                                maxLength={maxLength}
                                onFocus={() =>
                                  handleFieldFocus("event_schedular_title")
                                }
                                onChange={(e) => {
                                  field.onChange(e);
                                  setScopedValue(
                                    "event_schedular_title",
                                    e.target.value,
                                  );
                                }}
                              />
                            </FormControl>
                            <div className="text-xs text-muted-foreground mt-1">
                              <span
                                className={
                                  currentLength > maxLength
                                    ? "text-destructive"
                                    : ""
                                }
                              >
                                {currentLength}/{maxLength} characters
                              </span>
                            </div>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                    <FormField
                      control={form.control}
                      name="event_schedule_subtitle"
                      render={({ field }) => {
                        const currentLength = field.value?.length || 0;
                        const maxLength = 160;
                        return (
                          <FormItem>
                            <FormLabel className="text-base font-medium">
                              Timeline subtitle (optional)
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Set the flow for your guests, from doors open to final call."
                                {...field}
                                maxLength={maxLength}
                                onFocus={() =>
                                  handleFieldFocus("event_schedule_subtitle")
                                }
                                onChange={(e) => {
                                  field.onChange(e);
                                  setScopedValue(
                                    "event_schedule_subtitle",
                                    e.target.value,
                                  );
                                }}
                              />
                            </FormControl>
                            <div className="text-xs text-muted-foreground mt-1">
                              <span
                                className={
                                  currentLength > maxLength
                                    ? "text-destructive"
                                    : ""
                                }
                              >
                                {currentLength}/{maxLength} characters
                              </span>
                            </div>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                    <div className="space-y-4">
                      <FormLabel className="text-base font-medium">
                        Event scheduler
                      </FormLabel>
                      {schedulerFields.map((item, index) => (
                        <div
                          key={item.id}
                          className="flex items-start justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.03] p-4"
                        >
                          <FormField
                            control={form.control}
                            name={`event_schedular.${index}.title`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormControl>
                                  <Input
                                    type="text"
                                    placeholder="Event Title"
                                    value={field.value || ""}
                                    maxLength={40}
                                    onFocus={() =>
                                      handleFieldFocus("event_schedular")
                                    }
                                    onChange={(e) => {
                                      field.onChange(e);
                                      const updated = [
                                        ...(form.getValues("event_schedular") ||
                                          []),
                                      ];
                                      updated[index] = {
                                        ...updated[index],
                                        title: e.target.value,
                                      };
                                      setScopedValue(
                                        "event_schedular",
                                        updated,
                                      );
                                    }}
                                    className="h-11 bg-white/5 border-white/10"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`event_schedular.${index}.time`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormControl>
                                  <Input
                                    type="time"
                                    value={field.value || ""}
                                    onFocus={() =>
                                      handleFieldFocus("event_schedular")
                                    }
                                    onChange={(e) => {
                                      field.onChange(e.target.value);
                                      const updated = [
                                        ...(form.getValues("event_schedular") ||
                                          []),
                                      ];
                                      updated[index] = {
                                        ...updated[index],
                                        time: e.target.value,
                                      };
                                      setScopedValue(
                                        "event_schedular",
                                        updated,
                                      );
                                    }}
                                    className="h-11 bg-white/5 border-white/10"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              removeScheduler(index);
                              const updated = [
                                ...(form.getValues("event_schedular") || []),
                              ].filter((_, i) => i !== index);
                              setScopedValue("event_schedular", updated);
                            }}
                            className="text-red-400 h-11 w-11"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="event-outline"
                        type="button"
                        onClick={() => {
                          appendScheduler({ title: "", time: "" });
                          const updated = [
                            ...(form.getValues("event_schedular") || []),
                            { title: "", time: "" },
                          ];
                          setScopedValue("event_schedular", updated);
                          handleFieldFocus("event_schedular");
                        }}
                      >
                        Add Schedule
                      </Button>
                    </div>
                  </div>
                </section>

                <section
                  className={guidedInsetSectionSurfaceClass(
                    "mb-4 w-full space-y-6",
                  )}
                >
                  <OnboardingFieldGroupTitle>
                    Packages & Gallery
                  </OnboardingFieldGroupTitle>
                  <div className="mt-4 space-y-6 min-w-0">
                    <FormField
                      control={form.control}
                      name="package_title"
                      render={({ field }) => {
                        const currentLength = field.value?.length || 0;
                          const maxLength =
                            EVENT_PACKAGE_MAIN_HEADING_MAX_CHARS;
                        return (
                          <FormItem className="mb-4">
                            <FormLabel className="text-base font-medium">
                                Main event heading
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="e.g. What's included"
                                className="h-11 bg-white/5 border-white/10"
                                maxLength={maxLength}
                                onFocus={() =>
                                  handleFieldFocus("package_title")
                                }
                                onChange={(e) => {
                                  field.onChange(e);
                                    setScopedValue(
                                      "package_title",
                                      e.target.value,
                                  );
                                }}
                              />
                            </FormControl>
                            <div className="text-xs text-muted-foreground mt-1">
                              <span
                                className={
                                  currentLength > maxLength
                                    ? "text-destructive"
                                    : ""
                                }
                              >
                                {currentLength}/{maxLength} characters
                              </span>
                            </div>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    <FormField
                      control={form.control}
                      name="package_description"
                      render={({ field }) => {
                        const currentLength = field.value?.length || 0;
                        const maxLength = EVENT_PACKAGE_SUB_HEADING_MAX_CHARS;
                        return (
                          <FormItem className="mb-4">
                            <FormLabel className="text-base font-medium">
                              Subheading
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={`e.g., Prices From ${currencySymbol}65 Plus VAT Include:`}
                                className="h-11 bg-white/5 border-white/10"
                                maxLength={maxLength}
                                onFocus={() =>
                                  handleFieldFocus("package_description")
                                }
                                onChange={(e) => {
                                  field.onChange(e);
                                    setScopedValue(
                                      "package_description",
                                      e.target.value,
                                  );
                                }}
                              />
                            </FormControl>
                            <div className="text-xs text-muted-foreground mt-1">
                              <span
                                className={
                                  currentLength > maxLength
                                    ? "text-destructive"
                                    : ""
                                }
                              >
                                {currentLength}/{maxLength} characters
                              </span>
                            </div>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  </div>
                </section>

                <section
                  className={guidedInsetSectionSurfaceClass(
                    "mb-4 w-full space-y-6",
                  )}
                >
                  <OnboardingFieldGroupTitle>Image</OnboardingFieldGroupTitle>
                  <div className="mt-4 space-y-6 min-w-0">
                  <FormField
                    control={form.control}
                    name="package_image"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">
                        Highlights image
                      </FormLabel>
                        <FormControl>
                          <div
                            onClick={() => handleFieldFocus("package_image")}
                          >
                            {packageImageUrl ? (
                              <div className="relative w-full">
                                <img
                                  src={addCacheBusting(packageImageUrl)}
                                  alt="Package Image"
                                  className="max-h-60 object-contain mx-auto mb-2"
                                  width={100}
                                  height={100}
                                />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    setPackageImageUrl(null);
                                    field.onChange(null);
                                      setScopedValue("package_image", null);
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
                                maxFileCount={1}
                                  maxSize={10 * 1024 * 1024}
                                onRemove={() =>
                                  handleRemovePackage(field.onChange)
                                }
                                className="h-60"
                                accept={["image/*"] as unknown as Accept}
                                enableCropping={true}
                                aspectRatio={4 / 3}
                                cropConfig={{
                                  maxSizeKB: 500,
                                  quality: 0.9,
                                  maxWidth: 1200,
                                  maxHeight: 900,
                                }}
                              />
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                          </div>
                </section>

                <section
                  className={guidedInsetSectionSurfaceClass(
                    "mb-4 w-full space-y-6",
                  )}
                >
                  <OnboardingFieldGroupTitle>
                    What guests can expect
                  </OnboardingFieldGroupTitle>
                  <div className="mt-4 space-y-4 min-w-0">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                    {fields.length < 10 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0 border-white/20 bg-white/[0.04] text-foreground hover:bg-white/[0.08]"
                        onClick={() => {
                            const nextIndex = fields.length;
                            const newRow = createDefaultPackageDetailRow(nextIndex);
                            append(newRow);
                          const updatedDetails = [
                            ...(form.getValues("package_details") || []),
                              newRow,
                          ];
                            setScopedValue("package_details", updatedDetails);
                          handleFieldFocus("package_details");
                        }}
                      >
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add Detail
                      </Button>
                    )}
                  </div>

                  {fields.map((item, index) => (
                    <Card
                      key={item.id}
                      className="mb-4 rounded-lg border border-white/10 bg-white/[0.03] p-4"
                    >
                      <CardContent className="p-0 flex items-center gap-4">
                        <FormField
                          control={form.control}
                          name={`package_details.${index}.title`}
                          render={({ field }) => {
                            const currentLength = field.value?.length || 0;
                            const maxLength = PACKAGE_DETAIL_LINE_MAX_CHARS;
                            return (
                              <FormItem className="flex-1">
                                  <FormLabel className="text-sm font-medium">
                                    {packageDetailLabel(index)}
                                  </FormLabel>
                                <FormControl>
                                  <div>
                                    <Input
                                      {...field}
                                        placeholder={packageDetailPlaceholder(
                                          index,
                                        )}
                                      className="h-11 bg-white/5 border-white/10"
                                      maxLength={maxLength}
                                      onFocus={() =>
                                        handleFieldFocus("package_details")
                                      }
                                      onChange={(e) => {
                                        field.onChange(e);
                                        const updatedDetails = [
                                          ...(form.getValues(
                                              "package_details",
                                          ) || []),
                                        ];
                                        updatedDetails[index].title =
                                          e.target.value;
                                          setScopedValue(
                                            "package_details",
                                            updatedDetails,
                                        );
                                      }}
                                    />
                                    <div className="text-xs text-muted-foreground mt-1">
                                      <span
                                        className={
                                          currentLength > maxLength
                                            ? "text-destructive"
                                            : ""
                                        }
                                      >
                                        {currentLength}/{maxLength} characters
                                      </span>
                                    </div>
                                  </div>
                                </FormControl>
                                <FormMessage />
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
                              toast.error(
                                  "At least one package detail is required",
                              );
                              return;
                            }

                            remove(index);
                            const updatedDetails = [
                              ...form.getValues("package_details"),
                            ].filter((_, i) => i !== index);
                              setScopedValue("package_details", updatedDetails);
                          }}
                          disabled={fields.length <= 1}
                          className="text-red-400 h-11 w-11 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                  </div>
                </section>

                <section
                  className={guidedInsetSectionSurfaceClass("w-full mb-4")}
                >
                  <OnboardingFieldGroupTitle>Gallery</OnboardingFieldGroupTitle>
                  <div className="mt-4 min-w-0">
                <FormField
                  control={form.control}
                  name="gallery"
                  render={({ field }) => (
                    <div onClick={() => handleFieldFocus("gallery")}>
                          <GalleryUploader
                            field={field}
                            scopedGalleryPath={`${scopePrefix}.gallery`}
                            onExistingItemRemove={handleExistingGalleryRemove}
                          />
                    </div>
                  )}
                />
                  </div>
                </section>
                    </>
                  )}
                </WholeStepGuidedShell>
              </form>
            </Form>
            )}
          </CardContent>
        </OnboardingCard>
      </div>
    </div>
  );
};

export default StepFour;
