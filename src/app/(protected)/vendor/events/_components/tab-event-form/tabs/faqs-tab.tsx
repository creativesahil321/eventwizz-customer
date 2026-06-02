"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { eventsService } from "@/services/vendor/events/events.service";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { STEP_NINE_MAX_FAQS } from "@/app/(on-boarding)/on-boarding/_components/form-provider/schema";
import { StepSevenType, stepSevenSchema } from "../schema";
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
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";

export default function FaqsTab() {
  const [isLoading, setIsLoading] = useState(false);
  const {
    form: globalForm,
    advanceStep,
    setActiveField,
    readOnly,
  } = useEventFormContext();

  // Get event_id from global form
  const getEventId = (): number => {
    const stepOne = globalForm.getValues().stepOne;
    return typeof stepOne === "object" && "event_id" in stepOne
      ? Number(stepOne.event_id)
      : 0;
  };

  // Create local form instance
  const form = useForm<StepSevenType>({
    resolver: zodResolver(stepSevenSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      step: 7,
      event_id: getEventId() || 0,
      // Ensure one empty FAQ is present for better UX when API/global returns empty list
      faqs:
        (globalForm.getValues().stepSeven?.faqs || []).length > 0
          ? (globalForm.getValues().stepSeven?.faqs as StepSevenType["faqs"])!
          : [{ question: "", answer: "" }],
      deleted_faq_ids: globalForm.getValues().stepSeven?.deleted_faq_ids || [],
    } as StepSevenType,
  });

  const { control } = form;

  // Setup field array for FAQs
  const {
    fields: faqFields,
    append,
    remove,
  } = useFieldArray({
    control,
    name: "faqs",
  });

  // Handle field focus for tracking active field
  const handleFieldFocus = useCallback(
    (fieldName: string) => {
      setActiveField?.(fieldName);
    },
    [setActiveField],
  );

  // Sync local form with global form
  useEffect(() => {
    const subscription = form.watch((value) => {
      if (value) {
        globalForm.setValue("stepSeven", value as StepSevenType);
      }
    });

    return () => subscription.unsubscribe();
  }, [form, globalForm]);

  const handleAppend = async () => {
    const currentFaqs = form.getValues("faqs");

    if (currentFaqs.length >= STEP_NINE_MAX_FAQS) {
      toast.error(`You can add a maximum of ${STEP_NINE_MAX_FAQS} FAQs`);
      return;
    }

    const hasEmptyFields = currentFaqs.some(
      (faq: StepSevenType["faqs"][number]) =>
        !faq.question ||
        faq.question.trim() === "" ||
        !faq.answer ||
        faq.answer.trim() === "",
    );

    if (hasEmptyFields) {
      toast.error(
        "Please fill in all existing FAQ fields before adding a new one",
      );
      return;
    }

    append({ question: "", answer: "" });
  };

  // Handle FAQ removal
  const handleRemove = (index: number) => {
    // Remove the FAQ from the field array
    remove(index);
  };

  // Handle form submission
  const handleSubmit = useCallback(
    async (data: StepSevenType) => {
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
              `[name="${errorFields[0]}"]`,
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
        globalForm.setValue("stepSeven", {
          ...globalForm.getValues().stepSeven,
          ...data,
        } as StepSevenType);

        // Call the API directly using eventsService
        const response = await eventsService.storeStepSevenData(data);

        if (response && response.status) {
          // Success message is handled by axios interceptor
          // Move to the next step
          await advanceStep(7);
        } else {
          const errorMessage =
            response?.message ||
            "Failed to save FAQ details. Please try again.";
          toast.error("Error saving FAQ details", {
            description: errorMessage,
          });
        }
      } catch (error) {
        console.error("Error saving FAQ details:", error);
        toast.error("Failed to save FAQ details");
      } finally {
        setIsLoading(false);
      }
    },
    [form, globalForm, advanceStep, setActiveField],
  );

  return (
    <div className="space-y-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
          {/* FAQ Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold title-header">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              Help your customers find answers to common questions about your
              event
            </p>

            <div className="space-y-8">
              {faqFields.map((field, index) => (
                <div
                  key={field.id}
                  className="border border-[#E5E7EB] p-6 rounded-md bg-white relative"
                >
                  <div className="absolute top-3 right-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(index)}
                      disabled={faqFields.length === 1}
                      className="h-8 w-8 p-0 rounded-full hover:bg-red-50 text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="mb-2 text-sm font-medium text-gray-500">
                    FAQ #{index + 1}
                  </div>

                  <div className="space-y-4">
                    <FormField
                      control={control}
                      name={`faqs.${index}.question`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Question
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="e.g. Is the venue heated?"
                              className="h-10 bg-[#F9FAFB] border-[#E5E7EB]"
                              onFocus={() =>
                                handleFieldFocus(`faqs.${index}.question`)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={control}
                      name={`faqs.${index}.answer`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Answer
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="e.g. Yes, we have multi-thermostatic heaters throughout all of our marquee venues."
                              className="min-h-[100px] bg-[#F9FAFB] border-[#E5E7EB]"
                              onFocus={() =>
                                handleFieldFocus(`faqs.${index}.answer`)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}

              <div className="flex justify-center pt-4">
                <Button
                  type="button"
                  onClick={handleAppend}
                  disabled={readOnly || faqFields.length >= STEP_NINE_MAX_FAQS}
                  className="bg-[#F9FAFB] hover:bg-gray-100 text-gray-700 border border-[#E5E7EB]"
                >
                  <span className="mr-1">+</span> Add Another FAQ
                </Button>
              </div>
            </div>
          </div>

          {/* Pro Tip Section */}
          <div className="p-4 bg-blue-50 rounded-md text-blue-800 text-sm">
            <p>
              <strong>Pro Tip:</strong> Including FAQs can significantly reduce
              inquiries and improve customer conversion. Consider adding
              questions about payment policies, cancellations, dress codes, and
              any unique aspects of your event.
            </p>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button
              type="submit"
              disabled={isLoading || readOnly}
              variant="event-primary"
            >
              {readOnly ? "View only" : isLoading ? "Saving..." : "Save & Next"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
