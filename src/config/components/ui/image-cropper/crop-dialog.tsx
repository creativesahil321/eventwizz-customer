"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
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
  Maximize2,
} from "lucide-react";
import { ImageCropperProps, CropState, DEFAULT_CROPPER_CONFIG } from "./types";
import {
  createDownscaledPreviewUrl,
  getCroppedAndCompressedImage,
  getOptimizedFullImage,
  formatFileSize,
  formatCompressionRatio,
  resolveCropPreviewMaxDimension,
} from "./crop-utils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function getAspectRatioLabel(aspectRatio: number | undefined): string {
  if (!aspectRatio) return "Free crop";
  if (aspectRatio === 1) return "Square (1:1)";
  if (aspectRatio === 16 / 9) return "Landscape (16:9)";
  if (aspectRatio === 21 / 9) return "Cinematic (21:9)";
  if (aspectRatio === 3 / 4) return "Portrait (3:4)";
  if (aspectRatio === 4 / 3) return "Landscape (4:3)";
  if (aspectRatio === 3 / 2) return "Landscape (3:2)";
  return `Custom (${aspectRatio.toFixed(2)})`;
}

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
  const [previewLoading, setPreviewLoading] = useState(false);
  const finishedRef = useRef(false);

  // Merge with default config
  const mergedConfig = { ...DEFAULT_CROPPER_CONFIG, ...config };

  const recommendedAspect = config.aspectRatio;
  const [activeAspect, setActiveAspect] = useState<number | undefined>(
    recommendedAspect
  );

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

  // Initialize image source (downscale huge files before crop UI — matches onboarding speed)
  useEffect(() => {
    if (image instanceof File) {
      setOriginalFile(image);
      setImageSrc("");
      setPreviewLoading(true);
      let revokePreview = () => {};

      const maxDim = resolveCropPreviewMaxDimension(mergedConfig);
      void createDownscaledPreviewUrl(image, maxDim)
        .then(({ url, revoke }) => {
          revokePreview = revoke;
          setImageSrc(url);
        })
        .catch(() => {
          const url = URL.createObjectURL(image);
          revokePreview = () => URL.revokeObjectURL(url);
          setImageSrc(url);
        })
        .finally(() => setPreviewLoading(false));

      return () => {
        revokePreview();
        setPreviewLoading(false);
      };
    }
    if (typeof image === "string") {
      setImageSrc(image);
      setPreviewLoading(false);
    }
  }, [image, mergedConfig.maxWidth, mergedConfig.maxHeight]);

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

  const handleAspectChange = useCallback(
    (next: number | undefined) => {
      // Re-clicking the already-active mode used to clear croppedAreaPixels and
      // leave Save disabled — react-easy-crop only re-fires onCropComplete after
      // a remount or user drag.
      if (next === activeAspect) return;

      setActiveAspect(next);
      setCropState((prev) => ({
        ...prev,
        crop: { x: 0, y: 0 },
        zoom: mergedConfig.initialZoom,
        croppedAreaPixels: null,
      }));
    },
    [activeAspect, mergedConfig.initialZoom]
  );

  const finishWithResult = useCallback(
    (croppedImage: Awaited<ReturnType<typeof getOptimizedFullImage>>) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
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
    },
    [onComplete]
  );

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
      finishWithResult(croppedImage);
    } catch (error) {
      console.error("Error cropping image:", error);
      toast.error("Failed to crop image. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  /** Keep the entire uploaded image — optimize only, no crop. */
  const handleUseFullImage = async () => {
    if (!originalFile) {
      toast.error("Image is still loading. Please wait.");
      return;
    }

    setIsProcessing(true);
    try {
      const optimized = await getOptimizedFullImage(originalFile, mergedConfig);
      finishWithResult(optimized);
    } catch (error) {
      console.error("Error optimizing full image:", error);
      toast.error("Failed to optimize image. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = useCallback(() => {
    if (finishedRef.current) {
      setIsOpen(false);
      return;
    }
    finishedRef.current = true;
    setIsOpen(false);
    onCancel();
  }, [onCancel]);

  const handleOpenChange = (open: boolean) => {
    if (isProcessing) return;
    if (!open) {
      handleCancel();
      return;
    }
    setIsOpen(true);
  };

  const showAspectToggle = recommendedAspect !== undefined;
  const isFreeActive = activeAspect === undefined;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn("max-w-4xl h-[90vh] flex flex-col", className)}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-black">
            Crop & Optimize Image
          </DialogTitle>
          <DialogDescription className="text-black">
            {recommendedAspect
              ? `Frame your image to ${getAspectRatioLabel(recommendedAspect)} so it matches the live banner. Zoom and reposition as needed — the image is optimized automatically.`
              : "Adjust the crop area, zoom, and rotation — or use the full image. The image will be automatically optimized for web use."}
          </DialogDescription>
        </DialogHeader>

        {/* Cropper Area */}
        <div className="relative flex-1 bg-black/5 rounded-lg overflow-hidden">
          {previewLoading ? (
            <div className="flex h-full min-h-[280px] items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Preparing image…
            </div>
          ) : null}
          {imageSrc && !previewLoading ? (
            <Cropper
              // Remount when aspect/rotation changes so onCropComplete fires
              // with the new frame (otherwise Save can stay disabled).
              key={`crop-${activeAspect ?? "free"}-${cropState.rotation}`}
              image={imageSrc}
              crop={cropState.crop}
              zoom={cropState.zoom}
              rotation={cropState.rotation}
              aspect={activeAspect}
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
          ) : null}
        </div>

        {/* Controls */}
        <div className="space-y-4 py-4">
          {/* Aspect Ratio */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground text-black">
                <Info className="h-4 w-4 shrink-0" />
                <span>Aspect Ratio: {getAspectRatioLabel(activeAspect)}</span>
              </div>
              <Button
                type="button"
                variant="event-outline"
                size="sm"
                onClick={handleUseFullImage}
                disabled={isProcessing || previewLoading || !originalFile}
                className="gap-2"
              >
                <Maximize2 className="h-4 w-4" />
                Use full image
              </Button>
            </div>
            {showAspectToggle ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={
                    !isFreeActive ? "event-primary" : "event-outline"
                  }
                  onClick={() => handleAspectChange(recommendedAspect)}
                  disabled={isProcessing}
                >
                  {getAspectRatioLabel(recommendedAspect)}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={isFreeActive ? "event-primary" : "event-outline"}
                  onClick={() => handleAspectChange(undefined)}
                  disabled={isProcessing}
                >
                  Free crop
                </Button>
              </div>
            ) : null}
            {isFreeActive ? (
              <p className="text-xs text-muted-foreground">
                Drag the crop corners to include as much of the image as you
                want, or click &quot;Use full image&quot; to keep everything.
              </p>
            ) : null}
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
            disabled={
              isProcessing || previewLoading || !cropState.croppedAreaPixels
            }
            className="gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Optimizing image…
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
