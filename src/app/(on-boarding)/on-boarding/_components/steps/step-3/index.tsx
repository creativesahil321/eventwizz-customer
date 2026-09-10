"use client";

import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileUploader } from "@/components/ui/file-uploader";
import { useFormContext } from "../../form-provider";
import CategoryDropdown from "./event-category";
import { stepThreeSchema, StepThreeType } from "../../form-provider/schema";
import { CardHeader, CardContent, OnboardingCard } from "@/components/ui/card";
import {
  OnboardingTitle,
  OnboardingFieldGroupTitle,
} from "@/components/ui/typography";
import { toast } from "sonner";
import { onboardingService } from "@/services/vendor/onboarding/onboarding.service";
import { useEventCategories } from "@/services/vendor/events/query";
import { useSession } from "next-auth/react";
import { TiptapEditor } from "@/components/ui/tiptap-editor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { setEventIdInForm } from "../../../_lib/hooks/useEventId";
import { VideoFormatInfo } from "@/components/shared/video-format-info";
import { addCacheBusting } from "@/lib/image-utils";
import { cn } from "@/lib/utils";
import {
  BANNER_HEADING_MAX_WORDS,
  countWords,
  truncateToMaxWordsForInput,
} from "@/lib/word-count";
import { useGuidedOnboardingSections } from "../../../_lib/hooks/use-guided-onboarding-sections";
import type { GuidedSectionConfig } from "../../../_lib/hooks/use-guided-onboarding-sections";
import { useOnboardingPreviewFieldFocus } from "../../../_lib/onboarding-preview-field-focus";
import { GuidedMultiSectionBottomActions } from "../../guided-section-chips";
import {
  GuidedSectionActionFooter,
  GuidedSectionCoreActions,
} from "../../guided-sticky-approval-bar";
import { guidedSectionSurfaceClass } from "../../guided-section-surface";
import { GuidedSectionTitleBar } from "../../guided-section-title-bar";
import AddressAutocomplete from "@/app/(protected)/vendor/events/_components/tab-event-form/tabs/_components/address-autocomplete";
import EventLocationMap from "@/app/(protected)/vendor/events/_components/tab-event-form/tabs/_components/event-location-map";
import { useLocationStore } from "@/store/location.store";
import {
  resolveVenueLocationAddress,
  resolveVenueLocationCoords,
} from "@/lib/venue-location-address";

function resolveStepThreeErrorIndex(keys: string[]) {
  if (keys.some((k) => k === "__extra_validation__")) return 0;
  if (keys.some((k) => k === "event_name" || k === "event_category_id"))
    return 2;
  if (
    keys.some(
      (k) =>
        k.startsWith("event_banner") ||
        k.includes("remove_event") ||
        k === "event_banner_image" ||
        k === "event_banner_video",
    )
  )
    return 0;
  if (keys.some((k) => k.startsWith("about_event"))) return 1;
  if (keys.some((k) => k === "event_address")) return 3;
  return 0;
}

export default function StepThree() {
  const {
    form: globalForm,
    save,
    setActiveStep,
    setActiveField,
    persistedProgressHydrated,
  } = useFormContext();

  const stepThreePersistedApproved = useWatch({
    control: globalForm.control,
    name: "stepThree.isApproved",
  });
  const [loading, setLoading] = useState(false);
  const selectedLocation = useLocationStore((state) => state.selectedLocation);
  const venueAddress = useMemo(
    () =>
      globalForm.getValues("stepOne.address")?.trim() ||
      resolveVenueLocationAddress(selectedLocation),
    [globalForm, selectedLocation],
  );
  const venueCoords = useMemo(() => {
    const selectedCoords = resolveVenueLocationCoords(
      selectedLocation as
        | (NonNullable<typeof selectedLocation> & Record<string, unknown>)
        | null,
    );
    if (selectedCoords) return selectedCoords;
    const latitude = Number(globalForm.getValues("stepOne.latitude"));
    const longitude = Number(globalForm.getValues("stepOne.longitude"));
    return Number.isFinite(latitude) && Number.isFinite(longitude)
      ? { latitude, longitude }
      : null;
  }, [globalForm, selectedLocation]);
  const addressSearchFunctionRef = useRef<((address: string) => void) | null>(
    null,
  );

  // Get session data and update function
  const { data: session, update: updateSession } = useSession();

  // Clear active field when component unmounts
  useEffect(() => {
    return () => {
      setActiveField(null);
    };
  }, [setActiveField]);

  // Function to track which field is being focused
  const handleFieldFocus = (fieldName: string) => {
    setActiveField(fieldName);
  };

  // Fetch event categories from API
  const {
    data: categoriesResponse,
    isLoading: isCategoriesLoading,
    refetch: refetchCategories,
  } = useEventCategories();

  // Extract categories from response, ensuring we have a valid array
  const eventCategories = categoriesResponse?.data || [];

  // Get the initial category ID, ensuring it's a valid number
  const initialCategoryId = useMemo(() => {
    const savedId = globalForm.getValues("stepThree.event_category_id");
    return savedId && !isNaN(Number(savedId)) ? Number(savedId) : undefined;
  }, [globalForm]);

  const form = useForm<StepThreeType>({
    resolver: zodResolver(stepThreeSchema),
    defaultValues: {
      step: 3,
      vendor_location_id:
        globalForm.getValues("stepThree.vendor_location_id") || 0,
      event_category_id: (() => {
        const savedId = globalForm.getValues("stepThree.event_category_id");
        return savedId && !isNaN(Number(savedId)) ? Number(savedId) : undefined;
      })(),
      event_name: globalForm.getValues("stepThree.event_name") || "",
      event_banner_image: globalForm.getValues("stepThree.event_banner_image"),
      event_banner_video: globalForm.getValues("stepThree.event_banner_video"),
      about_event_image: globalForm.getValues("stepThree.about_event_image"),
      event_banner_heading:
        globalForm.getValues("stepThree.event_banner_heading") || "",
      event_banner_sub_heading:
        globalForm.getValues("stepThree.event_banner_sub_heading") || "",
      about_event_heading:
        globalForm.getValues("stepThree.about_event_heading") || "",
      about_event_sub_heading:
        globalForm.getValues("stepThree.about_event_sub_heading") || "",
      about_event_description:
        globalForm.getValues("stepThree.about_event_description") || "",
      event_address:
        globalForm.getValues("stepThree.event_address") ||
        globalForm.getValues("stepSeven.event_address") ||
        venueAddress ||
        "",
      latitude:
        globalForm.getValues("stepThree.latitude") ??
        globalForm.getValues("stepSeven.latitude") ??
        venueCoords?.latitude,
      longitude:
        globalForm.getValues("stepThree.longitude") ??
        globalForm.getValues("stepSeven.longitude") ??
        venueCoords?.longitude,
      location: {
        title: "LOCATION",
        description:
          globalForm.getValues("stepThree.event_address") ||
          globalForm.getValues("stepSeven.event_address") ||
          venueAddress ||
          "",
        icon: "MapPin",
      },
      remove_event_banner_image: false,
      remove_event_banner_video: false,
      remove_about_event_image: false,
    },
    mode: "onChange",
  });

  // Get the current event category name based on the selected category ID
  const selectedCategoryId = form.watch("event_category_id");
  const currentEventCategoryName = useMemo(() => {
    if (!selectedCategoryId || eventCategories.length === 0) {
      return "";
    }
    const selectedCategory = eventCategories.find(
      (category) => category.id === selectedCategoryId,
    );
    return selectedCategory?.name || "";
  }, [eventCategories, selectedCategoryId]);

  useEffect(() => {
    const currentAddress =
      globalForm.getValues("stepThree.event_address")?.trim() ||
      form.getValues("event_address")?.trim();
    if (currentAddress && !globalForm.getValues("stepThree.event_address")) {
      globalForm.setValue("stepThree.event_address", currentAddress, {
        shouldDirty: false,
      });
    } else if (!currentAddress && venueAddress) {
      form.setValue("event_address", venueAddress, { shouldDirty: false });
      globalForm.setValue("stepThree.event_address", venueAddress, {
        shouldDirty: false,
      });
    }

    const currentLatitude =
      globalForm.getValues("stepThree.latitude") ?? form.getValues("latitude");
    const currentLongitude =
      globalForm.getValues("stepThree.longitude") ??
      form.getValues("longitude");
    if (
      venueCoords &&
      (!Number.isFinite(Number(currentLatitude)) ||
        !Number.isFinite(Number(currentLongitude)))
    ) {
      form.setValue("latitude", venueCoords.latitude, { shouldDirty: false });
      form.setValue("longitude", venueCoords.longitude, { shouldDirty: false });
      globalForm.setValue("stepThree.latitude", venueCoords.latitude, {
        shouldDirty: false,
      });
      globalForm.setValue("stepThree.longitude", venueCoords.longitude, {
        shouldDirty: false,
      });
    }
  }, [form, globalForm, venueAddress, venueCoords]);

  const [headerBannerFile, setHeaderBannerFile] = useState<File[]>([]);
  // Track if we have a string URL from backend
  const [headerBannerUrl, setHeaderBannerUrl] = useState<string | null>(null);
  const [aboutImageFile, setAboutImageFile] = useState<File[]>([]);
  const [aboutImageUrl, setAboutImageUrl] = useState<string | null>(null);

  // Video state management
  const [bannerType, setBannerType] = useState<"image" | "video">("image");
  const [bannerVideoFile, setBannerVideoFile] = useState<File[]>([]);
  const [bannerVideoUrl, setBannerVideoUrl] = useState<string | null>(null);
  const [bannerVideoUploading, setBannerVideoUploading] = useState(false);

  // Memoized video preview URL to prevent creating new object URLs on every render
  const videoPreviewUrl = useMemo(() => {
    if (bannerVideoFile.length > 0 && bannerVideoFile[0] instanceof File) {
      return URL.createObjectURL(bannerVideoFile[0]);
    }
    return null;
  }, [bannerVideoFile]);

  // Cleanup video preview URL when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, [videoPreviewUrl]);

  // Initialize URL value from global form on mount
  useEffect(() => {
    const bannerImage = globalForm.getValues("stepThree.event_banner_image");
    const bannerVideo = globalForm.getValues("stepThree.event_banner_video");

    // Check if value is a string URL
    if (typeof bannerImage === "string" && bannerImage) {
      setHeaderBannerUrl(bannerImage);
      setBannerType("image");
    }

    const aboutImage = globalForm.getValues("stepThree.about_event_image");
    if (typeof aboutImage === "string" && aboutImage) {
      setAboutImageUrl(aboutImage);
    } else if (aboutImage instanceof File) {
      setAboutImageFile([aboutImage]);
    }

    if (bannerVideo) {
      if (bannerVideo instanceof File) {
        setBannerType("video");
        setBannerVideoFile([bannerVideo]);
      } else if (typeof bannerVideo === "string" && bannerVideo) {
        // If it's a string URL, we don't need to set bannerVideoFile
        // Just set the banner type to video
        setBannerType("video");
        setBannerVideoUrl(bannerVideo); // Store the URL
      }
    }
  }, [globalForm]);

  const sectionConfigs = useMemo((): GuidedSectionConfig<StepThreeType>[] => {
    return [
      {
        id: "event-hero",
        label: "Banner",
        description: "Cover image or video and banner headings.",
        fields: [
          "event_banner_heading",
          "event_banner_sub_heading",
          "event_banner_image",
          "event_banner_video",
        ],
        validate: async () => {
          const img = form.getValues("event_banner_image");
          const vid = form.getValues("event_banner_video");
          const hasMedia = Boolean(
            headerBannerUrl ||
            headerBannerFile.length > 0 ||
            img instanceof File ||
            (typeof img === "string" && img.length > 0) ||
            bannerVideoUrl ||
            bannerVideoFile.length > 0 ||
            vid instanceof File ||
            (typeof vid === "string" && String(vid).length > 0),
          );
          if (!hasMedia) {
            toast.error(
              "Please upload an image or video for your event banner.",
            );
            return false;
          }
          return true;
        },
      },
      {
        id: "about-event",
        label: "About the event",
        description: "Headings and description for your event page.",
        fields: [
          "about_event_heading",
          "about_event_sub_heading",
          "about_event_description",
          "about_event_image",
        ],
      },
      {
        id: "event-details",
        label: "Event details",
        description: "Event name for your account, and category.",
        fields: ["event_name", "event_category_id"],
      },
      {
        id: "event-location",
        label: "Event location",
        description: "Set the exact event address near your venue.",
        fields: ["event_address"],
      },
    ];
  }, [
    form,
    headerBannerUrl,
    headerBannerFile.length,
    bannerVideoUrl,
    bannerVideoFile.length,
  ]);

  const validateFullStepThree = useCallback(async () => {
    const data = form.getValues();
    if (!data.event_banner_image && !data.event_banner_video) {
      toast.error("Please upload an image or video for your event banner.");
      return false;
    }
    return true;
  }, [form]);

  const guided = useGuidedOnboardingSections({
    form,
    sections: sectionConfigs,
    resolveErrorSectionIndex: resolveStepThreeErrorIndex,
    validateFullStep: validateFullStepThree,
    persistenceHydrated: persistedProgressHydrated,
    persistedStepApproved: stepThreePersistedApproved === true,
  });

  useOnboardingPreviewFieldFocus(3, guided.focusGuidedSection);

  // Handle banner image change
  const handleHeaderBannerFileChange = useCallback(
    (files: File[], onChange: (value: File | undefined) => void) => {
      if (!files || files.length === 0) return;

      const file = files[0];

      console.log("📸 Event banner image file received:", file);
      console.log("📸 Event banner image file type:", file.type);
      console.log("📸 Event banner image file size:", file.size);

      setHeaderBannerFile(files);
      setHeaderBannerUrl(null); // Clear URL when new file is uploaded
      setBannerType("image"); // Switch to image mode

      // Clear video when image is uploaded
      setBannerVideoFile([]);
      setBannerVideoUrl(null); // Clear video URL
      globalForm.setValue("stepThree.event_banner_video", undefined);

      // Clear removal flags when new file is uploaded
      globalForm.setValue("stepThree.remove_event_banner_image", false);
      globalForm.setValue("stepThree.remove_event_banner_video", false);
      form.setValue("remove_event_banner_image", false);
      form.setValue("remove_event_banner_video", false);

      let progress = 0;
      const interval = setInterval(() => {
        progress += 20;
        if (progress >= 100) {
          clearInterval(interval);
          onChange(file);
          form.setValue("event_banner_image", file);
          globalForm.setValue("stepThree.event_banner_image", file);
          console.log("✅ Event banner image set in form");
        }
      }, 300);
    },
    [form, globalForm],
  );

  // Handle banner video change
  const handleBannerVideoChange = useCallback(
    async (files: File[], onChange: (value: File | undefined) => void) => {
      if (!files || files.length === 0) return;

      // Prevent duplicate validation calls
      if (bannerVideoUploading) return;

      const file = files[0];
      setBannerVideoUploading(true);

      try {
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

        // Update local form
        onChange(file);
        globalForm.setValue("stepThree.event_banner_video", file);

        // Switch to video mode
        setBannerType("video");

        // Clear image when video is uploaded
        setHeaderBannerFile([]);
        setHeaderBannerUrl(null);
        globalForm.setValue("stepThree.event_banner_image", undefined);

        // Clear removal flags when new file is uploaded
        globalForm.setValue("stepThree.remove_event_banner_image", false);
        globalForm.setValue("stepThree.remove_event_banner_video", false);
        form.setValue("remove_event_banner_image", false);
        form.setValue("remove_event_banner_video", false);

        // Success toast will be shown by axios interceptor when form is submitted
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
    [form, globalForm],
  );

  // Handle banner image removal
  const handleRemoveHeaderBanner = useCallback(
    (onChange: (value: File | undefined) => void) => {
      setHeaderBannerFile([]);
      setHeaderBannerUrl(null);
      onChange(undefined);
      globalForm.setValue(
        "stepThree.event_banner_image",
        undefined as unknown as File,
      );
      // Set removal flag
      globalForm.setValue("stepThree.remove_event_banner_image", true);
      form.setValue("remove_event_banner_image", true);
    },
    [globalForm, form, setHeaderBannerFile, setHeaderBannerUrl],
  );

  // Handle banner video removal
  const handleRemoveBannerVideo = useCallback(
    (onChange: (value: File | undefined) => void) => {
      setBannerVideoFile([]);
      setBannerVideoUrl(null); // Clear video URL
      onChange(undefined);
      setBannerType("image");
      globalForm.setValue("stepThree.event_banner_video", undefined);
      // Set removal flag
      globalForm.setValue("stepThree.remove_event_banner_video", true);
      form.setValue("remove_event_banner_video", true);
    },
    [globalForm, form, setBannerVideoFile, setBannerVideoUrl, setBannerType],
  );

  const handleAboutImageChange = useCallback(
    (files: File[], onChange: (value: File | undefined) => void) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      setAboutImageFile(files);
      setAboutImageUrl(null);
      onChange(file);
      form.setValue("about_event_image", file);
      form.setValue("remove_about_event_image", false);
      globalForm.setValue("stepThree.about_event_image", file);
      globalForm.setValue("stepThree.remove_about_event_image", false);
    },
    [form, globalForm],
  );

  const handleRemoveAboutImage = useCallback(
    (onChange: (value: File | undefined) => void) => {
      setAboutImageFile([]);
      setAboutImageUrl(null);
      onChange(undefined);
      form.setValue("about_event_image", undefined);
      form.setValue("remove_about_event_image", true);
      globalForm.setValue(
        "stepThree.about_event_image",
        undefined as unknown as File,
      );
      globalForm.setValue("stepThree.remove_about_event_image", true);
    },
    [form, globalForm],
  );

  // Cleanup object URLs when component unmounts
  useEffect(() => {
    const objectUrls: string[] = [];

    return () => {
      // Revoke any object URLs to prevent memory leaks
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Get form data
      const data = form.getValues();

      // Get event_id from session
      const storedEventId = session?.user?.event_id
        ? Number(session.user.event_id)
        : 0;

      if (storedEventId) {
        data.event_id = storedEventId;
      }

      // Validate header banner with user-friendly error
      if (!data.event_banner_image && !data.event_banner_video) {
        toast.error("Please upload an image or video for your event banner.", {
          description:
            "Click on the 'Choose files' button to select an image or video for your event banner.",
          duration: 5000,
        });
        // Scroll to banner section
        document
          .querySelector('[name="event_banner_image"]')
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
        setLoading(false);
        return;
      }

      // Check required text fields
      const requiredFields = [
        "event_name",
        "event_banner_heading",
        "event_banner_sub_heading",
        "about_event_heading",
        "about_event_sub_heading",
        "about_event_description",
        "event_address",
      ];

      const missingFields = requiredFields.filter(
        (field) => !data[field as keyof StepThreeType],
      );

      if (missingFields.length > 0) {
        // Show toast with specific missing fields
        toast.error(
          `Please fill in the following required fields: ${missingFields.join(
            ", ",
          )}`,
        );
        // Trigger validation to show error messages on the form
        await form.trigger(missingFields as (keyof StepThreeType)[]);
        setLoading(false);
        return;
      }

      // Create a mapping of field names to user-friendly labels
      const fieldLabels: Record<string, string> = {
        event_name: "Event Name",
        event_category_id: "Event Category",
        event_banner_image: "Header Banner Image",
        event_banner_heading: "Banner Heading",
        event_banner_sub_heading: "Banner Sub Heading",
        about_event_heading: "About Event Heading",
        about_event_sub_heading: "About Event Sub Heading",
        about_event_description: "About Event Description",
        event_address: "Event Address",
        gallery: "Gallery Images",
      };

      // Validate the form
      const isValid = await form.trigger();
      if (!isValid) {
        const errors = form.formState.errors;
        const errorFields = Object.keys(errors);

        // Map the error field names to user-friendly labels
        const errorLabels = errorFields.map(
          (field) => fieldLabels[field] || field,
        );

        toast.error(
          `Please correct the highlighted fields: ${errorLabels.join(", ")}`,
        );
        setLoading(false);
        return;
      }

      console.log("📤 Form data before submit:", data);
      console.log("📤 Event banner image in form:", data.event_banner_image);
      console.log(
        "📤 Event banner image is File?:",
        data.event_banner_image instanceof File,
      );
      console.log(
        "📤 Event banner image is Blob?:",
        data.event_banner_image instanceof Blob,
      );
      console.log("📤 Event banner video in form:", data.event_banner_video);

      // SAFETY CHECK: Ensure banner image is included
      if (headerBannerFile.length > 0 && !data.event_banner_image) {
        console.warn(
          "⚠️ Event banner image in state but not in form data, adding manually",
        );
        data.event_banner_image = headerBannerFile[0];
      }
      if (aboutImageFile.length > 0 && !data.about_event_image) {
        data.about_event_image = aboutImageFile[0];
      }

      // SAFETY CHECK: Ensure banner video is included
      if (bannerVideoFile.length > 0 && !data.event_banner_video) {
        console.warn(
          "⚠️ Event banner video in state but not in form data, adding manually",
        );
        data.event_banner_video = bannerVideoFile[0];
      }

      console.log("📤 Final data to send:", data);

      const payload = { ...data, isApproved: true as const };

      // Make API call directly
      const response = await onboardingService.storeStepThreeData(payload);

      if (response && response.status) {
        globalForm.setValue("stepThree", payload);
        // Type assertion to handle the response data structure
        const responseData = response.data as {
          id?: number;
          slug?: string;
          status?: number;
          event_banner_image?: string;
          event_banner_video?: string;
          about_event_image?: string;
        };

        // Update preview URLs with backend response
        if (
          responseData?.event_banner_image &&
          typeof responseData.event_banner_image === "string"
        ) {
          console.log("🔄 Updating event banner image URL from backend");
          setHeaderBannerUrl(responseData.event_banner_image);
          setHeaderBannerFile([]);
        }

        if (
          responseData?.event_banner_video &&
          typeof responseData.event_banner_video === "string"
        ) {
          console.log("🔄 Updating event banner video URL from backend");
          setBannerVideoUrl(responseData.event_banner_video);
          setBannerVideoFile([]);
        }

        if (
          responseData?.about_event_image &&
          typeof responseData.about_event_image === "string"
        ) {
          setAboutImageUrl(responseData.about_event_image);
          setAboutImageFile([]);
          globalForm.setValue(
            "stepThree.about_event_image",
            responseData.about_event_image,
          );
        }

        // CRITICAL FIX: Get event_id from response
        const eventId = responseData?.id;

        if (!eventId) {
          console.error("❌ No event_id in response:", responseData);
          toast.error("Failed to create event. Please try again.");
          return;
        }

        // CRITICAL FIX: Update session FIRST (synchronously) before navigation
        try {
          await updateSession({
            event_id: eventId,
            on_boarding_step: 4,
          });

          console.log("✅ Session updated with event_id:", eventId);

          // Store event_id in globalForm as backup
          setEventIdInForm(globalForm, eventId, ["stepThree", "stepFour"]);

          // Save form state
          await save();

          // NOW navigate to next step (session is already updated)
          await setActiveStep(4);
        } catch (error) {
          console.error("❌ Failed to update session:", error);
          toast.error("Failed to save progress. Please try again.");
        }
      } else {
        console.error("API Error:", response);
        // Error toast is handled by axios interceptor
      }
    } catch (error) {
      console.error("Error during Step Three submission:", error);
      // Error toast is handled by axios interceptor
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    if (!guided.allSectionsApproved) {
      const ok = await guided.handleApproveAllSections();
      if (!ok) return;
    }
    setActiveField(null);
    await handleSubmit();
  };

  // Function to handle refreshing categories after creating a new one
  const handleCategoryCreated = () => {
    refetchCategories();
  };

  return (
    <section>
      <OnboardingCard>
        <CardHeader>
          <OnboardingTitle>
            Let’s create your first event
          </OnboardingTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleContinue();
              }}
              className="flex flex-col gap-6"
            >
              <input type="hidden" {...form.register("step")} />
              <input type="hidden" {...form.register("vendor_location_id")} />

              <section
                data-guided-section="event-hero"
                tabIndex={-1}
                className={guidedSectionSurfaceClass(
                  guided.currentSectionIndex === 0,
                  "space-y-6 order-1",
                )}
              >
                <GuidedSectionTitleBar
                  sectionIndex={0}
                  sectionId="event-hero"
                  guided={guided}
                  title="Banner"
                />
                <fieldset
                  disabled={guided.currentSectionIndex !== 0}
                  className={cn(
                    "min-w-0 border-0 p-0 m-0 space-y-6",
                    guided.currentSectionIndex !== 0 &&
                      "pointer-events-none",
                  )}
                >
                  <FormField
                    control={form.control}
                    name="event_banner_heading"
                    render={({ field }) => {
                      const text =
                        typeof field.value === "string" ? field.value : "";
                      const headingWordCount = countWords(text);
                      return (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Banner heading{" "}
                            <span className="text-red-400">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              className="h-11 bg-white/5 border-white/10"
                              placeholder="Enter a banner heading (max 30 words)"
                              {...field}
                              value={
                                typeof field.value === "string"
                                  ? field.value
                                  : ""
                              }
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
                                  "stepThree.event_banner_heading",
                                  next,
                                );
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            Shown on the hero banner. Keep it to 30 words or
                            fewer and no more than 500 characters.
                          </FormDescription>
                          <div className="text-xs text-muted-foreground mt-1">
                            <span>
                              {headingWordCount}/{BANNER_HEADING_MAX_WORDS}{" "}
                              words
                            </span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                  <FormField
                    control={form.control}
                    name="event_banner_sub_heading"
                    render={({ field }) => {
                      const currentLength = field.value?.length || 0;
                      const maxLength = 80;
                      return (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Banner subheading{" "}
                            <span className="text-red-400">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              className="h-11 bg-white/5 border-white/10"
                              placeholder="Enter a short banner supporting line"
                              {...field}
                              value={
                                typeof field.value === "string"
                                  ? field.value
                                  : ""
                              }
                              maxLength={maxLength}
                              onFocus={() =>
                                handleFieldFocus("event_banner_sub_heading")
                              }
                              onChange={(e) => {
                                field.onChange(e);
                                globalForm.setValue(
                                  "stepThree.event_banner_sub_heading",
                                  e.target.value,
                                );
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            Appears over the banner beneath the main heading.
                            Use a short line that supports the hero message.
                          </FormDescription>
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

                  <OnboardingFieldGroupTitle>
                    Banner image <span className="text-red-400">*</span>
                  </OnboardingFieldGroupTitle>

                  <Tabs
                    value={bannerType}
                    onValueChange={(v) => setBannerType(v as "image" | "video")}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="image">Image</TabsTrigger>
                      <TabsTrigger value="video">Video</TabsTrigger>
                    </TabsList>
                    <TabsContent value="image">
                      <FormField
                        control={form.control}
                        name="event_banner_image"
                        render={({ field }) => (
                          <FormItem>
                            <OnboardingFieldGroupTitle>
                              Add a cover photo
                              <span className="text-red-400">*</span>
                            </OnboardingFieldGroupTitle>
                            <FormControl>
                              <div
                                className="flex flex-col justify-center items-center h-full space-y-2 bg-white/5 p-4 rounded-lg border border-white/10"
                                onClick={() =>
                                  handleFieldFocus("event_banner_image")
                                }
                              >
                                {headerBannerUrl ? (
                                  <div className="relative w-full">
                                    <img
                                      src={addCacheBusting(
                                        headerBannerUrl as string,
                                      )}
                                      alt="Event Banner"
                                      className="max-h-40 object-contain mx-auto mb-2"
                                      width={100}
                                      height={100}
                                    />
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="sm"
                                      onClick={() =>
                                        handleRemoveHeaderBanner(field.onChange)
                                      }
                                      className="mt-2"
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <FileUploader
                                      value={headerBannerFile}
                                      onValueChange={(files) =>
                                        handleHeaderBannerFileChange(
                                          files,
                                          field.onChange,
                                        )
                                      }
                                      maxFileCount={1}
                                      maxSize={10 * 1024 * 1024}
                                      onRemove={() =>
                                        handleRemoveHeaderBanner(field.onChange)
                                      }
                                      className="border-dashed"
                                      enableCropping={true}
                                      aspectRatio={21 / 9}
                                      cropConfig={{
                                        maxSizeKB: 600,
                                        quality: 0.9,
                                        maxWidth: 1920,
                                        maxHeight: 823,
                                      }}
                                    />
                                    {!headerBannerFile.length && (
                                      <p className="mt-2 text-sm text-muted-foreground">
                                        Upload a banner image for your event
                                        header (required)
                                      </p>
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
                    <TabsContent value="video">
                      <FormField
                        control={form.control}
                        name="event_banner_video"
                        render={({ field }) => (
                          <FormItem>
                            <OnboardingFieldGroupTitle>
                              Add a cover video
                              <span className="text-red-400">*</span>
                            </OnboardingFieldGroupTitle>
                            <FormControl>
                              <div
                                className="flex flex-col justify-center items-center h-full space-y-2 bg-white/5 p-4 rounded-lg border border-white/10"
                                onClick={() =>
                                  handleFieldFocus("event_banner_video")
                                }
                              >
                                {/* Display video preview if available */}
                                {(bannerVideoFile.length > 0 ||
                                  bannerVideoUrl) && (
                                  <div className="relative w-full">
                                    <video
                                      src={
                                        videoPreviewUrl || bannerVideoUrl || ""
                                      }
                                      controls
                                      className="max-h-40 object-contain mx-auto mb-2"
                                    />
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="sm"
                                      onClick={() =>
                                        handleRemoveBannerVideo(field.onChange)
                                      }
                                      className="mt-2"
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                )}
                                {/* File uploader for video */}
                                {bannerVideoFile.length === 0 &&
                                  !bannerVideoUrl && (
                                    <FileUploader
                                      value={bannerVideoFile}
                                      onValueChange={(files) =>
                                        handleBannerVideoChange(
                                          files,
                                          field.onChange,
                                        )
                                      }
                                      maxFileCount={1}
                                      maxSize={50 * 1024 * 1024}
                                      onRemove={() =>
                                        handleRemoveBannerVideo(field.onChange)
                                      }
                                      className="border-dashed"
                                      accept={{
                                        "video/mp4": [".mp4"],
                                        "video/webm": [".webm"],
                                        "video/ogg": [".ogv"],
                                        "video/quicktime": [".mov"],
                                        "video/x-msvideo": [".avi"],
                                        "video/x-matroska": [".mkv"],
                                      }}
                                      disabled={bannerVideoUploading}
                                    />
                                  )}
                                {bannerVideoFile.length === 0 &&
                                  !bannerVideoUrl && (
                                    <>
                                      <p className="mt-2 text-sm text-muted-foreground">
                                        Upload a banner video for your event
                                        header (MP4, WebM, or OGG format, max
                                        50MB)
                                      </p>
                                      <div className="w-full mt-3">
                                        <VideoFormatInfo variant="compact" />
                                      </div>
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

                  <GuidedSectionActionFooter
                    isActive={guided.currentSectionIndex === 0}
                    hideSectionMeta
                  >
                    <GuidedSectionCoreActions guided={guided} />
                  </GuidedSectionActionFooter>
                </fieldset>
              </section>

              <section
                data-guided-section="about-event"
                tabIndex={-1}
                className={guidedSectionSurfaceClass(
                  guided.currentSectionIndex === 1,
                  "space-y-4 order-2",
                )}
              >
                <GuidedSectionTitleBar
                  sectionIndex={1}
                  sectionId="about-event"
                  guided={guided}
                  title="About the event"
                />
                <fieldset
                  disabled={guided.currentSectionIndex !== 1}
                  className={cn(
                    "min-w-0 border-0 p-0 m-0 space-y-4",
                    guided.currentSectionIndex !== 1 &&
                      "pointer-events-none",
                  )}
                >
                  <p className="-mt-2 mb-4 text-sm text-muted-foreground">
                    This content appears below the banner in the event details
                    section. It is separate from the short banner subheading.
                  </p>

                  {/* Title */}
                  <FormField
                    control={form.control}
                    name="about_event_heading"
                    render={({ field }) => {
                      const currentLength = field.value?.length || 0;
                      const maxLength = 50;
                      return (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Title <span className="text-red-400">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              className="h-11 bg-white/5 border-white/10"
                              placeholder="Enter event title"
                              {...field}
                              value={
                                typeof field.value === "string"
                                  ? field.value
                                  : ""
                              }
                              maxLength={maxLength}
                              onFocus={() =>
                                handleFieldFocus("about_event_heading")
                              }
                              onChange={(e) => {
                                field.onChange(e);
                                globalForm.setValue(
                                  "stepThree.about_event_heading",
                                  e.target.value,
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

                  {/* Sub Title */}
                  <FormField
                    control={form.control}
                    name="about_event_sub_heading"
                    render={({ field }) => {
                      const currentLength = field.value?.length || 0;
                      const maxLength = 80;
                      return (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Subtitle
                          </FormLabel>
                          <FormControl>
                            <Input
                              className="h-11 bg-white/5 border-white/10"
                              placeholder="Enter event subtitle"
                              {...field}
                              value={
                                typeof field.value === "string"
                                  ? field.value
                                  : ""
                              }
                              maxLength={maxLength}
                              onFocus={() =>
                                handleFieldFocus("about_event_sub_heading")
                              }
                              onChange={(e) => {
                                field.onChange(e);
                                globalForm.setValue(
                                  "stepThree.about_event_sub_heading",
                                  e.target.value,
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

                  {/* Description */}
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
                                "stepThree.about_event_description",
                                value,
                              );
                            }}
                            placeholder="Write a compelling description..."
                            className="min-h-[120px] w-full overflow-hidden max-w-[300px]"
                            maxLength={340}
                            maxWords={50}
                            showAIButton={true}
                            wrapText={true}
                            aiContext={{
                              event_name: form.watch("event_name"),
                              title: form.watch("about_event_heading"),
                              sub_title: form.watch("about_event_sub_heading"),
                              description: form.watch(
                                "about_event_description",
                              ),
                              ctaText: form.watch("about_event_sub_heading"),
                              event_category_name: currentEventCategoryName,
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
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          About image
                        </FormLabel>
                        <FormDescription>
                          This photo appears next to the About title and
                          description on the event page. Recommended size:
                          800 × 1000px. If you skip this, the banner image is
                          used.
                        </FormDescription>
                        <FormControl>
                          <div
                            className="flex flex-col justify-center items-center space-y-2 bg-white/5 p-4 rounded-lg border border-white/10"
                            onClick={() =>
                              handleFieldFocus("about_event_image")
                            }
                          >
                            {aboutImageUrl ? (
                              <div className="relative w-full space-y-2">
                                <img
                                  src={addCacheBusting(aboutImageUrl)}
                                  alt="About section"
                                  className="mx-auto mb-2 max-h-48 object-contain"
                                  width={160}
                                  height={200}
                                />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() =>
                                    handleRemoveAboutImage(field.onChange)
                                  }
                                >
                                  Remove
                                </Button>
                              </div>
                            ) : (
                              <FileUploader
                                value={aboutImageFile}
                                onValueChange={(files) =>
                                  handleAboutImageChange(files, field.onChange)
                                }
                                maxFileCount={1}
                                maxSize={2 * 1024 * 1024}
                                onRemove={() =>
                                  handleRemoveAboutImage(field.onChange)
                                }
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
                  <GuidedSectionActionFooter
                    isActive={guided.currentSectionIndex === 1}
                    hideSectionMeta
                  >
                    <GuidedSectionCoreActions guided={guided} />
                  </GuidedSectionActionFooter>
                </fieldset>
              </section>

              <section
                data-guided-section="event-details"
                tabIndex={-1}
                className={guidedSectionSurfaceClass(
                  guided.currentSectionIndex === 2,
                  "mb-6 order-3 border border-white/10 bg-white/[0.03] rounded-lg p-4",
                )}
              >
                <GuidedSectionTitleBar
                  sectionIndex={2}
                  sectionId="event-details"
                  guided={guided}
                  title="How shall we categorise this event for you?"
                />
                <fieldset
                  disabled={guided.currentSectionIndex !== 2}
                  className={cn(
                    "min-w-0 border-0 p-0 m-0",
                    guided.currentSectionIndex !== 2 &&
                      "pointer-events-none",
                  )}
                >
                  <div className="mt-4 space-y-4">
                    <FormField
                      control={form.control}
                      name="event_name"
                      render={({ field }) => {
                        const currentLength = field.value?.length || 0;
                        const maxLength = 40;
                        return (
                          <FormItem>
                            <FormLabel className="text-md font-medium">
                              What should we call this event?{" "}
                              <span className="text-red-400">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter your event name (max 40 characters)"
                                {...field}
                                value={
                                  typeof field.value === "string"
                                    ? field.value
                                    : ""
                                }
                                maxLength={maxLength}
                                onFocus={() => handleFieldFocus("event_name")}
                                onChange={(e) => {
                                  field.onChange(e);
                                  globalForm.setValue(
                                    "stepThree.event_name",
                                    e.target.value,
                                  );
                                }}
                              />
                            </FormControl>
                            <div className="text-xs text-muted-foreground mt-1">
                              <p className="mb-1">
                                This is the event title customers will see
                                throughout the booking journey.
                              </p>
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
                    <Controller
                      control={form.control}
                      name="event_category_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-md font-medium">
                            Event category
                          </FormLabel>
                          <FormControl>
                            <CategoryDropdown
                              categories={eventCategories}
                              onSelect={(value) => {
                                field.onChange(Number(value));
                                globalForm.setValue(
                                  "stepThree.event_category_id",
                                  Number(value),
                                );
                              }}
                              isLoading={isCategoriesLoading}
                              initialValue={initialCategoryId}
                              onCategoryCreated={handleCategoryCreated}
                            />
                          </FormControl>
                          {form.formState.errors.event_category_id && (
                            <FormMessage>
                              {form.formState.errors.event_category_id.message}
                            </FormMessage>
                          )}
                        </FormItem>
                      )}
                    />
                  </div>
                  <GuidedSectionActionFooter
                    isActive={guided.currentSectionIndex === 2}
                    hideSectionMeta
                  >
                    <GuidedSectionCoreActions guided={guided} />
                  </GuidedSectionActionFooter>
                </fieldset>
              </section>
              <section
                data-guided-section="event-location"
                tabIndex={-1}
                className={guidedSectionSurfaceClass(
                  guided.currentSectionIndex === 3,
                  "mb-6 order-4 border border-white/10 bg-white/[0.03] rounded-lg p-4",
                )}
              >
                <GuidedSectionTitleBar
                  sectionIndex={3}
                  sectionId="event-location"
                  guided={guided}
                  title="Where will this event take place?"
                />
                <fieldset
                  disabled={guided.currentSectionIndex !== 3}
                  className={cn(
                    "min-w-0 border-0 p-0 m-0 space-y-4",
                    guided.currentSectionIndex !== 3 &&
                      "pointer-events-none",
                  )}
                >
                  <FormField
                    control={form.control}
                    name="event_address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Event address (exact location){" "}
                          <span className="text-red-400">*</span>
                        </FormLabel>
                        <FormControl>
                          <div className="relative isolate z-[100]">
                            <AddressAutocomplete
                              variant="dark"
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
                              globalForm.setValue(
                                "stepThree.event_address",
                                address,
                              );
                              globalForm.setValue("stepThree.location", {
                                title: "LOCATION",
                                description: address,
                                icon: "MapPin",
                              });
                            }}
                            onSelect={(_placeId, address) => {
                              field.onChange(address);
                              globalForm.setValue(
                                "stepThree.event_address",
                                address,
                              );
                              globalForm.setValue("stepThree.location", {
                                title: "LOCATION",
                                description: address,
                                icon: "MapPin",
                              });
                              addressSearchFunctionRef.current?.(address);
                            }}
                            onFocus={() => handleFieldFocus("event_address")}
                            placeholder="Type to search for a UK address or location..."
                            className="w-full"
                          />
                          </div>
                        </FormControl>
                        <p className="text-xs font-medium text-[var(--color-primary,#38bdf8)]">
                          Restricted to{" "}
                          {selectedLocation?.city ||
                            selectedLocation?.name ||
                            "your selected venue"}{" "}
                          (~50km). Search nearby addresses, or drag the pin
                          inside that area.
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
                      globalForm.setValue(
                        "stepThree.event_address",
                        location.address,
                      );
                      globalForm.setValue(
                        "stepThree.latitude",
                        location.latitude,
                      );
                      globalForm.setValue(
                        "stepThree.longitude",
                        location.longitude,
                      );
                      globalForm.setValue("stepThree.location", {
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
                  <GuidedSectionActionFooter
                    isActive={guided.currentSectionIndex === 3}
                    hideSectionMeta
                  >
                    <GuidedSectionCoreActions guided={guided} />
                  </GuidedSectionActionFooter>
                </fieldset>
              </section>
              <GuidedMultiSectionBottomActions
                onApproveAll={guided.handleApproveAllSections}
                allSectionsApproved={guided.allSectionsApproved}
                hasInput={guided.currentSectionHasInput}
                loading={loading}
                onEditAll={() => guided.handleUnlockSection(0)}
                onContinue={() => void handleContinue()}
                className="order-5"
              />
            </form>
          </Form>
        </CardContent>
      </OnboardingCard>
    </section>
  );
}
