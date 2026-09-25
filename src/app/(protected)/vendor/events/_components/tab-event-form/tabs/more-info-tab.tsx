"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  eventsService,
  type StepFiveSavePayload,
} from "@/services/vendor/events/events.service";
import {
  capEventRoomList,
  normalizeVendorStepTwoRooms,
} from "@/lib/event-form-limits";
import {
  cloneVendorStepFiveRoomBrochure,
  findStepFiveBrochureForRoom,
  normalizeVendorStepFiveRooms,
  roomEntryToStepFiveBrochureFields,
  stepFiveBrochureFieldsToRoomEntry,
  syncStepFiveRoomsFromStepTwo,
} from "@/app/(protected)/vendor/events/_lib/vendor-step-five-rooms";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { StepFiveType, stepFiveSchema } from "../schema";
import { useEventFormContext } from "../../events-form-provider";
import { toast } from "sonner";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { FileUploader } from "@/components/ui/file-uploader";

export default function MoreInfoTab() {
  const [isLoading, setIsLoading] = useState(false);
  const {
    form: globalForm,
    advanceStep,
    markEventFormSaved,
    setActiveField,
    readOnly,
  } = useEventFormContext();
  // Track if we have string URLs from backend
  const [brochurePdfUrl, setBrochurePdfUrl] = useState<string | null>(null);
  const [brochurePdfUrl2, setBrochurePdfUrl2] = useState<string | null>(null);

  // Get event_id from global form
  const getEventId = (): number => {
    const stepOne = globalForm.getValues().stepOne;
    return typeof stepOne === "object" && "event_id" in stepOne
      ? Number(stepOne.event_id)
      : 0;
  };

  const isRoomsEnabled = globalForm.watch("stepTwo.is_rooms") === 1;
  const activeRoomIndex = globalForm.watch("stepTwo.active_room_index") ?? 0;
  const stepTwoRooms = capEventRoomList(
    normalizeVendorStepTwoRooms(globalForm.getValues().stepTwo?.rooms),
  );
  const resolvedRoomIndex =
    stepTwoRooms.length > 0
      ? Math.min(
          Math.max(activeRoomIndex, 0),
          Math.max(stepTwoRooms.length - 1, 0),
        )
      : 0;
  const activeRoomId = Number(stepTwoRooms[resolvedRoomIndex]?.room_id) || 0;
  const previousRoomIndexRef = useRef<number | null>(null);
  const lastHydratedRoomIndexRef = useRef<number | null>(null);

  const eventId = getEventId();
  const stepFiveDefaults = globalForm.getValues().stepFive;

  const resolveInitialBrochureFields = () => {
    const defaults = globalForm.getValues().stepFive;
    if (isRoomsEnabled && activeRoomId > 0) {
      const syncedRooms = syncStepFiveRoomsFromStepTwo(
        stepTwoRooms,
        normalizeVendorStepFiveRooms(defaults?.rooms),
      );
      const incoming = findStepFiveBrochureForRoom(syncedRooms, activeRoomId);
      return {
        ...roomEntryToStepFiveBrochureFields(incoming),
        rooms: syncedRooms,
      };
    }
    return {
      brochure_pdf: defaults?.brochure_pdf || null,
      brochure_pdf_2: defaults?.brochure_pdf_2 || null,
      remove_brochure_pdf: defaults?.remove_brochure_pdf ?? false,
      remove_brochure_pdf_2: defaults?.remove_brochure_pdf_2 ?? false,
    };
  };

  const initialBrochure = resolveInitialBrochureFields();

  const form = useForm<StepFiveType>({
    resolver: zodResolver(stepFiveSchema),
    mode: "onChange",
    defaultValues: {
      step: 5,
      event_id: eventId,
      is_rooms: isRoomsEnabled ? 1 : 0,
      rooms: (initialBrochure as unknown as StepFiveType)?.rooms ?? [],
      brochure_pdf: initialBrochure.brochure_pdf ?? null,
      brochure_pdf_2: initialBrochure.brochure_pdf_2 ?? null,
      remove_brochure_pdf: initialBrochure.remove_brochure_pdf ?? false,
      remove_brochure_pdf_2: initialBrochure.remove_brochure_pdf_2 ?? false,
    } as StepFiveType,
  });

  // Update form when eventId changes
  useEffect(() => {
    form.setValue("event_id", eventId);
  }, [eventId, form]);

  const { control, watch, setValue, getValues, reset } = form;
  const watchedBrochurePdf = watch("brochure_pdf");
  const watchedBrochurePdf2 = watch("brochure_pdf_2");

  const resolveBrochureFieldsForSubmit = useCallback(
    (data: StepFiveType): StepFiveType => {
      const next = { ...data };
      if (!next.brochure_pdf && brochurePdfUrl) {
        next.brochure_pdf = brochurePdfUrl;
      }
      if (!next.brochure_pdf_2 && brochurePdfUrl2) {
        next.brochure_pdf_2 = brochurePdfUrl2;
      }
      return next;
    },
    [brochurePdfUrl, brochurePdfUrl2],
  );

  const syncBrochureUrlState = useCallback(
    (brochurePdf: unknown, brochurePdf2: unknown) => {
      setBrochurePdfUrl(
        typeof brochurePdf === "string" && brochurePdf.trim()
          ? brochurePdf
          : null,
      );
      setBrochurePdfUrl2(
        typeof brochurePdf2 === "string" && brochurePdf2.trim()
          ? brochurePdf2
          : null,
      );
    },
    [],
  );

  const persistActiveRoomBrochureToGlobal = useCallback(
    (roomIndex: number, data: StepFiveType) => {
      if (!isRoomsEnabled || stepTwoRooms.length === 0) return;
      const existing = syncStepFiveRoomsFromStepTwo(
        stepTwoRooms,
        normalizeVendorStepFiveRooms(globalForm.getValues().stepFive?.rooms),
      );
      const roomId = Number(stepTwoRooms[roomIndex]?.room_id);
      if (!roomId) return;
      const snapshot = stepFiveBrochureFieldsToRoomEntry(roomId, data);
      const nextRooms = existing.map((entry) =>
        entry.room_id === roomId ? snapshot : entry,
      );
      globalForm.setValue("stepFive.rooms", nextRooms, {
        shouldDirty: true,
        shouldValidate: false,
      });
    },
    [globalForm, isRoomsEnabled, stepTwoRooms],
  );

  useEffect(() => {
    if (!isRoomsEnabled || stepTwoRooms.length === 0) {
      previousRoomIndexRef.current = null;
      lastHydratedRoomIndexRef.current = null;
      return;
    }

    const prevIndex = previousRoomIndexRef.current;
    if (
      prevIndex !== null &&
      prevIndex >= 0 &&
      prevIndex < stepTwoRooms.length &&
      prevIndex !== resolvedRoomIndex
    ) {
      persistActiveRoomBrochureToGlobal(prevIndex, getValues());
    }

    const shouldHydrate =
      lastHydratedRoomIndexRef.current === null ||
      lastHydratedRoomIndexRef.current !== resolvedRoomIndex;

    if (shouldHydrate) {
      const syncedRooms = syncStepFiveRoomsFromStepTwo(
        stepTwoRooms,
        normalizeVendorStepFiveRooms(globalForm.getValues().stepFive?.rooms),
      );
      const incoming = findStepFiveBrochureForRoom(
        syncedRooms,
        Number(stepTwoRooms[resolvedRoomIndex]?.room_id),
      );
      const fields = roomEntryToStepFiveBrochureFields(incoming);
      syncBrochureUrlState(fields.brochure_pdf, fields.brochure_pdf_2);
      reset({
        ...getValues(),
        is_rooms: 1,
        ...fields,
        rooms: syncedRooms,
      });
      lastHydratedRoomIndexRef.current = resolvedRoomIndex;
    }

    previousRoomIndexRef.current = resolvedRoomIndex;
  }, [
    getValues,
    globalForm,
    isRoomsEnabled,
    persistActiveRoomBrochureToGlobal,
    reset,
    resolvedRoomIndex,
    stepTwoRooms,
    syncBrochureUrlState,
  ]);

  const canApplyToAllRooms = useMemo(() => {
    if (!isRoomsEnabled || stepTwoRooms.length < 2) return false;
    return true;
  }, [isRoomsEnabled, stepTwoRooms.length]);

  // Handle field focus for tracking active field
  const handleFieldFocus = useCallback(
    (fieldName: string) => {
      setActiveField?.(fieldName);
    },
    [setActiveField],
  );

  // Initialize URL values from global form on mount
  useEffect(() => {
    const brochurePdf = globalForm.getValues("stepFive.brochure_pdf");
    const brochurePdf2 = globalForm.getValues("stepFive.brochure_pdf_2");

    // Check if values are string URLs
    if (typeof brochurePdf === "string" && brochurePdf) {
      setBrochurePdfUrl(brochurePdf);
    }

    if (typeof brochurePdf2 === "string" && brochurePdf2) {
      setBrochurePdfUrl2(brochurePdf2);
    }
  }, [globalForm]);

  // Handle file upload for brochure PDF
  const handleBrochureUpload = (file: File | null) => {
    // Check if file is PDF
    if (file && file.type !== "application/pdf") {
      toast.error("Only PDF files are allowed");
      return;
    }

    form.setValue("brochure_pdf", file || null);
    // When new file is uploaded, clear the URL
    if (file) {
      setBrochurePdfUrl(null);
      // Clear removal flag when new file is uploaded
      form.setValue("remove_brochure_pdf", false);
      globalForm.setValue("stepFive.remove_brochure_pdf", false);
    } else {
      setBrochurePdfUrl(null);
      // Set removal flag when file is removed
      form.setValue("remove_brochure_pdf", true);
      globalForm.setValue("stepFive.remove_brochure_pdf", true);
    }
  };

  // Handle file upload for brochure PDF 2
  const handleBrochureUpload2 = (file: File | null) => {
    form.setValue("brochure_pdf_2", file || null);
    if (file) {
      setBrochurePdfUrl2(null);
      // Clear removal flag when new file is uploaded
      form.setValue("remove_brochure_pdf_2", false);
      globalForm.setValue("stepFive.remove_brochure_pdf_2", false);
    } else {
      setBrochurePdfUrl2(null);
      // Set removal flag when file is removed
      form.setValue("remove_brochure_pdf_2", true);
      globalForm.setValue("stepFive.remove_brochure_pdf_2", true);
    }
  };

  // Sync local form with global form
  useEffect(() => {
    const subscription = form.watch((value) => {
      if (value) {
        globalForm.setValue(
          "stepFive",
          {
            ...globalForm.getValues().stepFive,
            ...value,
          } as StepFiveType,
          { shouldDirty: true },
        );
      }
    });

    return () => subscription.unsubscribe();
  }, [form, globalForm]);

  const handleSubmit = useCallback(
    async (data: StepFiveType, options?: { applyToAllRooms?: boolean }) => {
      const applyToAllRooms = options?.applyToAllRooms === true;
      setIsLoading(true);

      try {
        const submission = resolveBrochureFieldsForSubmit(data);

        if (submission.brochure_pdf !== form.getValues().brochure_pdf) {
          form.setValue("brochure_pdf", submission.brochure_pdf ?? null);
        }
        if (submission.brochure_pdf_2 !== form.getValues().brochure_pdf_2) {
          form.setValue("brochure_pdf_2", submission.brochure_pdf_2 ?? null);
        }

        // Manually re-trigger validation on all fields to force error display
        const isValid = await form.trigger();

        // If form is not valid, only highlight fields - no toast
        if (!isValid) {
          // Get all validation errors
          const errors = form.formState.errors;
          const errorFields = Object.keys(errors);

          const firstErrorField = errorFields[0];

          if (firstErrorField) {
            setActiveField(firstErrorField);

            // Try to find and focus the field with an error
            const errorElement = document.querySelector(
              `[name="${firstErrorField}"]`,
            );
            if (errorElement) {
              (errorElement as HTMLElement).focus();
              errorElement.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
            }
          }

          setIsLoading(false);
          return;
        }

        const roomsEnabled = globalForm.getValues().stepTwo?.is_rooms === 1;
        const stepTwoRoomsForSave = capEventRoomList(
          normalizeVendorStepTwoRooms(globalForm.getValues().stepTwo?.rooms),
        );

        let cleanedData: StepFiveSavePayload;
        let mergedRoomsGlobal = syncStepFiveRoomsFromStepTwo(
          stepTwoRoomsForSave,
          normalizeVendorStepFiveRooms(globalForm.getValues().stepFive?.rooms),
        );

        if (roomsEnabled && stepTwoRoomsForSave.length > 0) {
          persistActiveRoomBrochureToGlobal(resolvedRoomIndex, submission);
          const activeSnapshot = stepFiveBrochureFieldsToRoomEntry(
            Number(stepTwoRoomsForSave[resolvedRoomIndex]?.room_id),
            submission,
          );
          const brochureClone = cloneVendorStepFiveRoomBrochure(activeSnapshot);

          mergedRoomsGlobal = syncStepFiveRoomsFromStepTwo(
            stepTwoRoomsForSave,
            normalizeVendorStepFiveRooms(
              globalForm.getValues().stepFive?.rooms,
            ),
          ).map((entry, roomIndex) => {
            if (!applyToAllRooms && roomIndex !== resolvedRoomIndex) {
              return entry;
            }
            return { ...entry, ...brochureClone, room_id: entry.room_id };
          });

          const activeRoomIdForSave = Number(
            stepTwoRoomsForSave[resolvedRoomIndex]?.room_id,
          );
          const roomsForApi = applyToAllRooms
            ? mergedRoomsGlobal
            : mergedRoomsGlobal.filter(
                (entry) => entry.room_id === activeRoomIdForSave,
              );

          cleanedData = {
            step: 5,
            event_id: submission.event_id,
            is_rooms: 1,
            rooms: roomsForApi,
            brochure_pdf: submission.brochure_pdf,
            brochure_pdf_2: submission.brochure_pdf_2,
            remove_brochure_pdf: submission.remove_brochure_pdf,
            remove_brochure_pdf_2: submission.remove_brochure_pdf_2,
          };
        } else {
          const { rooms: _rooms, is_rooms: _isRooms, ...flatData } = submission;
          cleanedData = {
            ...flatData,
            is_rooms: 0,
          };
        }

        globalForm.setValue("stepFive", {
          ...globalForm.getValues().stepFive,
          ...cleanedData,
          ...(cleanedData.is_rooms === 1
            ? {
                rooms: mergedRoomsGlobal,
                ...roomEntryToStepFiveBrochureFields(
                  findStepFiveBrochureForRoom(
                    mergedRoomsGlobal,
                    Number(stepTwoRoomsForSave[resolvedRoomIndex]?.room_id),
                  ),
                ),
              }
            : {}),
        } as StepFiveType);

        const response = await eventsService.storeStepFiveData(cleanedData);

        if (response && response.status) {
          if (
            roomsEnabled &&
            stepTwoRoomsForSave.length > 0 &&
            !applyToAllRooms
          ) {
            const nextRoomIndex = resolvedRoomIndex + 1;
            if (nextRoomIndex < stepTwoRoomsForSave.length) {
              globalForm.setValue("stepTwo.active_room_index", nextRoomIndex, {
                shouldDirty: false,
                shouldTouch: false,
              });
              toast.info("Saved. Continue with the next room.");
              markEventFormSaved(5);
              return;
            }
          }

          await advanceStep(5, response);
        } else {
          console.error("Error saving additional information:", response);
        }
      } catch (error) {
        console.error("Error saving additional information:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [
      brochurePdfUrl,
      brochurePdfUrl2,
      form,
      globalForm,
      persistActiveRoomBrochureToGlobal,
      resolveBrochureFieldsForSubmit,
      resolvedRoomIndex,
      advanceStep,
      markEventFormSaved,
      setActiveField,
    ],
  );

  const attemptSubmit = useCallback(
    (applyToAllRooms: boolean) => {
      const current = getValues();
      const merged = resolveBrochureFieldsForSubmit(current);
      if (merged.brochure_pdf !== current.brochure_pdf) {
        setValue("brochure_pdf", merged.brochure_pdf ?? null);
      }
      if (merged.brochure_pdf_2 !== current.brochure_pdf_2) {
        setValue("brochure_pdf_2", merged.brochure_pdf_2 ?? null);
      }

      if (applyToAllRooms) {
        void handleSubmit(merged as StepFiveType, { applyToAllRooms: true });
        return;
      }

      void form.handleSubmit(
        (data) => handleSubmit(data, { applyToAllRooms: false }),
        () => {
          toast.error("Please complete the required address for this room.");
        },
      )();
    },
    [
      form,
      getValues,
      setValue,
      resolveBrochureFieldsForSubmit,
      handleSubmit,
      setActiveField,
    ],
  );

  return (
    <div className="space-y-8">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((data) =>
            handleSubmit(data as StepFiveType, { applyToAllRooms: false }),
          )}
          className="space-y-8"
        >
          {/* Document Uploads Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold title-header">
              Add more information
            </h2>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              Upload brochures and flyers for your event
            </p>
            <div className="space-y-6 border border-[#E5E7EB] p-6 rounded-md bg-white">
              <FormField
                control={control}
                name="brochure_pdf"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Event Brochure (PDF only) (Optional)
                    </FormLabel>
                    <FormControl>
                      {brochurePdfUrl ? (
                        <div className="w-full">
                          <div className="flex items-center justify-between bg-gray-100 p-4 rounded-md mb-2">
                            <div className="flex items-center">
                              <svg
                                width="24"
                                height="24"
                                viewBox="0 0 32 32"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M20 2H8C6.9 2 6 2.9 6 4V28C6 29.1 6.9 30 8 30H24C25.1 30 26 29.1 26 28V8L20 2Z"
                                  fill="#FF5252"
                                />
                                <path d="M20 2V8H26L20 2Z" fill="#FF8A80" />
                                <path d="M14 16H18V18H14V16Z" fill="white" />
                                <path d="M14 20H18V22H14V20Z" fill="white" />
                              </svg>
                              <span className="ml-2 text-sm">
                                {brochurePdfUrl.split("/").pop()}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setBrochurePdfUrl(null);
                                form.setValue("brochure_pdf", null);
                                form.setValue("remove_brochure_pdf", true);
                                globalForm.setValue(
                                  "stepFive.remove_brochure_pdf",
                                  true,
                                );
                                handleBrochureUpload(null);
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Controller
                          name="brochure_pdf"
                          control={control}
                          render={({ field: { value } }) => (
                            <FileUploader
                              value={value instanceof File ? [value] : []}
                              onValueChange={(files) =>
                                handleBrochureUpload(files[0] || null)
                              }
                              maxFileCount={1}
                              maxSize={1 * 1024 * 1024} // 1MB
                              onRemove={() => handleBrochureUpload(null)}
                              accept={{ "application/pdf": [".pdf"] }}
                            />
                          )}
                        />
                      )}
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-gray-500 mt-1">
                      Upload your event brochure (PDF only)
                    </p>
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="brochure_pdf_2"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Event flyer (PDF only, optional)
                    </FormLabel>
                    <FormControl>
                      {brochurePdfUrl2 ? (
                        <div className="w-full">
                          <div className="flex items-center justify-between bg-gray-100 p-4 rounded-md mb-2">
                            <div className="flex items-center">
                              <svg
                                width="24"
                                height="24"
                                viewBox="0 0 32 32"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M20 2H8C6.9 2 6 2.9 6 4V28C6 29.1 6.9 30 8 30H24C25.1 30 26 29.1 26 28V8L20 2Z"
                                  fill="#FF5252"
                                />
                                <path d="M20 2V8H26L20 2Z" fill="#FF8A80" />
                                <path d="M14 16H18V18H14V16Z" fill="white" />
                                <path d="M14 20H18V22H14V20Z" fill="white" />
                              </svg>
                              <span className="ml-2 text-sm">
                                {brochurePdfUrl2.split("/").pop()}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setBrochurePdfUrl2(null);
                                form.setValue("brochure_pdf_2", null);
                                form.setValue("remove_brochure_pdf_2", true);
                                globalForm.setValue(
                                  "stepFive.remove_brochure_pdf_2",
                                  true,
                                );
                                handleBrochureUpload2(null);
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Controller
                          name="brochure_pdf_2"
                          control={control}
                          render={({ field: { value } }) => (
                            <FileUploader
                              value={value instanceof File ? [value] : []}
                              onValueChange={(files) =>
                                handleBrochureUpload2(files[0] || null)
                              }
                              maxFileCount={1}
                              maxSize={1 * 1024 * 1024} // 1MB
                              onRemove={() => handleBrochureUpload2(null)}
                              accept={{ "application/pdf": [".pdf"] }}
                            />
                          )}
                        />
                      )}
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-gray-500 mt-1">
                      Upload your event flyer (PDF only)
                    </p>
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4">
            {canApplyToAllRooms && (
              <Button
                type="button"
                variant="outline"
                disabled={isLoading || readOnly}
                className="w-full sm:w-auto"
                onClick={() => attemptSubmit(true)}
              >
                {isLoading ? "Saving..." : "Apply to all rooms"}
              </Button>
            )}
            <Button
              type={isRoomsEnabled ? "button" : "submit"}
              disabled={isLoading || readOnly}
              variant="event-primary"
              className="w-full sm:w-auto"
              onClick={isRoomsEnabled ? () => attemptSubmit(false) : undefined}
            >
              {readOnly
                ? "View only"
                : isLoading
                  ? "Saving..."
                  : isRoomsEnabled
                    ? "Apply to this room only"
                    : "Save & Next"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
