"use client";

import { Button } from "@/components/ui/button";
import { CardContent, CardHeader } from "@/components/ui/card";
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
import { shouldShowStepOneLocationGate } from "../../form-provider/hydrate-onboarding-from-api";
import { stepOneSchema, StepOneType } from "../../form-provider/schema";
import GoogleBusinessSearch from "./google-business";
import { env } from "@/env";
import { fetchPlaceDetails } from "./_lib/actions";
import { useEffect, useMemo, useState } from "react";
import { OnboardingCard } from "@/components/ui/card";
import {
  OnboardingTitle,
  OnboardingFieldGroupTitle,
} from "@/components/ui/typography";
import { onboardingService } from "@/services/vendor/onboarding/onboarding.service";
import { useSession } from "next-auth/react";
import { useGuidedOnboardingSections } from "../../../_lib/hooks/use-guided-onboarding-sections";
import type { GuidedSectionConfig } from "../../../_lib/hooks/use-guided-onboarding-sections";
import { GuidedMultiSectionBottomActions } from "../../guided-section-chips";
import {
  GuidedSectionActionFooter,
  GuidedSectionCoreActions,
} from "../../guided-sticky-approval-bar";
import { guidedSectionSurfaceClass } from "../../guided-section-surface";
import { GuidedSectionTitleBar } from "../../guided-section-title-bar";
import { cn } from "@/lib/utils";
import { useBrandNameAvailability } from "@/hooks/use-brand-name-availability";

const RESOLVE_STEP_ONE_ERROR_INDEX = (keys: string[]) =>
  keys.some((k) => k === "name" || k === "has_multiple_locations") ? 0 : 1;

export default function StepOne() {
  const [loading, setLoading] = useState(false);
  const {
    form: globalForm,
    save,
    setActiveStep,
    persistedProgressHydrated,
  } = useFormContext();

  const stepOnePersistedApproved = useWatch({
    control: globalForm.control,
    name: "stepOne.isApproved",
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
    });
  }, [globalHasMultiple, globalForm, form]);

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
      },
      {
        id: "contact-details",
        label: "Contact details",
        description: "Phone, email, address, and city.",
        fields: ["contact_number", "email", "address", "city"],
      },
    ],
    [isBrandMode],
  );

  const guided = useGuidedOnboardingSections({
    form,
    sections: sectionConfigs,
    resolveErrorSectionIndex: RESOLVE_STEP_ONE_ERROR_INDEX,
    persistenceHydrated: persistedProgressHydrated,
    persistedStepApproved: stepOnePersistedApproved === true,
  });

  const persistLocationChoice = (value: boolean) => {
    form.setValue("has_multiple_locations", value, { shouldValidate: true });
    const prev = globalForm.getValues("stepOne");
    globalForm.setValue("stepOne", {
      ...prev,
      has_multiple_locations: value,
    });
  };

  const persistStepOne = async (data: StepOneType) => {
    setLoading(true);
    try {
      const response = await onboardingService.storeStepData({
        ...data,
        isApproved: true,
      });

      if (response.status) {
        globalForm.setValue("stepOne", { ...data, isApproved: true });
        if (response.data?.vendor_location_id) {
          const vendorLocationId = response.data.vendor_location_id;
          await update({
            vendor_location_id: vendorLocationId,
            on_boarding_step: response.data.on_boarding_step,
          });
        }

        setActiveStep(2);

        Promise.all([
          response.data?.on_boarding_step
            ? update({ on_boarding_step: response.data.on_boarding_step })
            : update({ on_boarding_step: 2 }),
          save(),
        ]).catch((error) => {
          console.error("Background save error:", error);
        });
      }
    } catch (error) {
      console.error("Error submitting step 1:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    if (brandNameTaken || brandNameChecking) return;
    if (!guided.allSectionsApproved) {
      const ok = await guided.handleApproveAllSections();
      if (!ok) return;
    }
    await form.handleSubmit(persistStepOne)();
  };

  const showLocationGate = shouldShowStepOneLocationGate(
    hasMultipleLocations,
    stepOnePersistedApproved,
  );

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen py-8 px-4">
      <OnboardingCard className="w-full max-w-2xl">
        <CardHeader className="pb-2 pt-4">
          <OnboardingTitle>Tell us about your business</OnboardingTitle>
        </CardHeader>
        <CardContent>
          {showLocationGate ? (
            <div className="space-y-6">
              <OnboardingFieldGroupTitle className="text-base">
                Do you have multiple locations?
              </OnboardingFieldGroupTitle>
              <p className="text-sm text-muted-foreground">
                If you operate several venues under one brand, we&apos;ll label
                this step for your brand and send the right details to our
                systems. If you have a single venue, nothing changes in your
                flow.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Button
                  type="button"
                  variant="event-primary"
                  className="min-w-[140px]"
                  onClick={() => persistLocationChoice(true)}
                >
                  Yes, multiple locations
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="min-w-[140px] border-white/20 bg-white/5 hover:bg-white/10"
                  onClick={() => persistLocationChoice(false)}
                >
                  No, single location
                </Button>
              </div>
            </div>
          ) : (
            <>
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
                      guided.allSectionsApproved ||
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
                      disabled={
                        !guided.allSectionsApproved &&
                        guided.currentSectionIndex !== 0
                      }
                      className={cn(
                        "min-w-0 border-0 p-0 m-0",
                        !guided.allSectionsApproved &&
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
                                  <Input
                                    placeholder="e.g. Acme Events Co."
                                    className="bg-white/5"
                                    maxLength={120}
                                    {...field}
                                    onChange={(e) =>
                                      field.onChange(e.target.value)
                                    }
                                  />
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
                              {brandNameChecking ? (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Checking name availability…
                                </p>
                              ) : null}
                              {brandNameCheckStatus === "available" &&
                              (nameValue?.trim().length ?? 0) >= 2 ? (
                                <p className="text-xs text-emerald-400/90 mt-1">
                                  {isBrandMode
                                    ? "This brand name is available."
                                    : "This venue name is available."}
                                </p>
                              ) : null}
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
                      guided.allSectionsApproved ||
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
                      disabled={
                        !guided.allSectionsApproved &&
                        guided.currentSectionIndex !== 1
                      }
                      className={cn(
                        "min-w-0 border-0 p-0 m-0",
                        !guided.allSectionsApproved &&
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
                                <Input
                                  placeholder="e.g. Stock Brook Country Club"
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
                              <p className="text-xs text-muted-foreground mt-1">
                                Email must be entered manually for privacy
                                reasons
                              </p>
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
                                  placeholder={
                                    isBrandMode
                                      ? "e.g. London"
                                      : "Select a venue to auto-fill"
                                  }
                                  className={cn(
                                    "bg-white/5",
                                    !isBrandMode && "cursor-not-allowed",
                                  )}
                                  readOnly={!isBrandMode}
                                  {...field}
                                />
                              </FormControl>
                              <p className="text-xs text-muted-foreground mt-1">
                                {isBrandMode
                                  ? "Enter the city for your head office or main site (or your primary trading city)."
                                  : "Auto-filled from Google Places when you select a venue"}
                              </p>
                              <FormMessage />
                            </FormItem>
                          )}
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
                    loading={loading}
                    onContinue={handleContinue}
                    continueDisabled={brandNameTaken || brandNameChecking}
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
