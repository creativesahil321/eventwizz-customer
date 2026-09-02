"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CardContent, CardHeader, OnboardingCard } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useFormContext } from "../../form-provider";
import { stepSevenSchema, StepSevenType } from "../../form-provider/schema";
import { FileUploader } from "@/components/ui/file-uploader";
import { toast } from "sonner";
import {
  OnboardingTitle,
  OnboardingFieldGroupTitle,
} from "@/components/ui/typography";
import { onboardingService } from "@/services/vendor/onboarding/onboarding.service";
import { Resolver } from "react-hook-form";
import { useSession } from "next-auth/react";
import { useFieldFocusHandler } from "../../form-preview/field-focus-handler";
import { useEventId } from "../../../_lib/hooks/useEventId";
import { WholeStepGuidedShell } from "../../whole-step-guided-shell";
import { guidedInsetSectionSurfaceClass } from "../../guided-section-surface";
import { guidedOnboardingSkipButtonClass } from "../../guided-sticky-approval-bar";
import { GuidedWholeStepBottomActions } from "../../guided-section-chips";
import { useCurrencySymbol } from "@/hooks/use-currency-format";
import { MultiSpaceHeader } from "../../rooms/multi-space-header";
import { useRoomScopeSync } from "../../rooms/use-room-scope-sync";
import { canShowApplyToAllButton, useRoomManager } from "../../rooms/use-room-manager";

export default function StepSeven() {
  const currencySymbol = useCurrencySymbol();
  const { handleFieldFocus } = useFieldFocusHandler();
  const {
    form: globalForm,
    save,
    setActiveStep,
    activeField,
    persistedProgressHydrated,
  } = useFormContext();

  const stepSevenPersistedApprovedSingle = useWatch({
    control: globalForm.control,
    name: "stepSeven.isApproved",
  });
  // Multi-room hookup for the Brochure / Price section.
  const roomScope = useRoomScopeSync("brochure");
  const { rooms, currentRoomIndex, setCurrentRoomIndex } = useRoomManager();
  const stepSevenPersistedApproved = roomScope.isMultiRoom
    ? roomScope.persistedApproved
    : stepSevenPersistedApprovedSingle === true;
  const [loading, setLoading] = useState(false);
  const { update: updateSession } = useSession();
  const eventId = useEventId(globalForm, "stepSeven");
  const activeScopedBrochure = roomScope.isMultiRoom
    ? rooms[currentRoomIndex]?.brochure
    : globalForm.getValues("stepSeven");

  const form = useForm<StepSevenType>({
    resolver: zodResolver(stepSevenSchema) as Resolver<StepSevenType>,
    defaultValues: {
      step: 7,
      event_id: eventId,
      brochure_pdf: globalForm.getValues("stepSeven.brochure_pdf") || undefined,
      faq_pdf: globalForm.getValues("stepSeven.faq_pdf") || undefined,
      price_start_from:
        globalForm.getValues("stepSeven.price_start_from") || "",
      downloads: globalForm.getValues("stepSeven.downloads") || [],
      remove_brochure_pdf: false,
      remove_brochure_pdf_2: false,
      remove_faq_pdf: false,
    },
    mode: "onChange",
  });

  // Track if we have string URLs from backend
  const [brochurePdfUrl, setBrochurePdfUrl] = useState<string | null>(null);
  const [brochurePdfUrl2, setBrochurePdfUrl2] = useState<string | null>(null);

  const setScopedBrochureField = useCallback(
    (field: keyof StepSevenType, value: unknown) => {
      globalForm.setValue(`stepSeven.${field}` as never, value as never);
      if (roomScope.isMultiRoom) {
        globalForm.setValue(
          `multiSpace.rooms.${currentRoomIndex}.brochure.${field}` as never,
          value as never,
        );
      }
    },
    [globalForm, roomScope.isMultiRoom, currentRoomIndex],
  );

  const normalizeOptionalPdfValue = useCallback(
    (value: unknown): File | string | null => {
      if (value instanceof File) return value;
      if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
      }
      return null;
    },
    [],
  );

  const mergeScopedBrochureState = useCallback(
    (patch: Partial<StepSevenType>) => {
      const currentStepSeven = (globalForm.getValues("stepSeven") ??
        {}) as Record<string, unknown>;
      globalForm.setValue("stepSeven", {
        ...currentStepSeven,
        ...patch,
      } as never);

      if (!roomScope.isMultiRoom) return;
      const roomPath = `multiSpace.rooms.${currentRoomIndex}.brochure` as never;
      const currentRoomBrochure =
        (globalForm.getValues(roomPath) as
          | Record<string, unknown>
          | undefined) ?? {};
      globalForm.setValue(roomPath, {
        ...currentRoomBrochure,
        ...patch,
      } as never);
    },
    [globalForm, roomScope.isMultiRoom, currentRoomIndex],
  );

  const previousRoomIndexRef = useRef(currentRoomIndex);

  // Stable key so the rehydration effect fires on actual data change too
  // (not just room index), without relying on unstable object references.
  const scopedBrochureKey = useMemo(() => {
    const s = (activeScopedBrochure ?? {}) as Record<string, unknown>;
    return JSON.stringify({
      bp: typeof s.brochure_pdf === "string" ? s.brochure_pdf : "",
      bp2: typeof s.brochure_pdf_2 === "string" ? s.brochure_pdf_2 : "",
      ps: s.price_start_from ?? "",
    });
  }, [activeScopedBrochure]);

  // Helper: build the full reset state from a scoped brochure object.
  const buildResetState = useCallback(
    (scoped: Record<string, unknown>) => {
      return {
        step: 7 as const,
        event_id: eventId,
        brochure_pdf: normalizeOptionalPdfValue(scoped.brochure_pdf),
        brochure_pdf_2: normalizeOptionalPdfValue(scoped.brochure_pdf_2),
        faq_pdf: normalizeOptionalPdfValue(scoped.faq_pdf),
        remove_brochure_pdf:
          typeof scoped.remove_brochure_pdf === "boolean"
            ? scoped.remove_brochure_pdf
            : false,
        remove_brochure_pdf_2:
          typeof scoped.remove_brochure_pdf_2 === "boolean"
            ? scoped.remove_brochure_pdf_2
            : false,
        remove_faq_pdf:
          typeof scoped.remove_faq_pdf === "boolean"
            ? scoped.remove_faq_pdf
            : false,
        price_start_from:
          typeof scoped.price_start_from === "string"
            ? scoped.price_start_from
            : "",
        price: {
          title: "PRICES FROM" as const,
          description:
            typeof scoped.price_start_from === "string" &&
            scoped.price_start_from
              ? `${currencySymbol}${scoped.price_start_from} per person`
              : "",
          link: "#",
          icon: "Tag" as const,
          price_title: "",
        },
        downloads: Array.isArray(scoped.downloads) ? scoped.downloads : [],
        more_info: Array.isArray(scoped.more_info) ? scoped.more_info : [],
      };
    },
    [currencySymbol, eventId, normalizeOptionalPdfValue],
  );

  // Helper: sync the PDF URL state-setters from a scoped object.
  const syncPdfUrlState = useCallback(
    (scoped: Record<string, unknown>) => {
      setBrochurePdfUrl(
        typeof scoped.brochure_pdf === "string" &&
          scoped.brochure_pdf.trim().length > 0
          ? scoped.brochure_pdf
          : null,
      );
      setBrochurePdfUrl2(
        typeof scoped.brochure_pdf_2 === "string" &&
          scoped.brochure_pdf_2.trim().length > 0
          ? scoped.brochure_pdf_2
          : null,
      );
    },
    [],
  );

  // Persist outgoing room draft, then force-reset from the incoming room.
  // Driven by `currentRoomIndex` (primitive) so it always fires on tab switch.
  useEffect(() => {
    if (!roomScope.isMultiRoom) {
      previousRoomIndexRef.current = currentRoomIndex;
      // Single-room: still rehydrate from scoped data (initial load / API update).
      const scoped = (activeScopedBrochure ?? {}) as Record<string, unknown>;
      form.reset(buildResetState(scoped) as StepSevenType);
      syncPdfUrlState(scoped);
      return;
    }

    // 1. Save outgoing room's local form state so work isn't lost.
    const previousRoomIndex = previousRoomIndexRef.current;
    if (
      previousRoomIndex !== currentRoomIndex &&
      previousRoomIndex >= 0 &&
      previousRoomIndex < rooms.length
    ) {
      const outgoing = form.getValues();
      globalForm.setValue(
        `multiSpace.rooms.${previousRoomIndex}.brochure`,
        {
          brochure_pdf: outgoing.brochure_pdf,
          brochure_pdf_2: outgoing.brochure_pdf_2,
          faq_pdf: outgoing.faq_pdf,
          remove_brochure_pdf: outgoing.remove_brochure_pdf,
          remove_brochure_pdf_2: outgoing.remove_brochure_pdf_2,
          remove_faq_pdf: outgoing.remove_faq_pdf,
          price_start_from: outgoing.price_start_from,
          downloads: outgoing.downloads ?? [],
          more_info: outgoing.more_info ?? [],
        },
        { shouldValidate: false, shouldDirty: true },
      );
    }
    previousRoomIndexRef.current = currentRoomIndex;

    // 2. Force-reset local form from the incoming room's brochure data.
    const scoped = (rooms[currentRoomIndex]?.brochure ?? {}) as Record<
      string,
      unknown
    >;
    form.reset(buildResetState(scoped) as StepSevenType);
    syncPdfUrlState(scoped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRoomIndex, roomScope.isMultiRoom, scopedBrochureKey]);

  // Generic function to handle PDF uploads to downloads array
  const handlePdfUploadToDownloads = (
    file: File | null,
    title: string,
    id: number,
    localFieldName: "brochure_pdf" | "brochure_pdf_2" | "faq_pdf",
    urlSetter: (url: string | null) => void,
    removalFlagName:
      | "remove_brochure_pdf"
      | "remove_brochure_pdf_2"
      | "remove_faq_pdf",
  ) => {
    // Check if file is PDF
    if (file && file.type !== "application/pdf") {
      toast.error("Only PDF files are allowed");
      return;
    }

    form.setValue(localFieldName, file || null);
    setScopedBrochureField(localFieldName, file || null);

    // Update global form downloads array
    const downloads = globalForm.getValues("stepSeven.downloads") || [];

    if (file) {
      // When new file is uploaded, clear the URL
      urlSetter(null);
      // Clear removal flag when new file is uploaded
      form.setValue(removalFlagName, false);
      setScopedBrochureField(removalFlagName, false);

      // Add or update PDF in downloads array
      const existingIndex = downloads.findIndex(
        (d: { title?: string | undefined }) => d.title === title,
      );

      if (existingIndex >= 0) {
        downloads[existingIndex] = {
          ...downloads[existingIndex],
          title,
          pdf: file,
          id,
          download_link: ["#"],
        };
      } else {
        downloads.push({
          id,
          title,
          pdf: file,
          download_link: ["#"],
        });
      }
    } else {
      // Remove PDF if file is null
      urlSetter(null);
      // Set removal flag when file is removed
      form.setValue(removalFlagName, true);
      setScopedBrochureField(removalFlagName, true);

      const filteredDownloads = downloads.filter(
        (d: { title?: string | undefined }) => d.title !== title,
      );
      mergeScopedBrochureState({
        downloads: filteredDownloads,
      });
      return;
    }

    mergeScopedBrochureState({
      downloads,
    });

    // Manually trigger validation
    form.trigger(localFieldName);
  };

  // Handle file upload for main brochure PDF
  const handleBrochureUpload = (file: File | null) => {
    handlePdfUploadToDownloads(
      file,
      "Brochure",
      1,
      "brochure_pdf",
      setBrochurePdfUrl,
      "remove_brochure_pdf",
    );
  };

  // Handle file upload for Event Flyer PDF
  const handleBrochureUpload2 = (file: File | null) => {
    handlePdfUploadToDownloads(
      file,
      "Event Flyer",
      3,
      "brochure_pdf_2",
      setBrochurePdfUrl2,
      "remove_brochure_pdf_2",
    );
  };

  const handleSubmit = async (
    data: StepSevenType,
    options?: { applyToAllRooms?: boolean },
  ) => {
    const applyToAllRooms = options?.applyToAllRooms === true;
    setLoading(true);
    try {
      const resolvePdfField = (
        value: StepSevenType["brochure_pdf"],
        fallbackUrl: string | null,
      ): StepSevenType["brochure_pdf"] => {
        if (value instanceof File) return value;
        if (typeof value === "string" && value.trim().length > 0) return value;
        return fallbackUrl && fallbackUrl.trim().length > 0 ? fallbackUrl : null;
      };

      const submissionData: StepSevenType = {
        ...data,
        brochure_pdf: resolvePdfField(data.brochure_pdf, brochurePdfUrl),
        brochure_pdf_2: resolvePdfField(data.brochure_pdf_2, brochurePdfUrl2),
      };

      // First ensure the preview data is properly formatted
      const formattedData = {
        ...submissionData,
        price: {
          title: "PRICES FROM",
          description: data.price_start_from
            ? `${currencySymbol}${data.price_start_from} per person`
            : "",
          link: "#",
          icon: "Tag",
          price_title: "",
        },
      };

      // Update global form with formatted data
      globalForm.setValue("stepSeven", formattedData);

      // Validate the form using schema validation only
      const isSchemaValid = await form.trigger();

      if (!isSchemaValid) {
        const errors = form.formState.errors;
        // Display schema validation errors
        const errorFields = Object.keys(errors);
        toast.error(
          `Please correct the highlighted fields: ${errorFields.join(", ")}`,
        );
        setLoading(false);
        return;
      }

      try {
        // Branch on multi-room mode. Single-room mode hits the existing endpoint; multi-room
        // dispatches via the room-scoped endpoint and mirrors data into the active room slot.
        const succeeded = await roomScope.saveSection({
          stepData: { ...submissionData, isApproved: true } as StepSevenType,
          applyToAllRooms,
          singleRoomSave: async () => {
            const response = await onboardingService.storeStepSevenData({
              ...submissionData,
              isApproved: true,
            });
            if (response?.status) {
              globalForm.setValue("stepSeven", {
                ...formattedData,
                isApproved: true,
              });
              return true;
            }
            console.error("API Error:", response);
            return false;
          },
        });

        if (succeeded) {
          if (applyToAllRooms && roomScope.isMultiRoom) {
          }
          if (roomScope.isMultiRoom && !applyToAllRooms) {
            const updatedRooms = (globalForm.getValues("multiSpace")?.rooms ??
              []) as typeof rooms;
            const nextUnsavedRoomIndex = updatedRooms.findIndex(
              (room) => room.isApprovedBrochure !== true,
            );
            if (nextUnsavedRoomIndex !== -1) {
              if (nextUnsavedRoomIndex !== currentRoomIndex) {
                setCurrentRoomIndex(nextUnsavedRoomIndex);
              }
              toast.info("Saved. Continue with the next room.");
              return;
            }
          }
          setActiveStep(8);
          Promise.all([updateSession({ on_boarding_step: 8 }), save()]).catch(
            (error) => {
              console.error("Background save error:", error);
            },
          );
        }
      } catch (apiError) {
        console.error("API call failed:", apiError);
      }
    } catch (error) {
      console.error("Error during Step Seven submission:", error);
      // Error toast is handled by axios interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-start w-full min-h-screen bg-transparent">
      <div className="w-full min-w-0 max-w-none mx-auto relative">
        <OnboardingCard className="w-full mx-auto shadow-sm mb-16">
          <CardHeader className="pb-2 pt-4">
            <OnboardingTitle>
              Add your brochure and pricing
            </OnboardingTitle>
          </CardHeader>

          <CardContent className="px-6 py-2 pb-8">
            {/* Per-room tab bar shown only when multi-space mode is enabled. */}
            <MultiSpaceHeader section="brochure" />

            <Form {...form}>
              <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
                <input type="hidden" {...form.register("step")} />
                <input
                  type="hidden"
                  {...form.register("event_id", {
                    setValueAs: (value) => Number(value),
                  })}
                />

                <WholeStepGuidedShell
                  form={form}
                  sectionId="step-seven-brochure-location"
                  previewFocusStep={7}
                  chipLabel="Brochure info"
                  chipDescription="Brochure files and pricing."
                  persistenceHydrated={persistedProgressHydrated}
                  persistedStepApproved={stepSevenPersistedApproved}
                  renderFooter={({ guided }) => (
                    <GuidedWholeStepBottomActions
                      guided={guided}
                      loading={loading}
                      alwaysShowReadyLabel={roomScope.isMultiRoom}
                      labelWhenReady={
                        roomScope.isMultiRoom
                          ? "Apply to this room only"
                          : "Save & continue"
                      }
                      onContinue={() =>
                        void form.handleSubmit((data) =>
                          handleSubmit(data),
                        )()
                      }
                      extraActions={
                        canShowApplyToAllButton(rooms, true) ? (
                          <Button
                            variant="event-outline"
                            type="button"
                            onClick={() =>
                              void form.handleSubmit((data) =>
                                handleSubmit(data, { applyToAllRooms: true }),
                              )()
                            }
                            className={guidedOnboardingSkipButtonClass}
                          >
                            Apply to all rooms
                          </Button>
                        ) : !roomScope.isMultiRoom ? (
                          <Button
                            variant="event-outline"
                            type="button"
                            onClick={() => setActiveStep(8)}
                            className={guidedOnboardingSkipButtonClass}
                          >
                            Skip
                          </Button>
                        ) : null
                      }
                    />
                  )}
                >
                  {() => (
                    <>
                      {/* Brochure Section */}
                      <section
                        className={guidedInsetSectionSurfaceClass(
                          "w-full mb-4",
                        )}
                      >
                        <OnboardingFieldGroupTitle>
                          Add more information
                        </OnboardingFieldGroupTitle>

                        <div className="mt-4 w-full min-w-0 space-y-6 rounded-lg border border-white/10 bg-white/[0.03] p-4 sm:p-6">
                          <FormField
                            control={form.control}
                            name="brochure_pdf"
                            render={() => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">
                                  Event brochure PDF (optional)
                                </FormLabel>
                                <FormControl>
                                  {brochurePdfUrl ? (
                                    <div className="w-full min-w-0">
                                      <div className="mb-2 flex min-w-0 items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.06] p-4">
                                        <div className="flex items-center min-w-0 flex-1 overflow-hidden">
                                          <svg
                                            className="shrink-0"
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
                                            <path
                                              d="M20 2V8H26L20 2Z"
                                              fill="#FF8A80"
                                            />
                                            <path
                                              d="M14 16H18V18H14V16Z"
                                              fill="white"
                                            />
                                            <path
                                              d="M14 20H18V22H14V20Z"
                                              fill="white"
                                            />
                                          </svg>
                                          <span
                                            className="ml-2 text-sm truncate"
                                            title={
                                              brochurePdfUrl.split("/").pop() ??
                                              undefined
                                            }
                                          >
                                            {brochurePdfUrl.split("/").pop()}
                                          </span>
                                        </div>
                                        <Button
                                          className="shrink-0"
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setBrochurePdfUrl(null);
                                            form.setValue("brochure_pdf", null);
                                            form.setValue(
                                              "remove_brochure_pdf",
                                              true,
                                            );
                                            globalForm.setValue(
                                              "stepSeven.remove_brochure_pdf",
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
                                      control={form.control}
                                      render={({ field: { value } }) => (
                                        <FileUploader
                                          value={
                                            value instanceof File ? [value] : []
                                          }
                                          onValueChange={(files) =>
                                            handleBrochureUpload(
                                              files[0] || null,
                                            )
                                          }
                                          maxFileCount={1}
                                          maxSize={20 * 1024 * 1024}
                                          onRemove={() =>
                                            handleBrochureUpload(null)
                                          }
                                          accept={{
                                            "application/pdf": [".pdf"],
                                          }}
                                          onFocus={() =>
                                            handleFieldFocus("brochure_pdf")
                                          }
                                        />
                                      )}
                                    />
                                  )}
                                </FormControl>
                                <FormMessage />
                                <p className="text-xs text-muted-foreground mt-1">
                                  Upload your event brochure (PDF only, up to 20MB)
                                </p>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="brochure_pdf_2"
                            render={() => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">
                                  Event flyer PDF (optional)
                                </FormLabel>
                                <FormControl>
                                  {brochurePdfUrl2 ? (
                                    <div className="w-full min-w-0">
                                      <div className="mb-2 flex min-w-0 items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.06] p-4">
                                        <div className="flex items-center min-w-0 flex-1 overflow-hidden">
                                          <svg
                                            className="shrink-0"
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
                                            <path
                                              d="M20 2V8H26L20 2Z"
                                              fill="#FF8A80"
                                            />
                                            <path
                                              d="M14 16H18V18H14V16Z"
                                              fill="white"
                                            />
                                            <path
                                              d="M14 20H18V22H14V20Z"
                                              fill="white"
                                            />
                                          </svg>
                                          <span
                                            className="ml-2 text-sm truncate"
                                            title={
                                              brochurePdfUrl2
                                                .split("/")
                                                .pop() ?? undefined
                                            }
                                          >
                                            {brochurePdfUrl2.split("/").pop()}
                                          </span>
                                        </div>
                                        <Button
                                          className="shrink-0"
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setBrochurePdfUrl2(null);
                                            form.setValue(
                                              "brochure_pdf_2",
                                              null,
                                            );
                                            form.setValue(
                                              "remove_brochure_pdf_2",
                                              true,
                                            );
                                            globalForm.setValue(
                                              "stepSeven.remove_brochure_pdf_2",
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
                                      control={form.control}
                                      render={({ field: { value } }) => (
                                        <FileUploader
                                          value={
                                            value instanceof File ? [value] : []
                                          }
                                          onValueChange={(files) =>
                                            handleBrochureUpload2(
                                              files[0] || null,
                                            )
                                          }
                                          maxFileCount={1}
                                          maxSize={20 * 1024 * 1024}
                                          onRemove={() =>
                                            handleBrochureUpload2(null)
                                          }
                                          accept={{
                                            "application/pdf": [".pdf"],
                                          }}
                                          onFocus={() =>
                                            handleFieldFocus("brochure_pdf_2")
                                          }
                                        />
                                      )}
                                    />
                                  )}
                                </FormControl>
                                <FormMessage />
                                <p className="text-xs text-muted-foreground mt-1">
                                  Upload your event flyer (PDF only, up to 20MB)
                                </p>
                              </FormItem>
                            )}
                          />

                        </div>
                      </section>

                    </>
                  )}
                </WholeStepGuidedShell>
              </form>
            </Form>
          </CardContent>
        </OnboardingCard>
      </div>
    </div>
  );
}
