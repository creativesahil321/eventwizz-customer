"use client";

import React, { useState, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
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
import { FileUploader } from "@/components/ui/file-uploader";
import { toast } from "sonner";
import {
  OnboardingTitle,
  OnboardingSectionTitle,
} from "@/components/ui/typography";
import { onboardingService } from "@/services/vendor/onboarding/onboarding.service";
import { Resolver } from "react-hook-form";
import { useSession } from "next-auth/react";
import { useFieldFocusHandler } from "../../form-preview/field-focus-handler";
import { useEventId } from "../../../_lib/hooks/useEventId";
import EventLocationMap from "./event-location-map";
import AddressAutocomplete from "./address-autocomplete";
export default function StepEight() {
  const { handleFieldFocus } = useFieldFocusHandler();
  const {
    form: globalForm,
    save,
    setActiveStep,
    activeField,
  } = useFormContext();
  const [loading, setLoading] = useState(false);
  const { update: updateSession } = useSession();
  // Get the address from Step 1 to prefill the event address
  const getStepOneAddress = () => {
    const stepOneData = globalForm.getValues("stepOne");
    return stepOneData?.address || "";
  };

  const eventId = useEventId(globalForm, "stepEight");

  const form = useForm<StepEightType>({
    resolver: zodResolver(stepEightSchema) as Resolver<StepEightType>,
    defaultValues: {
      step: 8,
      event_id: eventId,
      brochure_pdf: globalForm.getValues("stepEight.brochure_pdf") || undefined,
      faq_pdf: globalForm.getValues("stepEight.faq_pdf") || undefined,
      event_address:
        globalForm.getValues("stepEight.event_address") || getStepOneAddress(),
      latitude: globalForm.getValues("stepEight.latitude") || undefined,
      longitude: globalForm.getValues("stepEight.longitude") || undefined,
      price_start_from:
        globalForm.getValues("stepEight.price_start_from") || "",
      price_start_from_button_text:
        globalForm.getValues("stepEight.price_start_from_button_text") ||
        "Book Now",
      location: {
        title: "LOCATION",
        description:
          globalForm.getValues("stepEight.event_address") ||
          getStepOneAddress(),
        icon: "MapPin",
      },
      downloads: globalForm.getValues("stepEight.downloads") || [],
      remove_brochure_pdf: false,
      remove_brochure_pdf_2: false,
      remove_faq_pdf: false,
    },
    mode: "onChange",
  });

  // Track if we have string URLs from backend
  const [brochurePdfUrl, setBrochurePdfUrl] = useState<string | null>(null);
  const [faqPdfUrl, setFaqPdfUrl] = useState<string | null>(null);
  const [brochurePdfUrl2, setBrochurePdfUrl2] = useState<string | null>(null);
  const addressSearchFunctionRef = useRef<((address: string) => void) | null>(
    null
  );

  // Initialize URL values from global form on mount
  useEffect(() => {
    const brochurePdf = globalForm.getValues("stepEight.brochure_pdf");
    const faqPdf = globalForm.getValues("stepEight.faq_pdf");
    const brochurePdf2 = globalForm.getValues("stepEight.brochure_pdf_2");
    // Check if values are string URLs
    if (typeof brochurePdf === "string" && brochurePdf) {
      setBrochurePdfUrl(brochurePdf);
    } else if (brochurePdf instanceof File) {
      // This case should ideally not happen if brochure_pdf is always a string URL
      // but as a fallback, we can set it to null if it's a File object
      setBrochurePdfUrl(null);
    }

    if (typeof faqPdf === "string" && faqPdf) {
      setFaqPdfUrl(faqPdf);
    } else if (faqPdf instanceof File) {
      // This case should ideally not happen if faq_pdf is always a string URL
      // but as a fallback, we can set it to null if it's a File object
      setFaqPdfUrl(null);
    }

    if (typeof brochurePdf2 === "string" && brochurePdf2) {
      setBrochurePdfUrl2(brochurePdf2);
    } else if (brochurePdf2 instanceof File) {
      setBrochurePdfUrl2(null);
    }
  }, [globalForm]);

  // Initialize location, price and downloads structure for preview
  useEffect(() => {
    // Get the address from Step 1 to prefill the event address
    const getStepOneAddress = () => {
      const stepOneData = globalForm.getValues("stepOne");
      return stepOneData?.address || "";
    };

    // Set initial preview data
    const currentStepEight = globalForm.getValues("stepEight") || {};
    const stepOneAddress = getStepOneAddress();

    // If event_address is empty but we have a Step 1 address, prefill it
    if (!currentStepEight.event_address && stepOneAddress) {
      form.setValue("event_address", stepOneAddress);
      globalForm.setValue("stepEight.event_address", stepOneAddress);
    }

    globalForm.setValue("stepEight", {
      ...currentStepEight,
      location: {
        title: "LOCATION",
        description: form.getValues("event_address") || stepOneAddress || "",
        icon: "MapPin",
      },
      // Set initial price data if available
      ...(form.getValues("price_start_from")
        ? {
            price: {
              title: "PRICES FROM",
              description: `£${form.getValues("price_start_from")} PP exc VAT`,
              link: "#",
              icon: "Tag",
              price_title:
                form.getValues("price_start_from_button_text") || "Book Now",
            },
          }
        : {}),
      // Initialize downloads array if needed
      downloads: currentStepEight.downloads || [],
    });
  }, [form, globalForm]);

  // Generic function to handle PDF uploads to downloads array
  const handlePdfUploadToDownloads = (
    file: File | null,
    title: string,
    id: number,
    localFieldName: "brochure_pdf" | "brochure_pdf_2" | "faq_pdf",
    urlSetter: (url: string | null) => void,
    removalFlagName:
      | "remove_brochure_pdf"
      | "remove_brochure_pdf_2"
      | "remove_faq_pdf"
  ) => {
    // Check if file is PDF
    if (file && file.type !== "application/pdf") {
      toast.error("Only PDF files are allowed");
      return;
    }

    form.setValue(localFieldName, file || null);

    // Update global form downloads array
    const currentStepEight = globalForm.getValues("stepEight") || {};
    const downloads = currentStepEight.downloads || [];

    if (file) {
      // When new file is uploaded, clear the URL
      urlSetter(null);
      // Clear removal flag when new file is uploaded
      form.setValue(removalFlagName, false);
      globalForm.setValue(`stepEight.${removalFlagName}`, false);

      // Add or update PDF in downloads array
      const existingIndex = downloads.findIndex((d) => d.title === title);

      if (existingIndex >= 0) {
        downloads[existingIndex] = {
          ...downloads[existingIndex],
          title,
          pdf: file,
          id,
          download_link: ["#"],
        };
      } else {
        downloads.push({
          id,
          title,
          pdf: file,
          download_link: ["#"],
        });
      }
    } else {
      // Remove PDF if file is null
      urlSetter(null);
      // Set removal flag when file is removed
      form.setValue(removalFlagName, true);
      globalForm.setValue(`stepEight.${removalFlagName}`, true);

      const filteredDownloads = downloads.filter((d) => d.title !== title);
      globalForm.setValue("stepEight", {
        ...currentStepEight,
        downloads: filteredDownloads,
      });
      return;
    }

    globalForm.setValue("stepEight", {
      ...currentStepEight,
      downloads,
    });

    // Manually trigger validation
    form.trigger(localFieldName);
  };

  // Handle file upload for main brochure PDF
  const handleBrochureUpload = (file: File | null) => {
    handlePdfUploadToDownloads(
      file,
      "Brochure",
      1,
      "brochure_pdf",
      setBrochurePdfUrl,
      "remove_brochure_pdf"
    );
  };

  // Handle file upload for Event Flyer PDF
  const handleBrochureUpload2 = (file: File | null) => {
    handlePdfUploadToDownloads(
      file,
      "Event Flyer",
      3,
      "brochure_pdf_2",
      setBrochurePdfUrl2,
      "remove_brochure_pdf_2"
    );
  };

  // Handle file upload for FAQ PDF
  const handleFaqUpload = (file: File | null) => {
    handlePdfUploadToDownloads(
      file,
      "Frequently Asked Questions",
      2,
      "faq_pdf",
      setFaqPdfUrl,
      "remove_faq_pdf"
    );
  };

  const handleSubmit = async (data: StepEightType) => {
    setLoading(true);
    try {
      // Check for required fields manually before submission
      const missingFields = [];

      if (!data.brochure_pdf && !brochurePdfUrl) {
        missingFields.push("Brochure PDF");
      }

      if (!data.event_address || data.event_address.trim() === "") {
        missingFields.push("Event Address");
      }

      if (!data.price_start_from || data.price_start_from.trim() === "") {
        missingFields.push("Starting Price");
      }

      if (missingFields.length > 0) {
        toast.error(
          `Please fill in the required fields: ${missingFields.join(", ")}`
        );
        setLoading(false);
        return;
      }

      // First ensure the preview data is properly formatted
      const formattedData = {
        ...data,
        location: {
          title: "LOCATION",
          description: data.event_address || "",
          icon: "MapPin",
        },
        price: {
          title: "PRICES FROM",
          description: data.price_start_from
            ? `£${data.price_start_from} PP exc VAT`
            : "",
          link: "#",
          icon: "Tag",
          price_title: data.price_start_from_button_text || "Book Now",
        },
      };

      // Update global form with formatted data
      globalForm.setValue("stepEight", formattedData);

      // Validate the form using schema validation only
      const isSchemaValid = await form.trigger();

      if (!isSchemaValid) {
        const errors = form.formState.errors;
        // Display schema validation errors
        const errorFields = Object.keys(errors);
        toast.error(
          `Please correct the highlighted fields: ${errorFields.join(", ")}`
        );
        setLoading(false);
        return;
      }

      try {
        // Use the onboardingService
        const response = await onboardingService.storeStepEightData(data);

        if (response?.status) {
          // INSTANT TRANSITION: Set active step FIRST for smooth UX
          setActiveStep(9);

          // Then handle async operations in background
          Promise.all([updateSession({ on_boarding_step: 9 }), save()]).catch(
            (error) => {
              console.error("Background save error:", error);
            }
          );
        } else {
          console.error("API Error:", response);
          if (response.errors) {
            // Format and display validation errors
            Object.entries(response.errors)
              .map(([field, errors]) => {
                if (Array.isArray(errors)) {
                  return `${field}: ${errors.join(", ")}`;
                }
                return `${field}: ${errors}`;
              })
              .join("\n");
          }
        }
      } catch (apiError) {
        console.error("API call failed:", apiError);
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
      <div className="w-full max-w-4xl mx-auto relative">
        <OnboardingCard className="w-full mx-auto shadow-sm mb-16">
          <CardHeader className="pb-2 pt-4">
            <OnboardingTitle>
              Check Out The Latest Dates To Be Released,
            </OnboardingTitle>
            <p className="text-lg mt-2">
              But Get In Quick As These Dates Will Soon Go!!
            </p>
          </CardHeader>

          <CardContent className="px-6 py-2 pb-8">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-6"
              >
                <input type="hidden" {...form.register("step")} />
                <input
                  type="hidden"
                  {...form.register("event_id", {
                    setValueAs: (value) => Number(value),
                  })}
                />

                {/* Brochure Section */}
                <section className="w-full mb-4">
                  <OnboardingSectionTitle className="text-xl font-medium">
                    Add More Information
                  </OnboardingSectionTitle>

                  <div className="space-y-6 border border-white/10 p-6 rounded-md bg-white mt-4">
                    <FormField
                      control={form.control}
                      name="brochure_pdf"
                      render={() => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Event Brochure PDF{" "}
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
                                      <path
                                        d="M20 2V8H26L20 2Z"
                                        fill="#FF8A80"
                                      />
                                      <path
                                        d="M14 16H18V18H14V16Z"
                                        fill="white"
                                      />
                                      <path
                                        d="M14 20H18V22H14V20Z"
                                        fill="white"
                                      />
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
                                      form.setValue(
                                        "remove_brochure_pdf",
                                        true
                                      );
                                      globalForm.setValue(
                                        "stepEight.remove_brochure_pdf",
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
                                control={form.control}
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
                                    onFocus={() =>
                                      handleFieldFocus("brochure_pdf")
                                    }
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
                      control={form.control}
                      name="brochure_pdf_2"
                      render={() => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Event Flyer PDF (Optional)
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
                                      <path
                                        d="M20 2V8H26L20 2Z"
                                        fill="#FF8A80"
                                      />
                                      <path
                                        d="M14 16H18V18H14V16Z"
                                        fill="white"
                                      />
                                      <path
                                        d="M14 20H18V22H14V20Z"
                                        fill="white"
                                      />
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
                                      form.setValue(
                                        "remove_brochure_pdf_2",
                                        true
                                      );
                                      globalForm.setValue(
                                        "stepEight.remove_brochure_pdf_2",
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
                                control={form.control}
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
                                    onFocus={() =>
                                      handleFieldFocus("brochure_pdf_2")
                                    }
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
                      control={form.control}
                      name="faq_pdf"
                      render={() => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            FAQ PDF (Optional)
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
                                      <path
                                        d="M20 2V8H26L20 2Z"
                                        fill="#90CAF9"
                                      />
                                      <path
                                        d="M14 13H18V15H14V13Z"
                                        fill="white"
                                      />
                                      <path
                                        d="M14 17H18V19H14V17Z"
                                        fill="white"
                                      />
                                      <path
                                        d="M14 21H18V23H14V21Z"
                                        fill="white"
                                      />
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
                                        "stepEight.remove_faq_pdf",
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
                                control={form.control}
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
                                    onFocus={() => handleFieldFocus("faq_pdf")}
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
                </section>

                <section className="w-full mb-4">
                  <OnboardingSectionTitle className="text-xl font-medium">
                    Event Location
                  </OnboardingSectionTitle>

                  <div className="space-y-4 border border-white/10 p-6 rounded-md bg-white">
                    <FormField
                      control={form.control}
                      name="event_address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Event Address (exact location)
                          </FormLabel>
                          <FormControl>
                            <AddressAutocomplete
                              value={field.value}
                              onChange={(address) => {
                                field.onChange(address);
                                // Update location for preview
                                const currentStepEight =
                                  globalForm.getValues("stepEight") || {};
                                globalForm.setValue("stepEight", {
                                  ...currentStepEight,
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
                                const currentStepEight =
                                  globalForm.getValues("stepEight") || {};
                                globalForm.setValue("stepEight", {
                                  ...currentStepEight,
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
                              autoFocus={activeField === "event_address"}
                              placeholder="Type to search for a UK address or location..."
                              className="w-full"
                            />
                          </FormControl>
                          <p className="text-xs text-blue-600 mt-1 font-medium">
                            ⓘ Search for UK addresses or use the map below to
                            set exact location
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
                        const currentStepEight =
                          globalForm.getValues("stepEight") || {};
                        globalForm.setValue("stepEight", {
                          ...currentStepEight,
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

                    {/* Location Status Indicator */}
                  </div>
                </section>

                {/* Price Section */}
                <section className="w-full mb-4">
                  <OnboardingSectionTitle className="text-xl font-medium">
                    Price Information
                  </OnboardingSectionTitle>

                  <div className="space-y-4 border border-white/10 p-6 rounded-md bg-white mt-4">
                    <FormField
                      control={form.control}
                      name="price_start_from"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Prices Start From{" "}
                            <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="e.g. 50"
                              type="number"
                              className="h-10 bg-white/5 border-white/10"
                              min="0"
                              max="999999"
                              maxLength={10}
                              onChange={(e) => {
                                field.onChange(e);
                                // Update price for preview
                                const currentStepEight =
                                  globalForm.getValues("stepEight") || {};
                                globalForm.setValue("stepEight", {
                                  ...currentStepEight,
                                  price_start_from: e.target.value,
                                  price: {
                                    title: "PRICES FROM",
                                    description: `£${e.target.value} PP exc VAT`,
                                    link: "#",
                                    icon: "Tag",
                                    price_title:
                                      form.getValues(
                                        "price_start_from_button_text"
                                      ) || "Book Now",
                                  },
                                });
                              }}
                              onFocus={() =>
                                handleFieldFocus("price_start_from")
                              }
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
                      control={form.control}
                      name="price_start_from_button_text"
                      render={({ field }) => {
                        const currentLength = field.value?.length || 0;
                        const maxLength = 18;
                        return (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">
                              Button Text
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="e.g. Book Now"
                                className="h-10 bg-white/5 border-white/10"
                                maxLength={maxLength}
                                onChange={(e) => {
                                  field.onChange(e);
                                  const currentStepEight =
                                    globalForm.getValues("stepEight") || {};
                                  const currentPrice =
                                    currentStepEight.price || {};
                                  globalForm.setValue("stepEight", {
                                    ...currentStepEight,
                                    price_start_from_button_text:
                                      e.target.value,
                                    price: {
                                      ...currentPrice,
                                      price_title: e.target.value,
                                    },
                                  });
                                }}
                                onFocus={() =>
                                  handleFieldFocus(
                                    "price_start_from_button_text"
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
                  </div>
                </section>

                <div className="flex items-center justify-center gap-4 pt-4">
                  <Button
                    variant="event-primary"
                    type="submit"
                    className="rounded-full px-8 py-2 text-white"
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Save & Next"}
                  </Button>
                  <Button
                    variant="event-secondary"
                    type="button"
                    onClick={() => setActiveStep(9)}
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
