"use client";

import React, { useCallback, useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { FileUploader } from "@/components/ui/file-uploader";
import { Trash, PlusCircle, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { Accept } from "react-dropzone";
import { useEventFormContext } from "../../events-form-provider";
import { StepTwoType, stepTwoSchema } from "../schema";
import { eventsService } from "@/services/vendor/events/events.service";
import { addCacheBusting } from "@/lib/image-utils";

// Define interfaces for gallery items and files with preview
interface FileWithPreview extends File {
  preview?: string;
}

interface GalleryItem {
  id: number;
  url: string;
  preview?: string;
}

export default function PackageTab() {
  // Access the GLOBAL form context
  const {
    form: globalForm,
    save,
    isLoading: globalLoading,
    setActiveField,
  } = useEventFormContext();

  // Get event_id from stepOne safely
  const getEventId = (): number => {
    const stepOne = globalForm.getValues().stepOne;
    if (stepOne && typeof stepOne === "object" && "event_id" in stepOne) {
      return Number(stepOne.event_id) || 0;
    }
    return 0;
  };

  // Create a LOCAL form instance with its own validation
  const form = useForm<StepTwoType>({
    resolver: zodResolver(stepTwoSchema),
    defaultValues: {
      step: 2,
      event_id: getEventId(),
      package_image: globalForm.getValues().stepTwo?.package_image,
      package_title: globalForm.getValues().stepTwo?.package_title || "",
      package_description:
        globalForm.getValues().stepTwo?.package_description || "",
      package_button_name:
        globalForm.getValues().stepTwo?.package_button_name || "",
      package_details: globalForm.getValues().stepTwo?.package_details || [
        { title: "" },
      ],
      gallery: globalForm.getValues().stepTwo?.gallery || [],
    },
    mode: "onChange",
    reValidateMode: "onChange",
  });

  // Setup field array for package details
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "package_details",
  });

  // State for file management
  const [packageImage, setPackageImage] = useState<FileWithPreview[]>([]);
  const [packageImageUrl, setPackageImageUrl] = useState<string | null>(null);

  // Drag & drop state for gallery reordering
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [draggedOverItem, setDraggedOverItem] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Sync local form changes to global form
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (name && type === "change") {
        const fieldName = name as keyof StepTwoType;
        globalForm.setValue("stepTwo", {
          ...globalForm.getValues().stepTwo,
          [fieldName]: value[fieldName],
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [form, globalForm]);

  // Initialize URL value from form on mount
  useEffect(() => {
    const packageImageValue = form.watch("package_image");

    // Check if value is a string URL
    if (typeof packageImageValue === "string" && packageImageValue) {
      setPackageImageUrl(packageImageValue);
    } else if (packageImageValue instanceof File) {
      setPackageImage([packageImageValue]);
    }
  }, [form]);

  // Handle field focus for tracking active field
  const handleFieldFocus = useCallback(
    (fieldName: string) => {
      setActiveField?.(fieldName);
    },
    [setActiveField]
  );

  // Handle file change for package image
  const handleFileChange = useCallback(
    (files: FileWithPreview[]) => {
      if (!files.length) return;

      const file = files[0];

      // Validate file is actually an image
      if (!file.type.startsWith("image/")) {
        toast.error(
          "Only image files are allowed. Please select a JPG, PNG, or other image file."
        );
        return;
      }

      // Create a preview URL if it doesn't exist
      if (!file.preview) {
        file.preview = URL.createObjectURL(file);
      }

      setPackageImage(files);
      setPackageImageUrl(null); // Clear URL when new file is uploaded

      // Update form state immediately
      form.setValue("package_image", file);

      // Sync with global form
      globalForm.setValue("stepTwo.package_image", file);
    },
    [form, globalForm]
  );

  // Handle removing package image
  const handleRemovePackage = useCallback(() => {
    // Clean up preview URLs
    if (packageImage.length > 0 && packageImage[0].preview) {
      URL.revokeObjectURL(packageImage[0].preview);
    }

    setPackageImage([]);
    setPackageImageUrl(null);

    form.setValue("package_image", null);
    globalForm.setValue("stepTwo.package_image", null);
  }, [packageImage, form, globalForm]);

  // Clean up preview URLs when component unmounts
  useEffect(() => {
    return () => {
      if (packageImage.length > 0 && packageImage[0].preview) {
        URL.revokeObjectURL(packageImage[0].preview);
      }
    };
  }, [packageImage]);

  // Drag & drop handlers for gallery reordering
  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    index: number
  ) => {
    e.dataTransfer.effectAllowed = "move";
    setDraggedItem(index);
    // Hide the default drag ghost
    e.dataTransfer.setDragImage(new window.Image(), 0, 0);
  };

  const handleDragEnter = (index: number) => {
    if (draggedItem === null || draggedItem === index) return;
    setDraggedOverItem(index);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>,
    gallery: Array<File | GalleryItem>
  ) => {
    e.preventDefault();

    if (
      draggedItem === null ||
      draggedOverItem === null ||
      draggedItem === draggedOverItem
    ) {
      setDraggedItem(null);
      setDraggedOverItem(null);
      return;
    }

    // Reorder the items
    const items = [...gallery];
    const item = items[draggedItem];
    items.splice(draggedItem, 1);
    items.splice(draggedOverItem, 0, item);

    // Update form state
    form.setValue("gallery", items);
    globalForm.setValue("stepTwo.gallery", items);

    // Reset drag state
    setDraggedItem(null);
    setDraggedOverItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDraggedOverItem(null);
  };

  // Handle form submission
  const handleSubmit = useCallback(
    async (data: StepTwoType) => {
      setIsLoading(true);

      try {
        // Manually re-trigger validation on all fields to force error display
        const isValid = await form.trigger();

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

        // SAFETY CHECK: Ensure package image is included if we have it in state
        if (packageImage.length > 0 && !data.package_image) {
          data.package_image = packageImage[0];
        }

        // Update global form with all fields
        globalForm.setValue("stepTwo", {
          ...globalForm.getValues().stepTwo,
          ...data,
        });

        // Call the API directly using eventsService
        const response = await eventsService.storeStepTwoData(data);

        if (response && response.status) {
          // Sync form with saved gallery from response (cap at 8; backend may return more until delete logic is fixed)
          const responseData = response.data as
            | { gallery?: Array<{ id: number; url: string }> }
            | undefined;
          if (responseData?.gallery && Array.isArray(responseData.gallery)) {
            const cappedGallery = responseData.gallery.slice(0, 8);
            globalForm.setValue("stepTwo.gallery", cappedGallery);
            form.setValue("gallery", cappedGallery);
          }
          // Success message is handled by axios interceptor
          // Move to the next step
          await save();
        } else {
          const errorMessage =
            response?.message ||
            "Failed to save package details. Please try again.";
          toast.error("Error saving package details", {
            description: errorMessage,
          });
        }
      } catch (error) {
        console.error("Error saving package details:", error);
        toast.error("Failed to save package details");
      } finally {
        setIsLoading(false);
      }
    },
    [form, globalForm, save, setActiveField, packageImage]
  );

  return (
    <div className="space-y-8">
      <Form {...form}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.trigger().then((valid) => {
              if (valid) {
                form.handleSubmit(handleSubmit)(e);
              }
            });
          }}
          className="space-y-6"
          noValidate
          autoComplete="off"
        >
          {/* Event Package Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold title-header">Event Package</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Package Title */}
              <FormField
                control={form.control}
                name="package_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Event Package Heading{" "}
                      <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., The Package"
                        className="h-11 bg-[#F9FAFB] border-[#E5E7EB]"
                        onFocus={() => handleFieldFocus("package_title")}
                        onChange={(e) => {
                          field.onChange(e);
                          globalForm.setValue(
                            "stepTwo.package_title",
                            e.target.value
                          );
                        }}
                        onBlur={field.onBlur}
                        value={
                          typeof field.value === "string" ? field.value : ""
                        }
                      />
                    </FormControl>
                    <FormMessage className="text-red-500 font-semibold mt-1" />
                  </FormItem>
                )}
              />

              {/* Package Description */}
              <FormField
                control={form.control}
                name="package_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Sub Heading <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., Prices From £65 Plus VAT Include:"
                        className="h-10 bg-[#F9FAFB] border-[#E5E7EB]"
                        maxLength={160}
                      />
                    </FormControl>
                    <FormMessage className="text-red-500 font-semibold mt-1" />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Package Image Section */}
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="package_image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    Package Image
                  </FormLabel>
                  <FormControl>
                    <div>
                      {packageImageUrl ? (
                        <div className="relative w-full">
                          <img
                            src={addCacheBusting(
                              (packageImageUrl as string) || ""
                            )}
                            alt="Package Image"
                            width={400}
                            height={200}
                            className="max-h-60 object-contain mx-auto mb-2"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setPackageImageUrl(null);
                              field.onChange(null);
                              globalForm.setValue(
                                "stepTwo.package_image",
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
                          onValueChange={(files) => handleFileChange(files)}
                          maxFileCount={1}
                          maxSize={1 * 1024 * 1024}
                          onRemove={handleRemovePackage}
                          className="h-60"
                          accept={["image/*"] as unknown as Accept}
                          enableCropping={true}
                          aspectRatio={4 / 3}
                          cropConfig={{
                            maxSizeKB: 300,
                            quality: 0.9,
                            maxWidth: 1024,
                            maxHeight: 768,
                          }}
                        />
                      )}
                    </div>
                  </FormControl>
                  <FormMessage className="text-red-500 font-semibold mt-1" />
                </FormItem>
              )}
            />
          </div>

          {/* Button Name Section */}
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="package_button_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    Button Name <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., Choose Now"
                      className="h-11 bg-[#F9FAFB] border-[#E5E7EB]"
                      onFocus={() => handleFieldFocus("package_button_name")}
                      onChange={(e) => {
                        field.onChange(e);
                        globalForm.setValue(
                          "stepTwo.package_button_name",
                          e.target.value
                        );
                      }}
                      onBlur={field.onBlur}
                      value={typeof field.value === "string" ? field.value : ""}
                    />
                  </FormControl>
                  <FormMessage className="text-red-500 font-semibold mt-1" />
                </FormItem>
              )}
            />
          </div>

          {/* Package Details Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold title-header">
                Package Details
              </h3>
              {fields.length < 10 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newDetail = { title: "" };
                    append(newDetail);

                    // Sync with global form
                    const currentDetails =
                      globalForm.getValues().stepTwo?.package_details || [];
                    globalForm.setValue("stepTwo.package_details", [
                      ...currentDetails,
                      newDetail,
                    ]);
                  }}
                  className="bg-white border-gray-200 text-gray-700"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Detail
                </Button>
              )}
            </div>

            {fields.map((item, index) => (
              <Card
                key={item.id}
                className="p-4 border border-gray-200 shadow-sm rounded-lg bg-white"
              >
                <CardContent className="p-0 flex items-center gap-4">
                  <FormField
                    control={form.control}
                    name={`package_details.${index}.title`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g.- VIP entrance with photo opportunities"
                            className="h-11 bg-[#F9FAFB] border-[#E5E7EB]"
                            onFocus={() =>
                              handleFieldFocus(`package_details.${index}.title`)
                            }
                            onChange={(e) => {
                              field.onChange(e);

                              // Sync with global form
                              const currentDetails = [
                                ...(globalForm.getValues().stepTwo
                                  ?.package_details || []),
                              ];
                              if (currentDetails[index]) {
                                currentDetails[index].title = e.target.value;
                                globalForm.setValue(
                                  "stepTwo.package_details",
                                  currentDetails
                                );
                              }
                            }}
                            onBlur={field.onBlur}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage className="text-red-500 font-semibold mt-1" />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      // Check if this would leave us with no package details
                      if (fields.length <= 1) {
                        toast.error("At least one package detail is required");
                        return;
                      }

                      remove(index);

                      // Sync with global form
                      const currentDetails = [
                        ...(globalForm.getValues().stepTwo?.package_details ||
                          []),
                      ];
                      currentDetails.splice(index, 1);
                      globalForm.setValue(
                        "stepTwo.package_details",
                        currentDetails
                      );
                    }}
                    disabled={fields.length <= 1}
                    className="text-red-500 h-11 w-11 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Gallery Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold title-header">
              Gallery Images
            </h3>
            <FormField
              control={form.control}
              name="gallery"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="space-y-4">
                      {/* Display gallery preview grid */}
                      {field.value && field.value.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                          {field.value.map(
                            (
                              item: File | GalleryItem | string,
                              index: number
                            ) => (
                              <div
                                key={index}
                                className={`relative aspect-square rounded-md overflow-hidden border ${
                                  index === draggedOverItem
                                    ? "border-blue-500 border-2"
                                    : index === 0
                                    ? "border-green-500"
                                    : "border-gray-200"
                                } ${
                                  draggedItem === index
                                    ? "opacity-50"
                                    : "opacity-100"
                                } transition-all cursor-move`}
                                draggable
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragEnter={() => handleDragEnter(index)}
                                onDragOver={handleDragOver}
                                onDragEnd={handleDragEnd}
                                onDrop={(e) => handleDrop(e, field.value || [])}
                              >
                                {/* Drag handle */}
                                <div className="absolute top-2 left-2 z-10 bg-white/80 rounded-full p-1 shadow-sm">
                                  <GripVertical className="h-4 w-4 text-gray-600" />
                                </div>

                                <img
                                  src={addCacheBusting(
                                    typeof item === "string"
                                      ? (item as string)
                                      : (((item as GalleryItem).url ||
                                          (item as FileWithPreview).preview ||
                                          "") as string)
                                  )}
                                  alt={`Gallery image ${index + 1}`}
                                  width={200}
                                  height={200}
                                  className="w-full h-full object-cover"
                                />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  className="absolute top-2 right-2 h-6 w-6 rounded-full"
                                  onClick={() => {
                                    const updatedItems = (
                                      field.value || []
                                    ).filter(
                                      (_: File | GalleryItem, i: number) =>
                                        i !== index
                                    );
                                    field.onChange(updatedItems);

                                    // Sync with global form
                                    globalForm.setValue(
                                      "stepTwo.gallery",
                                      updatedItems
                                    );
                                  }}
                                >
                                  <Trash className="h-3 w-3" />
                                </Button>
                                {index === 0 && (
                                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs py-1 px-2 text-center">
                                    Main Image
                                  </div>
                                )}
                              </div>
                            )
                          )}
                        </div>
                      )}

                      {/* File Uploader */}
                      {(!field.value || field.value.length < 8) && (
                        <FileUploader
                          value={[]}
                          onValueChange={(files) => {
                            const currentItems = field.value || [];
                            const newItems = [...currentItems, ...files];
                            const limitedItems = newItems.slice(0, 8);

                            field.onChange(limitedItems);

                            // Sync with global form
                            globalForm.setValue(
                              "stepTwo.gallery",
                              limitedItems
                            );
                          }}
                          maxFileCount={8 - (field.value?.length || 0)}
                          maxSize={5 * 1024 * 1024}
                          moreLabel
                          accept={{
                            "image/png": [],
                            "image/jpeg": [],
                            "image/jpg": [],
                            "image/webp": [],
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

                      {field.value && field.value.length >= 8 && (
                        <p className="text-amber-600 text-sm mt-2">
                          Maximum of 8 images reached. Remove some images to add
                          more.
                        </p>
                      )}

                      {field.value && field.value.length > 0 && (
                        <p className="text-gray-600 text-sm mt-2">
                          <strong>Tip:</strong> The first image will be used as
                          the main image.
                        </p>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage className="text-red-500 font-semibold mt-1" />
                </FormItem>
              )}
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end mt-6">
            <Button
              type="submit"
              onClick={async () => {
                // First trigger validation on all fields to show errors
                const valid = await form.trigger();
                console.log("Form validation triggered, valid:", valid);

                if (!valid) {
                  // Get errors for debugging
                  const errors = form.formState.errors;
                  const errorFields = Object.keys(errors);
                  console.log("Form errors:", errors);

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
        </form>
      </Form>
    </div>
  );
}
