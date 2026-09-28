"use client";

import { LongTextInput } from "@/components/ui/long-text-input";
import {
  BANNER_HEADING_MAX_CHARS,
  BANNER_SUB_HEADING_MAX_CHARS,
} from "@/lib/hero-copy-limits";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import { Skeleton } from "@/components/ui/skeleton";
import { FileUploader } from "@/components/ui/file-uploader";
import { MAX_VIDEO_SIZE_BYTES, MAX_VIDEO_SIZE_MB } from "@/utils/video-validator";
import { TiptapEditor } from "@/components/ui/tiptap-editor";
import { AlertCircle } from "lucide-react";
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
import { useParams, useRouter } from "next/navigation";
import { addCacheBusting } from "@/lib/image-utils";
import {
  BANNER_HEADING_MAX_WORDS,
  countWords,
  truncateToMaxWordsForInput,
} from "@/lib/word-count";
import { mapGlobalStepOneToLocal } from "../../../_lib/map-global-step-to-local";
import {
  resolveWizardStepAfterSave,
  readVendorEventUpdateCurrentStep,
  stashWizardStepForNextMount,
  toPositiveVendorEventPathId,
} from "../../../_lib/vendor-event-wizard-step";
import { useSyncStepFormFromGlobal } from "../../../_lib/use-sync-step-form-from-global";
import { writeVendorEventPreviewDraft } from "../../../_lib/vendor-event-preview-live-data";
import AddressAutocomplete from "./_components/address-autocomplete";
import EventLocationMap from "./_components/event-location-map";
import { useLocationStore } from "@/store/location.store";
import {
  resolveVenueLocationAddress,
  resolveVenueLocationCoords,
} from "@/lib/venue-location-address";

function filePreviewSrc(file: File): string {
  const withPreview = file as File & { preview?: string };
  if (typeof withPreview.preview === "string" && withPreview.preview.trim()) {
    return withPreview.preview;
  }
  return URL.createObjectURL(file);
}

function applyAboutImageToUi(
  aboutImage: StepOneType["about_event_image"],
  setAboutImageFile: (files: File[]) => void,
  setAboutImageUrl: (url: string) => void,
) {
  if (typeof File !== "undefined" && aboutImage instanceof File) {
    setAboutImageFile([aboutImage]);
    setAboutImageUrl(filePreviewSrc(aboutImage));
  } else if (typeof aboutImage === "string" && aboutImage.trim()) {
    setAboutImageUrl(aboutImage);
    setAboutImageFile([]);
  } else {
    setAboutImageUrl("");
    setAboutImageFile([]);
  }
}

function applyBannerMediaToUi(
  values: Pick<StepOneType, "event_banner_image" | "event_banner_video">,
  setBannerImageFile: (files: File[]) => void,
  setBannerImageUrl: (url: string) => void,
  setBannerVideoFile: (files: File[]) => void,
  setBannerVideoUrl: (url: string) => void,
  setBannerType: (type: "image" | "video") => void,
) {
  const bannerImage = values.event_banner_image;
  const bannerVideo = values.event_banner_video;

  if (typeof File !== "undefined" && bannerImage instanceof File) {
    setBannerImageFile([bannerImage]);
    setBannerImageUrl(filePreviewSrc(bannerImage));
    setBannerType("image");
  } else if (typeof bannerImage === "string" && bannerImage.trim()) {
    setBannerImageUrl(bannerImage);
    setBannerImageFile([]);
    setBannerType("image");
  } else {
    setBannerImageUrl("");
    setBannerImageFile([]);
  }

  if (typeof File !== "undefined" && bannerVideo instanceof File) {
    setBannerVideoFile([bannerVideo]);
    setBannerVideoUrl(filePreviewSrc(bannerVideo));
    setBannerType("video");
  } else if (typeof bannerVideo === "string" && bannerVideo.trim()) {
    setBannerVideoUrl(bannerVideo);
    setBannerVideoFile([]);
    setBannerType("video");
  } else {
    setBannerVideoUrl("");
    setBannerVideoFile([]);
  }
}

export default function EventNameTab() {
  // No need to use session update as we get data from API
  const router = useRouter();
  const params = useParams<{ eventID?: string }>();
  const eventIdFromRoute = Array.isArray(params?.eventID)
    ? params.eventID[0]
    : params?.eventID;
  // Access the GLOBAL form context
  const {
    form: globalForm,
    advanceStep,
    isLoading: globalLoading,
    setActiveField,
    readOnly,
    persistedHydrated,
    discardEpoch,
  } = useEventFormContext();

  // Get event categories
  const { data: eventCategories, isLoading: isEventCategoriesLoading } =
    useEventCategories();

  const initialStepOne = globalForm.getValues().stepOne;
  const initialBannerImage = initialStepOne?.event_banner_image;
  const initialBannerVideo = initialStepOne?.event_banner_video;
  const initialAboutImage = initialStepOne?.about_event_image;

  // State for banner files and uploads
  const [bannerType, setBannerType] = useState<"image" | "video">(() => {
    if (typeof File !== "undefined" && initialBannerVideo instanceof File) {
      return "video";
    }
    if (
      typeof initialBannerVideo === "string" &&
      initialBannerVideo.trim()
    ) {
      return "video";
    }
    return "image";
  });
  const [bannerImageFile, setBannerImageFile] = useState<File[]>(() =>
    typeof File !== "undefined" && initialBannerImage instanceof File
      ? [initialBannerImage]
      : [],
  );
  const [bannerVideoFile, setBannerVideoFile] = useState<File[]>(() =>
    typeof File !== "undefined" && initialBannerVideo instanceof File
      ? [initialBannerVideo]
      : [],
  );
  const [bannerImageUploading, setBannerImageUploading] = useState(false);
  const [bannerVideoUploading, setBannerVideoUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // URL strings from backend or unsaved File previews
  const [bannerImageUrl, setBannerImageUrl] = useState(() => {
    if (typeof File !== "undefined" && initialBannerImage instanceof File) {
      return filePreviewSrc(initialBannerImage);
    }
    return typeof initialBannerImage === "string" ? initialBannerImage : "";
  });
  const [aboutImageFile, setAboutImageFile] = useState<File[]>(() =>
    typeof File !== "undefined" && initialAboutImage instanceof File
      ? [initialAboutImage]
      : [],
  );
  const [aboutImageUploading, setAboutImageUploading] = useState(false);
  const [aboutImageUrl, setAboutImageUrl] = useState(() => {
    if (typeof File !== "undefined" && initialAboutImage instanceof File) {
      return filePreviewSrc(initialAboutImage);
    }
    return typeof initialAboutImage === "string" ? initialAboutImage : "";
  });
  const [bannerVideoUrl, setBannerVideoUrl] = useState(() => {
    if (typeof File !== "undefined" && initialBannerVideo instanceof File) {
      return filePreviewSrc(initialBannerVideo);
    }
    return typeof initialBannerVideo === "string" ? initialBannerVideo : "";
  });
  const selectedLocation = useLocationStore((state) => state.selectedLocation);
  const venueAddressHint = useMemo(
    () => resolveVenueLocationAddress(selectedLocation),
    [selectedLocation],
  );
  const venueCoords = useMemo(
    () =>
      resolveVenueLocationCoords(
        selectedLocation as
          | (NonNullable<typeof selectedLocation> & Record<string, unknown>)
          | null,
      ),
    [selectedLocation],
  );
  const addressSearchFunctionRef = useRef<((address: string) => void) | null>(
    null,
  );

  // Initialize form with combined step data
  const stepOneDefaults = globalForm.getValues().stepOne;
  const { data: session } = useSession();
  const vendorLocationId = (() => {
    const sessionLocationId = session?.user?.vendor_location_id;
    const parsedId = sessionLocationId
      ? parseInt(String(sessionLocationId), 10)
      : 0;
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
      about_event_image: stepOneDefaults?.about_event_image,
      event_banner_heading: stepOneDefaults?.event_banner_heading || "",
      event_banner_sub_heading: stepOneDefaults?.event_banner_sub_heading || "",
      about_event_heading: stepOneDefaults?.about_event_heading || "",
      about_event_sub_heading: stepOneDefaults?.about_event_sub_heading || "",
      about_event_description: stepOneDefaults?.about_event_description || "",
      event_address: stepOneDefaults?.event_address || venueAddressHint || "",
      latitude: stepOneDefaults?.latitude ?? venueCoords?.latitude,
      longitude: stepOneDefaults?.longitude ?? venueCoords?.longitude,
      location: stepOneDefaults?.location || {
        title: "LOCATION",
        description: venueAddressHint || "",
        icon: "MapPin",
      },
      remove_event_banner_image: false,
      remove_event_banner_video: false,
      remove_about_event_image: false,
    } as StepOneType,
    mode: "onChange",
  });

  useSyncStepFormFromGlobal({
    globalForm,
    localForm: form,
    stepKey: "stepOne",
    enabled: persistedHydrated,
    resyncKey: discardEpoch,
    toLocalValues: (stepOne) =>
      mapGlobalStepOneToLocal(stepOne, vendorLocationId),
    onAfterSync: (values) => {
      applyBannerMediaToUi(
        values,
        setBannerImageFile,
        setBannerImageUrl,
        setBannerVideoFile,
        setBannerVideoUrl,
        setBannerType,
      );
      applyAboutImageToUi(
        values.about_event_image,
        setAboutImageFile,
        setAboutImageUrl,
      );
    },
  });

  const globalBannerImage = useWatch({
    control: globalForm.control,
    name: "stepOne.event_banner_image",
  });
  const globalBannerVideo = useWatch({
    control: globalForm.control,
    name: "stepOne.event_banner_video",
  });
  const globalAboutImage = useWatch({
    control: globalForm.control,
    name: "stepOne.about_event_image",
  });

  useEffect(() => {
    if (!persistedHydrated) return;
    form.setValue(
      "event_banner_image",
      globalBannerImage as StepOneType["event_banner_image"],
      { shouldDirty: false },
    );
    form.setValue(
      "event_banner_video",
      globalBannerVideo as StepOneType["event_banner_video"],
      { shouldDirty: false },
    );
    applyBannerMediaToUi(
      {
        event_banner_image: globalBannerImage as StepOneType["event_banner_image"],
        event_banner_video: globalBannerVideo as StepOneType["event_banner_video"],
      },
      setBannerImageFile,
      setBannerImageUrl,
      setBannerVideoFile,
      setBannerVideoUrl,
      setBannerType,
    );
    form.setValue(
      "about_event_image",
      globalAboutImage as StepOneType["about_event_image"],
      { shouldDirty: false },
    );
    applyAboutImageToUi(
      globalAboutImage as StepOneType["about_event_image"],
      setAboutImageFile,
      setAboutImageUrl,
    );
  }, [
    form,
    persistedHydrated,
    globalBannerImage,
    globalBannerVideo,
    globalAboutImage,
  ]);

  // Update form when vendor_location_id changes
  useEffect(() => {
    form.setValue("vendor_location_id", vendorLocationId);
  }, [vendorLocationId, form]);

  useEffect(() => {
    const currentAddress = globalForm.getValues("stepOne.event_address")?.trim();
    if (!currentAddress && venueAddressHint) {
      globalForm.setValue("stepOne.event_address", venueAddressHint, {
        shouldDirty: false,
      });
      form.setValue("event_address", venueAddressHint, { shouldDirty: false });
    }

    const currentLatitude = globalForm.getValues("stepOne.latitude");
    const currentLongitude = globalForm.getValues("stepOne.longitude");
    if (
      venueCoords &&
      (!Number.isFinite(Number(currentLatitude)) ||
        !Number.isFinite(Number(currentLongitude)))
    ) {
      globalForm.setValue("stepOne.latitude", venueCoords.latitude, {
        shouldDirty: false,
      });
      globalForm.setValue("stepOne.longitude", venueCoords.longitude, {
        shouldDirty: false,
      });
      form.setValue("latitude", venueCoords.latitude, { shouldDirty: false });
      form.setValue("longitude", venueCoords.longitude, { shouldDirty: false });
    }
  }, [form, globalForm, venueAddressHint, venueCoords]);

  const persistUnsavedDraft = useCallback(() => {
    const eventId =
      Number(globalForm.getValues().stepOne?.event_id) ||
      Number(eventIdFromRoute) ||
      0;
    if (eventId <= 0) return;
    writeVendorEventPreviewDraft(eventId, globalForm.getValues());
  }, [eventIdFromRoute, globalForm]);

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

  // Handle field focus for tracking active field
  const handleFieldFocus = useCallback(
    (fieldName: string) => {
      setActiveField?.(fieldName);
    },
    [setActiveField],
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
        form.setValue("event_banner_image", files[0], { shouldDirty: true });

        // Sync to global form
        const currentStepOne = globalForm.getValues().stepOne || {};
        globalForm.setValue(
          "stepOne",
          {
            ...currentStepOne,
            event_banner_image: files[0],
            remove_event_banner_image: false,
            remove_event_banner_video: false,
          },
          { shouldDirty: true },
        );

        // Clear removal flags when new file is uploaded
        form.setValue("remove_event_banner_image", false, { shouldDirty: true });
        form.setValue("remove_event_banner_video", false, { shouldDirty: true });

        // Switch to image mode
        setBannerType("image");

        // Clear video when image is uploaded
        setBannerVideoFile([]);
        setBannerVideoUrl(""); // Clear video URL too
        form.setValue("event_banner_video", undefined, { shouldDirty: true });
        persistUnsavedDraft();
      } catch (error) {
        console.error("Error handling banner image:", error);
      } finally {
        setBannerImageUploading(false);
      }
    },
    [form, globalForm, persistUnsavedDraft],
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
        const validation = await validateVideo(file);

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
        form.setValue("event_banner_video", file, { shouldDirty: true });

        // Clear removal flags when new file is uploaded
        form.setValue("remove_event_banner_image", false, { shouldDirty: true });
        form.setValue("remove_event_banner_video", false, { shouldDirty: true });

        // Update global form
        const currentStepOne = globalForm.getValues().stepOne || {};
        globalForm.setValue(
          "stepOne",
          {
            ...currentStepOne,
            event_banner_video: file,
            remove_event_banner_image: false,
            remove_event_banner_video: false,
          },
          { shouldDirty: true },
        );

        // Switch to video mode
        setBannerType("video");

        // Clear image when video is uploaded
        setBannerImageFile([]);
        setBannerImageUrl(""); // Clear image URL too
        form.setValue("event_banner_image", undefined, { shouldDirty: true });
        globalForm.setValue("stepOne.event_banner_image", undefined, {
          shouldDirty: true,
        });
        persistUnsavedDraft();

        // Success toast will be shown by axios interceptor when form is saved
      } catch (error) {
        console.error("Error handling banner video:", error);
        toast.error("Could not process the video", {
          description:
            "Please ensure the video is in MP4 format with H.264 codec.",
        });
      } finally {
        setBannerVideoUploading(false);
      }
    },
    [form, globalForm, persistUnsavedDraft],
  );

  // Handle banner image removal
  const handleRemoveBannerImage = useCallback(() => {
    setBannerImageFile([]);
    setBannerImageUrl(""); // Clear URL too
    form.setValue("event_banner_image", undefined, { shouldDirty: true });
    form.setValue("remove_event_banner_image", true, { shouldDirty: true });

    // Update global form
    const currentStepOne = globalForm.getValues().stepOne || {};
    globalForm.setValue(
      "stepOne",
      {
        ...currentStepOne,
        event_banner_image: undefined,
        remove_event_banner_image: true,
      },
      { shouldDirty: true },
    );
    persistUnsavedDraft();
  }, [form, globalForm, persistUnsavedDraft]);

  // Handle banner video removal
  const handleRemoveBannerVideo = useCallback(() => {
    setBannerVideoFile([]);
    setBannerVideoUrl(""); // Clear URL too
    form.setValue("event_banner_video", undefined, { shouldDirty: true });
    form.setValue("remove_event_banner_video", true, { shouldDirty: true });
    setBannerType("image");

    // Update global form
    const currentStepOne = globalForm.getValues().stepOne || {};
    globalForm.setValue(
      "stepOne",
      {
        ...currentStepOne,
        event_banner_video: undefined,
        remove_event_banner_video: true,
      },
      { shouldDirty: true },
    );
    persistUnsavedDraft();
  }, [form, globalForm, persistUnsavedDraft]);

  const handleAboutImageChange = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;

      setAboutImageFile(files);
      setAboutImageUrl("");
      setAboutImageUploading(true);

      try {
        form.setValue("about_event_image", files[0], { shouldDirty: true });
        form.setValue("remove_about_event_image", false, { shouldDirty: true });
        const currentStepOne = globalForm.getValues().stepOne || {};
        globalForm.setValue(
          "stepOne",
          {
            ...currentStepOne,
            about_event_image: files[0],
            remove_about_event_image: false,
          },
          { shouldDirty: true },
        );
        persistUnsavedDraft();
      } catch (error) {
        console.error("Error handling about image:", error);
      } finally {
        setAboutImageUploading(false);
      }
    },
    [form, globalForm, persistUnsavedDraft],
  );

  const handleRemoveAboutImage = useCallback(() => {
    setAboutImageFile([]);
    setAboutImageUrl("");
    form.setValue("about_event_image", undefined, { shouldDirty: true });
    form.setValue("remove_about_event_image", true, { shouldDirty: true });
    const currentStepOne = globalForm.getValues().stepOne || {};
    globalForm.setValue(
      "stepOne",
      {
        ...currentStepOne,
        about_event_image: undefined,
        remove_about_event_image: true,
      },
      { shouldDirty: true },
    );
    persistUnsavedDraft();
  }, [form, globalForm, persistUnsavedDraft]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (data: StepOneType) => {
      setIsLoading(true);

      try {
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
        if (aboutImageFile.length > 0 && !formData.about_event_image) {
          formData.about_event_image = aboutImageFile[0];
        }

        // Update global form with all fields
        globalForm.setValue("stepOne", {
          ...globalForm.getValues().stepOne,
          ...formData,
        });

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

        const eventIdFromGlobalForm = toPositiveVendorEventPathId(
          (globalForm.getValues().stepOne as { event_id?: unknown } | undefined)
            ?.event_id,
        );

        const existingEventId =
          toPositiveVendorEventPathId(eventIdFromUrl) || eventIdFromGlobalForm;
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
            existingEventId.toString(),
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
                "Response data is an array, can't extract ID directly",
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
                eventId,
              );
            }
          }

          if (eventId) {
            const persistedEventId = Number(eventId);
            if (Number.isFinite(persistedEventId) && persistedEventId > 0) {
              const currentStepOne = globalForm.getValues().stepOne;
              globalForm.setValue("stepOne", {
                ...currentStepOne,
                event_id: persistedEventId,
              });
            }

            if (!existingEventId) {
              const nextStep = resolveWizardStepAfterSave({
                updateCurrentStep: readVendorEventUpdateCurrentStep(response),
                savedStep: 1,
              });
              stashWizardStepForNextMount(eventId, nextStep);
              router.push(`/vendor/events/${eventId}`);
            } else {
              await advanceStep(1, response);
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
          console.error("Error saving event details:", response);
        }
      } catch (error) {
        console.error("Error saving event details:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [
      globalForm,
      advanceStep,
      form,
      setActiveField,
      router,
      bannerImageFile,
      aboutImageFile,
    ],
  );

  if (globalLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-7 w-28" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-11 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-11 w-full" />
        </div>
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      <Form {...form}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit(
              handleSubmit,
              (errors) => {
                const firstError = Object.keys(errors)[0];
                if (!firstError) return;

                setActiveField(firstError);
                const errorElement = document.querySelector(
                  `[name="${firstError}"]`,
                );
                if (errorElement instanceof HTMLElement) {
                  errorElement.focus();
                  errorElement.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
                }
              },
            )(e);
          }}
          className="space-y-4 sm:space-y-6"
          noValidate
          autoComplete="off"
        >
          <div className="space-y-4 sm:space-y-6">
            {/* Banner — heading, subheading, then image (onboarding order) */}
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center gap-3 title-header">
                <h2 className="text-xl font-bold">Banner</h2>
              </div>

              <FormField
                control={form.control}
                name="event_banner_heading"
                render={({ field }) => {
                  const wc = countWords(field.value || "");
                  return (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Banner Heading <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          maxLength={BANNER_HEADING_MAX_CHARS}
                          {...field}
                          placeholder={`Enter a banner heading (max ${BANNER_HEADING_MAX_WORDS} words)`}
                          className="h-11 bg-[#F9FAFB] border-[#E5E7EB]"
                          onFocus={() =>
                            handleFieldFocus("event_banner_heading")
                          }
                          onChange={(e) => {
                            const next = truncateToMaxWordsForInput(
                              e.target.value,
                              BANNER_HEADING_MAX_WORDS,
                            );
                            field.onChange(next);
                            globalForm.setValue(
                              "stepOne.event_banner_heading",
                              next,
                              { shouldDirty: true, shouldTouch: true },
                            );
                          }}
                          onBlur={field.onBlur}
                        />
                      </FormControl>
                      <FormDescription>
                        Shown on the hero banner. Keep it to{" "}
                        {BANNER_HEADING_MAX_WORDS} words and{" "}
                        {BANNER_HEADING_MAX_CHARS} characters.
                      </FormDescription>
                      <p className="text-xs text-muted-foreground mt-1">
                        <span>
                          {wc}/{BANNER_HEADING_MAX_WORDS} words
                        </span>
                      </p>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="event_banner_sub_heading"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Banner subheading <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <LongTextInput
                        {...field}
                        placeholder="Enter a short banner supporting line"
                        maxLength={BANNER_SUB_HEADING_MAX_CHARS}
                        className="h-11 bg-[#F9FAFB] border-[#E5E7EB]"
                        onFocus={() =>
                          handleFieldFocus("event_banner_sub_heading")
                        }
                        onChange={(e) => {
                          field.onChange(e);
                          globalForm.setValue(
                            "stepOne.event_banner_sub_heading",
                            e.target.value,
                            { shouldDirty: true, shouldTouch: true },
                          );
                        }}
                        onBlur={field.onBlur}
                      />
                    </FormControl>
                    <FormDescription>
                      Appears over the banner beneath the main heading. Use a
                      short line that supports the hero message.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4" data-banner-section>
                <h3 className="text-lg font-semibold title-header">
                  Banner Image
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
                            max {MAX_VIDEO_SIZE_MB}MB)
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
                                    maxSize={MAX_VIDEO_SIZE_BYTES}
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
                                            bannerVideoFile[0],
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
            </div>

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
                        Event name <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter your event name (max 40 characters)"
                          className="h-11 bg-[#F9FAFB] border-[#E5E7EB] w-full"
                          onFocus={() => handleFieldFocus("event_name")}
                          onChange={(e) => {
                            field.onChange(e);
                            globalForm.setValue(
                              "stepOne.event_name",
                              e.target.value,
                            );
                          }}
                          onBlur={field.onBlur} // Important for onBlur validation
                        />
                      </FormControl>
                      <FormDescription>
                        This is the event title customers will see throughout
                        the booking journey. Maximum 40 characters.
                      </FormDescription>
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
                        Event category <span className="text-red-500">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(Number(value));
                          globalForm.setValue(
                            "stepOne.event_category_id",
                            Number(value),
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
                            ),
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4" data-event-location-section>
              <div className="flex items-center gap-3 title-header">
                <h2 className="text-xl font-bold">Event Location</h2>
              </div>
              <p className="text-sm text-gray-500">
                Set the exact event location near your selected venue.
              </p>

              <div className="space-y-4 border border-[#E5E7EB] p-6 rounded-md bg-white">
                <FormField
                  control={form.control}
                  name="event_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Event address (exact location){" "}
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <AddressAutocomplete
                          value={field.value}
                          biasCity={
                            selectedLocation?.city ??
                            selectedLocation?.name ??
                            null
                          }
                          biasLatitude={venueCoords?.latitude ?? null}
                          biasLongitude={venueCoords?.longitude ?? null}
                          onChange={(address) => {
                            field.onChange(address);
                            globalForm.setValue("stepOne.event_address", address);
                            globalForm.setValue("stepOne.location", {
                              title: "LOCATION",
                              description: address,
                              icon: "MapPin",
                            });
                            form.setValue("latitude", undefined, {
                              shouldDirty: true,
                            });
                            form.setValue("longitude", undefined, {
                              shouldDirty: true,
                            });
                          }}
                          onSelect={(_placeId, address) => {
                            field.onChange(address);
                            globalForm.setValue("stepOne.event_address", address);
                            globalForm.setValue("stepOne.location", {
                              title: "LOCATION",
                              description: address,
                              icon: "MapPin",
                            });
                            addressSearchFunctionRef.current?.(address);
                          }}
                          onResolved={({ address, latitude, longitude }) => {
                            field.onChange(address);
                            globalForm.setValue("stepOne.event_address", address);
                            globalForm.setValue("stepOne.location", {
                              title: "LOCATION",
                              description: address,
                              icon: "MapPin",
                            });
                            if (
                              latitude != null &&
                              longitude != null &&
                              Number.isFinite(latitude) &&
                              Number.isFinite(longitude)
                            ) {
                              form.setValue("latitude", latitude, {
                                shouldDirty: true,
                                shouldValidate: true,
                              });
                              form.setValue("longitude", longitude, {
                                shouldDirty: true,
                                shouldValidate: true,
                              });
                            } else {
                              addressSearchFunctionRef.current?.(address);
                            }
                          }}
                          onFocus={() => handleFieldFocus("event_address")}
                          placeholder="Type to search for a UK address or location..."
                          className="w-full"
                        />
                      </FormControl>
                      <p className="text-xs text-blue-600 mt-1 font-medium">
                        Restricted to{" "}
                        {selectedLocation?.city ||
                          selectedLocation?.name ||
                          "your selected location"}{" "}
                        (~50km). Search nearby addresses, or drag the pin inside
                        that area.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <EventLocationMap
                  initialAddress={form.watch("event_address")}
                  initialLatitude={form.watch("latitude")}
                  initialLongitude={form.watch("longitude")}
                  restrictLatitude={venueCoords?.latitude ?? null}
                  restrictLongitude={venueCoords?.longitude ?? null}
                  restrictLabel={
                    selectedLocation?.city ?? selectedLocation?.name ?? null
                  }
                  onLocationChange={(location) => {
                    const prevAddress = String(
                      globalForm.getValues("stepOne.event_address") ?? "",
                    ).trim();
                    const prevLat = Number(
                      globalForm.getValues("stepOne.latitude"),
                    );
                    const prevLng = Number(
                      globalForm.getValues("stepOne.longitude"),
                    );
                    if (
                      prevAddress === location.address.trim() &&
                      Number.isFinite(prevLat) &&
                      Number.isFinite(prevLng) &&
                      prevLat === location.latitude &&
                      prevLng === location.longitude
                    ) {
                      return;
                    }
                    form.setValue("event_address", location.address, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                    form.setValue("latitude", location.latitude, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                    form.setValue("longitude", location.longitude, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                    globalForm.setValue("stepOne.event_address", location.address);
                    globalForm.setValue("stepOne.latitude", location.latitude);
                    globalForm.setValue("stepOne.longitude", location.longitude);
                    globalForm.setValue("stepOne.location", {
                      title: "LOCATION",
                      description: location.address,
                      icon: "MapPin",
                    });
                  }}
                  onAddressSearch={(searchFunction) => {
                    addressSearchFunctionRef.current = searchFunction;
                  }}
                  className="mt-4"
                />
              </div>
            </div>

            {/* Tell Guests What It's About Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 title-header">
                <h2 className="text-xl font-bold">
                  Tell guests what it&apos;s about
                </h2>
              </div>
              <p className="text-sm text-gray-500">
                This content appears below the banner in the event details
                section. It is separate from the short banner subheading.
              </p>

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
                          placeholder="Enter a short title for the about section"
                          className="h-11 bg-[#F9FAFB] border-[#E5E7EB]"
                          onFocus={() =>
                            handleFieldFocus("about_event_heading")
                          }
                          onChange={(e) => {
                            field.onChange(e);
                            globalForm.setValue(
                              "stepOne.about_event_heading",
                              e.target.value,
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
                        Subtitle
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter a short subtitle for the about section"
                          className="h-11 bg-[#F9FAFB] border-[#E5E7EB]"
                          onFocus={() =>
                            handleFieldFocus("about_event_sub_heading")
                          }
                          onChange={(e) => {
                            field.onChange(e);
                            globalForm.setValue(
                              "stepOne.about_event_sub_heading",
                              e.target.value,
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
                            value,
                          );
                        }}
                        placeholder="Write a clear description of the event…"
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

              <FormField
                control={form.control}
                name="about_event_image"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      About image
                    </FormLabel>
                    <FormDescription>
                      This photo appears next to the About title and
                      description on the event page. Recommended size:
                      800 × 1000px. If you skip this, the banner image is used.
                    </FormDescription>
                    <FormControl>
                      <div>
                        {aboutImageUrl ? (
                          <div className="space-y-2">
                            <img
                              src={addCacheBusting(aboutImageUrl)}
                              alt="About section"
                              width={240}
                              height={300}
                              className="mx-auto max-h-60 object-contain"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={handleRemoveAboutImage}
                              className="mt-2"
                            >
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <FileUploader
                            value={aboutImageFile}
                            onValueChange={handleAboutImageChange}
                            maxFileCount={1}
                            maxSize={2 * 1024 * 1024}
                            disabled={aboutImageUploading}
                            onRemove={handleRemoveAboutImage}
                            accept={{
                              "image/png": [".png"],
                              "image/jpeg": [".jpg", ".jpeg"],
                              "image/webp": [".webp"],
                            }}
                            enableCropping={true}
                            aspectRatio={4 / 5}
                            cropConfig={{
                              maxSizeKB: 500,
                              quality: 0.9,
                              maxWidth: 960,
                              maxHeight: 1200,
                            }}
                          />
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end mt-6">
              <Button
                type="submit"
                disabled={isLoading || globalLoading || readOnly}
                variant="event-primary"
              >
                {readOnly
                  ? "View only"
                  : isLoading || globalLoading
                    ? "Saving..."
                    : "Save & Next"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
