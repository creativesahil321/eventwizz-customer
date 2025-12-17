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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFormContext } from "../../form-provider";
import { stepOneSchema, StepOneType } from "../../form-provider/schema";
import GoogleBusinessSearch from "./google-business";
import { env } from "@/env";
import { fetchPlaceDetails } from "./_lib/actions";
import { useState } from "react";
import { OnboardingCard } from "@/components/ui/card";
import {
  OnboardingTitle,
  OnboardingSectionTitle,
} from "@/components/ui/typography";
import { onboardingService } from "@/services/vendor/onboarding/onboarding.service";
import { useSession } from "next-auth/react";

export default function StepOne() {
  const [loading, setLoading] = useState(false);
  const { form: globalForm, save, setActiveStep } = useFormContext();
  const { update } = useSession();

  const form = useForm<StepOneType>({
    resolver: zodResolver(stepOneSchema),
    defaultValues: {
      step: 1,
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

  const handleSubmit = async (data: StepOneType) => {
    setLoading(true);
    try {
      // Update global form state
      globalForm.setValue("stepOne", data);

      // Call API using service
      const response = await onboardingService.storeStepData(data);

      if (response.status) {
        // If vendor_location_id is in the response, update the session
        if (response.data?.vendor_location_id) {
          const vendorLocationId = response.data.vendor_location_id;

          // Use the update method from useSession hook to update the session
          await update({
            vendor_location_id: vendorLocationId,
            on_boarding_step: response.data.on_boarding_step,
          });
        }

        // INSTANT TRANSITION: Set active step FIRST for smooth UX
        setActiveStep(2);

        // Then handle async operations in background
        Promise.all([
          response.data.on_boarding_step
            ? updateSession({ on_boarding_step: response.data.on_boarding_step })
            : Promise.resolve(),
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

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen py-8 px-4">
      <OnboardingCard className="w-full max-w-2xl">
        <CardHeader className="pb-2 pt-4">
          <OnboardingTitle>OK Tell us About Your Business!</OnboardingTitle>
        </CardHeader>
        <CardContent>
          <section className="w-full mb-4">
            <OnboardingSectionTitle>Venue Information</OnboardingSectionTitle>
          </section>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6"
            >
              <Input type="hidden" {...form.register("domain")} />
              <Input type="hidden" {...form.register("description")} />

              {/* Venue Name - Full Width */}
              <div className="w-full mb-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Venue Name <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <GoogleBusinessSearch
                          apiKey={env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                          value={field.value}
                          onChange={(value) => field.onChange(value)}
                          onSelect={(placeId) =>
                            fetchPlaceDetails(form, placeId)
                          }
                        />
                      </FormControl>
                      <p className="text-xs text-blue-600 mt-1 font-medium">
                        ⓘ Only verified venues from Google Places can be
                        selected
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Other fields in 2-column grid */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                <FormField
                  control={form.control}
                  name="contact_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Venue Contact Number
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="123 456 7890"
                          className="bg-gray-50"
                          maxLength={20}
                          {...field}
                          onChange={(e) => {
                            // Only allow numbers, spaces, dashes, plus signs, and parentheses
                            const value = e.target.value.replace(
                              /[^\d\s\-+()]/g,
                              ""
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
                        Venue Address
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g Stock Brook Country Club,..."
                          className="bg-gray-50"
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
                        Venue Email
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Please enter venue email manually"
                          className="bg-gray-50"
                          {...field}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground mt-1">
                        Email must be entered manually for privacy reasons
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => {
                    const currentLength = field.value?.length || 0;
                    const maxLength = 30;
                    return (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          City <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. London"
                            className="bg-gray-50"
                            maxLength={maxLength}
                            {...field}
                          />
                        </FormControl>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground mt-1">
                            Auto-filled based on venue selection, but can be
                            edited manually
                          </p>
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
                        </div>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>
              <div className="flex items-center justify-center gap-4 pt-4">
                <Button
                  variant="event-primary"
                  disabled={loading}
                  type="submit"
                  className="rounded-full px-8 py-2"
                >
                  {loading ? "Saving..." : "Save & Next"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </OnboardingCard>
    </div>
  );
}
