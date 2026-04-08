"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CardHeader, CardContent, OnboardingCard } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { FileUploader } from "@/components/ui/file-uploader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useFormContext } from "../../form-provider";
import { stepTwoSchema, StepTwoType } from "../../form-provider/schema";
import {
  OnboardingTitle,
  OnboardingFieldGroupTitle,
} from "@/components/ui/typography";
import { onboardingService } from "@/services/vendor/onboarding/onboarding.service";
import { toast } from "sonner";
import { TiptapEditor } from "@/components/ui/tiptap-editor";
import { useSession } from "next-auth/react";
import { addCacheBusting } from "@/lib/image-utils";
import { cn } from "@/lib/utils";
import { BANNER_HEADING_MAX_WORDS, countWords } from "@/lib/word-count";
import { useGuidedOnboardingSections } from "../../../_lib/hooks/use-guided-onboarding-sections";
import type { GuidedSectionConfig } from "../../../_lib/hooks/use-guided-onboarding-sections";
import { GuidedMultiSectionBottomActions } from "../../guided-section-chips";
import {
  GuidedSectionActionFooter,
  GuidedSectionCoreActions,
} from "../../guided-sticky-approval-bar";
import { guidedSectionSurfaceClass } from "../../guided-section-surface";
import { GuidedSectionTitleBar } from "../../guided-section-title-bar";

const resolveStepTwoErrorIndex = (keys: string[]) => {
  if (keys.some((k) => k === "__extra_validation__")) return 0;
  if (keys.some((k) => k === "logo" || k === "cover_image")) return 0;
  if (keys.some((k) => k === "banner_heading" || k === "banner_sub_heading"))
    return 1;
  return 2;
};

export default function StepTwo() {
  const {
    form: globalForm,
    save,
    setActiveStep,
    setActiveField,
    persistedProgressHydrated,
  } = useFormContext();

  const stepTwoPersistedApproved = useWatch({
    control: globalForm.control,
    name: "stepTwo.isApproved",
  });
  const { update: updateSession } = useSession();
  const [loading, setLoading] = useState(false);

  const form = useForm<StepTwoType>({
    resolver: zodResolver(stepTwoSchema),
    defaultValues: {
      step: 2,
      banner_heading: globalForm.getValues("stepTwo.banner_heading") || "",
      banner_sub_heading:
        globalForm.getValues("stepTwo.banner_sub_heading") || "",
      about_title: globalForm.getValues("stepTwo.about_title") || "",
      about_description:
        globalForm.getValues("stepTwo.about_description") || "",
      logo: globalForm.getValues("stepTwo.logo") || undefined,
      cover_image: globalForm.getValues("stepTwo.cover_image") || undefined,
      about_link_title: globalForm.getValues("stepTwo.about_link_title") || "",
    },
    mode: "onChange",
  });

  // Clear active field when component unmounts
  useEffect(() => {
    return () => {
      setActiveField(null);
    };
  }, [setActiveField]);

  // Initialize file state from global form values
  const [logoFiles, setLogoFiles] = React.useState<File[]>([]);
  const [coverFiles, setCoverFiles] = React.useState<File[]>([]);

  // Track if we have string URLs from backend
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
  const [coverUrl, setCoverUrl] = React.useState<string | null>(null);

  // Initialize URL values from global form on mount
  useEffect(() => {
    const logo = globalForm.getValues("stepTwo.logo");
    const cover = globalForm.getValues("stepTwo.cover_image");

    // Check if values are string URLs
    if (typeof logo === "string" && logo) {
      setLogoUrl(logo);
    }

    if (typeof cover === "string" && cover) {
      setCoverUrl(cover);
    }
  }, [globalForm]);

  const sectionConfigs = useMemo((): GuidedSectionConfig<StepTwoType>[] => {
    return [
      {
        id: "branding",
        label: "Branding",
        description: "Logo and landing page cover image.",
        fields: [],
        validate: async () => {
          const lg = form.getValues("logo");
          const cv = form.getValues("cover_image");
          const hasLogo = Boolean(
            logoUrl ||
            logoFiles.length > 0 ||
            lg instanceof File ||
            (typeof lg === "string" && lg.length > 0),
          );
          const hasCover = Boolean(
            coverUrl ||
            coverFiles.length > 0 ||
            cv instanceof File ||
            (typeof cv === "string" && cv.length > 0),
          );
          if (!hasLogo || !hasCover) {
            toast.error("Please upload both a logo and a landing page image.");
            return false;
          }
          return true;
        },
      },
      {
        id: "banner",
        label: "Banner text",
        description: "Main hero heading and sub-heading.",
        fields: ["banner_heading", "banner_sub_heading"],
      },
      {
        id: "about",
        label: "About section",
        description: "Title, description, and CTA button label.",
        fields: ["about_title", "about_description", "about_link_title"],
      },
    ];
  }, [form, logoUrl, logoFiles.length, coverUrl, coverFiles.length]);

  const validateFullStep = useCallback(async () => {
    const lg = form.getValues("logo");
    const cv = form.getValues("cover_image");
    const hasLogo = Boolean(
      logoUrl ||
      logoFiles.length > 0 ||
      lg instanceof File ||
      (typeof lg === "string" && lg.length > 0),
    );
    const hasCover = Boolean(
      coverUrl ||
      coverFiles.length > 0 ||
      cv instanceof File ||
      (typeof cv === "string" && cv.length > 0),
    );
    if (!hasLogo || !hasCover) {
      toast.error("Please upload both a logo and a landing page image.");
      return false;
    }
    return true;
  }, [form, logoUrl, logoFiles.length, coverUrl, coverFiles.length]);

  const guided = useGuidedOnboardingSections({
    form,
    sections: sectionConfigs,
    resolveErrorSectionIndex: resolveStepTwoErrorIndex,
    validateFullStep,
    persistenceHydrated: persistedProgressHydrated,
    persistedStepApproved: stepTwoPersistedApproved === true,
  });

  const handleLogoFileChange = (
    files: File[],
    onChange: (file: File | undefined) => void,
  ) => {
    if (!files.length) return;

    console.log("📸 Logo file received:", files[0]);
    console.log("📸 Logo file type:", files[0].type);
    console.log("📸 Logo file size:", files[0].size);

    setLogoFiles(files);
    setLogoUrl(null); // Clear URL when new file is uploaded

    // Update React Hook Form field
    onChange(files[0]);

    // Update global form
    globalForm.setValue("stepTwo.logo", files[0]);

    // Force update form value
    form.setValue("logo", files[0]);

    setActiveField("logo");
  };

  const handleCoverFileChange = (
    files: File[],
    onChange: (file: File | undefined) => void,
  ) => {
    if (!files.length) return;

    console.log("🖼️ Cover image received:", files[0]);
    console.log("🖼️ Cover image type:", files[0].type);
    console.log("🖼️ Cover image size:", files[0].size);

    setCoverFiles(files);
    setCoverUrl(null); // Clear URL when new file is uploaded

    // Update React Hook Form field
    onChange(files[0]);

    // Update global form
    globalForm.setValue("stepTwo.cover_image", files[0]);

    // Force update form value
    form.setValue("cover_image", files[0]);

    setActiveField("cover_image");
  };

  const handleRemoveLogo = (onChange: (value: File | undefined) => void) => {
    setLogoFiles([]);
    setLogoUrl(null);
    onChange(undefined);
    globalForm.setValue("stepTwo.logo", undefined as unknown as File);
  };

  const handleRemoveCover = (onChange: (value: File | undefined) => void) => {
    setCoverFiles([]);
    setCoverUrl(null);
    onChange(undefined);
    globalForm.setValue("stepTwo.cover_image", undefined as unknown as File);
  };

  const handleFieldFocus = (fieldName: string) => {
    setActiveField(fieldName);
  };

  const handleSaveAndNext = useCallback(async () => {
    setLoading(true);
    try {
      const formValues = form.getValues();

      const requiredFields = [
        "banner_heading",
        "banner_sub_heading",
        "about_title",
        "about_description",
        "about_link_title",
        "logo",
        "cover_image",
      ] as const;
      const fieldLabels: Record<(typeof requiredFields)[number], string> = {
        banner_heading: "Banner Heading",
        banner_sub_heading: "Banner Sub-Heading",
        about_title: "Title for Your Page",
        about_description: "Short Description",
        about_link_title: "Button Text",
        logo: "Logo",
        cover_image: "Landing Page Image",
      };
      const missingFields = requiredFields.filter(
        (field) => !formValues[field as keyof typeof formValues],
      );

      if (missingFields.length > 0) {
        const missingLabels = missingFields.map((f) => fieldLabels[f]);
        toast.error(
          `Please fill in the following required fields: ${missingLabels.join(", ")}`,
        );
        await form.trigger(missingFields as (keyof StepTwoType)[]);
        setLoading(false);
        return;
      }

      const isValid = await form.trigger();

      if (!isValid) {
        const errors = form.formState.errors;
        const errorFields = Object.keys(errors);
        toast.error(
          `Please correct the highlighted fields:${errorFields.join(", ")}`,
        );
        setLoading(false);
        return;
      }

      const data = form.getValues();

      if (logoFiles.length > 0 && !data.logo) {
        data.logo = logoFiles[0];
      }

      if (coverFiles.length > 0 && !data.cover_image) {
        data.cover_image = coverFiles[0];
      }

      const response = await onboardingService.storeStepTwoData({
        ...data,
        isApproved: true,
      });

      if (response.status) {
        const updatedData = {
          ...data,
          isApproved: true as const,
          logo: response.data?.logo || data.logo,
          cover_image: response.data?.cover_image || data.cover_image,
        };

        globalForm.setValue("stepTwo", updatedData);

        if (response.data?.logo && typeof response.data.logo === "string") {
          setLogoUrl(response.data.logo);
          setLogoFiles([]);
        }

        if (
          response.data?.cover_image &&
          typeof response.data.cover_image === "string"
        ) {
          setCoverUrl(response.data.cover_image);
          setCoverFiles([]);
        }

        setActiveField(null);

        setActiveStep(3);

        Promise.all([updateSession({ on_boarding_step: 3 }), save()]).catch(
          (error) => {
            console.error("Background save error:", error);
          },
        );
      }
    } catch {
      console.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [
    form,
    globalForm,
    logoFiles,
    coverFiles,
    updateSession,
    save,
    setActiveField,
    setActiveStep,
  ]);

  const handleContinue = useCallback(async () => {
    if (!guided.allSectionsApproved) {
      const ok = await guided.handleApproveAllSections();
      if (!ok) return;
    }
    await handleSaveAndNext();
  }, [guided, handleSaveAndNext]);

  return (
    <section>
      <OnboardingCard>
        <CardHeader>
          <OnboardingTitle>OK Let&apos;s Create Your Site</OnboardingTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-6">
              <section
                data-guided-section="branding"
                tabIndex={-1}
                className={guidedSectionSurfaceClass(
                  guided.allSectionsApproved ||
                    guided.currentSectionIndex === 0,
                  "space-y-6",
                )}
              >
                <GuidedSectionTitleBar
                  sectionIndex={0}
                  sectionId="branding"
                  guided={guided}
                  title="Branding"
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
                  <FormField
                    control={form.control}
                    name="logo"
                    render={({ field }) => (
                      <FormItem>
                        <OnboardingFieldGroupTitle>
                          Upload Your Logo
                        </OnboardingFieldGroupTitle>
                        <FormControl>
                          <div
                            className="flex flex-col justify-center items-center h-full space-y-2 bg-white/5 p-4 rounded-lg border border-white/10"
                            onClick={() => handleFieldFocus("logo")}
                          >
                            {logoUrl ? (
                              <div className="relative w-full">
                                <img
                                  src={addCacheBusting(logoUrl)}
                                  alt="Logo"
                                  className="max-h-40 object-contain mx-auto mb-2"
                                  width={100}
                                  height={100}
                                />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() =>
                                    handleRemoveLogo(field.onChange)
                                  }
                                  className="mt-2"
                                >
                                  Remove
                                </Button>
                              </div>
                            ) : (
                              <FileUploader
                                value={logoFiles}
                                onValueChange={(files) =>
                                  handleLogoFileChange(files, field.onChange)
                                }
                                maxFileCount={1}
                                maxSize={1 * 1024 * 1024}
                                onRemove={() =>
                                  handleRemoveLogo(field.onChange)
                                }
                                className="border-dashed"
                              />
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cover_image"
                    render={({ field }) => (
                      <FormItem>
                        <OnboardingFieldGroupTitle>
                          Landing Page Image
                        </OnboardingFieldGroupTitle>
                        <FormControl>
                          <div
                            className="flex flex-col justify-center items-center h-full space-y-2 bg-white/5 p-4 rounded-lg border border-white/10"
                            onClick={() => handleFieldFocus("cover_image")}
                          >
                            {coverUrl ? (
                              <div className="relative w-full">
                                <img
                                  src={addCacheBusting(coverUrl)}
                                  alt="Cover Image"
                                  className="max-h-40 object-contain mx-auto mb-2"
                                  width={100}
                                  height={100}
                                />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() =>
                                    handleRemoveCover(field.onChange)
                                  }
                                  className="mt-2"
                                >
                                  Remove
                                </Button>
                              </div>
                            ) : (
                              <FileUploader
                                value={coverFiles}
                                onValueChange={(files) =>
                                  handleCoverFileChange(files, field.onChange)
                                }
                                maxFileCount={1}
                                maxSize={1 * 1024 * 1024}
                                onRemove={() =>
                                  handleRemoveCover(field.onChange)
                                }
                                className="border-dashed"
                                enableCropping={true}
                                aspectRatio={16 / 9}
                                cropConfig={{
                                  maxSizeKB: 500,
                                  quality: 0.9,
                                  maxWidth: 1920,
                                  maxHeight: 1080,
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
                    isActive={guided.currentSectionIndex === 0}
                    hideSectionMeta
                  >
                    <GuidedSectionCoreActions guided={guided} />
                  </GuidedSectionActionFooter>
                </fieldset>
              </section>

              <section
                data-guided-section="banner"
                tabIndex={-1}
                className={guidedSectionSurfaceClass(
                  guided.allSectionsApproved ||
                    guided.currentSectionIndex === 1,
                  "space-y-6",
                )}
              >
                <GuidedSectionTitleBar
                  sectionIndex={1}
                  sectionId="banner"
                  guided={guided}
                  title="Banner text"
                />
                <fieldset
                  disabled={
                    !guided.allSectionsApproved &&
                    guided.currentSectionIndex !== 1
                  }
                  className={cn(
                    "min-w-0 border-0 p-0 m-0 space-y-6",
                    !guided.allSectionsApproved &&
                      guided.currentSectionIndex !== 1 &&
                      "pointer-events-none",
                  )}
                >
                  <FormField
                    control={form.control}
                    name="banner_heading"
                    render={({ field }) => {
                      const text =
                        typeof field.value === "string" ? field.value : "";
                      const wordCount = countWords(text);
                      return (
                        <FormItem>
                          <OnboardingFieldGroupTitle>
                            Add a Banner Heading
                          </OnboardingFieldGroupTitle>
                          <FormControl>
                            <Input
                              placeholder="Landing Page Banner Heading"
                              {...field}
                              onFocus={() => handleFieldFocus("banner_heading")}
                              onChange={(e) => {
                                field.onChange(e);
                                globalForm.setValue(
                                  "stepTwo.banner_heading",
                                  e.target.value,
                                );
                              }}
                            />
                          </FormControl>
                          <div className="text-xs text-muted-foreground mt-1">
                            <span
                              className={
                                wordCount > BANNER_HEADING_MAX_WORDS
                                  ? "text-destructive"
                                  : ""
                              }
                            >
                              {wordCount}/{BANNER_HEADING_MAX_WORDS} words
                            </span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                  <FormField
                    control={form.control}
                    name="banner_sub_heading"
                    render={({ field }) => {
                      const currentLength = field.value?.length || 0;
                      const maxLength = 80;
                      return (
                        <FormItem>
                          <OnboardingFieldGroupTitle>
                            Add a Banner Sub-Heading
                          </OnboardingFieldGroupTitle>
                          <FormControl>
                            <Input
                              placeholder="e.g. Experience more Stock Brook Events"
                              {...field}
                              maxLength={maxLength}
                              onFocus={() =>
                                handleFieldFocus("banner_sub_heading")
                              }
                              onChange={(e) => {
                                field.onChange(e);
                                globalForm.setValue(
                                  "stepTwo.banner_sub_heading",
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
                  <GuidedSectionActionFooter
                    isActive={guided.currentSectionIndex === 1}
                    sectionLabel={guided.sectionFlow[1]?.label ?? "Banner"}
                    sectionProgress={`2 / ${guided.sectionFlow.length}`}
                  >
                    <GuidedSectionCoreActions guided={guided} />
                  </GuidedSectionActionFooter>
                </fieldset>
              </section>

              <section
                data-guided-section="about"
                tabIndex={-1}
                className={guidedSectionSurfaceClass(
                  guided.allSectionsApproved ||
                    guided.currentSectionIndex === 2,
                  "space-y-6",
                )}
              >
                <GuidedSectionTitleBar
                  sectionIndex={2}
                  sectionId="about"
                  guided={guided}
                  title="About section"
                />
                <fieldset
                  disabled={
                    !guided.allSectionsApproved &&
                    guided.currentSectionIndex !== 2
                  }
                  className={cn(
                    "min-w-0 border-0 p-0 m-0 space-y-6",
                    !guided.allSectionsApproved &&
                      guided.currentSectionIndex !== 2 &&
                      "pointer-events-none",
                  )}
                >
                  <FormField
                    control={form.control}
                    name="about_title"
                    render={({ field }) => {
                      const currentLength = field.value?.length || 0;
                      const maxLength = 40;
                      return (
                        <FormItem>
                          <OnboardingFieldGroupTitle>
                            Add a Title for Your Page
                          </OnboardingFieldGroupTitle>
                          <FormControl>
                            <Input
                              placeholder="e.g. Experience more Stock Brook Events or Stock Brook Events"
                              {...field}
                              maxLength={maxLength}
                              onFocus={() => handleFieldFocus("about_title")}
                              onChange={(e) => {
                                field.onChange(e);
                                globalForm.setValue(
                                  "stepTwo.about_title",
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
                  <FormField
                    control={form.control}
                    name="about_description"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <OnboardingFieldGroupTitle>
                            Write a Short Description
                          </OnboardingFieldGroupTitle>
                        </div>
                        <FormControl>
                          <TiptapEditor
                            value={field.value}
                            onChange={(value) => {
                              field.onChange(value);
                              globalForm.setValue(
                                "stepTwo.about_description",
                                value,
                              );
                            }}
                            placeholder="Write a compelling description about your business..."
                            maxLength={340}
                            maxWords={50}
                            className="min-h-[120px] w-full overflow-hidden max-w-[300px]"
                            showAIButton={true}
                            wrapText={true}
                            aiContext={{
                              banner_heading:
                                form.watch("banner_heading") || undefined,
                              banner_sub_heading:
                                form.watch("banner_sub_heading") || undefined,
                              title: form.watch("about_title") || undefined,
                              ctaText:
                                form.watch("about_link_title") || undefined,
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="about_link_title"
                    render={({ field }) => {
                      const currentLength = field.value?.length || 0;
                      const maxLength = 18;
                      return (
                        <FormItem>
                          <OnboardingFieldGroupTitle>
                            Button Text
                          </OnboardingFieldGroupTitle>
                          <FormControl>
                            <Input
                              placeholder="Explore Link Text"
                              {...field}
                              maxLength={maxLength}
                              onFocus={() =>
                                handleFieldFocus("about_link_title")
                              }
                              onChange={(e) => {
                                field.onChange(e);
                                globalForm.setValue(
                                  "stepTwo.about_link_title",
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
                  <GuidedSectionActionFooter
                    isActive={guided.currentSectionIndex === 2}
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
              />
            </form>
          </Form>
        </CardContent>
      </OnboardingCard>
    </section>
  );
}
