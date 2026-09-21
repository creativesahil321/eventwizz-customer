"use client";

import { CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFormContext } from "../../form-provider";
import {
  isOnboardingLocationChoiceLocked,
  shouldShowStepOneLocationGate,
} from "../../form-provider/hydrate-onboarding-from-api";
import { stepOneSchema, StepOneType } from "../../form-provider/schema";
import GoogleBusinessSearch from "./google-business";
import AddressAutocomplete, {
  cityFromFormattedAddress,
} from "../step-7/address-autocomplete";
import { env } from "@/env";
import { fetchPlaceDetails } from "./_lib/actions";
import { geocodeLocation } from "../step-11/_lib/actions";
import {
  hasValidLocationCoordinates,
  LOCATION_COORDINATES_REQUIRED_MESSAGE,
  parseOptionalCoordinate,
} from "@/lib/to-location-coords-payload";
import { isCoarseUkFallbackPin } from "@/lib/sync-event-location-map";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, Settings2 } from "lucide-react";
import { NameAvailabilityInputCue } from "@/components/name-availability-input-cue";
import { Skeleton } from "@/components/ui/skeleton";
import { OnboardingCard } from "@/components/ui/card";
import { OnboardingFieldGroupTitle } from "@/components/ui/typography";
import { onboardingService } from "@/services/vendor/onboarding/onboarding.service";
import { useSession } from "next-auth/react";
import { useGuidedOnboardingSections } from "../../../_lib/hooks/use-guided-onboarding-sections";
import type { GuidedSectionConfig } from "../../../_lib/hooks/use-guided-onboarding-sections";
import { useOnboardingPreviewFieldFocus } from "../../../_lib/onboarding-preview-field-focus";
import { GuidedMultiSectionBottomActions } from "../../guided-section-chips";
import {
  GuidedSectionActionFooter,
  GuidedSectionCoreActions,
} from "../../guided-sticky-approval-bar";
import { guidedSectionSurfaceClass } from "../../guided-section-surface";
import { GuidedSectionTitleBar } from "../../guided-section-title-bar";
import { cn } from "@/lib/utils";
import { useBrandNameAvailability } from "@/hooks/use-brand-name-availability";
import {
  AIChoicePair,
  AIFlowProgress,
} from "../../ai-onboarding/ai-choice-pair";
import { toast } from "sonner";

const EventLocationMap = dynamic(
  () => import("../step-7/event-location-map"),
  {
    ssr: false,
    loading: () => (
      <Skeleton className="h-40 w-full rounded-lg border border-white/10" />
    ),
  },
);

const RESOLVE_STEP_ONE_ERROR_INDEX = (keys: string[]) =>
  keys.some((k) => k === "name" || k === "has_multiple_locations") ? 0 : 1;

export default function StepOne() {
  const [loading, setLoading] = useState(false);
  /** Lets the vendor return to Yes/No after a mistaken tap, even if the flag is still set. */
  const [locationGateReopened, setLocationGateReopened] = useState(false);
  const {
    form: globalForm,
    save,
    setActiveStep,
    lastCompletedStep,
    persistedProgressHydrated,
    onBackToMode,
  } = useFormContext();

  const stepOnePersistedApproved = useWatch({
    control: globalForm.control,
    name: "stepOne.isApproved",
  });
  const lastCompletedFromForm = useWatch({
    control: globalForm.control,
    name: "last_completed_step",
  });
  const stepTwoBanner = useWatch({
    control: globalForm.control,
    name: "stepTwo.banner_heading",
  });
  const stepThreeEventName = useWatch({
    control: globalForm.control,
    name: "stepThree.event_name",
  });
  const stepSixMenus = useWatch({
    control: globalForm.control,
    name: "stepSix.menus",
  });

  const locationChoiceLocked = isOnboardingLocationChoiceLocked({
    ...globalForm.getValues(),
    last_completed_step: Math.max(
      lastCompletedStep,
      Number(lastCompletedFromForm ?? 0) || 0,
    ),
    stepOne: {
      ...globalForm.getValues("stepOne"),
      isApproved: stepOnePersistedApproved === true,
    },
    stepTwo: {
      ...globalForm.getValues("stepTwo"),
      banner_heading: stepTwoBanner,
    },
    stepThree: {
      ...globalForm.getValues("stepThree"),
      event_name: stepThreeEventName,
    },
    stepSix: {
      ...globalForm.getValues("stepSix"),
      menus: stepSixMenus,
    },
  });
  const { update } = useSession();

  const form = useForm<StepOneType>({
    resolver: zodResolver(stepOneSchema),
    defaultValues: {
      step: 1,
      has_multiple_locations: globalForm.getValues(
        "stepOne.has_multiple_locations",
      ),
      name: globalForm.getValues("stepOne.name") || "",
      contact_number: globalForm.getValues("stepOne.contact_number") || "",
      email: globalForm.getValues("stepOne.email") || "",
      address: globalForm.getValues("stepOne.address") || "",
      domain: globalForm.getValues("stepOne.domain") || "",
      description: globalForm.getValues("stepOne.description") || "",
      city: globalForm.getValues("stepOne.city") || "",
      latitude: parseOptionalCoordinate(
        globalForm.getValues("stepOne.latitude"),
      ),
      longitude: parseOptionalCoordinate(
        globalForm.getValues("stepOne.longitude"),
      ),
    },
    mode: "onChange",
  });

  const localHasMultiple = useWatch({
    control: form.control,
    name: "has_multiple_locations",
  });

  const globalHasMultiple = useWatch({
    control: globalForm.control,
    name: "stepOne.has_multiple_locations",
  });

  /** Prefer global (hydrated from GET); local covers the gate before sync. */
  const hasMultipleLocations = globalHasMultiple ?? localHasMultiple;

  useEffect(() => {
    const g = globalForm.getValues("stepOne");
    if (!g || g.has_multiple_locations === undefined) return;
    if (form.getValues("has_multiple_locations") === g.has_multiple_locations) {
      return;
    }
    form.reset({
      step: 1,
      has_multiple_locations: g.has_multiple_locations,
      name: g.name ?? "",
      contact_number: g.contact_number ?? "",
      email: g.email ?? "",
      address: g.address ?? "",
      domain: g.domain ?? "",
      description: g.description ?? "",
      city: g.city ?? "",
      latitude: parseOptionalCoordinate(g.latitude),
      longitude: parseOptionalCoordinate(g.longitude),
    });
  }, [globalHasMultiple, globalForm, form]);

  const addressValue = useWatch({
    control: form.control,
    name: "address",
  });
  const cityValue = useWatch({
    control: form.control,
    name: "city",
  });

  useEffect(() => {
    if (cityValue?.trim() || !addressValue?.trim()) return;
    const parsed = cityFromFormattedAddress(addressValue);
    if (parsed) {
      form.setValue("city", parsed, { shouldValidate: true });
    }
  }, [addressValue, cityValue, form]);

  const isBrandMode = hasMultipleLocations === true;

  const nameValue = useWatch({
    control: form.control,
    name: "name",
  });

  const {
    status: brandNameCheckStatus,
    message: brandNameCheckMessage,
    isChecking: brandNameChecking,
    isTaken: brandNameTaken,
  } = useBrandNameAvailability(nameValue ?? "", {
    takenFallback: isBrandMode
      ? "This brand name is already in use"
      : "This venue name is already in use",
  });

  const sectionConfigs = useMemo(
    (): GuidedSectionConfig<StepOneType>[] => [
      {
        id: "venue-search",
        label: isBrandMode ? "Brand name" : "Venue search",
        description: isBrandMode
          ? "Enter your brand name (any name — not limited to Google listings)."
          : "Pick your venue from Google Places.",
        fields: ["name"],
        // Never approve a name that is still being checked or already taken —
        // the taken case shows an inline red message, so only toast the "still checking" case.
        validate: async () => {
          if (brandNameChecking) {
            toast.error(
              isBrandMode
                ? "Hold on — we're still checking that brand name."
                : "Hold on — we're still checking that venue name.",
            );
            return false;
          }
          return !brandNameTaken;
        },
      },
      {
        id: "contact-details",
        label: "Contact details",
        description: "Phone, email, address, and city.",
        fields: ["contact_number", "email", "address", "city"],
      },
    ],
    [isBrandMode, brandNameChecking, brandNameTaken],
  );

  const guided = useGuidedOnboardingSections({
    form,
    sections: sectionConfigs,
    resolveErrorSectionIndex: RESOLVE_STEP_ONE_ERROR_INDEX,
    persistenceHydrated: persistedProgressHydrated,
    persistedStepApproved: stepOnePersistedApproved === true,
  });

  useOnboardingPreviewFieldFocus(1, guided.focusGuidedSection);

  const persistLocationChoice = (value: boolean) => {
    setLocationGateReopened(false);
    form.clearErrors();
    form.setValue("has_multiple_locations", value, { shouldValidate: false });
    const prev = globalForm.getValues("stepOne");
    globalForm.setValue("stepOne", {
      ...prev,
      has_multiple_locations: value,
    });
  };

  const goBackToLocationQuestion = () => {
    if (locationChoiceLocked) return;
    setLocationGateReopened(true);
    const email = form.getValues("email");
    const cleared = {
      step: 1 as const,
      has_multiple_locations: undefined,
      name: "",
      contact_number: "",
      email,
      address: "",
      city: "",
      domain: "",
      description: "",
      latitude: undefined,
      longitude: undefined,
    };
    form.reset(cleared);
    const prev = globalForm.getValues("stepOne");
    globalForm.setValue("stepOne", {
      ...prev,
      ...cleared,
    });
    guided.resetSectionProgress();
  };

  const persistStepOne = async (data: StepOneType) => {
    setLoading(true);
    try {
      const response = await onboardingService.storeStepData({
        ...data,
        isApproved: true,
      });

      if (!response.status) {
        toast.error(
          response.message?.trim() || "Could not save. Please try again.",
        );
        return;
      }

      globalForm.setValue("stepOne", { ...data, isApproved: true });
      const nextStep = Number(response.data?.on_boarding_step) || 2;
      // Do not await NextAuth `update()` — it can hang and freeze Save & continue.
      void setActiveStep(nextStep, { skipSessionSync: true });
      void update({
        ...(response.data?.vendor_location_id
          ? { vendor_location_id: response.data.vendor_location_id }
          : {}),
        on_boarding_step: nextStep,
      });
      void save();
    } catch (error) {
      console.error("Error submitting step 1:", error);
      toast.error("Could not save. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const sanitizeStepOneCoordinates = () => {
    const latitude = parseOptionalCoordinate(form.getValues("latitude"));
    const longitude = parseOptionalCoordinate(form.getValues("longitude"));
    form.setValue("latitude", latitude, { shouldValidate: false });
    form.setValue("longitude", longitude, { shouldValidate: false });
    return { latitude, longitude };
  };

  const resolveStepOneCoordinates = async (): Promise<{
    latitude: number;
    longitude: number;
  } | null> => {
    let { latitude, longitude } = sanitizeStepOneCoordinates();
    if (latitude != null && longitude != null) {
      return { latitude, longitude };
    }

    const address = form.getValues("address")?.trim() ?? "";
    const city = form.getValues("city")?.trim() ?? "";
    if (!address) return null;

    const resolved = await geocodeLocation(address, city);
    if (!resolved) return null;

    form.setValue("latitude", resolved.latitude, { shouldValidate: true });
    form.setValue("longitude", resolved.longitude, { shouldValidate: true });
    return resolved;
  };

  const ensureStepOneCoordinates = async (): Promise<boolean> => {
    const resolved = await resolveStepOneCoordinates();
    if (
      resolved &&
      hasValidLocationCoordinates(resolved.latitude, resolved.longitude)
    ) {
      return true;
    }

    form.setError("address", {
      type: "manual",
      message: LOCATION_COORDINATES_REQUIRED_MESSAGE,
    });
    toast.error("Missing map coordinates for this address", {
      description: LOCATION_COORDINATES_REQUIRED_MESSAGE,
      duration: 5000,
    });
    return false;
  };

  const handleContinue = async () => {
    if (brandNameTaken) {
      toast.error(
        isBrandMode
          ? "This brand name is already in use."
          : "This venue name is already in use.",
      );
      return;
    }
    if (brandNameChecking) {
      toast.error(
        isBrandMode
          ? "Hold on — we're still checking that brand name."
          : "Hold on — we're still checking that venue name.",
      );
      return;
    }
    if (hasMultipleLocations === undefined) {
      toast.error("Please choose whether you have multiple locations.");
      setLocationGateReopened(true);
      return;
    }

    // The AI flow and persistence hydration update the global form first.
    // Keep the local RHF form in sync before guided/full-step validation so a
    // hidden location-choice field cannot invalidate an otherwise complete step.
    if (
      form.getValues("has_multiple_locations") !== hasMultipleLocations
    ) {
      form.setValue("has_multiple_locations", hasMultipleLocations, {
        shouldValidate: false,
      });
    }

    if (!guided.allSectionsApproved) {
      const ok = await guided.handleApproveAllSections();
      if (!ok) return;
    }

    if (!(await ensureStepOneCoordinates())) return;

    const valid = await form.trigger(undefined, { shouldFocus: true });
    if (!valid) {
      const fieldLabels: Record<string, string> = {
        has_multiple_locations: "location setup choice",
        name: "venue or brand name",
        contact_number: "contact number",
        email: "email",
        address: "address (pick from Google suggestions)",
        city: "city",
        latitude: "map location",
        longitude: "map location",
      };
      const invalidFields = Object.keys(form.formState.errors)
        .map((field) => fieldLabels[field] ?? field)
        .join(", ");
      toast.error(
        invalidFields
          ? `Please check: ${invalidFields}.`
          : "Please check the highlighted fields.",
      );
      return;
    }

    await persistStepOne(form.getValues());
  };

  // Always ask when the choice is missing — even if a later-step placeholder
  // (empty menus) incorrectly looks like a draft. Lock only blocks going *back*
  // after a real Yes/No is already stored.
  const showLocationGate =
    shouldShowStepOneLocationGate(hasMultipleLocations) ||
    (locationGateReopened && !locationChoiceLocked);

  return (
    <div className="flex w-full flex-col items-center py-6 px-4">
      <div className="mb-8 w-full max-w-2xl text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-400/5 px-4 py-1.5 backdrop-blur-sm">
          <Settings2 className="h-3.5 w-3.5 text-indigo-400" />
          <span className="text-xs font-medium uppercase tracking-wide text-indigo-400">
            Manual setup
          </span>
        </div>
        <h1 className="mb-3 text-3xl font-bold text-white">
          Tell us about your business
        </h1>
        {showLocationGate ? (
          <p className="mx-auto max-w-md text-sm text-slate-400">
            First, tell us if you run more than one venue under the same brand.
          </p>
        ) : null}
      </div>
      <OnboardingCard
        className={cn(
          "w-full max-w-2xl",
          showLocationGate &&
            "border border-white/10 bg-slate-900/60 p-8 backdrop-blur-xl",
        )}
      >
        <CardContent className={showLocationGate ? "p-0" : undefined}>
          {showLocationGate ? (
            <div className="space-y-6">
              <AIFlowProgress current={1} total={11} label="Venue" />
              <h2 className="text-lg font-semibold text-white text-center">
                Do you have multiple locations?
              </h2>
              <p className="text-slate-400 text-sm text-center max-w-md mx-auto">
                Choose Yes if several venues share one brand. We&apos;ll ask for
                a brand name instead of a single venue listing.
              </p>
              <AIChoicePair
                value={undefined}
                onChange={persistLocationChoice}
                options={[
                  { value: true, label: "Yes, multiple locations" },
                  { value: false, label: "No, single location" },
                ]}
              />
              {onBackToMode ? (
                <div className="flex justify-center pt-1">
                  <button
                    type="button"
                    onClick={onBackToMode}
                    className="flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-300"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to setup options
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              {!locationChoiceLocked ? (
                <button
                  type="button"
                  onClick={goBackToLocationQuestion}
                  className="mb-4 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to location question
                </button>
              ) : null}
              <section className="w-full mb-4">
                <OnboardingFieldGroupTitle className="text-base">
                  {isBrandMode ? "Brand information" : "Venue information"}
                </OnboardingFieldGroupTitle>
              </section>
              <Form {...form}>
                <form
                  id="onboarding-step-one-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleContinue();
                  }}
                  className="space-y-6"
                >
                  <Input type="hidden" {...form.register("domain")} />
                  <Input type="hidden" {...form.register("description")} />

                  <section
                    data-guided-section="venue-search"
                    tabIndex={-1}
                    className={guidedSectionSurfaceClass(
                      guided.currentSectionIndex === 0,
                    )}
                  >
                    <GuidedSectionTitleBar
                      sectionIndex={0}
                      sectionId="venue-search"
                      guided={guided}
                      title={
                        isBrandMode ? "Brand name" : "Venue search"
                      }
                    />
                    <fieldset
                      disabled={guided.currentSectionIndex !== 0}
                      className={cn(
                        "min-w-0 border-0 p-0 m-0",
                        guided.currentSectionIndex !== 0 &&
                          "pointer-events-none",
                      )}
                    >
                      <div className="w-full mb-2">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">
                                {isBrandMode ? "Brand name" : "Venue name"}{" "}
                                <span className="text-red-400">*</span>
                              </FormLabel>
                              <FormControl>
                                {isBrandMode ? (
                                  <div className="relative">
                                    <Input
                                      placeholder="e.g. Acme Events Co."
                                      className="bg-white/5 pr-10"
                                      maxLength={120}
                                      aria-busy={brandNameChecking || undefined}
                                      {...field}
                                      onChange={(e) =>
                                        field.onChange(e.target.value)
                                      }
                                    />
                                    <NameAvailabilityInputCue
                                      checking={brandNameChecking}
                                      available={
                                        brandNameCheckStatus === "available" &&
                                        (nameValue?.trim().length ?? 0) >= 2
                                      }
                                    />
                                  </div>
                                ) : (
                                  <GoogleBusinessSearch
                                    apiKey={env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                                    value={field.value}
                                    onChange={(value) => field.onChange(value)}
                                    onSelect={(placeId) =>
                                      fetchPlaceDetails(form, placeId)
                                    }
                                  />
                                )}
                              </FormControl>
                              <p className="text-xs text-[color:var(--color-primary)] mt-1 font-medium">
                                {isBrandMode
                                  ? "ⓘ Type your trading or brand name — it does not need to match a Google listing."
                                  : "ⓘ Only verified venues from Google Places can be selected"}
                              </p>
                              {brandNameCheckStatus === "taken" &&
                              (nameValue?.trim().length ?? 0) >= 2 &&
                              brandNameCheckMessage ? (
                                <p className="text-xs text-red-400/90 mt-1">
                                  {brandNameCheckMessage}
                                </p>
                              ) : null}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <GuidedSectionActionFooter
                        isActive={guided.currentSectionIndex === 0}
                        hideSectionMeta
                      >
                        <GuidedSectionCoreActions guided={guided} />
                      </GuidedSectionActionFooter>
                    </fieldset>
                  </section>

                  <section
                    data-guided-section="contact-details"
                    tabIndex={-1}
                    className={guidedSectionSurfaceClass(
                      guided.currentSectionIndex === 1,
                    )}
                  >
                    <GuidedSectionTitleBar
                      sectionIndex={1}
                      sectionId="contact-details"
                      guided={guided}
                      title="Contact details"
                    />
                    <fieldset
                      disabled={guided.currentSectionIndex !== 1}
                      className={cn(
                        "min-w-0 border-0 p-0 m-0",
                        guided.currentSectionIndex !== 1 &&
                          "pointer-events-none",
                      )}
                    >
                      <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                        <FormField
                          control={form.control}
                          name="contact_number"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">
                                {isBrandMode
                                  ? "Primary contact number"
                                  : "Venue Contact Number"}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="tel"
                                  placeholder="123 456 7890"
                                  className="bg-white/5"
                                  maxLength={20}
                                  {...field}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(
                                      /[^\d\s\-+()]/g,
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
                        <FormField
                          control={form.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">
                                {isBrandMode ? "Address" : "Venue address"}
                              </FormLabel>
                              <FormControl>
                                <div className="relative isolate z-[100]">
                                  <AddressAutocomplete
                                    variant="dark"
                                    value={field.value}
                                  onChange={(value) => {
                                    field.onChange(value);
                                    form.setValue("latitude", undefined, {
                                      shouldDirty: true,
                                    });
                                    form.setValue("longitude", undefined, {
                                      shouldDirty: true,
                                    });
                                  }}
                                  onResolved={({ address, city, latitude, longitude }) => {
                                    field.onChange(address);
                                    const nextCity =
                                      city ||
                                      cityFromFormattedAddress(address);
                                    if (nextCity) {
                                      form.setValue("city", nextCity, {
                                        shouldValidate: true,
                                        shouldDirty: true,
                                      });
                                    }
                                    if (
                                      latitude != null &&
                                      longitude != null &&
                                      Number.isFinite(latitude) &&
                                      Number.isFinite(longitude) &&
                                      !isCoarseUkFallbackPin(latitude, longitude)
                                    ) {
                                      form.setValue("latitude", latitude, {
                                        shouldDirty: true,
                                      });
                                      form.setValue("longitude", longitude, {
                                        shouldDirty: true,
                                      });
                                    } else {
                                      form.setValue("latitude", undefined, {
                                        shouldDirty: true,
                                      });
                                      form.setValue("longitude", undefined, {
                                        shouldDirty: true,
                                      });
                                    }
                                  }}
                                  placeholder="Start typing a UK street, postcode, or place…"
                                  inputClassName="bg-white/5"
                                  noResultsMessage="No UK addresses found. Try a street, postcode, or place name."
                                  unavailableMessage="Address search is unavailable. Check your connection and try again."
                                />
                                </div>
                              </FormControl>
                              <p className="text-xs text-muted-foreground mt-1">
                                {isBrandMode
                                  ? "Search Google for your head office or main site address, then confirm the pin on the map below."
                                  : "Auto-filled when you pick a venue — or search Google, then confirm the pin on the map below."}
                              </p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">
                                {isBrandMode ? "Email" : "Venue email"}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Please enter venue email manually"
                                  className="bg-white/5"
                                  {...field}
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
                              <FormLabel className="text-sm font-medium">
                                City <span className="text-red-400">*</span>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Auto-detected from address"
                                  className="cursor-not-allowed bg-white/5 opacity-80"
                                  readOnly
                                  disabled
                                  autoComplete="off"
                                  {...field}
                                />
                              </FormControl>
                              <p className="text-xs text-muted-foreground mt-1">
                                Filled from your Google listing. Edit the
                                address to update it.
                              </p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="mt-6">
                        <p className="text-sm font-medium mb-1">
                          Confirm on map{" "}
                          <span className="text-red-400">*</span>
                        </p>
                        <p className="text-xs text-muted-foreground mb-1.5">
                          Drag the pin if search missed the entrance.
                        </p>
                        <EventLocationMap
                          compact
                          heightClass="h-32"
                          minHeightPx={128}
                          initialAddress={form.watch("address")}
                          initialLatitude={form.watch("latitude")}
                          initialLongitude={form.watch("longitude")}
                          onLocationChange={({
                            address,
                            latitude,
                            longitude,
                          }) => {
                            if (
                              isCoarseUkFallbackPin(latitude, longitude) ||
                              address.trim().toLowerCase() === "united kingdom"
                            ) {
                              return;
                            }
                            form.setValue("address", address, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                            form.setValue("latitude", latitude, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                            form.setValue("longitude", longitude, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                            const parsedCity = cityFromFormattedAddress(address);
                            if (parsedCity) {
                              form.setValue("city", parsedCity, {
                                shouldValidate: true,
                                shouldDirty: true,
                              });
                            }
                          }}
                        />
                      </div>

                      <GuidedSectionActionFooter
                        isActive={guided.currentSectionIndex === 1}
                        hideSectionMeta
                      >
                        <GuidedSectionCoreActions guided={guided} />
                      </GuidedSectionActionFooter>
                    </fieldset>
                  </section>
                  <GuidedMultiSectionBottomActions
                    onApproveAll={guided.handleApproveAllSections}
                    allSectionsApproved={guided.allSectionsApproved}
                    hasInput={guided.stepHasGuidedInput}
                    loading={loading}
                    onEditAll={() => guided.handleUnlockSection(0)}
                    onContinue={handleContinue}
                    continueDisabled={brandNameTaken}
                  />
                </form>
              </Form>
            </>
          )}
        </CardContent>
      </OnboardingCard>
    </div>
  );
}
