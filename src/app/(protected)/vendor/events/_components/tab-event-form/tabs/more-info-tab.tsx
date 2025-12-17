"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { eventsService } from "@/services/vendor/events/events.service";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { StepSixType, stepSixSchema } from "../schema";
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
import { FileUploader } from "@/components/ui/file-uploader";
import AddressAutocomplete from "./_components/address-autocomplete";
import EventLocationMap from "./_components/event-location-map";

export default function MoreInfoTab() {
  const [isLoading, setIsLoading] = useState(false);
  const { form: globalForm, save, setActiveField } = useEventFormContext();

  // Track if we have string URLs from backend
  const [brochurePdfUrl, setBrochurePdfUrl] = useState<string | null>(null);
  const [faqPdfUrl, setFaqPdfUrl] = useState<string | null>(null);
  const [brochurePdfUrl2, setBrochurePdfUrl2] = useState<string | null>(null);

  // Address search function ref for map integration
  const addressSearchFunctionRef = useRef<((address: string) => void) | null>(
    null
  );
  // Get event_id from global form
  const getEventId = (): number => {
    const stepOne = globalForm.getValues().stepOne;
    return typeof stepOne === "object" && "event_id" in stepOne
      ? Number(stepOne.event_id)
      : 0;
  };

  // Initialize form with combined step data
  const stepSixDefaults = globalForm.getValues().stepSix;
  const eventId = getEventId();

  // Setup form with the new schema structure
  const form = useForm<StepSixType>({
    resolver: zodResolver(stepSixSchema),
    mode: "onChange",
    defaultValues: {
      step: 6,
      event_id: eventId,
      brochure_pdf: stepSixDefaults?.brochure_pdf || null,
      brochure_pdf_2: stepSixDefaults?.brochure_pdf_2 || null,
      faq_pdf: stepSixDefaults?.faq_pdf || null,
      event_address: stepSixDefaults?.event_address || "",
      latitude: stepSixDefaults?.latitude || undefined,
      longitude: stepSixDefaults?.longitude || undefined,
      price_start_from: stepSixDefaults?.price_start_from || "",
      price_start_from_button_text:
        stepSixDefaults?.price_start_from_button_text || "Book Now",
      location: stepSixDefaults?.location || {
        title: "LOCATION",
        description: "",
        icon: "MapPin",
      },
      price: stepSixDefaults?.price || undefined,
      downloads: stepSixDefaults?.downloads || [],
      more_info: stepSixDefaults?.more_info || [],
      remove_brochure_pdf: false,
      remove_brochure_pdf_2: false,
      remove_faq_pdf: false,
    } as StepSixType,
  });

  // Update form when eventId changes
  useEffect(() => {
    form.setValue("event_id", eventId);
  }, [eventId, form]);

  const { control } = form;

  // Handle field focus for tracking active field
  const handleFieldFocus = useCallback(
    (fieldName: string) => {
      setActiveField?.(fieldName);
    },
    [setActiveField]
  );

  // Initialize URL values from global form on mount
  useEffect(() => {
    const brochurePdf = globalForm.getValues("stepSix.brochure_pdf");
    const faqPdf = globalForm.getValues("stepSix.faq_pdf");

    // Check if values are string URLs
    if (typeof brochurePdf === "string" && brochurePdf) {
      setBrochurePdfUrl(brochurePdf);
    }

    if (typeof faqPdf === "string" && faqPdf) {
      setFaqPdfUrl(faqPdf);
    }
  }, [globalForm]);

  // Handle file upload for brochure PDF
  const handleBrochureUpload = (file: File | null) => {
    // Check if file is PDF
    if (file && file.type !== "application/pdf") {
      toast.error("Only PDF files are allowed");
      return;
    }

    form.setValue("brochure_pdf", file || null);
    // When new file is uploaded, clear the URL
    if (file) {
      setBrochurePdfUrl(null);
      // Clear removal flag when new file is uploaded
      form.setValue("remove_brochure_pdf", false);
      globalForm.setValue("stepSix.remove_brochure_pdf", false);
    } else {
      setBrochurePdfUrl(null);
      // Set removal flag when file is removed
      form.setValue("remove_brochure_pdf", true);
      globalForm.setValue("stepSix.remove_brochure_pdf", true);
    }
  };

  // Handle file upload for FAQ PDF
  const handleFaqUpload = (file: File | null) => {
    // Check if file is PDF
    if (file && file.type !== "application/pdf") {
      toast.error("Only PDF files are allowed");
      return;
    }

    form.setValue("faq_pdf", file || null);
    // When new file is uploaded, clear the URL
    if (file) {
      setFaqPdfUrl(null);
      // Clear removal flag when new file is uploaded
      form.setValue("remove_faq_pdf", false);
      globalForm.setValue("stepSix.remove_faq_pdf", false);
    } else {
      setFaqPdfUrl(null);
      // Set removal flag when file is removed
      form.setValue("remove_faq_pdf", true);
      globalForm.setValue("stepSix.remove_faq_pdf", true);
    }
  };

  // Handle file upload for brochure PDF 2
  const handleBrochureUpload2 = (file: File | null) => {
    form.setValue("brochure_pdf_2", file || null);
    if (file) {
      setBrochurePdfUrl2(null);
      // Clear removal flag when new file is uploaded
      form.setValue("remove_brochure_pdf_2", false);
      globalForm.setValue("stepSix.remove_brochure_pdf_2", false);
    } else {
      setBrochurePdfUrl2(null);
      // Set removal flag when file is removed
      form.setValue("remove_brochure_pdf_2", true);
      globalForm.setValue("stepSix.remove_brochure_pdf_2", true);
    }
  };

  // Sync local form with global form
  useEffect(() => {
    const subscription = form.watch((value) => {
      if (value) {
        globalForm.setValue("stepSix", {
          ...value,
          price_start_from_button_text:
            value.price_start_from_button_text || "Book Now",
        } as StepSixType);
      }
    });

    return () => subscription.unsubscribe();
  }, [form, globalForm]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (data: StepSixType) => {
      setIsLoading(true);

      try {
        // Manually re-trigger validation on all fields to force error display
        const isValid = await form.trigger();

        // Custom validation for required brochure PDF
        if (!data.brochure_pdf && !brochurePdfUrl) {
          toast.error("Event Brochure PDF is required");
          setActiveField("brochure_pdf");
          setIsLoading(false);
          return;
        }

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
        globalForm.setValue("stepSix", {
          ...globalForm.getValues().stepSix,
          ...data,
          price_start_from_button_text:
            data.price_start_from_button_text || "Book Now",
        } as StepSixType);

        // Call the API directly using eventsService
        const response = await eventsService.storeStepSixData(data);

        if (response && response.status) {
          // Move to the next step
          await save();
        } else {
          const errorMessage =
            response?.message ||
            "Failed to save additional information. Please try again.";
          toast.error("Error saving additional information", {
            description: errorMessage,
          });
        }
      } catch (error) {
        console.error("Error saving additional information:", error);
        toast.error("Failed to save additional information");
      } finally {
        setIsLoading(false);
      }
    },
    [brochurePdfUrl, form, globalForm, save, setActiveField]
  );

  return (
    <div className="space-y-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
          {/* Document Uploads Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold title-header">
              Add More Information
            </h2>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              Upload important documents for your event
            </p>

            <div className="space-y-6 border border-[#E5E7EB] p-6 rounded-md bg-white">
              <FormField
                control={control}
                name="brochure_pdf"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Event Brochure (PDF only){" "}
                      <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      {brochurePdfUrl ? (
                        <div className="w-full">
                          <div className="flex items-center justify-between bg-gray-100 p-4 rounded-md mb-2">
                            <div className="flex items-center">
                              <svg
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
                                <path d="M20 2V8H26L20 2Z" fill="#FF8A80" />
                                <path d="M14 16H18V18H14V16Z" fill="white" />
                                <path d="M14 20H18V22H14V20Z" fill="white" />
                              </svg>
                              <span className="ml-2 text-sm">
                                {brochurePdfUrl.split("/").pop()}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setBrochurePdfUrl(null);
                                form.setValue("brochure_pdf", null);
                                form.setValue("remove_brochure_pdf", true);
                                globalForm.setValue(
                                  "stepSix.remove_brochure_pdf",
                                  true
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
                          control={control}
                          render={({ field: { value } }) => (
                            <FileUploader
                              value={value instanceof File ? [value] : []}
                              onValueChange={(files) =>
                                handleBrochureUpload(files[0] || null)
                              }
                              maxFileCount={1}
                              maxSize={1 * 1024 * 1024} // 1MB
                              onRemove={() => handleBrochureUpload(null)}
                              accept={{ "application/pdf": [".pdf"] }}
                            />
                          )}
                        />
                      )}
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-gray-500 mt-1">
                      Upload your event brochure (PDF only)
                    </p>
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="brochure_pdf_2"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Event Flyer (PDF only) (Optional)
                    </FormLabel>
                    <FormControl>
                      {brochurePdfUrl2 ? (
                        <div className="w-full">
                          <div className="flex items-center justify-between bg-gray-100 p-4 rounded-md mb-2">
                            <div className="flex items-center">
                              <svg
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
                                <path d="M20 2V8H26L20 2Z" fill="#FF8A80" />
                                <path d="M14 16H18V18H14V16Z" fill="white" />
                                <path d="M14 20H18V22H14V20Z" fill="white" />
                              </svg>
                              <span className="ml-2 text-sm">
                                {brochurePdfUrl2.split("/").pop()}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setBrochurePdfUrl2(null);
                                form.setValue("brochure_pdf_2", null);
                                form.setValue("remove_brochure_pdf_2", true);
                                globalForm.setValue(
                                  "stepSix.remove_brochure_pdf_2",
                                  true
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
                          control={control}
                          render={({ field: { value } }) => (
                            <FileUploader
                              value={value instanceof File ? [value] : []}
                              onValueChange={(files) =>
                                handleBrochureUpload2(files[0] || null)
                              }
                              maxFileCount={1}
                              maxSize={1 * 1024 * 1024} // 1MB
                              onRemove={() => handleBrochureUpload2(null)}
                              accept={{ "application/pdf": [".pdf"] }}
                            />
                          )}
                        />
                      )}
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-gray-500 mt-1">
                      Upload your event Flyer (PDF only)
                    </p>
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="faq_pdf"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      FAQ (PDF only) (Optional)
                    </FormLabel>
                    <FormControl>
                      {faqPdfUrl ? (
                        <div className="w-full">
                          <div className="flex items-center justify-between bg-gray-100 p-4 rounded-md mb-2">
                            <div className="flex items-center">
                              <svg
                                width="24"
                                height="24"
                                viewBox="0 0 32 32"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M20 2H8C6.9 2 6 2.9 6 4V28C6 29.1 6.9 30 8 30H24C25.1 30 26 29.1 26 28V8L20 2Z"
                                  fill="#2196F3"
                                />
                                <path d="M20 2V8H26L20 2Z" fill="#90CAF9" />
                                <path d="M14 13H18V15H14V13Z" fill="white" />
                                <path d="M14 17H18V19H14V17Z" fill="white" />
                                <path d="M14 21H18V23H14V21Z" fill="white" />
                              </svg>
                              <span className="ml-2 text-sm">
                                {faqPdfUrl.split("/").pop()}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setFaqPdfUrl(null);
                                form.setValue("faq_pdf", null);
                                form.setValue("remove_faq_pdf", true);
                                globalForm.setValue(
                                  "stepSix.remove_faq_pdf",
                                  true
                                );
                                handleFaqUpload(null);
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Controller
                          name="faq_pdf"
                          control={control}
                          render={({ field: { value } }) => (
                            <FileUploader
                              value={value instanceof File ? [value] : []}
                              onValueChange={(files) =>
                                handleFaqUpload(files[0] || null)
                              }
                              maxFileCount={1}
                              maxSize={1 * 1024 * 1024} // 1MB
                              onRemove={() => handleFaqUpload(null)}
                              accept={{ "application/pdf": [".pdf"] }}
                            />
                          )}
                        />
                      )}
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-gray-500 mt-1">
                      Upload your FAQ document (PDF only)
                    </p>
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Event Location Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold title-header">Event Location</h2>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              Provide the exact event location details
            </p>

            <div className="space-y-4 border border-[#E5E7EB] p-6 rounded-md bg-white">
              <FormField
                control={control}
                name="event_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Event Address (exact location){" "}
                      <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <AddressAutocomplete
                        value={field.value}
                        onChange={(address) => {
                          field.onChange(address);
                          // Update location for preview
                          const currentStepSix =
                            globalForm.getValues("stepSix") || {};
                          globalForm.setValue("stepSix", {
                            ...currentStepSix,
                            event_address: address,
                            location: {
                              title: "LOCATION",
                              description: address,
                              icon: "MapPin",
                            },
                          });
                        }}
                        onSelect={(placeId, address) => {
                          field.onChange(address);
                          // Update global form
                          const currentStepSix =
                            globalForm.getValues("stepSix") || {};
                          globalForm.setValue("stepSix", {
                            ...currentStepSix,
                            event_address: address,
                            location: {
                              title: "LOCATION",
                              description: address,
                              icon: "MapPin",
                            },
                          });

                          // Trigger map search for the selected address
                          if (addressSearchFunctionRef.current) {
                            addressSearchFunctionRef.current(address);
                          }
                        }}
                        onFocus={() => handleFieldFocus("event_address")}
                        placeholder="Type to search for a UK address or location..."
                        className="w-full"
                      />
                    </FormControl>
                    <p className="text-xs text-blue-600 mt-1 font-medium">
                      ⓘ Search for UK addresses or use the map below to set
                      exact location
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Interactive Google Map */}
              <EventLocationMap
                initialAddress={form.watch("event_address")}
                onLocationChange={(location) => {
                  // Update form values with new location data
                  form.setValue("event_address", location.address);
                  form.setValue("latitude", location.latitude);
                  form.setValue("longitude", location.longitude);

                  // Update global form
                  const currentStepSix = globalForm.getValues("stepSix") || {};
                  globalForm.setValue("stepSix", {
                    ...currentStepSix,
                    event_address: location.address,
                    latitude: location.latitude,
                    longitude: location.longitude,
                    location: {
                      title: "LOCATION",
                      description: location.address,
                      icon: "MapPin",
                    },
                  });
                }}
                onAddressSearch={(searchFunction) => {
                  addressSearchFunctionRef.current = searchFunction;
                }}
                className="mt-4"
              />
            </div>
          </div>

          {/* Price Information Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold title-header">
              Price Information
            </h2>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              Set pricing details for your event
            </p>

            <div className="space-y-4 border border-[#E5E7EB] p-6 rounded-md bg-white">
              <FormField
                control={control}
                name="price_start_from"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Prices Start From <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g. 50"
                        className="h-10 bg-[#F9FAFB] border-[#E5E7EB]"
                        onFocus={() => handleFieldFocus("price_start_from")}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter the starting price (numbers only)
                    </p>
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="price_start_from_button_text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Button Text
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g. Book Now"
                        className="h-10 bg-[#F9FAFB] border-[#E5E7EB]"
                        onFocus={() =>
                          handleFieldFocus("price_start_from_button_text")
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
