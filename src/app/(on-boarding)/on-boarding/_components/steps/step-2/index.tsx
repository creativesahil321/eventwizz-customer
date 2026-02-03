"use client";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
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
  OnboardingSectionTitle,
} from "@/components/ui/typography";
import { onboardingService } from "@/services/vendor/onboarding/onboarding.service";
import { toast } from "sonner";
import { TiptapEditor } from "@/components/ui/tiptap-editor";
import { useSession } from "next-auth/react";
import { addCacheBusting } from "@/lib/image-utils";

export default function StepTwo() {
  const {
    form: globalForm,
    save,
    setActiveStep,
    setActiveField,
  } = useFormContext();
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

  const handleLogoFileChange = (
    files: File[],
    onChange: (file: File | undefined) => void
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
    onChange: (file: File | undefined) => void
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

  return (
    <section>
      <OnboardingCard>
        <CardHeader>
          <OnboardingTitle>OK Let&apos;s Create Your Site</OnboardingTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-6">
              <FormField
                control={form.control}
                name="logo"
                render={({ field }) => (
                  <FormItem>
                    <OnboardingSectionTitle>
                      Upload Your Logo
                    </OnboardingSectionTitle>
                    <FormControl>
                      <div
                        className="flex flex-col justify-center items-center h-full space-y-2 bg-[#F3F4F6] p-4 rounded-md"
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
                              onClick={() => handleRemoveLogo(field.onChange)}
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
                            onRemove={() => handleRemoveLogo(field.onChange)}
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
                    <OnboardingSectionTitle>
                      Landing Page Image
                    </OnboardingSectionTitle>
                    <FormControl>
                      <div
                        className="flex flex-col justify-center items-center h-full space-y-2 bg-[#F3F4F6] p-4 rounded-md"
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
                              onClick={() => handleRemoveCover(field.onChange)}
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
                            onRemove={() => handleRemoveCover(field.onChange)}
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
              <FormField
                control={form.control}
                name="banner_heading"
                render={({ field }) => {
                  const currentLength = field.value?.length || 0;
                  const maxLength = 50;
                  return (
                    <FormItem>
                      <OnboardingSectionTitle>
                        Add a Banner Heading
                      </OnboardingSectionTitle>
                      <FormControl>
                        <Input
                          placeholder="Landing Page Banner Heading"
                          {...field}
                          maxLength={maxLength}
                          onFocus={() => handleFieldFocus("banner_heading")}
                          onChange={(e) => {
                            field.onChange(e);
                            globalForm.setValue(
                              "stepTwo.banner_heading",
                              e.target.value
                            );
                          }}
                        />
                      </FormControl>
                      <div className="text-xs text-muted-foreground mt-1">
                        <span
                          className={
                            currentLength > maxLength ? "text-destructive" : ""
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
                name="banner_sub_heading"
                render={({ field }) => {
                  const currentLength = field.value?.length || 0;
                  const maxLength = 80;
                  return (
                    <FormItem>
                      <OnboardingSectionTitle>
                        Add a Banner Sub-Heading
                      </OnboardingSectionTitle>
                      <FormControl>
                        <Input
                          placeholder="e.g. Experience more Stock Brook Events"
                          {...field}
                          maxLength={maxLength}
                          onFocus={() => handleFieldFocus("banner_sub_heading")}
                          onChange={(e) => {
                            field.onChange(e);
                            globalForm.setValue(
                              "stepTwo.banner_sub_heading",
                              e.target.value
                            );
                          }}
                        />
                      </FormControl>
                      <div className="text-xs text-muted-foreground mt-1">
                        <span
                          className={
                            currentLength > maxLength ? "text-destructive" : ""
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
                name="about_title"
                render={({ field }) => {
                  const currentLength = field.value?.length || 0;
                  const maxLength = 40;
                  return (
                    <FormItem>
                      <OnboardingSectionTitle>
                        Add a Title for Your Page
                      </OnboardingSectionTitle>
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
                              e.target.value
                            );
                          }}
                        />
                      </FormControl>
                      <div className="text-xs text-muted-foreground mt-1">
                        <span
                          className={
                            currentLength > maxLength ? "text-destructive" : ""
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
                      <OnboardingSectionTitle>
                        Write a Short Description
                      </OnboardingSectionTitle>
                    </div>
                    <FormControl>
                      <TiptapEditor
                        value={field.value}
                        onChange={(value) => {
                          field.onChange(value);
                          globalForm.setValue(
                            "stepTwo.about_description",
                            value
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
                          ctaText: form.watch("about_link_title") || undefined,
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
                      <OnboardingSectionTitle>
                        Button Text
                      </OnboardingSectionTitle>
                      <FormControl>
                        <Input
                          placeholder="Explore Link Text"
                          {...field}
                          maxLength={maxLength}
                          onFocus={() => handleFieldFocus("about_link_title")}
                          onChange={(e) => {
                            field.onChange(e);
                            globalForm.setValue(
                              "stepTwo.about_link_title",
                              e.target.value
                            );
                          }}
                        />
                      </FormControl>
                      <div className="text-xs text-muted-foreground mt-1">
                        <span
                          className={
                            currentLength > maxLength ? "text-destructive" : ""
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
              <div className="flex items-center justify-center gap-4 pt-4">
                <Button
                  variant="event-primary"
                  type="button"
                  onClick={async () => {
                    setLoading(true);
                    try {
                      // Get all form errors before triggering validation
                      const formValues = form.getValues();

                      // Check which fields are missing
                      const requiredFields = [
                        "banner_heading",
                        "banner_sub_heading",
                        "about_title",
                        "about_description",
                        "about_link_title",
                        "logo",
                        "cover_image",
                      ];
                      const missingFields = requiredFields.filter(
                        (field) => !formValues[field as keyof typeof formValues]
                      );

                      if (missingFields.length > 0) {
                        // Show toast with specific missing fields
                        toast.error(
                          `Please fill in the following required fields: ${missingFields.join(
                            ", "
                          )}`
                        );
                        // Trigger validation to show error messages on the form
                        await form.trigger(
                          missingFields as (keyof StepTwoType)[]
                        );
                        setLoading(false);
                        return;
                      }

                      // Validate entire form
                      const isValid = await form.trigger();

                      if (!isValid) {
                        // Get detailed error information
                        const errors = form.formState.errors;

                        // Show more specific error message if possible
                        const errorFields = Object.keys(errors);
                        toast.error(
                          `Please correct the highlighted fields:${errorFields.join(
                            ", "
                          )}`
                        );
                        setLoading(false);
                        return;
                      }

                      // Get form data
                      const data = form.getValues();

                      // SAFETY CHECK: Ensure files are included
                      // If files are in state but not in form data, add them manually
                      if (logoFiles.length > 0 && !data.logo) {
                        data.logo = logoFiles[0];
                      }

                      if (coverFiles.length > 0 && !data.cover_image) {
                        data.cover_image = coverFiles[0];
                      }

                      // Update global form
                      globalForm.setValue("stepTwo", data);

                      // Make API call directly
                      const response = await onboardingService.storeStepTwoData(
                        data
                      );

                      if (response.status) {
                        // Update global form with backend response
                        // Backend returns URLs (strings), preserve them as-is
                        const updatedData = {
                          ...data,
                          logo: response.data?.logo || data.logo,
                          cover_image:
                            response.data?.cover_image || data.cover_image,
                        };

                        globalForm.setValue("stepTwo", updatedData);

                        // Update preview states with backend response
                        if (
                          response.data?.logo &&
                          typeof response.data.logo === "string"
                        ) {
                          setLogoUrl(response.data.logo);
                          setLogoFiles([]); // Clear file state since we now have URL
                        }

                        if (
                          response.data?.cover_image &&
                          typeof response.data.cover_image === "string"
                        ) {
                          setCoverUrl(response.data.cover_image);
                          setCoverFiles([]); // Clear file state since we now have URL
                        }

                        setActiveField(null);

                        // INSTANT TRANSITION: Set active step FIRST for smooth UX
                        setActiveStep(3);

                        // Then handle async operations in background
                        Promise.all([
                          updateSession({ on_boarding_step: 3 }),
                          save(),
                        ]).catch((error) => {
                          console.error("Background save error:", error);
                        });
                      } else {
                        // Error toast is handled by axios interceptor
                      }
                    } catch {
                      console.error("An error occurred. Please try again.");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className=" rounded-full px-8 py-2"
                >
                  {loading ? "Saving..." : "Save & Next"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </OnboardingCard>
    </section>
  );
}
