"use client";

import React, { useCallback, useState, useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  OnboardingCard,
} from "@/components/ui/card";
import { useFormContext } from "../../form-provider";
import { stepFourSchema, StepFourType } from "../../form-provider/schema";
import { FileUploader } from "@/components/ui/file-uploader";
import { Trash, PlusCircle } from "lucide-react";
import { OnboardingTitle } from "@/components/ui/typography";
import { toast } from "sonner";
import { onboardingService } from "@/services/vendor/onboarding/onboarding.service";
import { Accept } from "react-dropzone";
import GalleryUploader from "./gallery-uploader";
import { useSession } from "next-auth/react";
import { useEventId } from "../../../_lib/hooks/useEventId";
import { addCacheBusting } from "@/lib/image-utils";
import { cn } from "@/lib/utils";
import { useGuidedOnboardingSections } from "../../../_lib/hooks/use-guided-onboarding-sections";
import type { GuidedSectionConfig } from "../../../_lib/hooks/use-guided-onboarding-sections";
import { GuidedMultiSectionBottomActions } from "../../guided-section-chips";
import {
  GuidedSectionActionFooter,
  GuidedSectionCoreActions,
  guidedOnboardingSkipButtonClass,
} from "../../guided-sticky-approval-bar";
import { guidedSectionSurfaceClass } from "../../guided-section-surface";
import { GuidedSectionTitleBar } from "../../guided-section-title-bar";
import { useCurrencySymbol } from "@/hooks/use-currency-format";

function resolveStepFourErrorIndex(keys: string[]) {
  if (keys.some((k) => k === "__extra_validation__")) return 1;
  if (keys.some((k) => k === "package_title" || k === "package_description"))
    return 0;
  if (keys.some((k) => k === "package_image" || k === "package_button_name"))
    return 1;
  if (keys.some((k) => k.startsWith("package_details"))) return 2;
  return 3;
}

// Define an interface for files with preview
interface FileWithPreview extends File {
  preview?: string;
}

const StepFour = () => {
  const currencySymbol = useCurrencySymbol();
  const {
    form: globalForm,
    save,
    setActiveStep,
    setActiveField,
    persistedProgressHydrated,
  } = useFormContext();

  const stepFourPersistedApproved = useWatch({
    control: globalForm.control,
    name: "stepFour.isApproved",
  });
  const stepFourDefaults = globalForm.getValues("stepFour");

  const { update: updateSession } = useSession();
  const eventId = useEventId(globalForm, "stepFour");

  const form = useForm<StepFourType>({
    resolver: zodResolver(stepFourSchema),
    defaultValues: {
      step: 4,
      event_id: eventId,
      package_title: stepFourDefaults?.package_title || "",
      package_description: stepFourDefaults?.package_description || "",
      package_image: stepFourDefaults?.package_image || null,
      package_button_name: stepFourDefaults?.package_button_name || "",
      package_details:
        stepFourDefaults?.package_details?.length > 0
          ? stepFourDefaults.package_details
          : [{ title: "" }],

      gallery: stepFourDefaults?.gallery || [],
    },
    mode: "onChange",
  });

  // Clear active field when component unmounts
  useEffect(() => {
    return () => {
      setActiveField(null);
    };
  }, [setActiveField]);

  // Update form when eventId changes
  useEffect(() => {
    if (eventId > 0) {
      form.setValue("event_id", eventId);
    }
  }, [eventId, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "package_details",
  });

  const [packageImage, setPackageImage] = useState<FileWithPreview[]>([]);
  const [packageImageUrl, setPackageImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Initialize URL value from global form on mount
  useEffect(() => {
    const packageImageValue = globalForm.getValues("stepFour.package_image");

    // Check if value is a string URL
    if (typeof packageImageValue === "string" && packageImageValue) {
      setPackageImageUrl(packageImageValue);
    } else if (packageImageValue instanceof File) {
      setPackageImage([packageImageValue]);
    }
  }, [globalForm]);

  const handleFieldFocus = (fieldName: string) => {
    setActiveField(fieldName);
  };

  const sectionConfigs = useMemo((): GuidedSectionConfig<StepFourType>[] => {
    return [
      {
        id: "package-copy",
        label: "Package overview",
        description: "Main heading and sub-heading for your package block.",
        fields: ["package_title", "package_description"],
      },
      {
        id: "package-media",
        label: "Image & button",
        description: "Hero image and primary call-to-action label.",
        fields: ["package_image", "package_button_name"],
        validate: async () => {
          const img = form.getValues("package_image");
          const hasImage = Boolean(
            packageImage.length > 0 ||
              packageImageUrl ||
              img instanceof File ||
              (typeof img === "string" && img.length > 0),
          );
          if (!hasImage) {
            toast.error("Please upload a package image.");
            return false;
          }
          return true;
        },
      },
      {
        id: "package-details",
        label: "Package details",
        description: "Bullet points that appear under your package.",
        fields: ["package_details"],
      },
      {
        id: "gallery",
        label: "Gallery",
        description: "Optional gallery images (up to 8).",
        fields: ["gallery"],
      },
    ];
  }, [form, packageImage.length, packageImageUrl]);

  const validateFullStepFour = useCallback(async () => {
    const img = form.getValues("package_image");
    const hasImage = Boolean(
      packageImage.length > 0 ||
        packageImageUrl ||
        img instanceof File ||
        (typeof img === "string" && img.length > 0),
    );
    if (!hasImage) {
      toast.error("Please upload a package image.");
      return false;
    }
    return true;
  }, [form, packageImage.length, packageImageUrl]);

  const guided = useGuidedOnboardingSections({
    form,
    sections: sectionConfigs,
    resolveErrorSectionIndex: resolveStepFourErrorIndex,
    validateFullStep: validateFullStepFour,
    persistenceHydrated: persistedProgressHydrated,
    persistedStepApproved: stepFourPersistedApproved === true,
  });

  const handleSubmit = useCallback(
    async (data: StepFourType) => {
      setLoading(true);
      try {
        // Validate the form
        const isValid = await form.trigger();
        if (!isValid) {
          const errors = form.formState.errors;

          // Display errors
          const errorFields = Object.keys(errors);
          toast.error(
            `Please correct the highlighted fields:${errorFields.join(", ")}`
          );
          setLoading(false);
          return;
        }

        console.log("📤 Form data before submit:", data);
        console.log("📤 Package image in form:", data.package_image);
        console.log(
          "📤 Package image is File?:",
          data.package_image instanceof File
        );
        console.log(
          "📤 Package image is Blob?:",
          data.package_image instanceof Blob
        );
        console.log("📤 Gallery in form:", data.gallery);

        // SAFETY CHECK: Ensure package image is included
        if (packageImage.length > 0 && !data.package_image) {
          console.warn(
            "⚠️ Package image in state but not in form data, adding manually"
          );
          data.package_image = packageImage[0];
        }

        console.log("📤 Final data to send:", data);
        console.log("📤 Final package image:", data.package_image);

        const payload = { ...data, isApproved: true as const };

        const response = await onboardingService.storeStepFourData(payload);
        if (response?.status) {
          globalForm.setValue("stepFour", payload);
          // Type assertion to handle the response data structure
          const responseData = response.data as unknown as {
            id?: number;
            slug?: string;
            status?: number;
            package_image?: string;
            gallery?: Array<{ id: number; url: string } | File>;
            [key: string]: unknown;
          };

          // Update preview URLs with backend response
          if (
            responseData?.package_image &&
            typeof responseData.package_image === "string"
          ) {
            console.log("🔄 Updating package image URL from backend");
            setPackageImageUrl(responseData.package_image);
            setPackageImage([]);
            globalForm.setValue(
              "stepFour.package_image",
              responseData.package_image
            );
          }

          // Update gallery URLs if returned (cap at 8; backend may return more until delete logic is fixed)
          if (responseData?.gallery && Array.isArray(responseData.gallery)) {
            const cappedGallery = (
              responseData.gallery as (File | { id: number; url: string })[]
            ).slice(0, 8);
            globalForm.setValue("stepFour.gallery", cappedGallery);
          }

          // INSTANT TRANSITION: Set active step FIRST for smooth UX
          setActiveStep(5);

          // Then handle async operations in background
          Promise.all([updateSession({ on_boarding_step: 5 }), save()]).catch(
            (error) => {
              console.error("Background save error:", error);
            }
          );
        } else {
          console.error("API Error:", response);
        }
      } catch (error) {
        console.error("Error during Step Four submission:", error);
        // Error toast is handled by axios interceptor
      } finally {
        setLoading(false);
      }
    },
    [form, globalForm, save, setActiveStep, updateSession]
  );

  const handleContinue = useCallback(async () => {
    if (!guided.allSectionsApproved) {
      const ok = await guided.handleApproveAllSections();
      if (!ok) return;
    }
    setActiveField(null);
    await handleSubmit(form.getValues());
  }, [guided, setActiveField, handleSubmit, form]);

  const handleFileChange = useCallback(
    (files: FileWithPreview[], onChange: (file: File | null) => void) => {
      if (!files.length) return;

      const file = files[0];

      // Validate file is actually an image
      if (!file.type.startsWith("image/")) {
        toast.error(
          "Only image files are allowed. Please select a JPG, PNG, or other image file."
        );
        return;
      }

      console.log("📸 Package image file received:", file);
      console.log("📸 Package image file type:", file.type);
      console.log("📸 Package image file size:", file.size);

      // Create a preview URL if it doesn't exist
      if (!file.preview) {
        file.preview = URL.createObjectURL(file);
      }

      setPackageImage(files);
      setPackageImageUrl(null); // Clear URL when new file is uploaded
      setActiveField("package_image");

      // Update form state immediately
      onChange(file);
      form.setValue("package_image", file);
      globalForm.setValue("stepFour.package_image", file);

      console.log("✅ Package image set in form");
    },
    [form, globalForm, setActiveField]
  );

  const handleRemovePackage = useCallback(
    (onChange: (value: File | null) => void) => {
      // Clean up preview URLs
      if (packageImage.length > 0 && packageImage[0].preview) {
        URL.revokeObjectURL(packageImage[0].preview);
      }

      setPackageImage([]);
      setPackageImageUrl(null);
      onChange(null);
      globalForm.setValue("stepFour.package_image", null);
    },
    [globalForm, packageImage]
  );

  // Clean up preview URLs when component unmounts
  React.useEffect(() => {
    return () => {
      if (packageImage.length > 0 && packageImage[0].preview) {
        URL.revokeObjectURL(packageImage[0].preview);
      }
    };
  }, [packageImage]);

  return (
    <div className="flex flex-col items-center justify-start w-full min-h-screen bg-transparent">
      <div className="w-full min-w-0 max-w-none mx-auto relative">
        <OnboardingCard className="w-full mx-auto shadow-sm mb-16">
          <CardHeader className="pb-2 pt-4">
            <OnboardingTitle>
              Now Tell Us About Your Event Package
            </OnboardingTitle>
          </CardHeader>

          <CardContent className="px-6 py-2 pb-8">
            <Form {...form}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleContinue();
                }}
                className="space-y-6"
              >
                <input type="hidden" {...form.register("step")} />
                <FormField
                  control={form.control}
                  name="event_id"
                  render={({ field }) => (
                    <FormItem className="hidden">
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <section
                  data-guided-section="package-copy"
                  tabIndex={-1}
                  className={guidedSectionSurfaceClass(
                    guided.allSectionsApproved ||
                      guided.currentSectionIndex === 0,
                    "mb-4 w-full space-y-6",
                  )}
                >
                  <GuidedSectionTitleBar
                    sectionIndex={0}
                    sectionId="package-copy"
                    guided={guided}
                    title="Package overview"
                  />
                  <fieldset
                    disabled={
                      !guided.allSectionsApproved &&
                      guided.currentSectionIndex !== 0
                    }
                    className={cn(
                      "min-w-0 border-0 p-0 m-0 space-y-6",
                      !guided.allSectionsApproved &&
                        guided.currentSectionIndex !== 0 &&
                        "pointer-events-none",
                    )}
                  >
                  <div className="mt-4">
                    <FormField
                      control={form.control}
                      name="package_title"
                      render={({ field }) => {
                        const currentLength = field.value?.length || 0;
                        const maxLength = 40;
                        return (
                          <FormItem className="mb-4">
                            <FormLabel className="text-base font-medium">
                              Event Main Heading
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="e.g., The Package"
                                className="h-11 bg-white/5 border-white/10"
                                maxLength={maxLength}
                                onFocus={() =>
                                  handleFieldFocus("package_title")
                                }
                                onChange={(e) => {
                                  field.onChange(e);
                                  globalForm.setValue(
                                    "stepFour.package_title",
                                    e.target.value
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
                      name="package_description"
                      render={({ field }) => {
                        const currentLength = field.value?.length || 0;
                        const maxLength = 160;
                        return (
                          <FormItem className="mb-4">
                            <FormLabel className="text-base font-medium">
                              Sub Heading
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={`e.g., Prices From ${currencySymbol}65 Plus VAT Include:`}
                                className="h-11 bg-white/5 border-white/10"
                                maxLength={maxLength}
                                onFocus={() =>
                                  handleFieldFocus("package_description")
                                }
                                onChange={(e) => {
                                  field.onChange(e);
                                  globalForm.setValue(
                                    "stepFour.package_description",
                                    e.target.value
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
                  </div>
                  <GuidedSectionActionFooter
                    isActive={guided.currentSectionIndex === 0}
                    hideSectionMeta
                  >
                    <GuidedSectionCoreActions guided={guided} />
                  </GuidedSectionActionFooter>
                  </fieldset>
                </section>

                <section
                  data-guided-section="package-media"
                  tabIndex={-1}
                  className={guidedSectionSurfaceClass(
                    guided.allSectionsApproved ||
                      guided.currentSectionIndex === 1,
                    "mb-4 w-full space-y-6",
                  )}
                >
                  <GuidedSectionTitleBar
                    sectionIndex={1}
                    sectionId="package-media"
                    guided={guided}
                    title="Image & button"
                  />
                  <fieldset
                    disabled={guided.currentSectionIndex !== 1}
                    className={cn(
                      "min-w-0 border-0 p-0 m-0 space-y-6",
                      guided.currentSectionIndex !== 1 &&
                        "pointer-events-none",
                    )}
                  >
                  <FormField
                    control={form.control}
                    name="package_image"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">
                          Package Image
                        </FormLabel>
                        <FormControl>
                          <div
                            onClick={() => handleFieldFocus("package_image")}
                          >
                            {packageImageUrl ? (
                              <div className="relative w-full">
                                <img
                                  src={addCacheBusting(packageImageUrl)}
                                  alt="Package Image"
                                  className="max-h-60 object-contain mx-auto mb-2"
                                  width={100}
                                  height={100}
                                />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    setPackageImageUrl(null);
                                    field.onChange(null);
                                    globalForm.setValue(
                                      "stepFour.package_image",
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
                                value={packageImage}
                                onValueChange={(files) =>
                                  handleFileChange(files, field.onChange)
                                }
                                maxFileCount={1}
                                maxSize={1 * 1024 * 1024}
                                onRemove={() =>
                                  handleRemovePackage(field.onChange)
                                }
                                className="h-60"
                                accept={["image/*"] as unknown as Accept}
                                enableCropping={true}
                                aspectRatio={4 / 3}
                                cropConfig={{
                                  maxSizeKB: 500,
                                  quality: 0.9,
                                  maxWidth: 1200,
                                  maxHeight: 900,
                                }}
                              />
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                <div className="w-full mb-4 pt-2">
                  <FormField
                    control={form.control}
                    name="package_button_name"
                    render={({ field }) => {
                      const currentLength = field.value?.length || 0;
                      const maxLength = 18;
                      return (
                        <FormItem>
                          <FormLabel className="text-base font-medium">
                            Button Name
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="e.g., Choose Now"
                              className="h-11 bg-white/5 border-white/10"
                              maxLength={maxLength}
                              onFocus={() =>
                                handleFieldFocus("package_button_name")
                              }
                              onChange={(e) => {
                                field.onChange(e);
                                globalForm.setValue(
                                  "stepFour.package_button_name",
                                  e.target.value
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
                </div>
                  <GuidedSectionActionFooter
                    isActive={guided.currentSectionIndex === 1}
                    hideSectionMeta
                  >
                    <GuidedSectionCoreActions guided={guided} />
                  </GuidedSectionActionFooter>
                  </fieldset>
                </section>

                <section
                  data-guided-section="package-details"
                  tabIndex={-1}
                  className={guidedSectionSurfaceClass(
                    guided.allSectionsApproved ||
                      guided.currentSectionIndex === 2,
                    "mb-4 w-full space-y-6",
                  )}
                >
                  <GuidedSectionTitleBar
                    sectionIndex={2}
                    sectionId="package-details"
                    guided={guided}
                    title="Package details"
                  />
                  <fieldset
                    disabled={
                      !guided.allSectionsApproved &&
                      guided.currentSectionIndex !== 2
                    }
                    className={cn(
                      "min-w-0 border-0 p-0 m-0 space-y-4",
                      !guided.allSectionsApproved &&
                        guided.currentSectionIndex !== 2 &&
                        "pointer-events-none",
                    )}
                  >
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                    {fields.length < 10 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0 border-white/20 bg-white/[0.04] text-foreground hover:bg-white/[0.08]"
                        onClick={() => {
                          append({ title: "" });
                          const updatedDetails = [
                            ...(form.getValues("package_details") || []),
                            { title: "" },
                          ];
                          globalForm.setValue(
                            "stepFour.package_details",
                            updatedDetails
                          );
                          handleFieldFocus("package_details");
                        }}
                      >
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add Detail
                      </Button>
                    )}
                  </div>

                  {fields.map((item, index) => (
                    <Card
                      key={item.id}
                      className="mb-4 rounded-lg border border-white/10 bg-white/[0.03] p-4"
                    >
                      <CardContent className="p-0 flex items-center gap-4">
                        <FormField
                          control={form.control}
                          name={`package_details.${index}.title`}
                          render={({ field }) => {
                            const currentLength = field.value?.length || 0;
                            const maxLength = 40;
                            return (
                              <FormItem className="flex-1">
                                <FormControl>
                                  <div>
                                    <Input
                                      {...field}
                                      placeholder="e.g.- VIP entrance with photo opportunities"
                                      className="h-11 bg-white/5 border-white/10"
                                      maxLength={maxLength}
                                      onFocus={() =>
                                        handleFieldFocus("package_details")
                                      }
                                      onChange={(e) => {
                                        field.onChange(e);
                                        const updatedDetails = [
                                          ...(form.getValues(
                                            "package_details"
                                          ) || []),
                                        ];
                                        updatedDetails[index].title =
                                          e.target.value;
                                        globalForm.setValue(
                                          "stepFour.package_details",
                                          updatedDetails
                                        );
                                      }}
                                    />
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
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            // Check if this would leave us with no package details
                            if (fields.length <= 1) {
                              toast.error(
                                "At least one package detail is required"
                              );
                              return;
                            }

                            remove(index);
                            const updatedDetails = [
                              ...form.getValues("package_details"),
                            ].filter((_, i) => i !== index);
                            globalForm.setValue(
                              "stepFour.package_details",
                              updatedDetails
                            );
                          }}
                          disabled={fields.length <= 1}
                          className="text-red-400 h-11 w-11 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                  <GuidedSectionActionFooter
                    isActive={guided.currentSectionIndex === 2}
                    hideSectionMeta
                  >
                    <GuidedSectionCoreActions guided={guided} />
                  </GuidedSectionActionFooter>
                  </fieldset>
                </section>

                <section
                  data-guided-section="gallery"
                  tabIndex={-1}
                  className={guidedSectionSurfaceClass(
                    guided.allSectionsApproved ||
                      guided.currentSectionIndex === 3,
                    "w-full",
                  )}
                >
                  <GuidedSectionTitleBar
                    sectionIndex={3}
                    sectionId="gallery"
                    guided={guided}
                    title="Gallery"
                  />
                  <fieldset
                    disabled={
                      !guided.allSectionsApproved &&
                      guided.currentSectionIndex !== 3
                    }
                    className={cn(
                      "min-w-0 border-0 p-0 m-0",
                      !guided.allSectionsApproved &&
                        guided.currentSectionIndex !== 3 &&
                        "pointer-events-none",
                    )}
                  >
                <FormField
                  control={form.control}
                  name="gallery"
                  render={({ field }) => (
                    <div onClick={() => handleFieldFocus("gallery")}>
                      <GalleryUploader field={field} />
                    </div>
                  )}
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
                  loading={loading}
                  onContinue={() => void handleContinue()}
                  extraActions={
                    <Button
                      variant="event-outline"
                      type="button"
                      onClick={() => setActiveStep(5)}
                      className={guidedOnboardingSkipButtonClass}
                    >
                      Skip
                    </Button>
                  }
                />
              </form>
            </Form>
          </CardContent>
        </OnboardingCard>
      </div>
    </div>
  );
};

export default StepFour;
