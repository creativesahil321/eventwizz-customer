"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { FileUploader } from "@/components/ui/file-uploader";
import { TiptapEditor } from "@/components/ui/tiptap-editor";
import { Plus, X, AlertCircle } from "lucide-react";
import { useEventCategories } from "@/services/vendor/events/query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useEventFormContext } from "../../events-form-provider";
import { StepOneType, stepOneSchema } from "../schema";
import { eventsService } from "@/services/vendor/events/events.service";
import { useRouter } from "next/navigation";
import { addCacheBusting } from "@/lib/image-utils";

export default function EventNameTab() {
  // No need to use session update as we get data from API
  const router = useRouter();
  // Access the GLOBAL form context
  const {
    form: globalForm,
    save,
    isLoading: globalLoading,
    setActiveField,
  } = useEventFormContext();

  // Get event categories
  const { data: eventCategories, isLoading: isEventCategoriesLoading } =
    useEventCategories();

  // State for banner files and uploads
  const [bannerType, setBannerType] = useState<"image" | "video">("image");
  const [bannerImageFile, setBannerImageFile] = useState<File[]>([]);
  const [bannerVideoFile, setBannerVideoFile] = useState<File[]>([]);
  const [bannerImageUploading, setBannerImageUploading] = useState(false);
  const [bannerVideoUploading, setBannerVideoUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [eventSchedularBackgroundImage, setEventSchedularBackgroundImage] =
    useState<File[] | null>(null);
  const [schedulerValidationErrors, setSchedulerValidationErrors] = useState<{
    [key: string]: string;
  }>({});

  // URL strings from backend for existing videos/images
  const [bannerImageUrl, setBannerImageUrl] = useState<string>("");
  const [bannerVideoUrl, setBannerVideoUrl] = useState<string>("");

  // Initialize form with combined step data
  const stepOneDefaults = globalForm.getValues().stepOne;
  const { data: session } = useSession();
  const vendorLocationId = (() => {
    const sessionLocationId = session?.user?.vendor_location_id;
    const parsedId = sessionLocationId ? parseInt(sessionLocationId, 10) : 0;
    const globalFormId = globalForm.getValues("stepOne.vendor_location_id");
    const validId =
      !isNaN(parsedId) && parsedId > 0 ? parsedId : globalFormId || 0;
    return Number(validId);
  })();

  // Setup form with the new schema structure
  const form = useForm<StepOneType>({
    resolver: zodResolver(stepOneSchema),
    defaultValues: {
      step: 1,
      vendor_location_id: vendorLocationId,
      event_category_id: stepOneDefaults?.event_category_id || undefined,
      event_name: stepOneDefaults?.event_name || "",
      event_banner_image: stepOneDefaults?.event_banner_image,
      event_banner_video: stepOneDefaults?.event_banner_video,
      event_banner_heading: stepOneDefaults?.event_banner_heading || "",
      event_banner_sub_heading: stepOneDefaults?.event_banner_sub_heading || "",
      about_event_heading: stepOneDefaults?.about_event_heading || "",
      about_event_sub_heading: stepOneDefaults?.about_event_sub_heading || "",
      about_event_description: stepOneDefaults?.about_event_description || "",
      event_schedular_title: stepOneDefaults?.event_schedular_title || "",
      event_schedular: stepOneDefaults?.event_schedular || [
        { title: "", time: "" },
      ],
      event_schedular_background_image:
        stepOneDefaults?.event_schedular_background_image,
      remove_event_banner_image: false,
      remove_event_banner_video: false,
    } as StepOneType,
    mode: "onChange",
  });

  // Update form when vendor_location_id changes
  useEffect(() => {
    form.setValue("vendor_location_id", vendorLocationId);
  }, [vendorLocationId, form]);

  // Initialize banner image and video from existing data
  useEffect(() => {
    const bannerImage = form.watch("event_banner_image");
    const bannerVideo = form.watch("event_banner_video");

    // Handle banner image
    if (bannerImage) {
      if (typeof bannerImage === "string" && bannerImage) {
        // If it's a URL string, set the banner type to image
        setBannerImageUrl(bannerImage);
        setBannerType("image");
        console.log("Existing image URL detected:", bannerImage);
      } else if (bannerImage instanceof File) {
        // If it's already a File object
        setBannerImageFile([bannerImage]);
        setBannerImageUrl(""); // Clear URL when using File
        setBannerType("image");
        console.log("Existing image File detected:", bannerImage);
      }
    } else {
      setBannerImageUrl("");
    }

    // Handle banner video
    if (bannerVideo) {
      if (typeof bannerVideo === "string" && bannerVideo) {
        // If it's a URL string
        setBannerVideoUrl(bannerVideo);
        setBannerType("video");
        console.log("Existing video URL detected:", bannerVideo);
      } else if (bannerVideo instanceof File) {
        // If it's already a File object
        setBannerVideoFile([bannerVideo]);
        setBannerVideoUrl(""); // Clear URL when using File
        setBannerType("video");
        console.log("Existing video File detected:", bannerVideo);
      }
    } else {
      setBannerVideoUrl("");
    }

    // Handle event scheduler background image
    const eventSchedularBackgroundImage = form.watch(
      "event_schedular_background_image"
    );
    if (eventSchedularBackgroundImage) {
      if (typeof eventSchedularBackgroundImage === "string") {
        // Don't set as File if it's a URL
        setEventSchedularBackgroundImage(null);
      } else {
        setEventSchedularBackgroundImage([
          eventSchedularBackgroundImage as unknown as File,
        ]);
      }
    } else {
      setEventSchedularBackgroundImage(null);
    }
  }, [form]);

  // Cleanup object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      bannerVideoFile.forEach((file) => {
        if (file instanceof File) {
          URL.revokeObjectURL(URL.createObjectURL(file));
        }
      });
    };
  }, [bannerVideoFile]);

  // Validation helper function for time sequence
  const validateTimeSequence = useCallback(
    (schedules: Array<{ title: string; time: string }>): boolean => {
      if (schedules.length <= 1) return true;

      const validSchedules = schedules.filter(
        (schedule) => schedule.time && schedule.title
      );
      if (validSchedules.length <= 1) return true;

      for (let i = 0; i < validSchedules.length - 1; i++) {
        const currentTime = validSchedules[i].time;
        const nextTime = validSchedules[i + 1].time;

        if (!currentTime || !nextTime) continue;

        const [currentHours, currentMinutes] = currentTime
          .split(":")
          .map(Number);
        const [nextHours, nextMinutes] = nextTime.split(":").map(Number);

        const currentTotalMinutes = currentHours * 60 + currentMinutes;
        const nextTotalMinutes = nextHours * 60 + nextMinutes;

        if (nextTotalMinutes <= currentTotalMinutes) {
          return false;
        }
      }

      return true;
    },
    []
  );

  // Debounced validation and global form update
  const validateAndUpdateScheduler = useCallback(
    (schedulers: Array<{ title: string; time: string }>) => {
      // Validate the scheduler
      const errors: { [key: string]: string } = {};
      if (!validateTimeSequence(schedulers)) {
        errors.sequence = "Times must be in ascending order";
      }
      setSchedulerValidationErrors(errors);

      // Update global form (debounced)
      const currentStepOne = globalForm.getValues().stepOne || {};
      globalForm.setValue("stepOne", {
        ...currentStepOne,
        event_schedular: schedulers,
      });
    },
    [globalForm, validateTimeSequence]
  );

  // Debounce timer ref
  const validationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced validation function
  const debouncedValidate = useCallback(
    (schedulers: Array<{ title: string; time: string }>) => {
      if (validationTimerRef.current) {
        clearTimeout(validationTimerRef.current);
      }
      validationTimerRef.current = setTimeout(() => {
        validateAndUpdateScheduler(schedulers);
      }, 300); // 300ms debounce
    },
    [validateAndUpdateScheduler]
  );

  // Field array for scheduler items
  const {
    fields: schedulerFields,
    append,
    remove,
  } = useFieldArray({
    control: form.control,
    name: "event_schedular",
  });

  // Validate scheduler on mount and when scheduler changes
  useEffect(() => {
    const currentSchedulers = form.getValues("event_schedular") || [];
    if (currentSchedulers.length > 0) {
      validateAndUpdateScheduler(currentSchedulers);
    }
  }, [form, validateAndUpdateScheduler, schedulerFields.length]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (validationTimerRef.current) {
        clearTimeout(validationTimerRef.current);
      }
    };
  }, []);

  // Handle field focus for tracking active field
  const handleFieldFocus = useCallback(
    (fieldName: string) => {
      setActiveField?.(fieldName);
    },
    [setActiveField]
  );

  // Handle banner image change
  const handleBannerImageChange = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;

      setBannerImageFile(files);
      setBannerImageUrl(""); // Clear URL when new file is uploaded
      setBannerImageUploading(true);

      try {
        // Update local form
        form.setValue("event_banner_image", files[0]);

        // Sync to global form
        const currentStepOne = globalForm.getValues().stepOne || {};
        globalForm.setValue("stepOne", {
          ...currentStepOne,
          event_banner_image: files[0],
          remove_event_banner_image: false,
          remove_event_banner_video: false,
        });

        // Clear removal flags when new file is uploaded
        form.setValue("remove_event_banner_image", false);
        form.setValue("remove_event_banner_video", false);

        // Switch to image mode
        setBannerType("image");

        // Clear video when image is uploaded
        setBannerVideoFile([]);
        setBannerVideoUrl(""); // Clear video URL too
        form.setValue("event_banner_video", undefined);
      } catch (error) {
        console.error("Error handling banner image:", error);
      } finally {
        setBannerImageUploading(false);
      }
    },
    [form, globalForm]
  );

  // Handle banner video change
  const handleBannerVideoChange = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      // Prevent duplicate validation calls
      if (bannerVideoUploading) return;

      setBannerVideoUploading(true);

      try {
        const file = files[0];

        // Validate video compatibility
        const { validateVideo } = await import("@/utils/video-validator");
        const validation = await validateVideo(file, 10);

        if (!validation.isValid) {
          toast.error(validation.errors.join(". ") || "Invalid video file", {
            description:
              "Please upload an MP4 video with H.264 codec for best compatibility.",
          });
          setBannerVideoUploading(false);
          return;
        }

        // Show warnings if any (e.g., HEVC detected)
        if (validation.warnings.length > 0) {
          toast.warning("Video compatibility warning", {
            description: validation.warnings[0],
          });
        }

        setBannerVideoFile(files);
        setBannerVideoUrl(""); // Clear URL when new file is uploaded

        // Update local form
        form.setValue("event_banner_video", file);
        console.log("Video uploaded, form values:", form.getValues());

        // Clear removal flags when new file is uploaded
        form.setValue("remove_event_banner_image", false);
        form.setValue("remove_event_banner_video", false);

        // Update global form
        const currentStepOne = globalForm.getValues().stepOne || {};
        globalForm.setValue("stepOne", {
          ...currentStepOne,
          event_banner_video: file,
          remove_event_banner_image: false,
          remove_event_banner_video: false,
        });

        // Switch to video mode
        setBannerType("video");

        // Clear image when video is uploaded
        setBannerImageFile([]);
        setBannerImageUrl(""); // Clear image URL too
        form.setValue("event_banner_image", undefined);
        globalForm.setValue("stepOne.event_banner_image", undefined);

        // Success toast will be shown by axios interceptor when form is saved
      } catch (error) {
        console.error("Error handling banner video:", error);
        toast.error("Failed to process video", {
          description:
            "Please ensure the video is in MP4 format with H.264 codec.",
        });
      } finally {
        setBannerVideoUploading(false);
      }
    },
    [form, globalForm]
  );

  // Handle banner image removal
  const handleRemoveBannerImage = useCallback(() => {
    setBannerImageFile([]);
    setBannerImageUrl(""); // Clear URL too
    form.setValue("event_banner_image", undefined);
    form.setValue("remove_event_banner_image", true);

    // Update global form
    const currentStepOne = globalForm.getValues().stepOne || {};
    globalForm.setValue("stepOne", {
      ...currentStepOne,
      event_banner_image: undefined,
      remove_event_banner_image: true,
    });
  }, [form, globalForm]);

  // Handle banner video removal
  const handleRemoveBannerVideo = useCallback(() => {
    setBannerVideoFile([]);
    setBannerVideoUrl(""); // Clear URL too
    form.setValue("event_banner_video", undefined);
    form.setValue("remove_event_banner_video", true);
    setBannerType("image");

    // Update global form
    const currentStepOne = globalForm.getValues().stepOne || {};
    globalForm.setValue("stepOne", {
      ...currentStepOne,
      event_banner_video: undefined,
      remove_event_banner_video: true,
    });
  }, [form, globalForm]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (data: StepOneType) => {
      setIsLoading(true);

      try {
        // Manually re-trigger validation on all fields to force error display
        console.log("Form values before validation:", form.getValues());
        const isValid = await form.trigger();

        // If form is not valid, only highlight fields - no toast
        if (!isValid) {
          // Get all validation errors
          const errors = form.formState.errors;
          const errorFields = Object.keys(errors);

          // Check if banner image/video validation failed
          if (errors.event_banner_image) {
            const errorMessage =
              typeof errors.event_banner_image === "object" &&
              "message" in errors.event_banner_image
                ? String(errors.event_banner_image.message)
                : "Please upload either a banner image or video for your event.";
            toast.error("Banner required", {
              description: errorMessage,
              duration: 5000,
            });
            // Scroll to banner section
            const bannerSection =
              document
                .querySelector('[name="event_banner_image"]')
                ?.closest(".space-y-6") ||
              document.querySelector("[data-banner-section]");
            if (bannerSection) {
              bannerSection.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
            }
            setIsLoading(false);
            return;
          }

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

        // Validate event scheduler times
        if (data.event_schedular && data.event_schedular.length > 0) {
          // Check for sequence
          const validSchedules = data.event_schedular.filter(
            (schedule) => schedule.time && schedule.title
          );
          for (let i = 0; i < validSchedules.length - 1; i++) {
            const currentTime = validSchedules[i].time;
            const nextTime = validSchedules[i + 1].time;

            if (!currentTime || !nextTime) continue;

            const [currentHours, currentMinutes] = currentTime
              .split(":")
              .map(Number);
            const [nextHours, nextMinutes] = nextTime.split(":").map(Number);

            const currentTotalMinutes = currentHours * 60 + currentMinutes;
            const nextTotalMinutes = nextHours * 60 + nextMinutes;

            if (nextTotalMinutes <= currentTotalMinutes) {
              toast.error("Event times must be in ascending order.", {
                description:
                  "Please arrange the times from earliest to latest.",
                duration: 5000,
              });
              setIsLoading(false);
              return;
            }
          }
        }

        // Continue with valid data - don't include vendor_location_id as it's sent in headers
        const formData = {
          ...data,
          // Include video field if it exists
          ...(form.getValues("event_banner_video") && {
            event_banner_video: form.getValues("event_banner_video"),
          }),
        };

        // SAFETY CHECK: Ensure banner image is included if we have it in state
        if (bannerImageFile.length > 0 && !formData.event_banner_image) {
          formData.event_banner_image = bannerImageFile[0];
        }

        // SAFETY CHECK: Ensure scheduler background image is included if we have it in state
        if (
          eventSchedularBackgroundImage &&
          eventSchedularBackgroundImage.length > 0 &&
          !formData.event_schedular_background_image
        ) {
          formData.event_schedular_background_image =
            eventSchedularBackgroundImage[0];
        }

        // Update global form with all fields
        globalForm.setValue("stepOne", {
          ...globalForm.getValues().stepOne,
          ...formData,
        });

        // Save data using the global save function
        await save();

        // Update global form
        globalForm.setValue("stepOne", formData);

        // Check if we already have an event_id from the URL route
        const pathname = window.location.pathname;
        let eventIdFromUrl;

        // Handle both URL patterns: /vendor/events/{id} and /vendor/events/create/{id}
        if (pathname.includes("/events/create/")) {
          eventIdFromUrl = pathname.split("/events/create/")[1];
        } else if (pathname.includes("/events/")) {
          const segment = pathname.split("/events/")[1];
          // Make sure we don't get "create" as an ID
          eventIdFromUrl = segment !== "create" ? segment : undefined;
        }

        // Fallback to form data if URL doesn't contain event ID
        const eventIdFromGlobalForm =
          globalForm.getValues().stepOne &&
          typeof (globalForm.getValues().stepOne as Record<string, unknown>)
            .event_id === "number"
            ? String(
                (globalForm.getValues().stepOne as Record<string, unknown>)
                  .event_id
              )
            : undefined;

        const existingEventId = eventIdFromUrl || eventIdFromGlobalForm;
        let response;

        if (existingEventId) {
          // We already have an event_id, so use update API
          const formDataWithId = {
            ...formData,
            event_id: Number(existingEventId),
          };

          // Update the global form with the event_id too
          globalForm.setValue("stepOne", {
            ...(globalForm.getValues().stepOne as StepOneType),
            event_id: Number(existingEventId),
          } as StepOneType);

          response = await eventsService.updateStepOneData(
            formDataWithId,
            existingEventId.toString()
          );
          console.log("Update response:", response);
        } else {
          // First time creating event, use create API
          response = await eventsService.storeStepOneData(formData);
          console.log("Create response:", response);
        }

        if (response && response.status) {
          // Type assertion to handle the response data structure
          // The API response can have different formats
          let eventId;

          // For update responses, we can use the existing event ID
          if (existingEventId) {
            eventId = Number(existingEventId);
          }
          // For create responses, extract from the response
          else if (response.data) {
            // Try to handle different response formats
            if (Array.isArray(response.data)) {
              // If it's an array, we can't extract an ID directly
              console.log(
                "Response data is an array, can't extract ID directly"
              );

              // Try to get event_id from URL
              const pathname = window.location.pathname;
              const matches = pathname.match(/\/events\/(\d+)/);
              if (matches && matches[1]) {
                eventId = Number(matches[1]);
                console.log("Extracted event ID from URL:", eventId);
              }
            } else {
              // Handle object response
              const responseData = response.data as Record<string, unknown>;

              // Check for common patterns
              if ("id" in responseData && responseData.id) {
                eventId = responseData.id as number;
                console.log("Found ID directly in response.data:", eventId);
              } else if ("event_id" in responseData && responseData.event_id) {
                eventId = responseData.event_id as number;
                console.log("Found event_id in response.data:", eventId);
              } else if (
                "data" in responseData &&
                responseData.data &&
                typeof responseData.data === "object" &&
                responseData.data !== null
              ) {
                const nestedData = responseData.data as Record<string, unknown>;
                if ("id" in nestedData && nestedData.id) {
                  eventId = nestedData.id as number;
                  console.log("Found ID in response.data.data:", eventId);
                } else if ("event_id" in nestedData && nestedData.event_id) {
                  eventId = nestedData.event_id as number;
                  console.log("Found event_id in response.data.data:", eventId);
                }
              }
            }
          }

          // Final fallback: try to get event ID from URL if we still don't have it
          if (!eventId) {
            // Try to extract from the current URL if we're already on an event page
            const pathname = window.location.pathname;
            const matches = pathname.match(/\/events\/(\d+)/);
            if (matches && matches[1]) {
              eventId = Number(matches[1]);
              console.log(
                "Last resort: Extracted event ID from current URL:",
                eventId
              );
            }
          }

          if (eventId) {
            // Only redirect if this is a new event
            // Success message is handled by axios interceptor
            if (!existingEventId) {
              router.push(`/vendor/events/${eventId}`);
            }
          } else {
            console.error("No event_id in response:", response);
            // Error handling - interceptor will handle API errors
            // Only show error if response doesn't indicate success
            if (
              !response.message ||
              !response.message.toLowerCase().includes("success")
            ) {
              toast.error("No event ID received from server");
            }
          }
        } else {
          // Handle API errors
          const errorMessage =
            response?.message || "Failed to create event. Please try again.";
          toast.error("Error creating event", {
            description: errorMessage,
          });
        }
      } catch (error) {
        console.error("Error saving event details:", error);
        toast.error("Failed to save event details");
      } finally {
        setIsLoading(false);
      }
    },
    [
      globalForm,
      save,
      form,
      setActiveField,
      router,
      bannerImageFile,
      eventSchedularBackgroundImage,
    ]
  );

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      <Form {...form}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.trigger().then((valid) => {
              if (valid) {
                form.handleSubmit(handleSubmit)(e);
              }
              // No toast error - let the form display validation errors natively
            });
          }}
          className="space-y-4 sm:space-y-6"
          noValidate
          autoComplete="off"
        >
          <div className="space-y-4 sm:space-y-6">
            {/* Event Details Section */}
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center gap-3 title-header">
                <h2 className="text-xl font-bold">Event Details</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <FormField
                  control={form.control}
                  name="event_name"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel className="text-sm font-medium">
                        Event Name <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter your event name"
                          className="h-11 bg-[#F9FAFB] border-[#E5E7EB] w-full"
                          onFocus={() => handleFieldFocus("event_name")}
                          onChange={(e) => {
                            field.onChange(e);
                            globalForm.setValue(
                              "stepOne.event_name",
                              e.target.value
                            );
                          }}
                          onBlur={field.onBlur} // Important for onBlur validation
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="event_category_id"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel className="text-sm font-medium">
                        Event Category <span className="text-red-500">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(Number(value));
                          globalForm.setValue(
                            "stepOne.event_category_id",
                            Number(value)
                          );
                        }}
                        value={field.value ? field.value.toString() : undefined}
                        disabled={isEventCategoriesLoading}
                        onOpenChange={() => field.onBlur()} // Trigger validation when dropdown closes
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 bg-[#F9FAFB] border-[#E5E7EB] w-full">
                            <SelectValue placeholder="Select event category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {eventCategories?.data?.map(
                            (category: { id: number; name: string }) => (
                              <SelectItem
                                key={category.id}
                                value={category.id.toString()}
                              >
                                {category.name}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4" data-banner-section>
                <h3 className="text-lg font-semibold title-header">
                  Add a Cover Photo or Video
                </h3>

                {/* Show validation error for banner image/video above tabs */}
                {(form.formState.errors.event_banner_image ||
                  form.formState.errors.event_banner_video) && (
                  <div className="rounded-md bg-red-50 p-3 border border-red-200">
                    <p className="text-sm text-red-600 font-medium">
                      {(() => {
                        const imageError =
                          form.formState.errors.event_banner_image;
                        const videoError =
                          form.formState.errors.event_banner_video;
                        const errorMsg =
                          (imageError &&
                          typeof imageError === "object" &&
                          "message" in imageError
                            ? String(imageError.message)
                            : null) ||
                          (videoError &&
                          typeof videoError === "object" &&
                          "message" in videoError
                            ? String(videoError.message)
                            : null) ||
                          "Either a banner image or video is required";
                        return errorMsg;
                      })()}
                    </p>
                  </div>
                )}

                <Tabs
                  value={bannerType}
                  onValueChange={(v) => setBannerType(v as "image" | "video")}
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="image">Image Banner</TabsTrigger>
                    <TabsTrigger value="video">Video Banner</TabsTrigger>
                  </TabsList>

                  <TabsContent value="image">
                    <FormField
                      control={form.control}
                      name="event_banner_image"
                      render={() => (
                        <FormItem>
                          <FormLabel>
                            Banner Image <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormDescription>
                            Upload a static image for your event banner
                            (recommended size: 1200 x 600px)
                          </FormDescription>
                          <FormControl>
                            <div>
                              {bannerImageUrl ? (
                                <div className="space-y-2">
                                  <img
                                    src={addCacheBusting(bannerImageUrl)}
                                    alt="Banner"
                                    width={400}
                                    height={200}
                                    className="max-h-60 object-contain mx-auto"
                                  />
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={handleRemoveBannerImage}
                                    className="mt-2"
                                  >
                                    Remove
                                  </Button>
                                </div>
                              ) : (
                                <FileUploader
                                  value={bannerImageFile}
                                  onValueChange={handleBannerImageChange}
                                  maxFileCount={1}
                                  maxSize={2 * 1024 * 1024} // 2MB
                                  disabled={bannerImageUploading}
                                  onRemove={handleRemoveBannerImage}
                                  accept={{
                                    "image/png": [".png"],
                                    "image/jpeg": [".jpg", ".jpeg"],
                                    "image/webp": [".webp"],
                                  }}
                                  enableCropping={true}
                                  aspectRatio={21 / 9}
                                  cropConfig={{
                                    maxSizeKB: 500,
                                    quality: 0.9,
                                    maxWidth: 1920,
                                    maxHeight: 823,
                                  }}
                                />
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  <TabsContent value="video">
                    <FormField
                      control={form.control}
                      name="event_banner_video"
                      render={() => (
                        <FormItem>
                          <FormLabel>
                            Banner Video <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormDescription>
                            Upload a video for your event banner (MP4 format,
                            max 10MB)
                          </FormDescription>
                          <FormControl>
                            <div className="space-y-4">
                              {bannerVideoUrl ? (
                                <div className="space-y-2">
                                  <video
                                    controls
                                    className="w-full h-auto max-h-[200px] object-contain bg-gray-100 rounded-lg"
                                  >
                                    <source
                                      src={bannerVideoUrl}
                                      type="video/mp4"
                                    />
                                    Your browser does not support the video tag.
                                  </video>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={handleRemoveBannerVideo}
                                    className="mt-2"
                                  >
                                    Remove Video
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <FileUploader
                                    value={bannerVideoFile}
                                    onValueChange={handleBannerVideoChange}
                                    maxFileCount={1}
                                    maxSize={10 * 1024 * 1024} // 10MB for banner video
                                    disabled={bannerVideoUploading}
                                    onRemove={handleRemoveBannerVideo}
                                    accept={{
                                      "video/mp4": [".mp4"],
                                      "video/webm": [".webm"],
                                      "video/ogg": [".ogv"],
                                      "video/quicktime": [".mov"],
                                      "video/x-msvideo": [".avi"],
                                      "video/x-matroska": [".mkv"],
                                    }}
                                  />
                                  {/* Video Preview for uploaded files */}
                                  {bannerVideoFile.length > 0 && (
                                    <div className="relative mt-4 rounded-lg overflow-hidden border">
                                      <video
                                        controls
                                        className="w-full h-auto max-h-[200px] object-contain bg-gray-100"
                                      >
                                        <source
                                          src={URL.createObjectURL(
                                            bannerVideoFile[0]
                                          )}
                                          type="video/mp4"
                                        />
                                        Your browser does not support the video
                                        tag.
                                      </video>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                </Tabs>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <FormField
                  control={form.control}
                  name="event_banner_heading"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Banner Heading <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter event title"
                          className="h-11 bg-[#F9FAFB] border-[#E5E7EB]"
                          onFocus={() =>
                            handleFieldFocus("event_banner_heading")
                          }
                          onChange={(e) => {
                            field.onChange(e);
                            globalForm.setValue(
                              "stepOne.event_banner_heading",
                              e.target.value
                            );
                          }}
                          onBlur={field.onBlur}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="event_banner_sub_heading"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Write banner Sub-heading{" "}
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter event subtitle"
                          className="h-11 bg-[#F9FAFB] border-[#E5E7EB]"
                          onFocus={() =>
                            handleFieldFocus("event_banner_sub_heading")
                          }
                          onChange={(e) => {
                            field.onChange(e);
                            globalForm.setValue(
                              "stepOne.event_banner_sub_heading",
                              e.target.value
                            );
                          }}
                          onBlur={field.onBlur}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Tell Guests What It's About Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 title-header">
                <h2 className="text-xl font-bold">
                  Tell Guests What It&apos;s About
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <FormField
                  control={form.control}
                  name="about_event_heading"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Title <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter about event heading"
                          className="h-11 bg-[#F9FAFB] border-[#E5E7EB]"
                          onFocus={() =>
                            handleFieldFocus("about_event_heading")
                          }
                          onChange={(e) => {
                            field.onChange(e);
                            globalForm.setValue(
                              "stepOne.about_event_heading",
                              e.target.value
                            );
                          }}
                          onBlur={field.onBlur}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="about_event_sub_heading"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Sub Title
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter about event sub-heading"
                          className="h-11 bg-[#F9FAFB] border-[#E5E7EB]"
                          onFocus={() =>
                            handleFieldFocus("about_event_sub_heading")
                          }
                          onChange={(e) => {
                            field.onChange(e);
                            globalForm.setValue(
                              "stepOne.about_event_sub_heading",
                              e.target.value
                            );
                          }}
                          onBlur={field.onBlur}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="about_event_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Description
                    </FormLabel>
                    <FormControl>
                      <TiptapEditor
                        value={field.value}
                        onChange={(value) => {
                          field.onChange(value);
                          globalForm.setValue(
                            "stepOne.about_event_description",
                            value
                          );
                        }}
                        placeholder="Write a compelling description..."
                        className="bg-gray-100 p-2 rounded-md"
                        maxLength={340}
                        maxWords={50}
                        showAIButton={true}
                        wrapText={true}
                        aiContext={{
                          event_name: form.watch("event_name"),
                          title: form.watch("about_event_heading"),
                          sub_title: form.watch("about_event_sub_heading"),
                          description: form.watch("about_event_description"),
                          ctaText: form.watch("about_event_sub_heading"),
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Event Scheduler Section */}
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center gap-3 title-header">
                <h2 className="text-xl font-bold">Event Schedule</h2>
              </div>

              <FormField
                control={form.control}
                name="event_schedular_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Event Scheduler Title
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g. Event Schedule"
                        className="h-11 bg-[#F9FAFB] border-[#E5E7EB]"
                        onFocus={() =>
                          handleFieldFocus("event_schedular_title")
                        }
                        onChange={(e) => {
                          field.onChange(e);
                          globalForm.setValue(
                            "stepOne.event_schedular_title",
                            e.target.value
                          );
                        }}
                        onBlur={field.onBlur}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="event_schedular_background_image"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Event Scheduler Background Image
                      </FormLabel>
                      <FormControl>
                        {typeof field.value === "string" && field.value ? (
                          <div className="relative w-full">
                            <img
                              src={addCacheBusting(field.value)}
                              alt="Scheduler Background"
                              width={400}
                              height={200}
                              className="max-h-60 object-contain mx-auto mb-2"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                field.onChange(null); // instead of undefined
                                setEventSchedularBackgroundImage(null);
                                globalForm.setValue(
                                  "stepOne.event_schedular_background_image",
                                  null
                                );
                              }}
                              className="mt-2"
                            >
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <FileUploader
                            value={eventSchedularBackgroundImage || []}
                            onValueChange={(files) => {
                              if (files.length > 0) {
                                setEventSchedularBackgroundImage(files);
                                field.onChange(files[0]);
                                globalForm.setValue(
                                  "stepOne.event_schedular_background_image",
                                  files[0]
                                );
                              }
                            }}
                            maxFileCount={1}
                            maxSize={2 * 1024 * 1024} // 2MB
                            onRemove={() => {
                              field.onChange(undefined);
                              setEventSchedularBackgroundImage(null);
                              globalForm.setValue(
                                "stepOne.event_schedular_background_image",
                                undefined
                              );
                            }}
                            accept={{
                              "image/png": [".png"],
                              "image/jpeg": [".jpg", ".jpeg"],
                              "image/webp": [".webp"],
                            }}
                            enableCropping={true}
                            aspectRatio={undefined}
                            cropConfig={{
                              maxSizeKB: 400,
                              quality: 0.9,
                              maxWidth: 1920,
                              maxHeight: 1920,
                            }}
                          />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="space-y-4">
                {/* Validation error for sequence */}
                {schedulerValidationErrors.sequence && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-600">
                      {schedulerValidationErrors.sequence}
                    </span>
                  </div>
                )}

                {schedulerFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="flex items-center justify-between gap-4 p-4 border border-[#E5E7EB] rounded-md bg-white"
                  >
                    <div className="flex-1">
                      <FormField
                        control={form.control}
                        name={`event_schedular.${index}.title`}
                        render={({ field: itemField }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                {...itemField}
                                placeholder="Event Title"
                                className="h-11 bg-[#F9FAFB] border-[#E5E7EB]"
                                onFocus={() =>
                                  handleFieldFocus("event_schedular")
                                }
                                onChange={(e) => {
                                  // Update form immediately for responsive typing
                                  itemField.onChange(e);

                                  // Debounce validation and global form update
                                  // Use setTimeout to ensure form state is updated first
                                  setTimeout(() => {
                                    const currentSchedulers =
                                      form.getValues("event_schedular") || [];
                                    debouncedValidate(currentSchedulers);
                                  }, 0);
                                }}
                                onBlur={itemField.onBlur}
                              />
                            </FormControl>
                            <FormMessage className="text-red-500 font-semibold mt-1" />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="flex-1">
                      <FormField
                        control={form.control}
                        name={`event_schedular.${index}.time`}
                        render={({ field: itemField }) => (
                          <FormItem>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  {...itemField}
                                  type="time"
                                  className="h-11 bg-[#F9FAFB] border-[#E5E7EB] pr-10"
                                  onFocus={() =>
                                    handleFieldFocus("event_schedular")
                                  }
                                  onChange={(e) => {
                                    // Update form immediately for responsive typing
                                    itemField.onChange(e.target.value);

                                    // Validate immediately for time fields (no debounce, but defer to ensure form state is updated)
                                    setTimeout(() => {
                                      const currentSchedulers =
                                        form.getValues("event_schedular") || [];
                                      validateAndUpdateScheduler(
                                        currentSchedulers
                                      );
                                    }, 0);
                                  }}
                                  onBlur={itemField.onBlur}
                                />
                              </div>
                            </FormControl>
                            <FormMessage className="text-red-500 font-semibold mt-1" />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        remove(index);
                        const updatedSchedulers = form
                          .getValues("event_schedular")
                          .filter((_, i) => i !== index);
                        const currentStepOne =
                          globalForm.getValues().stepOne || {};
                        globalForm.setValue("stepOne", {
                          ...currentStepOne,
                          event_schedular: updatedSchedulers,
                        });

                        // Re-validate after removal
                        const errors: { [key: string]: string } = {};
                        if (!validateTimeSequence(updatedSchedulers)) {
                          errors.sequence = "Times must be in ascending order";
                        }
                        setSchedulerValidationErrors(errors);
                      }}
                      disabled={schedulerFields.length === 1}
                      className="h-11 w-11 p-0 text-red-500 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const newItem = { title: "", time: "" };
                  append(newItem);
                  const updatedSchedulers = [
                    ...form.getValues("event_schedular"),
                    newItem,
                  ];
                  const currentStepOne = globalForm.getValues().stepOne || {};
                  globalForm.setValue("stepOne", {
                    ...currentStepOne,
                    event_schedular: updatedSchedulers,
                  });
                  handleFieldFocus("event_schedular");
                }}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Schedule
              </Button>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end mt-6">
              <Button
                type="submit"
                onClick={async () => {
                  // First trigger validation on all fields to show errors
                  const valid = await form.trigger();
                  if (!valid) {
                    const errors = form.formState.errors;
                    const errorFields = Object.keys(errors);

                    // Attempt to focus the first error field
                    if (errorFields.length > 0) {
                      const firstErrorElement = document.querySelector(
                        `[name="${errorFields[0]}"]`
                      );
                      if (firstErrorElement) {
                        (firstErrorElement as HTMLElement).focus();
                        firstErrorElement.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        });
                      }
                    }
                  } else {
                    form.handleSubmit(handleSubmit)();
                  }
                }}
                disabled={isLoading || globalLoading}
                variant="event-primary"
              >
                {isLoading || globalLoading ? "Saving..." : "Save & Next"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
