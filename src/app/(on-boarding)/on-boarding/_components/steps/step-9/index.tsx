"use client";

import React, { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
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
import { Trash2 } from "lucide-react";
import { stepNineSchema, StepNineType } from "../../form-provider/schema";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  OnboardingTitle,
  OnboardingSectionTitle,
} from "@/components/ui/typography";
import { onboardingService } from "@/services/vendor/onboarding/onboarding.service";
import { useSession } from "next-auth/react";
import { useFieldFocusHandler } from "../../form-preview/field-focus-handler";
import { useEventId } from "../../../_lib/hooks/useEventId";

export default function StepNine() {
  const { form: globalForm, save, setActiveStep } = useFormContext();
  const [loading, setLoading] = useState(false);
  const { update: updateSession } = useSession();

  const { handleFieldFocus } = useFieldFocusHandler();
  const eventId = useEventId(globalForm, "stepNine");

  const form = useForm<StepNineType>({
    resolver: zodResolver(stepNineSchema),
    defaultValues: {
      step: 9,
      event_id: eventId,
      faqs:
        globalForm.getValues("stepNine.faqs")?.length > 0
          ? globalForm.getValues("stepNine.faqs")
          : [{ question: "", answer: "" }],
    },

    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "faqs",
  });

  // Add a constant for max FAQs allowed
  const MAX_FAQS = 5;

  // Add state to track deleted FAQ IDs
  const [deletedFaqIds, setDeletedFaqIds] = useState<number[]>([]);

  // Update handleAppend to check against MAX_FAQS
  const handleAppend = async () => {
    const currentFaqs = form.getValues("faqs");

    // Check if we've reached the max allowed FAQs
    if (currentFaqs.length >= MAX_FAQS) {
      toast.error(`You can add a maximum of ${MAX_FAQS} FAQs`);
      return;
    }

    const hasEmptyFields = currentFaqs.some(
      (faq) =>
        !faq.question ||
        faq.question.trim() === "" ||
        !faq.answer ||
        faq.answer.trim() === ""
    );

    if (hasEmptyFields) {
      await form.trigger("faqs");
      toast.error(
        "Please fill in all existing FAQ fields before adding a new one"
      );
      return;
    }

    append({ question: "", answer: "" });
  };

  // Correct the setDeletedFaqIds typecasting
  const handleRemove = (index: number) => {
    // Check if the FAQ being removed has an ID (from backend)
    const faqToRemove = form.getValues(`faqs.${index}`);
    if (faqToRemove && "id" in faqToRemove && faqToRemove.id) {
      setDeletedFaqIds((prev: number[]) => [...prev, faqToRemove.id as number]);
    }

    // Remove the FAQ from the field array
    remove(index);

    // Update global form state immediately to update preview
    const currentFaqs = form.getValues("faqs").filter((_, i) => i !== index);
    globalForm.setValue("stepNine.faqs", currentFaqs);
  };

  // Update onSubmit to send deleted FAQ IDs
  const onSubmit = async (data: StepNineType) => {
    setLoading(true);
    try {
      // Update global form state
      globalForm.setValue("stepNine", data);

      // Validate the form
      const isValid = await form.trigger();
      if (!isValid) {
        const errors = form.formState.errors;

        // Display errors
        const errorFields = Object.keys(errors);
        toast.error(
          `Please correct the highlighted fields: ${errorFields.join(", ")}`
        );
        setLoading(false);
        return;
      }

      // Make sure event_id is set
      data.event_id = eventId;

      // Add deleted FAQ IDs if any
      if (deletedFaqIds.length > 0) {
        data.deleted_faq_ids = deletedFaqIds;
      }

      // Call the API using the service
      const response = await onboardingService.storeStepNineData(data);

      if (response?.status) {
        // INSTANT TRANSITION: Set active step FIRST for smooth UX
        setActiveStep(10);

        // Then handle async operations in background
        Promise.all([updateSession({ on_boarding_step: 10 }), save()]).catch(
          (error) => {
            console.error("Background save error:", error);
          }
        );
      } else {
        console.error("API Error:", response);
        // Error toast is handled by axios interceptor
      }
    } catch (error) {
      console.error("Error during Step Nine submission:", error);
      // Error toast is handled by axios interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-start w-full min-h-screen bg-transparent">
      <div className="w-full max-w-4xl mx-auto relative">
        <OnboardingCard className="w-full mx-auto shadow-sm mb-16">
          <CardHeader className="pb-2 pt-4">
            <OnboardingTitle>
              Do You Want To Add Any Frequently Asked Questions?
            </OnboardingTitle>
            <p className="text-lg mt-2">
              Help your customers find answers to common questions about your
              event
            </p>
          </CardHeader>

          <CardContent className="px-6 py-2 pb-8">
            <Form {...form}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  form.handleSubmit(onSubmit)(e);
                }}
                className="space-y-6"
              >
                <input type="hidden" {...form.register("step")} />
                <input type="hidden" {...form.register("event_id")} />

                <section className="w-full mb-4">
                  <OnboardingSectionTitle className="text-xl font-medium">
                    FAQ List
                  </OnboardingSectionTitle>

                  <div className="space-y-8 mt-4">
                    {fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="border border-white/10 p-6 rounded-md bg-white relative"
                      >
                        <div className="absolute top-3 right-3">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemove(index)}
                            disabled={fields.length === 1}
                            className="h-8 w-8 p-0 rounded-full text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="mb-2 text-sm font-medium text-gray-500">
                          FAQ #{index + 1}
                        </div>

                        <div className="space-y-4">
                          <FormField
                            control={form.control}
                            name={`faqs.${index}.question`}
                            render={({ field }) => {
                              const currentLength = field.value?.length || 0;
                              const maxLength = 160;
                              return (
                                <FormItem>
                                  <FormLabel className="text-sm font-medium">
                                    Question
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="e.g. Is the venue heated?"
                                      className="h-10 bg-white/5 border-white/10"
                                      maxLength={maxLength}
                                      onChange={(e) => {
                                        field.onChange(e);
                                        // Update global form state immediately to update preview
                                        const currentFaqs = [
                                          ...form.getValues("faqs"),
                                        ];
                                        currentFaqs[index].question =
                                          e.target.value;
                                        globalForm.setValue(
                                          "stepNine.faqs",
                                          currentFaqs
                                        );
                                      }}
                                      onFocus={() =>
                                        handleFieldFocus("question")
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
                            name={`faqs.${index}.answer`}
                            render={({ field }) => {
                              const currentLength = field.value?.length || 0;
                              const maxLength = 500;
                              return (
                                <FormItem>
                                  <FormLabel className="text-sm font-medium">
                                    Answer
                                  </FormLabel>
                                  <FormControl>
                                    <Textarea
                                      {...field}
                                      placeholder="e.g. Yes, we have multi-thermostatic heaters throughout all of our marquee venues."
                                      className="min-h-[100px] bg-white/5 border-white/10"
                                      maxLength={maxLength}
                                      onChange={(e) => {
                                        field.onChange(e);
                                        // Update global form state immediately to update preview
                                        const currentFaqs = [
                                          ...form.getValues("faqs"),
                                        ];
                                        currentFaqs[index].answer =
                                          e.target.value;
                                        globalForm.setValue(
                                          "stepNine.faqs",
                                          currentFaqs
                                        );
                                      }}
                                      onFocus={() => handleFieldFocus("answer")}
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
                      </div>
                    ))}

                    <div className="flex justify-center pt-4">
                      <Button
                        type="button"
                        onClick={handleAppend}
                        className="bg-white/5 hover:bg-white/10 text-gray-700 border border-white/10"
                      >
                        <span className="mr-1">+</span> Add Another FAQ
                      </Button>
                    </div>
                  </div>
                </section>

                <div className="flex items-center justify-center gap-4 pt-4">
                  <Button
                    variant="event-primary"
                    type="button"
                    className="rounded-full px-8 py-2 text-white"
                    disabled={loading}
                    onClick={() => {
                      const data = form.getValues();
                      onSubmit(data);
                    }}
                  >
                    {loading ? "Saving..." : "Save & Next"}
                  </Button>
                  <Button
                    variant="event-secondary"
                    type="button"
                    onClick={() => setActiveStep(10)}
                    className="rounded-full px-8 py-2 text-white"
                  >
                    Skip
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </OnboardingCard>
      </div>
    </div>
  );
}
