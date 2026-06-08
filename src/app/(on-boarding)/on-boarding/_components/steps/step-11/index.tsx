"use client";

import React, { useState, useEffect, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import { useFormContext } from "../../form-provider";
import { stepElevenSchema, StepElevenType } from "../../form-provider/schema";
import { onboardingService } from "@/services/vendor/onboarding/onboarding.service";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { syncVendorLocationsCache } from "@/app/(protected)/vendor/venue-locations/_lib/queries";
import { useUpdateSessionWithLocation } from "@/services/common/auth/auth-session";
import { OnboardingTitle, RadioButtonLabel } from "@/components/ui/typography";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import GoogleLocationSearch from "./google-location-search";
import { fetchLocationDetails } from "./_lib/actions";
import { env } from "@/env";
import { useDomainSuggestions } from "./_lib/hooks/useDomainSuggestions";
import {
  Loader2,
  Check,
  CheckCircle2,
  Globe,
  Mail,
  MapPin,
} from "lucide-react";
import { useEventId } from "../../../_lib/hooks/useEventId";
import { WholeStepGuidedShell } from "../../whole-step-guided-shell";
import { guidedInsetSectionSurfaceClass } from "../../guided-section-surface";
import { GuidedWholeStepBottomActions } from "../../guided-section-chips";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/utils";

/** Public-link preview: never show raw venue names (spaces). Match subdomain rules: a-z, 0-9, hyphens, max 63. */
function subdomainPublicPreviewLabel(
  selected: string | undefined | null,
  venueName: string,
): string {
  const stripHostSuffix = (s: string) =>
    s
      .replace(/\.eventwizz\.vercel\.app$/i, "")
      .replace(/\.eventwizz\.com$/i, "")
      .replace(/\.com$/i, "");

  const normalizeLabel = (s: string) => {
    const cleaned = stripHostSuffix(s.trim())
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 63);
    return cleaned || "yoursubdomain";
  };

  const trimmedSelected = (selected ?? "").trim();
  if (trimmedSelected) {
    return normalizeLabel(trimmedSelected);
  }

  const fromVenue = slugify(venueName.trim()).slice(0, 63);
  return fromVenue || "yoursubdomain";
}

const PUBLISH_STEPS = [
  { label: "Saving your settings", icon: "💾" },
  { label: "Configuring your domain", icon: "🌐" },
  { label: "Setting up your event page", icon: "📅" },
  { label: "Publishing your site", icon: "🚀" },
  { label: "Finalising & going to dashboard", icon: "✅" },
] as const;

// Days options for reminder emails
const days = Array.from({ length: 31 }, (_, i) => i + 1);

const extraOptions = [
  { value: 60, label: "Before 2 Months" },
  { value: 90, label: "Before 3 Months" },
  { value: 120, label: "Before 4 Months" },
  { value: 180, label: "Before 6 Months" },
];

const publishCardClass =
  "rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6 space-y-4";
const publishStepBadgeClass =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-sm font-semibold tabular-nums text-slate-100";

export default function StepEleven() {
  const { form: globalForm, persistedProgressHydrated } = useFormContext();

  const stepElevenPersistedApproved = useWatch({
    control: globalForm.control,
    name: "stepEleven.isApproved",
  });
  const { update } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const updateSessionWithLocation = useUpdateSessionWithLocation();
  const [publishing, setPublishing] = useState(false);
  const [publishStep, setPublishStep] = useState(-1);
  const [publishDone, setPublishDone] = useState(false);

  // Domain suggestions
  const {
    suggestions,
    isLoading: isGeneratingSuggestions,
    error: suggestionsError,
    generateSuggestions,
    selectedDomain,
    setSelectedDomain,
  } = useDomainSuggestions();

  // Function to get a user-friendly error message
  const getErrorMessage = (error: string) => {
    if (
      error.includes("explicit") ||
      error.includes("cannotprovide") ||
      error.includes("content") ||
      error.includes("inappropriate")
    ) {
      return "This subdomain name may not be appropriate for a professional event venue. Please try a different name.";
    }
    if (error.includes("model") || error.includes("API")) {
      return "Unable to generate suggestions at the moment. Please try again.";
    }
    // Don't truncate error messages - let them display fully
    return error;
  };

  const persistedStepElevenDomain = useWatch({
    control: globalForm.control,
    name: "stepEleven.domain",
  });

  // Reactive so subdomain can seed after persistence GET fills step one.
  const venueName =
    useWatch({
      control: globalForm.control,
      name: "stepOne.name",
    }) || "";
  const venueType = "event venue"; // Could be enhanced to get from form data
  const venueLocation = globalForm.getValues("stepOne.city") || "";
  /** Set from step 1 save and from persistence GET (root `has_multiple_locations` merged into stepOne in FormProvider). */
  const stepOneHasMulti = globalForm.watch("stepOne.has_multiple_locations");
  /** Hide duplicate flow for single-location (`false`). Show when multi (`true`) or legacy payloads without the flag (`undefined`). */
  const showDuplicateEventOptions = stepOneHasMulti !== false;

  const eventId = useEventId(globalForm, "stepEleven");

  const form = useForm<StepElevenType>({
    resolver: zodResolver(stepElevenSchema),
    defaultValues: {
      step: 11 as const,
      event_id: eventId,
      reminder_email_before_days:
        globalForm.getValues().stepEleven?.reminder_email_before_days || 10,
      submit_type: "submit",
      address: globalForm.getValues().stepEleven?.address || "",
      city: globalForm.getValues().stepEleven?.city || "",
      contact_number: globalForm.getValues().stepEleven?.contact_number || "",
      domain: globalForm.getValues().stepEleven?.domain || "",
      confirm_domain:
        globalForm.getValues().stepEleven?.confirm_domain || false,
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (stepOneHasMulti === false) {
      form.setValue("submit_type", "submit");
    }
  }, [stepOneHasMulti, form]);

  /**
   * Visible subdomain input is driven by `selectedDomain`, while “Public link” preview can show
   * slugified venue — keep them aligned from persistence and default preview.
   */
  const subdomainInputSeededRef = useRef(false);
  useEffect(() => {
    if (!persistedProgressHydrated) return;

    const fromGlobal = (persistedStepElevenDomain ?? "").trim();
    if (fromGlobal) {
      const slug = subdomainPublicPreviewLabel(fromGlobal, "");
      setSelectedDomain(slug);
      form.setValue("domain", slug);
      subdomainInputSeededRef.current = true;
      return;
    }

    if (subdomainInputSeededRef.current) return;

    const fallback = subdomainPublicPreviewLabel("", venueName);
    if (fallback && fallback !== "yoursubdomain") {
      setSelectedDomain(fallback);
      form.setValue("domain", fallback);
      subdomainInputSeededRef.current = true;
    }
  }, [
    persistedProgressHydrated,
    persistedStepElevenDomain,
    venueName,
    form,
    setSelectedDomain,
  ]);

  // Watch reminder email configuration state
  const showReminderDays =
    form.watch("reminder_email_before_days") !== undefined;

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const stepDelays = [900, 800, 1000, 900, 700];

  // Single clean submit flow — no double API call
  const onSubmit = async (values: StepElevenType) => {
    try {
      globalForm.setValue("stepEleven", values);
      setPublishing(true);
      setPublishStep(-1);
      setPublishDone(false);

      type StepElevenPayload = {
        step: 11;
        event_id: number;
        submit_type: "duplicate" | "submit";
        address?: string;
        city?: string;
        contact_number?: string;
        reminder_email_before_days?: number;
        domain: string;
        confirm_domain: boolean;
        isApproved?: boolean;
      };

      const payload: StepElevenPayload = {
        step: 11,
        event_id: values.event_id,
        submit_type: values.submit_type,
        domain: values.domain,
        confirm_domain: values.confirm_domain,
        isApproved: true,
      };

      if (values.submit_type === "duplicate") {
        payload.address = values.address;
        payload.city = values.city;
        payload.contact_number = values.contact_number;
      }

      if (showReminderDays) {
        payload.reminder_email_before_days =
          values.reminder_email_before_days || 10;
      }

      // Step 0 — saving settings (sync to global form only; do not call save() — it triggers cache invalidation and can unmount the overlay)
      setPublishStep(0);
      await sleep(stepDelays[0]);

      // Step 1 — configuring domain
      setPublishStep(1);
      await sleep(stepDelays[1]);

      // Step 2 — setting up event page (actual API call happens here)
      setPublishStep(2);
      const response = await onboardingService.storeStepElevenData(
        payload as StepElevenType,
      );
      if (!response?.status) throw new Error("Failed to publish");

      globalForm.setValue("stepEleven", { ...values, isApproved: true });

      if (values.submit_type === "duplicate") {
        const syncedLocations = await syncVendorLocationsCache(queryClient);
        if (syncedLocations?.data?.length) {
          await updateSessionWithLocation({
            venue_locations: syncedLocations.data,
            default_venue_location: syncedLocations.default_venue_location,
          });
        }
        void queryClient.invalidateQueries({ queryKey: ["locations"] });
      }

      // Step 3 — publishing site
      setPublishStep(3);
      await sleep(stepDelays[2]);

      await update({ on_boarding_step: 11 });

      // Step 4 — finalising
      setPublishStep(4);
      await sleep(stepDelays[3]);

      // Done — show success screen then redirect
      setPublishStep(PUBLISH_STEPS.length);
      await sleep(300);
      setPublishDone(true);

      setTimeout(() => {
        router.push("/welcome/select-location?onboarded=true");
      }, 3500);
    } catch (error) {
      console.error("Error during publishing:", error);
      setPublishing(false);
      setPublishStep(-1);
    }
  };

  const progressPct =
    publishStep < 0
      ? 0
      : Math.min(
          Math.round(((publishStep + 1) / PUBLISH_STEPS.length) * 100),
          100,
        );

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen bg-transparent">
      {/* Full-screen publishing overlay */}
      <AnimatePresence>
        {publishing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 backdrop-blur-sm"
          >
            <div className="w-full max-w-sm mx-auto px-6">
              <AnimatePresence mode="wait">
                {publishDone ? (
                  /* ── Success screen ── */
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 22 }}
                    className="flex flex-col items-center text-center gap-5"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 18,
                        delay: 0.1,
                      }}
                      className="w-20 h-20 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "rgba(34,197,94,0.15)" }}
                    >
                      <CheckCircle2 className="w-10 h-10 text-green-500" />
                    </motion.div>

                    <div>
                      <h2 className="text-2xl font-bold text-foreground">
                        Your site is live! 🎉
                      </h2>
                      <p className="text-sm text-muted-foreground mt-2">
                        Taking you to your dashboard now…
                      </p>
                    </div>

                    <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-green-500"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 3.2, ease: "linear" }}
                      />
                    </div>
                  </motion.div>
                ) : (
                  /* ── Loading screen ── */
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    className="w-full"
                  >
                    {/* Animated icon */}
                    <div className="text-center mb-8">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="w-14 h-14 rounded-2xl border border-blue-500/30 flex items-center justify-center mx-auto mb-4 bg-blue-500/10"
                      >
                        <Loader2 className="w-7 h-7 text-blue-400" />
                      </motion.div>
                      <h2 className="text-xl font-bold text-white">
                        Publishing your event…
                      </h2>
                      <p className="text-slate-500 text-xs mt-1">
                        Please don&apos;t close this page
                      </p>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs text-slate-500">Progress</span>
                        <span className="text-xs font-semibold text-blue-400">
                          {progressPct}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-blue-500"
                          initial={{ width: "0%" }}
                          animate={{ width: `${progressPct}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                      </div>
                    </div>

                    {/* Step list */}
                    <div className="space-y-2">
                      {PUBLISH_STEPS.map((step, idx) => {
                        const isDone = idx < publishStep;
                        const isActive = idx === publishStep;
                        const isPending = idx > publishStep;
                        return (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: isPending ? 0.35 : 1, x: 0 }}
                            transition={{ delay: idx * 0.06 }}
                            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors ${
                              isActive
                                ? "bg-white/10 border border-white/20"
                                : "bg-transparent"
                            }`}
                          >
                            <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
                              {isDone ? (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{
                                    type: "spring",
                                    stiffness: 300,
                                    damping: 20,
                                  }}
                                  className="w-5 h-5 rounded-full flex items-center justify-center bg-green-500/15"
                                >
                                  <Check className="w-3 h-3 text-green-500" />
                                </motion.div>
                              ) : isActive ? (
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{
                                    duration: 1,
                                    repeat: Infinity,
                                    ease: "linear",
                                  }}
                                >
                                  <Loader2 className="w-4 h-4 text-blue-400" />
                                </motion.div>
                              ) : (
                                <div className="w-4 h-4 rounded-full border border-slate-500/30" />
                              )}
                            </div>
                            <span className="text-sm mr-1">{step.icon}</span>
                            <span
                              className={`text-sm font-medium ${
                                isDone
                                  ? "text-slate-400"
                                  : isActive
                                    ? "text-white"
                                    : "text-slate-500"
                              }`}
                            >
                              {step.label}
                            </span>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-4xl mx-auto relative">
        <OnboardingCard className="w-full mx-auto shadow-sm">
          <CardHeader className="space-y-2 pb-4 pt-4 text-center sm:text-left">
            <OnboardingTitle>Almost done — publish your event</OnboardingTitle>
            <p className="mx-auto max-w-xl text-sm leading-relaxed text-slate-400 sm:mx-0">
              Choose the web address for bookings, optionally turn on balance
              reminders, then submit. Everything stays editable in your
              dashboard later.
            </p>
          </CardHeader>

          <CardContent className="px-6 py-2 pb-8">
            <Form {...form}>
              <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
                {/* Hidden fields */}
                <input type="hidden" {...form.register("step")} />
                <input
                  type="hidden"
                  {...form.register("event_id", {
                    valueAsNumber: true,
                  })}
                />

                <WholeStepGuidedShell
                  form={form}
                  sectionId="step-eleven-publish"
                  chipLabel="Publish"
                  chipDescription="Domain, reminders, and submit."
                  persistenceHydrated={persistedProgressHydrated}
                  persistedStepApproved={stepElevenPersistedApproved === true}
                  renderFooter={({ guided }) => (
                    <div className="w-full space-y-4">
                      <GuidedWholeStepBottomActions
                        guided={guided}
                        loading={publishing}
                        labelWhenReady={
                          form.watch("submit_type") === "duplicate"
                            ? "Duplicate & submit"
                            : "Submit"
                        }
                        continueDisabled={
                          publishing ||
                          !selectedDomain ||
                          !form.watch("confirm_domain")
                        }
                        onContinue={() => void form.handleSubmit(onSubmit)()}
                        primaryButtonClassName="h-12 px-10"
                      />
                      {!selectedDomain && (
                        <p className="text-center text-sm text-muted-foreground">
                          Please select a subdomain to continue
                        </p>
                      )}
                      {selectedDomain && !form.watch("confirm_domain") && (
                        <p className="text-center text-sm text-muted-foreground">
                          Please confirm your selection
                        </p>
                      )}
                    </div>
                  )}
                >
                  {() => (
                    <section
                      className={guidedInsetSectionSurfaceClass(
                        "w-full space-y-6 sm:space-y-8",
                      )}
                    >
                      {/* 1 — Website address (required) */}
                      <div className={publishCardClass}>
                        <div className="flex gap-4">
                          <span className={publishStepBadgeClass}>1</span>
                          <div className="min-w-0 flex-1 space-y-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <Globe
                                className="h-5 w-5 shrink-0 text-sky-400/90"
                                aria-hidden
                              />
                              <h3 className="text-base font-semibold tracking-tight text-white">
                                Your booking website address
                              </h3>
                            </div>
                            <p className="text-sm leading-relaxed text-slate-400">
                              Public link:{" "}
                              <strong className="font-medium text-slate-200 break-all">
                                {subdomainPublicPreviewLabel(
                                  selectedDomain,
                                  venueName,
                                )}
                                .{env.NEXT_PUBLIC_WHITE_LABEL_URL}
                              </strong>
                            </p>

                            <div className="space-y-3">
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">
                                  Subdomain
                                </label>
                                <div className="relative">
                                  <Input
                                    placeholder="Enter subdomain name"
                                    value={selectedDomain || ""}
                                    onChange={(e) => {
                                      const value = e.target.value
                                        .toLowerCase()
                                        .replace(/[^a-z0-9-]/g, "");
                                      setSelectedDomain(value);
                                      form.setValue("domain", value);

                                      // Generate suggestions based on typing
                                      if (value && value.length >= 3) {
                                        generateSuggestions(
                                          value, // Use the typed value
                                          venueType,
                                          venueLocation,
                                        );
                                      }
                                    }}
                                    className="h-9 border-white/20 bg-white/5 pr-20 text-sm"
                                    maxLength={63}
                                  />
                                  <div className="absolute right-3 top-1/2 flex -translate-y-1/2 transform items-center text-sm text-muted-foreground">
                                    .eventwizz.com
                                  </div>
                                  {selectedDomain && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedDomain("");
                                        form.setValue("domain", "");
                                      }}
                                      className="absolute right-16 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-300"
                                      title="Clear domain"
                                    >
                                      ✕
                                    </button>
                                  )}
                                  {isGeneratingSuggestions && (
                                    <div className="absolute right-20 top-1/2 transform -translate-y-1/2">
                                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                    </div>
                                  )}
                                </div>
                              </div>

                              {suggestionsError && (
                                <div className="flex items-start gap-2 mt-2 w-full">
                                  <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-white text-xs font-bold">
                                      !
                                    </span>
                                  </div>
                                  <div className="flex-1 min-w-0 w-full">
                                    <p className="text-sm text-red-600 leading-relaxed break-words overflow-wrap-anywhere">
                                      {getErrorMessage(suggestionsError)}
                                    </p>
                                    {(suggestionsError.includes("explicit") ||
                                      suggestionsError.includes(
                                        "cannotprovide",
                                      ) ||
                                      suggestionsError.includes("content")) && (
                                      <div className="mt-2">
                                        <p className="mb-2 text-xs text-muted-foreground">
                                          Try these alternatives:
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                          {[
                                            "venue",
                                            "events",
                                            "booking",
                                            "venue123",
                                            "myvenue",
                                          ].map((alt, index) => (
                                            <button
                                              key={index}
                                              type="button"
                                              onClick={() => {
                                                setSelectedDomain(alt);
                                                form.setValue("domain", alt);
                                              }}
                                              className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-sm text-foreground transition-all duration-200 hover:border-white/25 hover:bg-white/[0.1]"
                                            >
                                              {alt}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {suggestions.length > 0 && (
                                <div className="space-y-2">
                                  <div className="flex flex-wrap gap-2">
                                    {suggestions.map((suggestion, index) => (
                                      <button
                                        key={index}
                                        type="button"
                                        onClick={() => {
                                          setSelectedDomain(suggestion.domain);
                                          form.setValue(
                                            "domain",
                                            suggestion.domain,
                                          );
                                        }}
                                        className={`rounded-full border px-3 py-1.5 text-sm transition-all duration-200 hover:shadow-sm ${
                                          selectedDomain === suggestion.domain
                                            ? "border-[var(--color-primary,#3b82f6)] bg-[var(--color-primary,#3b82f6)]/15 text-foreground shadow-sm"
                                            : "border-white/15 bg-white/[0.06] text-foreground hover:border-white/25 hover:bg-white/[0.1]"
                                        }`}
                                      >
                                        {suggestion.domain.replace(
                                          /\.com$|\.eventwizz\.com$/g,
                                          "",
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Show message when no suggestions available but user is typing */}
                              {isGeneratingSuggestions &&
                                (selectedDomain || "").length >= 3 && (
                                  <div className="mt-2 flex items-center gap-2 text-xs text-[var(--color-primary,#38bdf8)]">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Finding suggestions...
                                  </div>
                                )}

                              <FormField
                                control={form.control}
                                name="domain"
                                render={({ field }) => (
                                  <FormItem className="hidden">
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="confirm_domain"
                                render={({ field }) => (
                                  <FormItem>
                                    <div className="flex items-start gap-3">
                                      <FormControl>
                                        <input
                                          type="checkbox"
                                          checked={field.value || false}
                                          onChange={(e) => {
                                            field.onChange(e.target.checked);
                                          }}
                                          className="mt-1 h-4 w-4 rounded border-white/30 text-[var(--color-primary,#38bdf8)] focus:ring-[var(--color-primary)]"
                                          disabled={!selectedDomain}
                                        />
                                      </FormControl>
                                      <div className="flex-1">
                                        <FormLabel className="text-sm font-medium cursor-pointer">
                                          I confirm this domain
                                        </FormLabel>
                                      </div>
                                    </div>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 2 — Reminder emails (optional) */}
                      <div className={publishCardClass}>
                        <div className="flex gap-4">
                          <span className={publishStepBadgeClass}>2</span>
                          <div className="min-w-0 flex-1 space-y-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <Mail
                                className="h-5 w-5 shrink-0 text-amber-400/90"
                                aria-hidden
                              />
                              <h3 className="text-base font-semibold tracking-tight text-white">
                                Balance reminder emails
                              </h3>
                              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                                Optional
                              </span>
                            </div>
                            <p className="text-sm leading-relaxed text-slate-400">
                              Send a reminder before the event so guests can pay
                              any remaining balance. You can change this later.
                            </p>
                            <FormField
                              control={form.control}
                              name="reminder_email_before_days"
                              render={({ field }) => (
                                <FormItem className="relative">
                                  <p className="text-sm font-medium text-slate-300">
                                    Send reminders?
                                  </p>
                                  <FormControl>
                                    <RadioGroup
                                      onValueChange={(value) => {
                                        if (value === "yes") {
                                          field.onChange(10);
                                        } else {
                                          field.onChange(undefined);
                                        }
                                      }}
                                      defaultValue={
                                        field.value !== undefined ? "yes" : "no"
                                      }
                                      className="flex items-center space-x-4 mt-4"
                                    >
                                      <FormItem className="flex items-center space-x-3 space-y-0">
                                        <FormControl>
                                          <RadioGroupItem
                                            value="yes"
                                            className="text-[#47aab8] border-[#47aab8] focus:ring-[#47aab8] data-[state=checked]:bg-[var(--color-secondary,#009ead)] data-[state=checked]:text-white"
                                          />
                                        </FormControl>
                                        <RadioButtonLabel>
                                          Yes, set up reminders
                                        </RadioButtonLabel>
                                      </FormItem>
                                      <FormItem className="flex items-center space-x-3 space-y-0">
                                        <FormControl>
                                          <RadioGroupItem
                                            value="no"
                                            className="text-[#47aab8] border-[#47aab8] focus:ring-[#47aab8] data-[state=checked]:bg-[var(--color-secondary,#009ead)] data-[state=checked]:text-white"
                                          />
                                        </FormControl>
                                        <RadioButtonLabel>
                                          Not now
                                        </RadioButtonLabel>
                                      </FormItem>
                                    </RadioGroup>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {showReminderDays && (
                              <FormField
                                control={form.control}
                                name="reminder_email_before_days"
                                render={({ field }) => {
                                  // Convert the value to string for the Select component
                                  const defaultValue =
                                    field.value !== undefined
                                      ? field.value.toString()
                                      : "10";

                                  return (
                                    <FormItem className="relative">
                                      <p className="text-sm font-medium text-slate-300">
                                        How many days before the event?
                                      </p>
                                      <Select
                                        onValueChange={(value) => {
                                          const numValue = parseInt(value, 10);
                                          field.onChange(numValue);
                                        }}
                                        value={defaultValue}
                                      >
                                        <FormControl>
                                          <SelectTrigger className="w-full h-10 bg-white/5 border-white/10 mt-4">
                                            <SelectValue placeholder="Days" />
                                          </SelectTrigger>
                                        </FormControl>

                                        <SelectContent className="w-full">
                                          {[
                                            ...days,
                                            ...extraOptions.map((o) => o.value),
                                          ].map((day) => {
                                            const extra = extraOptions.find(
                                              (o) => o.value === day,
                                            );
                                            return (
                                              <SelectItem
                                                key={day}
                                                value={day.toString()}
                                              >
                                                {extra
                                                  ? extra.label
                                                  : `${day} ${
                                                      day === 1 ? "Day" : "Days"
                                                    }`}
                                              </SelectItem>
                                            );
                                          })}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  );
                                }}
                              />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 3 — Copy event to another venue (multi-location only) */}
                      {showDuplicateEventOptions && (
                        <div className={publishCardClass}>
                          <div className="flex gap-4">
                            <span className={publishStepBadgeClass}>3</span>
                            <div className="min-w-0 flex-1 space-y-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <MapPin
                                  className="h-5 w-5 shrink-0 text-violet-400/90"
                                  aria-hidden
                                />
                                <h3 className="text-base font-semibold tracking-tight text-white">
                                  Another venue?
                                </h3>
                              </div>
                              <p className="text-sm leading-relaxed text-slate-400">
                                Only if you run more than one location:
                                duplicate this event and attach it to a
                                different address. You can edit everything in
                                the dashboard.
                              </p>
                              <FormField
                                control={form.control}
                                name="submit_type"
                                render={({ field }) => (
                                  <FormItem className="relative">
                                    <p className="text-sm font-medium text-slate-300">
                                      Duplicate this event for another location?{" "}
                                      <span className="text-red-400">*</span>
                                    </p>
                                    <FormControl>
                                      <RadioGroup
                                        onValueChange={(value) => {
                                          field.onChange(value);
                                          // Force re-render by setting state directly
                                          form.setValue(
                                            "submit_type",
                                            value as "duplicate" | "submit",
                                          );
                                        }}
                                        defaultValue={field.value || "submit"}
                                        className="flex items-center space-x-4 mt-4"
                                      >
                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                          <FormControl>
                                            <RadioGroupItem
                                              value="duplicate"
                                              className="text-[#47aab8] border-[#47aab8] focus:ring-[#47aab8] data-[state=checked]:bg-[var(--color-secondary,#009ead)] data-[state=checked]:text-white"
                                            />
                                          </FormControl>
                                          <RadioButtonLabel>
                                            Yes, duplicate
                                          </RadioButtonLabel>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                          <FormControl>
                                            <RadioGroupItem
                                              value="submit"
                                              className="text-[#47aab8] border-[#47aab8] focus:ring-[#47aab8] data-[state=checked]:bg-[var(--color-secondary,#009ead)] data-[state=checked]:text-white"
                                            />
                                          </FormControl>
                                          <RadioButtonLabel>
                                            No, only this event
                                          </RadioButtonLabel>
                                        </FormItem>
                                      </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              {form.watch("submit_type") === "duplicate" && (
                                <div className="space-y-4 border-t border-white/10 pt-6">
                                  <p className="text-sm font-medium text-slate-200">
                                    Other venue address &amp; contact
                                  </p>
                                  <FormField
                                    control={form.control}
                                    name="address"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-sm font-medium text-slate-300">
                                          Address{" "}
                                          <span className="text-red-400">
                                            *
                                          </span>
                                        </FormLabel>
                                        <FormControl>
                                          <GoogleLocationSearch
                                            apiKey={
                                              env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
                                            }
                                            value={field.value || ""}
                                            onChange={(value) =>
                                              field.onChange(value)
                                            }
                                            onSelect={(placeId) =>
                                              fetchLocationDetails(
                                                form,
                                                placeId,
                                              )
                                            }
                                            placeholder="Search for a location..."
                                            variant="dark"
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  <FormField
                                    control={form.control}
                                    name="city"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-sm font-medium text-slate-300">
                                          City{" "}
                                          <span className="text-red-400">
                                            *
                                          </span>
                                        </FormLabel>
                                        <FormControl>
                                          <Input
                                            {...field}
                                            placeholder="City"
                                            className="h-10 border-white/10 bg-white/5"
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  <FormField
                                    control={form.control}
                                    name="contact_number"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-sm font-medium text-slate-300">
                                          Contact number{" "}
                                          <span className="text-red-400">
                                            *
                                          </span>
                                        </FormLabel>
                                        <FormControl>
                                          <Input
                                            {...field}
                                            type="tel"
                                            inputMode="numeric"
                                            placeholder="Phone number"
                                            className="h-10 border-white/10 bg-white/5"
                                            onChange={(e) => {
                                              const value =
                                                e.target.value.replace(
                                                  /[^0-9+\-() ]/g,
                                                  "",
                                                );
                                              field.onChange(value);
                                            }}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </section>
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
