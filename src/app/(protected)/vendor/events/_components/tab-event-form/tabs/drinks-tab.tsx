"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useForm, useFieldArray, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { eventsService } from "@/services/vendor/events/events.service";
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
import { Input } from "@/components/ui/input";
import { X, PlusCircle } from "lucide-react";

export default function DrinksTab() {
  const [isLoading, setIsLoading] = useState(false);
  const { form: globalForm, save, setActiveField } = useEventFormContext();

  // Get event_id from global form
  const getEventId = (): number => {
    const stepOne = globalForm.getValues().stepOne;
    return typeof stepOne === "object" && "event_id" in stepOne
      ? Number(stepOne.event_id)
      : 0;
  };

  // Create local form instance
  const form = useForm<StepFiveType>({
    resolver: zodResolver(stepFiveSchema) as Resolver<StepFiveType>,
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      step: 5,
      event_id: getEventId() || 0,
      drink_title: globalForm.getValues().stepFive?.drink_title || "",
      drink_description:
        globalForm.getValues().stepFive?.drink_description || "",
      // Ensure at least one default package renders when API/global returns an empty array
      packages:
        (globalForm.getValues().stepFive?.packages || []).length > 0
          ? globalForm.getValues().stepFive?.packages.map((pkg) => ({
              ...pkg,
              available_quantity:
                typeof pkg.available_quantity === "number"
                  ? pkg.available_quantity
                  : 100,
            }))
          : [
              {
                title: "Premium Package",
                description: "This is a premium service package",
                price: 20,
                available_quantity: 100,
              },
            ],
    },
  });

  const { control } = form;

  // Setup field array for packages
  const {
    fields: packageFields,
    append,
    remove,
  } = useFieldArray({
    control,
    name: "packages",
  });

  // Handle field focus for tracking active field
  const handleFieldFocus = useCallback(
    (fieldName: string) => {
      setActiveField?.(fieldName);
    },
    [setActiveField]
  );

  // Sync local form with global form
  useEffect(() => {
    const subscription = form.watch((value) => {
      if (value) {
        globalForm.setValue("stepFive", value as StepFiveType);
      }
    });

    return () => subscription.unsubscribe();
  }, [form, globalForm]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (data: StepFiveType) => {
      setIsLoading(true);

      try {
        // Manually re-trigger validation on all fields to force error display
        const isValid = await form.trigger();

        // If form is not valid, only highlight fields - no toast
        if (!isValid) {
          // Get all validation errors
          const errors = form.formState.errors;
          const errorFields = Object.keys(errors);

          // Find the first error field and scroll to it
          if (errorFields.length > 0) {
            setActiveField(errorFields[0]);

            // Try to find and focus the field with an error
            const errorElement = document.querySelector(
              `[name="${errorFields[0]}"]`
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

        // Update global form with all fields
        globalForm.setValue("stepFive", {
          ...globalForm.getValues().stepFive,
          ...data,
        } as StepFiveType);

        // Call the API directly using eventsService
        const response = await eventsService.storeStepFiveData(data);

        if (response && response.status) {
          // Success message is handled by axios interceptor
          // Move to the next step
          await save();
        } else {
          const errorMessage =
            response?.message ||
            "Failed to save drink details. Please try again.";
          toast.error("Error saving drink details", {
            description: errorMessage,
          });
        }
      } catch (error) {
        console.error("Error saving drink details:", error);
        toast.error("Failed to save drink details");
      } finally {
        setIsLoading(false);
      }
    },
    [form, globalForm, save, setActiveField]
  );

  return (
    <div className="space-y-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
          {/* Package Options Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold title-header">
                Package Options
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={control}
                name="drink_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Title <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g. VIP Packages, Premium Access, etc."
                        className="h-11 bg-[#F9FAFB] border-[#E5E7EB]"
                        onFocus={() => handleFieldFocus("drink_title")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="drink_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Description <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g. Please note: Special terms and conditions apply..."
                        className="h-11 bg-[#F9FAFB] border-[#E5E7EB]"
                        onFocus={() => handleFieldFocus("drink_description")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Package Deals Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold title-header">
                Package Deals
              </h3>
              {packageFields.length < 10 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    append({
                      title: "",
                      description: "",
                      price: 0,
                      available_quantity: 100,
                    })
                  }
                  className="flex items-center gap-2"
                >
                  <PlusCircle className="h-4 w-4" />
                  Add More Package
                </Button>
              )}
            </div>

            <div className="space-y-6">
              {packageFields.map((field, index) => (
                <div
                  key={field.id}
                  className="space-y-4 border border-[#E5E7EB] p-6 rounded-md bg-white"
                >
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Package {index + 1}</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (packageFields.length <= 1) {
                          toast.error("At least one package is required");
                          return;
                        }
                        remove(index);
                      }}
                      disabled={packageFields.length <= 1}
                      className="h-8 w-8 p-0 rounded-full border-red-400 text-red-500"
                    >
                      <X size={16} />
                    </Button>
                  </div>

                  <FormField
                    control={control}
                    name={`packages.${index}.title`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Package Heading
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g. Premium Package A"
                            className="h-10 bg-[#F9FAFB] border-[#E5E7EB]"
                            onFocus={() =>
                              handleFieldFocus(`packages.${index}.title`)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name={`packages.${index}.description`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Package Description
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g. Includes premium access, special amenities..."
                            className="h-10 bg-[#F9FAFB] border-[#E5E7EB]"
                            maxLength={160}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name={`packages.${index}.price`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Package Price <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            className="h-10 bg-[#F9FAFB] border-[#E5E7EB]"
                            placeholder="£0.00"
                            value={field.value === 0 ? "" : field.value ?? ""}
                            onFocus={() =>
                              handleFieldFocus(`packages.${index}.price`)
                            }
                            onChange={(e) => {
                              const value = e.target.value;
                              // Allow empty string while typing
                              if (value === "" || value === null) {
                                field.onChange("");
                                return;
                              }

                              const numValue = Number.parseFloat(value);
                              if (!Number.isNaN(numValue) && numValue > 0) {
                                field.onChange(numValue);
                              }
                            }}
                            onBlur={() => {
                              // Keep empty string on blur - validation will catch it
                              field.onBlur();
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
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
                            className="h-10 bg-[#F9FAFB] border-[#E5E7EB]"
                            placeholder="e.g. 100"
                            min="1"
                            max="500"
                            onFocus={() =>
                              handleFieldFocus(
                                `packages.${index}.available_quantity`
                              )
                            }
                            onChange={(e) => {
                              const numValue = Number(e.target.value);
                              field.onChange(numValue);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button type="submit" disabled={isLoading} variant="event-primary">
              {isLoading ? "Saving..." : "Save & Next"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
