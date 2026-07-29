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
import { useRouter } from "next/navigation";
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
import { Loader2, Globe, Mail, MapPin } from "lucide-react";
import { useEventId } from "../../../_lib/hooks/useEventId";
import { WholeStepGuidedShell } from "../../whole-step-guided-shell";
import { GuidedWholeStepBottomActions } from "../../guided-section-chips";
import { slugify } from "@/lib/utils";

/** Public-link / input: subdomain label only (a-z, 0-9, hyphens, max 63). */
function normalizeSubdomainLabel(
  selected: string | undefined | null,
  suffix = "eventwizz.com",
): string {
  const stripHostSuffix = (s: string) => {
    let out = s.trim().toLowerCase();
    const suffixes = [
      suffix.trim().toLowerCase(),
      "eventwizz.com",
      "eventwizz.vercel.app",
      "com",
    ].filter(Boolean);
    for (const suf of suffixes) {
      if (out.endsWith(`.${suf}`)) {
        out = out.slice(0, -(suf.length + 1));
      }
    }
    return out;
  };

  const cleaned = stripHostSuffix(selected ?? "")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
  return cleaned;
}

function subdomainPublicPreviewLabel(
  selected: string | undefined | null,
  venueName: string,
  suffix = "eventwizz.com",
): string {
  const fromSelected = normalizeSubdomainLabel(selected, suffix);
  if (fromSelected) return fromSelected;

  const fromVenue = slugify(venueName.trim()).slice(0, 63);
  return fromVenue || "yoursubdomain";
}

// Days options for reminder emails
const days = Array.from({ length: 31 }, (_, i) => i + 1);

const extraOptions = [
  { value: 60, label: "2 months before" },
  { value: 90, label: "3 months before" },
  { value: 120, label: "4 months before" },
  { value: 180, label: "6 months before" },
];

const publishCardClass =
  "rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 sm:p-5 space-y-3";
const publishStepBadgeClass =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-sm font-semibold tabular-nums text-slate-100";

export default function StepEleven() {
  const {
    form: globalForm,
    save,
    persistedProgressHydrated,
  } = useFormContext();

  const stepElevenPersistedApproved = useWatch({
    control: globalForm.control,
    name: "stepEleven.isApproved",
  });
  const persistedStepElevenDomain = useWatch({
    control: globalForm.control,
    name: "stepEleven.domain",
  });
  const persistedDomainSuffix = useWatch({
    control: globalForm.control,
    name: "stepEleven.domain_suffix",
  });
  const domainSuffix =
    (typeof persistedDomainSuffix === "string" &&
      persistedDomainSuffix.trim()) ||
    "eventwizz.com";

  const { update } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const updateSessionWithLocation = useUpdateSessionWithLocation();
  const [loading, setLoading] = useState(false);

  /**
   * Last domain confirmed via the steps API (`stepEleven.domain` when `isApproved`).
   * Editing away from this value unchecks confirmation; reverting restores it.
   */
  const savedDomainRef = useRef<string>("");
  /** Whether the API last approved the domain in `savedDomainRef`. */
  const savedDomainApprovedRef = useRef(false);
  const subdomainInputSeededRef = useRef(false);

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
      step: 11,
      isApproved: false,
      event_id: eventId,
      reminder_email_before_days:
        globalForm.getValues().stepEleven?.reminder_email_before_days || 10,
      submit_type: "submit",
      address: globalForm.getValues().stepEleven?.address || "",
      city: globalForm.getValues().stepEleven?.city || "",
      contact_number: globalForm.getValues().stepEleven?.contact_number || "",
      domain: globalForm.getValues().stepEleven?.domain || "",
      domain_suffix:
        globalForm.getValues().stepEleven?.domain_suffix || "eventwizz.com",
      confirm_domain: globalForm.getValues().stepEleven?.confirm_domain || false,
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (stepOneHasMulti === false) {
      form.setValue("submit_type", "submit");
    }
  }, [stepOneHasMulti, form]);

  /**
   * Sync confirmation checkbox with the currently typed domain vs last saved domain.
   * - Current === savedDomain and was approved → restore checked
   * - Current !== savedDomain → uncheck (must confirm again)
   */
  const syncConfirmForDomain = (nextDomain: string) => {
    const saved = savedDomainRef.current;
    if (
      saved.length > 0 &&
      nextDomain === saved &&
      savedDomainApprovedRef.current
    ) {
      form.setValue("confirm_domain", true, { shouldValidate: true });
      return;
    }
    form.setValue("confirm_domain", false, { shouldValidate: true });
  };

  const applyDomainChange = (raw: string) => {
    const value = normalizeSubdomainLabel(raw, domainSuffix);
    setSelectedDomain(value);
    form.setValue("domain", value, { shouldValidate: true });
    syncConfirmForDomain(value);
  };

  /**
   * Prefill from steps API `stepEleven.domain` / `isApproved`, else seed from venue name.
   * Domain stays editable while onboarding (`isOnboarded === false`).
   */
  useEffect(() => {
    if (!persistedProgressHydrated) return;

    const fromGlobal = normalizeSubdomainLabel(
      persistedStepElevenDomain,
      domainSuffix,
    );
    const approved = stepElevenPersistedApproved === true;

    if (fromGlobal) {
      savedDomainRef.current = fromGlobal;
      savedDomainApprovedRef.current = approved;
      setSelectedDomain(fromGlobal);
      form.setValue("domain", fromGlobal);
      form.setValue("domain_suffix", domainSuffix);
      form.setValue("confirm_domain", approved, { shouldValidate: true });
      form.setValue("isApproved", approved);
      subdomainInputSeededRef.current = true;
      return;
    }

    if (subdomainInputSeededRef.current) return;

    savedDomainRef.current = "";
    savedDomainApprovedRef.current = false;
    const fallback = subdomainPublicPreviewLabel("", venueName, domainSuffix);
    if (fallback && fallback !== "yoursubdomain") {
      setSelectedDomain(fallback);
      form.setValue("domain", fallback);
      form.setValue("domain_suffix", domainSuffix);
      form.setValue("confirm_domain", false, { shouldValidate: true });
      subdomainInputSeededRef.current = true;
    }
  }, [
    persistedProgressHydrated,
    persistedStepElevenDomain,
    stepElevenPersistedApproved,
    domainSuffix,
    venueName,
    form,
    setSelectedDomain,
  ]);

  // Watch reminder email configuration state
  const showReminderDays =
    form.watch("reminder_email_before_days") !== undefined;

  const onSubmit = async (values: StepElevenType) => {
    setLoading(true);
    try {
      const domain = normalizeSubdomainLabel(values.domain, domainSuffix);
      if (!domain) {
        form.setError("domain", {
          message: "Please select a domain for your website",
        });
        setLoading(false);
        return;
      }

      const nextValues: StepElevenType = {
        ...values,
        domain,
        domain_suffix: domainSuffix,
        confirm_domain: true,
        isApproved: true,
      };
      globalForm.setValue("stepEleven", nextValues);

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
        domain,
        confirm_domain: true,
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

      const response = await onboardingService.storeStepElevenData(
        payload as StepElevenType,
      );
      if (!response?.status) throw new Error("Failed to save domain settings");

      // Keep checkbox restored for this domain if the vendor navigates back.
      savedDomainRef.current = domain;
      savedDomainApprovedRef.current = true;
      setSelectedDomain(domain);
      form.setValue("domain", domain);
      form.setValue("confirm_domain", true);
      form.setValue("isApproved", true);
      globalForm.setValue("stepEleven", {
        ...nextValues,
        domain,
        isApproved: true,
        confirm_domain: true,
      });

      if (values.submit_type === "duplicate") {
        const syncedLocations = await syncVendorLocationsCache(queryClient);
        if (syncedLocations?.default_venue_location?.id) {
          await updateSessionWithLocation({
            vendor_location_id: syncedLocations.default_venue_location.id,
          });
        }
        void queryClient.invalidateQueries({ queryKey: ["locations"] });
      }

      // Final step — mark onboarded then open preview.
      await Promise.all([
        update({ on_boarding_step: 11, isOnboarded: true }),
        save(),
      ]).catch((error) => {
        console.error("Background save error:", error);
      });
      router.push("/preview/onboarding");
    } catch (error) {
      console.error("Error during Step Eleven submission:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full flex-col items-center justify-start bg-transparent px-4 py-8">
      <div className="relative mx-auto mb-16 w-full max-w-3xl">
        <OnboardingCard className="mx-auto w-full shadow-sm">
          <CardHeader className="space-y-1.5 pb-2 pt-4 text-center sm:text-left">
            <OnboardingTitle>Set your booking website</OnboardingTitle>
            <p className="mx-auto max-w-xl text-sm leading-relaxed text-slate-400 sm:mx-0">
              Choose your booking web address and optionally turn on balance
              reminders. Everything stays editable later from your dashboard.
            </p>
          </CardHeader>

          <CardContent className="px-6 pb-6 pt-0">
            <Form {...form}>
              <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
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
                  sectionId="step-eleven-domain"
                  chipLabel="Domain"
                  chipDescription="Subdomain, reminders, then finish set-up."
                  persistenceHydrated={persistedProgressHydrated}
                  persistedStepApproved={stepElevenPersistedApproved === true}
                  renderFooter={({ guided }) => (
                    <div className="w-full space-y-4">
                      <GuidedWholeStepBottomActions
                        guided={guided}
                        loading={loading}
                        labelWhenReady={
                          form.watch("submit_type") === "duplicate"
                            ? "Duplicate & finish"
                            : "Finish set-up"
                        }
                        continueDisabled={
                          loading ||
                          !selectedDomain ||
                          !form.watch("confirm_domain")
                        }
                        onContinue={() => void form.handleSubmit(onSubmit)()}
                        primaryButtonClassName="h-12 px-10"
                      />
                      {!selectedDomain && (
                        <p className="text-center text-sm text-muted-foreground">
                          Please select a subdomain to finish
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
                    <div className="w-full space-y-4">
                      {/* 1 — Website address (required) */}
                      <div className={publishCardClass}>
                        <div className="flex gap-3">
                          <span className={publishStepBadgeClass}>1</span>
                          <div className="min-w-0 flex-1 space-y-3">
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
                                  domainSuffix,
                                )}
                                .{domainSuffix}
                              </strong>
                            </p>

                            <div className="space-y-3">
                              <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">
                                  Subdomain
                                </label>
                                <div className="flex overflow-hidden rounded-md border border-white/20 bg-white/5 focus-within:ring-1 focus-within:ring-[var(--color-primary,#38bdf8)]">
                                  <Input
                                    placeholder="Enter subdomain name"
                                    value={selectedDomain || ""}
                                    onChange={(e) => {
                                      const value = e.target.value
                                        .toLowerCase()
                                        .replace(/[^a-z0-9-]/g, "");
                                      applyDomainChange(value);

                                      // Generate suggestions based on typing
                                      if (value && value.length >= 3) {
                                        generateSuggestions(
                                          value, // Use the typed value
                                          venueType,
                                          venueLocation,
                                        );
                                      }
                                    }}
                                    className="h-9 flex-1 border-0 bg-transparent pr-8 text-sm shadow-none focus-visible:ring-0"
                                    maxLength={63}
                                  />
                                  {selectedDomain ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        applyDomainChange("");
                                      }}
                                      className="shrink-0 px-2 text-slate-500 hover:text-slate-300"
                                      title="Clear domain"
                                    >
                                      ✕
                                    </button>
                                  ) : null}
                                  {isGeneratingSuggestions ? (
                                    <div className="flex shrink-0 items-center pr-2">
                                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                    </div>
                                  ) : null}
                                  <div className="flex shrink-0 items-center border-l border-white/15 bg-white/[0.03] px-3 text-sm text-muted-foreground">
                                    .{domainSuffix}
                                  </div>
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
                                                applyDomainChange(alt);
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
                                          applyDomainChange(
                                            normalizeSubdomainLabel(
                                              suggestion.domain,
                                              domainSuffix,
                                            ),
                                          );
                                        }}
                                        className={`rounded-full border px-3 py-1.5 text-sm transition-all duration-200 hover:shadow-sm ${
                                          selectedDomain ===
                                          normalizeSubdomainLabel(
                                            suggestion.domain,
                                            domainSuffix,
                                          )
                                            ? "border-[var(--color-primary,#3b82f6)] bg-[var(--color-primary,#3b82f6)]/15 text-foreground shadow-sm"
                                            : "border-white/15 bg-white/[0.06] text-foreground hover:border-white/25 hover:bg-white/[0.1]"
                                        }`}
                                      >
                                        {normalizeSubdomainLabel(
                                          suggestion.domain,
                                          domainSuffix,
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
                        <div className="flex gap-3">
                          <span className={publishStepBadgeClass}>2</span>
                          <div className="min-w-0 flex-1 space-y-3">
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
                          <div className="flex gap-3">
                            <span className={publishStepBadgeClass}>3</span>
                            <div className="min-w-0 flex-1 space-y-3">
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
                    </div>
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
