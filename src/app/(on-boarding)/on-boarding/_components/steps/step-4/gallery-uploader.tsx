import { FileUploader } from "@/components/ui/file-uploader";
import { FormControl, FormItem, FormMessage } from "@/components/ui/form";
import { ControllerRenderProps } from "react-hook-form";
import React, { useEffect, useRef, useState, DragEvent } from "react";
import { StepFourType } from "../../form-provider/schema";
import { useFormContext } from "../../form-provider";
import { EVENT_GALLERY_MAX_IMAGES } from "@/lib/event-form-limits";
import { EVENT_GALLERY_MIN_IMAGES_WHEN_USED } from "@/lib/event-gallery-count";
import { OnboardingFieldGroupTitle } from "@/components/ui/typography";
import { GalleryCopyrightNotice } from "@/components/gallery-copyright-notice";
import { Button } from "@/components/ui/button";
import { Trash, GripVertical } from "lucide-react";

interface GalleryUploaderProps {
  field: ControllerRenderProps<StepFourType, "gallery">;
  scopedGalleryPath?: string;
  onExistingItemRemove?: (item: { id: number; url: string }) => void;
}

// Define an interface for files with preview
interface FileWithPreview extends File {
  preview?: string;
}

// Define interface for backend gallery items
interface GalleryItem {
  id: number;
  url: string;
}

// Gallery can contain either File objects or GalleryItem objects
type GalleryItemType = FileWithPreview | GalleryItem;

// Type guard to check if item is a File
const isFile = (item: unknown): item is File => {
  return item instanceof File;
};

// Type guard to check if item is a GalleryItem
const isGalleryItem = (item: unknown): item is GalleryItem => {
  return (
    item !== null &&
    typeof item === "object" &&
    "id" in (item as Record<string, unknown>) &&
    "url" in (item as Record<string, unknown>)
  );
};

const GalleryUploader: React.FC<GalleryUploaderProps> = ({
  field,
  scopedGalleryPath = "stepFour.gallery",
  onExistingItemRemove,
}) => {
  const { form: globalForm } = useFormContext();

  // State to track all gallery items (both Files and backend items)
  const [galleryItems, setGalleryItems] = useState<GalleryItemType[]>([]);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [draggedOverItem, setDraggedOverItem] = useState<number | null>(null);
  const uploadResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Initialize galleryItems from field.value on mount and when field.value changes
  useEffect(() => {
    if (field.value && Array.isArray(field.value)) {
      const capped =
        field.value.length > EVENT_GALLERY_MAX_IMAGES
          ? field.value.slice(0, EVENT_GALLERY_MAX_IMAGES)
          : field.value;
      setGalleryItems(capped);
      if (field.value.length > EVENT_GALLERY_MAX_IMAGES) {
        field.onChange(capped);
        globalForm.setValue(scopedGalleryPath as never, capped as never);
      }
    } else {
      setGalleryItems([]);
    }
  }, [field, field.value, globalForm, scopedGalleryPath]);

  const handleGalleryChange = (files: FileWithPreview[]) => {
    if (!files.length) return;

    setGalleryUploading(true);

    // Create preview URLs for new files
    const filesWithPreviews = files.map((file) => {
      if (!file.preview) {
        file.preview = URL.createObjectURL(file);
      }
      return file;
    });

    const currentScopedGallery = globalForm.getValues(
      scopedGalleryPath as never,
    ) as GalleryItemType[] | undefined;
    const baseItems = Array.isArray(currentScopedGallery)
      ? currentScopedGallery
      : galleryItems;

    // Append new files to existing gallery (keep all: backend items + existing Files)
    const updatedGalleryItems = [...baseItems, ...filesWithPreviews];

    const limitedGalleryItems = updatedGalleryItems.slice(
      0,
      EVENT_GALLERY_MAX_IMAGES,
    );

    setGalleryItems(limitedGalleryItems);
    field.onChange(limitedGalleryItems);
    globalForm.setValue(
      scopedGalleryPath as never,
      limitedGalleryItems as never,
    );

    if (uploadResetTimeoutRef.current) {
      clearTimeout(uploadResetTimeoutRef.current);
    }
    uploadResetTimeoutRef.current = setTimeout(() => {
      setGalleryUploading(false);
    }, 500);
  };

  const handleRemoveGalleryItem = (index: number) => {
    const itemToRemove = galleryItems[index];

    // Clean up preview URLs if item is a File
    if (isFile(itemToRemove) && (itemToRemove as FileWithPreview).preview) {
      URL.revokeObjectURL((itemToRemove as FileWithPreview).preview!);
    }
    if (isGalleryItem(itemToRemove)) {
      onExistingItemRemove?.(itemToRemove);
    }

    const updatedItems = galleryItems.filter((_, i) => i !== index);
    setGalleryItems(updatedItems);
    field.onChange(updatedItems);
    globalForm.setValue(scopedGalleryPath as never, updatedItems as never);
  };

  // Drag and drop handlers
  const handleDragStart = (e: DragEvent<HTMLDivElement>, index: number) => {
    e.dataTransfer.effectAllowed = "move";
    setDraggedItem(index);
    // Add a transparent image to hide the default drag ghost
    const img = new Image();
    img.src =
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDragEnter = (index: number) => {
    if (draggedItem === null || draggedItem === index) return;
    setDraggedOverItem(index);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
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
    const items = [...galleryItems];
    const item = items[draggedItem];
    items.splice(draggedItem, 1);
    items.splice(draggedOverItem, 0, item);

    // Update state and form
    setGalleryItems(items);
    field.onChange(items);
    globalForm.setValue(scopedGalleryPath as never, items as never);

    // Reset drag state
    setDraggedItem(null);
    setDraggedOverItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDraggedOverItem(null);
  };

  useEffect(() => {
    return () => {
      if (uploadResetTimeoutRef.current) {
        clearTimeout(uploadResetTimeoutRef.current);
      }
    };
  }, []);

  return (
    <FormItem className="w-full">
      <OnboardingFieldGroupTitle>Gallery images</OnboardingFieldGroupTitle>
      <p className="mt-1 text-sm text-slate-400">
        Optional. Skip the gallery, or add at least{" "}
        {EVENT_GALLERY_MIN_IMAGES_WHEN_USED} photos.
      </p>
      <GalleryCopyrightNotice className="mt-2 mb-4" />

      {/* Display gallery preview grid */}
      {galleryItems.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
          {galleryItems.map((item, index) => (
            <div
              key={index}
              className={`relative aspect-square rounded-md overflow-hidden border ${
                index === draggedOverItem
                  ? "border-blue-500 border-2"
                  : index === 0
                  ? "border-green-500"
                  : "border-white/15"
              } ${
                draggedItem === index ? "opacity-50" : "opacity-100"
              } transition-all cursor-move`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDrop={handleDrop}
            >
              {/* Drag handle */}
              <div className="absolute left-2 top-2 z-10 rounded-full bg-black/40 p-1 shadow-sm backdrop-blur-sm">
                <GripVertical className="h-4 w-4 text-white/80" />
              </div>

              {/* Render image preview based on type */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  isFile(item)
                    ? (item as FileWithPreview).preview
                    : isGalleryItem(item)
                    ? item.url
                    : ""
                }
                alt={`Gallery image ${index + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Remove button */}
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6 rounded-full"
                onClick={() => handleRemoveGalleryItem(index)}
              >
                <Trash className="h-3 w-3" />
              </Button>

              {/* Priority indicator for first image */}
              {index === 0 && (
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs py-1 px-2 text-center">
                  Main Image
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {galleryItems.length < EVENT_GALLERY_MAX_IMAGES && (
        <FormControl>
          <article className="w-full">
            <FileUploader
              value={[]}
              onValueChange={handleGalleryChange as (files: File[]) => void}
              maxFileCount={EVENT_GALLERY_MAX_IMAGES - galleryItems.length}
              maxSize={5 * 1024 * 1024}
              disabled={galleryUploading}
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
                maxSizeKB: 800,
                quality: 0.9,
                maxWidth: 1920,
                maxHeight: 1920,
              }}
            />
          </article>
        </FormControl>
      )}

      {galleryItems.length >= EVENT_GALLERY_MAX_IMAGES && (
        <p className="text-amber-600 text-sm mt-2">
          Maximum of {EVENT_GALLERY_MAX_IMAGES} images reached. Remove some
          images to add more.
        </p>
      )}

      {galleryItems.length > 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          <strong>Tip:</strong> Drag images to reorder them. The first image
          will be used as the main image.
        </p>
      )}

      <FormMessage />
    </FormItem>
  );
};

export default GalleryUploader;
