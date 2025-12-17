"use client";

import React, { useState, useCallback, useEffect } from "react";
import Cropper, { Area } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  RotateCw,
  ZoomIn,
  ZoomOut,
  Loader2,
  Info,
  Check,
  X,
} from "lucide-react";
import { ImageCropperProps, CropState, DEFAULT_CROPPER_CONFIG } from "./types";
import {
  getCroppedAndCompressedImage,
  formatFileSize,
  formatCompressionRatio,
} from "./crop-utils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * CropDialog Component
 * Modal dialog for cropping images with react-easy-crop
 */
export function CropDialog({
  image,
  onComplete,
  onCancel,
  config = {},
  className,
}: ImageCropperProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Merge with default config
  const mergedConfig = { ...DEFAULT_CROPPER_CONFIG, ...config };

  // Crop state
  const [cropState, setCropState] = useState<CropState>({
    crop: { x: 0, y: 0 },
    zoom: mergedConfig.initialZoom,
    rotation: 0,
    croppedAreaPixels: null,
  });

  // Image source URL
  const [imageSrc, setImageSrc] = useState<string>("");
  const [originalFile, setOriginalFile] = useState<File | null>(null);

  // Initialize image source
  useEffect(() => {
    if (image instanceof File) {
      const url = URL.createObjectURL(image);
      setImageSrc(url);
      setOriginalFile(image);

      return () => URL.revokeObjectURL(url);
    } else if (typeof image === "string") {
      setImageSrc(image);
    }
  }, [image]);

  // Handle crop change
  const onCropChange = useCallback((location: { x: number; y: number }) => {
    setCropState((prev) => ({ ...prev, crop: location }));
  }, []);

  // Handle zoom change
  const onZoomChange = useCallback((zoom: number) => {
    setCropState((prev) => ({ ...prev, zoom }));
  }, []);

  // Handle crop complete (when user stops dragging)
  const onCropComplete = useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      setCropState((prev) => ({ ...prev, croppedAreaPixels }));
    },
    []
  );

  // Rotate image 90 degrees clockwise
  const handleRotate = useCallback(() => {
    setCropState((prev) => ({
      ...prev,
      rotation: (prev.rotation + 90) % 360,
    }));
  }, []);

  // Handle save - crop, compress, and return
  const handleSave = async () => {
    if (!cropState.croppedAreaPixels || !originalFile) {
      toast.error("Please adjust the crop area before saving");
      return;
    }

    setIsProcessing(true);

    try {
      const croppedImage = await getCroppedAndCompressedImage(
        imageSrc,
        cropState.croppedAreaPixels,
        cropState.rotation,
        originalFile,
        mergedConfig
      );

      // Show success message with compression details
      if (croppedImage.compressionRatio > 0.1) {
        toast.success(
          `Image optimized! ${formatFileSize(
            croppedImage.originalSize
          )} → ${formatFileSize(
            croppedImage.croppedSize
          )} (${formatCompressionRatio(croppedImage.compressionRatio)} saved)`
        );
      }

      onComplete(croppedImage);
      setIsOpen(false);
    } catch (error) {
      console.error("Error cropping image:", error);
      toast.error("Failed to crop image. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setIsOpen(false);
    onCancel();
  };

  // Aspect ratio label
  const getAspectRatioLabel = () => {
    if (!mergedConfig.aspectRatio) return "Free crop";
    if (mergedConfig.aspectRatio === 1) return "Square (1:1)";
    if (mergedConfig.aspectRatio === 16 / 9) return "Landscape (16:9)";
    if (mergedConfig.aspectRatio === 21 / 9) return "Cinematic (21:9)";
    if (mergedConfig.aspectRatio === 3 / 4) return "Portrait (3:4)";
    return `Custom (${mergedConfig.aspectRatio.toFixed(2)})`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        className={cn("max-w-4xl h-[90vh] flex flex-col", className)}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-black">
            Crop & Optimize Image
          </DialogTitle>
          <DialogDescription className="text-black">
            Adjust the crop area, zoom, and rotation. The image will be
            automatically optimized for web use.
          </DialogDescription>
        </DialogHeader>

        {/* Cropper Area */}
        <div className="relative flex-1 bg-black/5 rounded-lg overflow-hidden">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={cropState.crop}
              zoom={cropState.zoom}
              rotation={cropState.rotation}
              aspect={mergedConfig.aspectRatio}
              onCropChange={onCropChange}
              onZoomChange={onZoomChange}
              onCropComplete={onCropComplete}
              minZoom={mergedConfig.minZoom}
              maxZoom={mergedConfig.maxZoom}
              style={{
                containerStyle: {
                  backgroundColor: "#f3f4f6",
                },
              }}
            />
          )}
        </div>

        {/* Controls */}
        <div className="space-y-4 py-4">
          {/* Aspect Ratio Info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground text-black">
            <Info className="h-4 w-4" />
            <span>Aspect Ratio: {getAspectRatioLabel()}</span>
          </div>

          {/* Zoom Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Zoom</Label>
              <span className="text-xs text-muted-foreground text-black">
                {Math.round(cropState.zoom * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ZoomOut className="h-4 w-4 text-muted-foreground text-black" />
              <Slider
                value={[cropState.zoom]}
                onValueChange={([zoom]) => onZoomChange(zoom)}
                min={mergedConfig.minZoom}
                max={mergedConfig.maxZoom}
                step={0.1}
                className="flex-1"
              />
              <ZoomIn className="h-4 w-4 text-muted-foreground text-black" />
            </div>
          </div>

          {/* Rotation Control */}
          {mergedConfig.enableRotation && (
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-black">Rotation</Label>
              <Button
                type="button"
                variant="event-outline"
                size="sm"
                onClick={handleRotate}
                className="gap-2"
              >
                <RotateCw className="h-4 w-4" />
                Rotate 90°
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="event-outline"
            onClick={handleCancel}
            disabled={isProcessing}
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button
            type="button"
            variant="event-primary"
            onClick={handleSave}
            disabled={isProcessing || !cropState.croppedAreaPixels}
            className="gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Save & Next
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
