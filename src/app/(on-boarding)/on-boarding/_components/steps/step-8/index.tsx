"use client";

import React, { useState } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFormContext } from "../../form-provider";
import { stepEightSchema, StepEightType } from "../../form-provider/schema";
import {
  OnboardingTitle,
  OnboardingFieldGroupTitle,
} from "@/components/ui/typography";
import { toast } from "sonner";
import { onboardingService } from "@/services/vendor/onboarding/onboarding.service";
import { useSession } from "next-auth/react";
import { useFieldFocusHandler } from "../../form-preview/field-focus-handler";
import { useEventId } from "../../../_lib/hooks/useEventId";
import { WholeStepGuidedShell } from "../../whole-step-guided-shell";
import { guidedInsetSectionSurfaceClass } from "../../guided-section-surface";
import { guidedOnboardingSkipButtonClass } from "../../guided-sticky-approval-bar";
import { GuidedWholeStepBottomActions } from "../../guided-section-chips";
import { useCurrencySymbol } from "@/hooks/use-currency-format";
import {
  DRINK_PACKAGE_ITEM_TITLE_MAX_CHARS,
  DRINK_SECTION_DESCRIPTION_MAX_CHARS,
  DRINK_SECTION_TITLE_MAX_CHARS,
  RICH_DESCRIPTION_MAX_CHARS,
  clampDrinkPackagePrice,
  clampDrinkPackageQuantity,
  DRINK_PACKAGE_PRICE_MAX,
  DRINK_PACKAGE_QTY_MAX,
} from "@/lib/event-form-limits";

export default function StepEight() {
  const currencySymbol = useCurrencySymbol();
  const {
    form: globalForm,
    save,
    setActiveStep,
    persistedProgressHydrated,
  } = useFormContext();

  const stepEightPersistedApproved = useWatch({
    control: globalForm.control,
    name: "stepEight.isApproved",
  });
  const { handleFieldFocus } = useFieldFocusHandler();
  const [loading, setLoading] = useState(false);
  const { update: updateSession } = useSession();

  // Predefined package as per the specified format
  const predefinedPackage = [
    {
      title: "Package 1",
      description: "This is a premium service package",
      price: 20,
      available_quantity: 100,
    },
  ];

  const eventId = useEventId(globalForm, "stepEight");

  const form = useForm({
    resolver: zodResolver(stepEightSchema),
    defaultValues: {
      step: 8 as unknown as number as StepEightType["step"],
      event_id: eventId,
      drink_title: globalForm.getValues("stepEight.drink_title") || "",
      drink_description:
        globalForm.getValues("stepEight.drink_description") || "",
      packages:
        globalForm.getValues("stepEight.packages")?.length > 0
          ? globalForm.getValues("stepEight.packages")
          : predefinedPackage,
    },
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "packages",
  });

  const onSubmit = async (data: StepEightType) => {
    setLoading(true);
    try {
      // Validate the form BEFORE updating global form state
      const isValid = await form.trigger();
      if (!isValid) {
        const errors = form.formState.errors;
        console.log("Form errors:", errors);

        // Collect error messages
        const errorMessages: string[] = [];

        // Check for drink_title and drink_description errors
        if (errors.drink_title) {
          errorMessages.push(errors.drink_title.message as string);
        }
        if (errors.drink_description) {
          errorMessages.push(errors.drink_description.message as string);
        }

        // Check for package errors
        if (errors.packages) {
          if (Array.isArray(errors.packages)) {
            errors.packages.forEach((pkgError, idx) => {
              if (pkgError && typeof pkgError === "object") {
                if (pkgError.title) {
                  errorMessages.push(
                    `Package ${idx + 1} title: ${pkgError.title.message}`,
                  );
                }
                if (pkgError.description) {
                  errorMessages.push(
                    `Package ${idx + 1} description: ${
                      pkgError.description.message
                    }`,
                  );
                }
                if (pkgError.available_quantity) {
                  errorMessages.push(
                    `Package ${idx + 1} available quantity: ${
                      pkgError.available_quantity.message
                    }`,
                  );
                }
                if (pkgError.price) {
                  errorMessages.push(
                    `Package ${idx + 1} price: ${pkgError.price.message}`,
                  );
                }
              }
            });
          } else if (errors.packages.message) {
            errorMessages.push(errors.packages.message);
          }
        }

        // Show consolidated error message
        if (errorMessages.length > 0) {
          toast.error(errorMessages.join("; "));
        } else {
          toast.error("Please correct the highlighted fields");
        }

        setLoading(false);
        return;
      }

      // Call the API using the service
      const response = await onboardingService.storeStepEightData({
        ...data,
        isApproved: true,
      });

      if (response?.status) {
        globalForm.setValue("stepEight", { ...data, isApproved: true });
        // INSTANT TRANSITION: Set active step FIRST for smooth UX
        setActiveStep(9);

        // Then handle async operations in background
        Promise.all([updateSession({ on_boarding_step: 9 }), save()]).catch(
          (error) => {
            console.error("Background save error:", error);
          },
        );
      } else {
        console.error("API Error:", response);
      }
    } catch (error) {
      console.error("Error during Step Eight submission:", error);
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
            <OnboardingTitle>Do You Want To Add Any Packages?</OnboardingTitle>
          </CardHeader>

          <CardContent className="px-6 py-2 pb-8">
            <Form {...form}>
              <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
                <input type="hidden" {...form.register("step")} />
                <input type="hidden" {...form.register("event_id")} />

                <WholeStepGuidedShell
                  form={form}
                  sectionId="step-eight-packages"
                  chipLabel="Other packages"
                  chipDescription="Optional add-on packages and pricing."
                  persistenceHydrated={persistedProgressHydrated}
                  persistedStepApproved={stepEightPersistedApproved === true}
                  renderFooter={({ guided }) => (
                    <GuidedWholeStepBottomActions
                      guided={guided}
                      loading={loading}
                      labelWhenReady="Save & continue"
                      onContinue={() => void form.handleSubmit(onSubmit)()}
                      extraActions={
                        <Button
                          variant="event-outline"
                          type="button"
                          onClick={() => setActiveStep(9)}
                          className={guidedOnboardingSkipButtonClass}
                        >
                          Skip
                        </Button>
                      }
                    />
                  )}
                >
                  {() => (
                    <div className="space-y-6">
                      <section
                        className={guidedInsetSectionSurfaceClass(
                          "w-full mb-4",
                        )}
                      >
                        <OnboardingFieldGroupTitle>
                          Title
                        </OnboardingFieldGroupTitle>
                        <FormField
                          control={form.control}
                          name="drink_title"
                          render={({ field }) => {
                            const currentLength = field.value?.length || 0;
                            const maxLength = DRINK_SECTION_TITLE_MAX_CHARS;
                            return (
                              <FormItem className="mt-2">
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="e.g. VIP Packages, Premium Access, etc."
                                    className="h-10 bg-white/5 border-white/10"
                                    maxLength={maxLength}
                                    onChange={(e) => {
                                      field.onChange(e);
                                      globalForm.setValue(
                                        "stepEight.drink_title",
                                        e.target.value,
                                      );
                                    }}
                                    onFocus={() =>
                                      handleFieldFocus("drink_title")
                                    }
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
                      </section>

                      <section
                        className={guidedInsetSectionSurfaceClass(
                          "w-full mb-4",
                        )}
                      >
                        <OnboardingFieldGroupTitle>
                          Description
                        </OnboardingFieldGroupTitle>
                        <FormField
                          control={form.control}
                          name="drink_description"
                          render={({ field }) => {
                            const currentLength = field.value?.length || 0;
                            const maxLength =
                              DRINK_SECTION_DESCRIPTION_MAX_CHARS;
                            return (
                              <FormItem className="mt-2">
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="e.g. Please note: Special terms and conditions apply..."
                                    className="h-10 bg-white/5 border-white/10"
                                    maxLength={maxLength}
                                    onChange={(e) => {
                                      field.onChange(e);
                                      globalForm.setValue(
                                        "stepEight.drink_description",
                                        e.target.value,
                                      );
                                    }}
                                    onFocus={() =>
                                      handleFieldFocus("drink_description")
                                    }
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
                      </section>

                      <section
                        className={guidedInsetSectionSurfaceClass(
                          "w-full mb-4",
                        )}
                      >
                        <OnboardingFieldGroupTitle>
                          Packages Deals
                        </OnboardingFieldGroupTitle>

                        <div className="space-y-6 mt-4">
                          {fields.map((field, index) => (
                            <div
                              key={field.id}
                              className="space-y-4 rounded-lg border border-white/10 bg-white/[0.03] p-6"
                            >
                              <FormField
                                control={form.control}
                                name={`packages.${index}.title`}
                                render={({ field }) => {
                                  const currentLength =
                                    field.value?.length || 0;
                                  const maxLength =
                                    DRINK_PACKAGE_ITEM_TITLE_MAX_CHARS;
                                  return (
                                    <FormItem>
                                      <FormLabel className="text-sm font-medium">
                                        Package {index + 1}
                                      </FormLabel>
                                      <FormControl>
                                        <Input
                                          {...field}
                                          placeholder={`Package ${index + 1}`}
                                          className="h-10 bg-white/5 border-white/10"
                                          maxLength={maxLength}
                                          onChange={(e) => {
                                            field.onChange(e);
                                            // Update global form immediately
                                            const currentPackages =
                                              form.getValues("packages");
                                            const updatedPackages = [
                                              ...currentPackages,
                                            ];
                                            updatedPackages[index].title =
                                              e.target.value;
                                            globalForm.setValue(
                                              "stepEight.packages",
                                              updatedPackages as StepEightType["packages"],
                                            );
                                          }}
                                          onBlur={() => {
                                            field.onBlur();
                                            form.trigger(
                                              `packages.${index}.title`,
                                            );
                                          }}
                                          onFocus={() =>
                                            handleFieldFocus(
                                              `packages.${index}.title`,
                                            )
                                          }
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
                                name={`packages.${index}.description`}
                                render={({ field }) => {
                                  const currentLength =
                                    field.value?.length || 0;
                                  const maxLength = RICH_DESCRIPTION_MAX_CHARS;
                                  return (
                                    <FormItem>
                                      <FormLabel className="text-sm font-medium">
                                        Package Description
                                      </FormLabel>
                                      <FormControl>
                                        <Input
                                          {...field}
                                          placeholder="e.g. Includes premium access, special amenities..."
                                          className="h-10 bg-white/5 border-white/10"
                                          maxLength={maxLength}
                                          onChange={(e) => {
                                            field.onChange(e);
                                            // Update global form immediately
                                            const currentPackages =
                                              form.getValues("packages");
                                            const updatedPackages = [
                                              ...currentPackages,
                                            ];
                                            updatedPackages[index].description =
                                              e.target.value;
                                            globalForm.setValue(
                                              "stepEight.packages",
                                              updatedPackages as StepEightType["packages"],
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
                                name={`packages.${index}.price`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-sm font-medium">
                                      Package Price{" "}
                                      <span className="text-red-500">*</span>
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        className="h-10 bg-white/5 border-white/10"
                                        min="0"
                                        max={DRINK_PACKAGE_PRICE_MAX}
                                        maxLength={10}
                                        step="0.01"
                                        value={
                                          field.value === 0
                                            ? ""
                                            : (field.value ?? "")
                                        }
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          // Allow empty string while typing
                                          if (value === "" || value === null) {
                                            field.onChange("");
                                            // Update global form with empty string temporarily
                                            const currentPackages =
                                              form.getValues("packages");
                                            const updatedPackages = [
                                              ...currentPackages,
                                            ];
                                            updatedPackages[index].price = "";
                                            globalForm.setValue(
                                              "stepEight.packages",
                                              updatedPackages as StepEightType["packages"],
                                            );
                                            return;
                                          }

                                          const numValue =
                                            Number.parseFloat(value);
                                          if (
                                            !Number.isFinite(numValue) ||
                                            numValue <= 0
                                          ) {
                                            return;
                                          }
                                          const capped =
                                            clampDrinkPackagePrice(numValue);
                                          field.onChange(capped);
                                          const currentPackages =
                                            form.getValues("packages");
                                          const updatedPackages = [
                                            ...currentPackages,
                                          ];
                                          updatedPackages[index].price = capped;
                                          globalForm.setValue(
                                            "stepEight.packages",
                                            updatedPackages as StepEightType["packages"],
                                          );
                                        }}
                                        onBlur={() => {
                                          // Keep empty string on blur - validation will catch it
                                          field.onBlur();
                                          form.trigger(
                                            `packages.${index}.price`,
                                          );
                                        }}
                                        onFocus={() =>
                                          handleFieldFocus(
                                            `packages.${index}.price`,
                                          )
                                        }
                                        placeholder={`${currencySymbol}0.00`}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name={`packages.${index}.available_quantity`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-sm font-medium">
                                      Available Quantity{" "}
                                      <span className="text-red-500">*</span>
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        {...field}
                                        value={field.value as number}
                                        className="h-10 bg-white/5 border-white/10"
                                        min={1}
                                        max={DRINK_PACKAGE_QTY_MAX}
                                        placeholder="e.g. 100"
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          if (value === "" || value === null) {
                                            field.onChange(Number.NaN);
                                            const currentPackages =
                                              form.getValues("packages");
                                            const updatedPackages = [
                                              ...currentPackages,
                                            ];
                                            updatedPackages[
                                              index
                                            ].available_quantity =
                                              undefined as unknown as number;
                                            globalForm.setValue(
                                              "stepEight.packages",
                                              updatedPackages as StepEightType["packages"],
                                            );
                                            return;
                                          }
                                          const numValue = Number(value);
                                          if (!Number.isFinite(numValue))
                                            return;
                                          const capped =
                                            clampDrinkPackageQuantity(numValue);
                                          field.onChange(capped);
                                          const currentPackages =
                                            form.getValues("packages");
                                          const updatedPackages = [
                                            ...currentPackages,
                                          ];
                                          updatedPackages[
                                            index
                                          ].available_quantity = capped;
                                          globalForm.setValue(
                                            "stepEight.packages",
                                            updatedPackages as StepEightType["packages"],
                                          );
                                        }}
                                        onFocus={() =>
                                          handleFieldFocus(
                                            `packages.${index}.available_quantity`,
                                          )
                                        }
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <Button
                                type="button"
                                variant="outline"
                                className="border-red-400/50 text-red-400 hover:bg-red-500/10"
                                onClick={() => {
                                  if (fields.length <= 1) {
                                    toast.error(
                                      "At least one package is required",
                                    );
                                    return;
                                  }
                                  remove(index);
                                }}
                                disabled={fields.length <= 1}
                              >
                                Remove Package
                              </Button>
                            </div>
                          ))}

                          {fields.length < 10 && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() =>
                                append({
                                  title: `Package ${fields.length + 1}`,
                                  description: "",
                                  price: 0,
                                  available_quantity: 100,
                                })
                              }
                              className="mt-4 border-white/20 bg-white/[0.04] text-sm hover:bg-white/[0.08]"
                            >
                              Add More Package
                            </Button>
                          )}
                        </div>
                      </section>
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
