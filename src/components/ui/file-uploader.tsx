"use client";

import * as React from "react";
import { FileText, Upload, X } from "lucide-react";
import Dropzone, {
  type DropzoneProps,
  type FileRejection,
} from "react-dropzone";
import { toast } from "sonner";

import { cn, formatBytes, formatFileUploadError } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useControllableState } from "@/hooks/use-controllable-state";
import { CropDialog } from "@/components/ui/image-cropper";
import {
  CropperConfig,
  CroppedImage,
} from "@/components/ui/image-cropper/types";
import { autoCompressImages } from "@/components/ui/image-cropper/auto-compress";

interface FileUploaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Value of the uploader.
   * @type File[]
   * @default undefined
   * @example value={files}
   */
  value?: File[];

  /**
   * Function to be called when the value changes.
   * @type (files: File[]) => void
   * @default undefined
   * @example onValueChange={(files) => setFiles(files)}
   */
  onValueChange?: (files: File[]) => void;

  /**
   * Function to be called when files are uploaded.
   * @type (files: File[]) => Promise<void>
   * @default undefined
   * @example onUpload={(files) => uploadFiles(files)}
   */
  onUpload?: (files: File[]) => Promise<void>;

  /**
   * Progress of the uploaded files.
   * @type Record<string, number> | undefined
   * @default undefined
   * @example progresses={{ "file1.png": 50 }}
   */
  progresses?: Record<string, number>;

  /**
   * Accepted file types for the uploader.
   * @type { [key: string]: string[]}
   * @default
   * ```ts
   * { "image/*": [] }
   * ```
   * @example accept={["image/png", "image/jpeg"]}
   */
  accept?: DropzoneProps["accept"];

  /**
   * Maximum file size for the uploader.
   * @type number | undefined
   * @default 1024 * 1024 * 2 // 2MB
   * @example maxSize={1024 * 1024 * 2} // 2MB
   */
  maxSize?: DropzoneProps["maxSize"];

  /**
   * Maximum number of files for the uploader.
   * @type number | undefined
   * @default 1
   * @example maxFileCount={4}
   */
  maxFileCount?: DropzoneProps["maxFiles"];

  /**
   * Whether the uploader should accept multiple files.
   * @type boolean
   * @default false
   * @example multiple
   */
  multiple?: boolean;

  /**
   * Whether the uploader is disabled.
   * @type boolean
   * @default false
   * @example disabled
   */
  disabled?: boolean;
  /**
   * Custom onRemove function that handles the deletion of file from parent component
   * @returns
   */

  onRemove?: (index?: string | number) => void;

  /**
   * Enable image cropping before upload (only for images)
   * @type boolean
   * @default false
   * @example enableCropping={true}
   */
  enableCropping?: boolean;

  /**
   * Aspect ratio for image cropping
   * @type number | undefined
   * @default undefined (free crop)
   * @example aspectRatio={16/9}
   */
  aspectRatio?: number;

  /**
   * Additional cropper configuration
   * @type CropperConfig
   * @default {}
   * @example cropConfig={{ maxSizeKB: 500, quality: 0.9 }}
   */
  cropConfig?: CropperConfig;

  /**
   * Enable automatic compression for images that exceed size limits
   * Images will be compressed automatically before validation
   * @type boolean
   * @default true
   * @example autoCompress={true}
   */
  autoCompress?: boolean;

  /**
   * Maximum file size in MB for auto-compression
   * Images larger than this will be automatically compressed
   * @type number
   * @default 2
   * @example autoCompressMaxSizeMB={2}
   */
  autoCompressMaxSizeMB?: number;

  /**
   * When true, label shows "X more images" (for gallery/add-more contexts) instead of "X files"
   * @type boolean
   * @default false
   */
  moreLabel?: boolean;
}

export function FileUploader(props: FileUploaderProps) {
  const {
    value: valueProp,
    onValueChange,
    onUpload,
    onRemove: propOnRemove,
    progresses,
    accept = {
      "image/*": [],
    },
    maxSize = 1024 * 1024 * 2,
    maxFileCount = 1,
    multiple = false,
    disabled = false,
    enableCropping = false,
    aspectRatio,
    cropConfig = {},
    autoCompress = true,
    autoCompressMaxSizeMB = 2,
    moreLabel = false,
    className,
    ...dropzoneProps
  } = props;

  // Detect if video types are in the accept prop
  const isVideoUploader = React.useMemo(() => {
    if (!accept) return false;
    const acceptKeys = Object.keys(accept);
    return acceptKeys.some((key) => key.startsWith("video/"));
  }, [accept]);

  const [files, setFiles] = useControllableState({
    prop: valueProp,
    onChange: onValueChange,
  });

  // Cropping state
  const [cropDialogOpen, setCropDialogOpen] = React.useState(false);
  const [fileToCrop, setFileToCrop] = React.useState<File | null>(null);
  const [pendingFiles, setPendingFiles] = React.useState<File[]>([]);

  // const onDrop = React.useCallback(
  //     (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
  //         console.log(rejectedFiles,'rejectedFiles');

  //         if (!multiple && maxFileCount === 1 && acceptedFiles.length > 1) {
  //             toast.error("Cannot upload more than 1 file at a time")
  //             return
  //         }

  //         if ((files?.length ?? 0) + acceptedFiles.length > maxFileCount) {
  //             toast.error(`Cannot upload more than ${maxFileCount} files`)
  //             return
  //         }

  //         const newFiles = acceptedFiles.map((file) =>
  //             Object.assign(file, {
  //                 preview: URL.createObjectURL(file),
  //             })
  //         )

  //         const updatedFiles = files ? [...files, ...newFiles] : newFiles

  //         setFiles(updatedFiles)

  //         if (rejectedFiles.length > 0) {
  //             rejectedFiles.forEach(({ file }) => {
  //                 toast.error(`File ${file.name} was rejected`)
  //             })
  //         }

  //         if (
  //             onUpload &&
  //             updatedFiles.length > 0 &&
  //             updatedFiles.length <= maxFileCount
  //         ) {
  //             const target =
  //                 updatedFiles.length > 0 ? `${updatedFiles.length} files` : `file`

  //             toast.promise(onUpload(updatedFiles), {
  //                 loading: `Uploading ${target}...`,
  //                 success: () => {
  //                     setFiles([])
  //                     return `${target} uploaded`
  //                 },
  //                 error: `Failed to upload ${target}`,
  //             })
  //         }
  //     },

  //     [files, maxFileCount, multiple, onUpload, setFiles]
  // )
  // Check if file is an image
  const isImageFile = (file: File): boolean => {
    return file.type.startsWith("image/");
  };

  // Handle cropping completion
  const handleCropComplete = React.useCallback(
    (croppedImage: CroppedImage) => {
      setCropDialogOpen(false);
      setFileToCrop(null);

      // Add the cropped file
      const newFiles = [croppedImage.file].map((file) =>
        Object.assign(file, {
          preview: croppedImage.previewUrl,
        })
      );

      const updatedFiles = files ? [...files, ...newFiles] : newFiles;

      // Update files state AND explicitly call onValueChange
      setFiles(updatedFiles);
      onValueChange?.(updatedFiles);

      // Process any remaining pending files
      if (pendingFiles.length > 0) {
        const [nextFile, ...rest] = pendingFiles;
        setPendingFiles(rest);
        setFileToCrop(nextFile);
        setCropDialogOpen(true);
      } else if (
        onUpload &&
        updatedFiles.length > 0 &&
        updatedFiles.length <= maxFileCount
      ) {
        const target =
          updatedFiles.length > 0 ? `${updatedFiles.length} files` : `file`;

        toast.promise(onUpload(updatedFiles), {
          loading: `Uploading ${target}...`,
          success: () => {
            setFiles([]);
            return `${target} uploaded`;
          },
          error: `Failed to upload ${target}`,
        });
      }
    },
    [files, pendingFiles, maxFileCount, onUpload, setFiles, onValueChange]
  );

  // Handle cropping cancellation
  const handleCropCancel = React.useCallback(() => {
    setCropDialogOpen(false);
    setFileToCrop(null);
    setPendingFiles([]);
    toast.info("Image upload cancelled");
  }, []);

  const onDrop = React.useCallback(
    async (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      if (!multiple && maxFileCount === 1 && acceptedFiles.length > 1) {
        toast.error("Cannot upload more than 1 file at a time");
        return;
      }

      if ((files?.length ?? 0) + acceptedFiles.length > maxFileCount) {
        toast.error(`Cannot upload more than ${maxFileCount} files`);
        return;
      }

      // AUTO-COMPRESS: Handle rejected image files that were rejected due to size
      // Compress them automatically and add to accepted files
      let processedFiles = [...acceptedFiles];

      if (autoCompress && rejectedFiles.length > 0) {
        const rejectedImageFiles: File[] = [];

        rejectedFiles.forEach(({ file, errors }) => {
          // Check if this is an image file rejected due to size
          const isSizeError = errors.some(
            (error) =>
              error.message.includes("larger than") ||
              error.code === "file-too-large"
          );

          if (isImageFile(file) && isSizeError) {
            // This image was rejected for size - we'll compress it
            rejectedImageFiles.push(file);
          } else {
            // Non-image file or other error - show error toast
            errors.forEach((error) => {
              const formattedMessage = formatFileUploadError(error.message);
              toast.error(
                `File ${file.name} was rejected: ${formattedMessage}`
              );
            });
          }
        });

        // Compress rejected image files
        if (rejectedImageFiles.length > 0) {
          try {
            toast.info(
              `Compressing ${rejectedImageFiles.length} large image${
                rejectedImageFiles.length > 1 ? "s" : ""
              }...`,
              { duration: 2000 }
            );

            const compressedFiles = await autoCompressImages(
              rejectedImageFiles,
              {
                maxSizeMB: autoCompressMaxSizeMB,
                maxWidthOrHeight: 1920,
                quality: 0.85,
                useWebWorker: true,
              }
            );

            // Add compressed files to processed files
            processedFiles = [...processedFiles, ...compressedFiles];
          } catch (error) {
            console.warn("Auto-compression failed:", error);
            toast.error(
              "Failed to compress some images. Please try smaller files."
            );
          }
        }
      }

      // Also compress accepted image files that exceed the target size
      if (autoCompress && processedFiles.length > 0) {
        try {
          const largeImages = processedFiles.filter(
            (file) =>
              isImageFile(file) &&
              file.size > autoCompressMaxSizeMB * 1024 * 1024
          );

          if (largeImages.length > 0) {
            // Compress large accepted images silently (no toast, already accepted)
            processedFiles = await autoCompressImages(processedFiles, {
              maxSizeMB: autoCompressMaxSizeMB,
              maxWidthOrHeight: 1920,
              quality: 0.85,
              useWebWorker: true,
            });
          }
        } catch (error) {
          console.warn("Auto-compression failed, using original files:", error);
        }
      }

      // Check if we need cropping for images
      if (enableCropping && processedFiles.length > 0) {
        // Filter only image files for cropping
        const imagesToCrop = processedFiles.filter(isImageFile);
        const otherFiles = processedFiles.filter((f) => !isImageFile(f));

        if (imagesToCrop.length > 0) {
          // Start cropping workflow
          const [firstImage, ...restImages] = imagesToCrop;
          setFileToCrop(firstImage);
          setPendingFiles([...restImages, ...otherFiles]);
          setCropDialogOpen(true);
          return;
        }
      }

      // Normal flow (no cropping or non-image files)
      const newFiles = processedFiles.map((file) =>
        Object.assign(file, {
          preview: URL.createObjectURL(file),
        })
      );

      const updatedFiles = files ? [...files, ...newFiles] : newFiles;

      setFiles(updatedFiles);

      // Explicitly call onValueChange to ensure parent receives the files
      onValueChange?.(updatedFiles);

      if (
        onUpload &&
        updatedFiles.length > 0 &&
        updatedFiles.length <= maxFileCount
      ) {
        const target =
          updatedFiles.length > 0 ? `${updatedFiles.length} files` : `file`;

        toast.promise(onUpload(updatedFiles), {
          loading: `Uploading ${target}...`,
          success: () => {
            setFiles([]);
            return `${target} uploaded`;
          },
          error: `Failed to upload ${target}`,
        });
      }
    },
    [
      files,
      maxFileCount,
      multiple,
      onUpload,
      setFiles,
      maxSize,
      enableCropping,
      aspectRatio,
      autoCompress,
      autoCompressMaxSizeMB,
    ]
  );
  function onRemove(index: number) {
    if (!files) return;

    if (typeof propOnRemove === "function") {
      propOnRemove(index);
    }
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    onValueChange?.(newFiles);
  }

  // Revoke preview url when component unmounts
  React.useEffect(() => {
    return () => {
      if (!files) return;
      files.forEach((file) => {
        if (isFileWithPreview(file)) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDisabled = disabled || (files?.length ?? 0) >= maxFileCount;

  return (
    <>
      <div className="relative flex flex-col gap-6 overflow-hidden">
        <Dropzone
          onDrop={onDrop}
          accept={accept}
          // When autoCompress is enabled, allow very large files to pass validation
          // We'll compress image files automatically in onDrop
          // 100MB limit allows most images to pass, then we compress them
          maxSize={autoCompress ? 100 * 1024 * 1024 : maxSize}
          maxFiles={maxFileCount}
          multiple={maxFileCount > 1 || multiple}
          disabled={isDisabled}
        >
          {({ getRootProps, getInputProps, isDragActive }) => (
            <div
              {...getRootProps()}
              className={cn(
                "group relative grid h-52 w-full cursor-pointer place-items-center rounded-lg border-2 border-dashed border-muted-foreground/25 px-5 py-2.5 text-center transition hover:bg-muted/25",
                "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isDragActive && "border-muted-foreground/50",
                isDisabled && "pointer-events-none opacity-60",
                className
              )}
              {...dropzoneProps}
            >
              <input {...getInputProps()} />
              {isDragActive ? (
                <div className="flex flex-col items-center justify-center gap-4 sm:px-5">
                  <div className="rounded-full border border-dashed p-3">
                    <Upload
                      className="size-7 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </div>
                  <p className="font-medium text-muted-foreground">
                    Drop the files here
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 sm:px-5">
                  <div className="rounded-full border border-dashed p-3">
                    <Upload
                      className="size-7 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="flex flex-col gap-px">
                    <p className="font-medium text-muted-foreground">
                      Drag {`'n'`} drop files here, or click to select files
                    </p>
                    <p className="text-sm text-muted-foreground/70">
                      {moreLabel
                        ? maxFileCount > 1
                          ? `You can add ${maxFileCount === Infinity ? "more" : maxFileCount} more images`
                          : "You can add 1 more image"
                        : `You can upload${
                            maxFileCount > 1
                              ? ` ${
                                  maxFileCount === Infinity
                                    ? "multiple"
                                    : maxFileCount
                                } files`
                              : ` a file`
                          }`}
                      {!isVideoUploader && autoCompress
                        ? ` (images will be automatically optimized)`
                        : ` (up to ${formatBytes(maxSize)} each)`}
                    </p>
                    {!isVideoUploader && (enableCropping || autoCompress) && (
                      <p className="text-xs text-blue-600 font-medium mt-1">
                        {enableCropping && autoCompress
                          ? "✂️ Images will be cropped & optimized automatically"
                          : enableCropping
                          ? "✂️ Images will be cropped automatically"
                          : "🔄 Images will be optimized automatically"}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </Dropzone>
        {files?.length ? (
          <ScrollArea className="h-fit w-full">
            <div className="flex max-h-48 flex-col gap-4">
              {files?.map((file, index) => (
                <FileCard
                  key={index}
                  file={file}
                  onRemove={() => onRemove(index)}
                  progress={progresses?.[file.name]}
                />
              ))}
            </div>
          </ScrollArea>
        ) : null}
      </div>

      {/* Crop Dialog */}
      {cropDialogOpen && fileToCrop && (
        <CropDialog
          image={fileToCrop}
          onComplete={handleCropComplete}
          onCancel={handleCropCancel}
          config={{
            ...cropConfig,
            aspectRatio: aspectRatio,
          }}
        />
      )}
    </>
  );
}

interface FileCardProps {
  file: File;
  onRemove: () => void;
  progress?: number;
}

function FileCard({ file, progress, onRemove }: FileCardProps) {
  return (
    <div className="relative flex items-center">
      <div className="flex flex-1">
        {isFileWithPreview(file) ? <FilePreview file={file} /> : null}
        <div className="flex w-full flex-col gap-2">
          <div className="flex flex-col gap-px">
            <p className="line-clamp-1 text-sm font-medium text-foreground/80">
              {file.name.slice(0, 20) + "..."}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatBytes(file.size)}
            </p>
          </div>
          {progress ? <Progress value={progress} /> : null}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-7"
          onClick={onRemove}
        >
          <X className="size-4" aria-hidden="true" />
          <span className="sr-only">Remove file</span>
        </Button>
      </div>
    </div>
  );
}

function isFileWithPreview(file: File): file is File & { preview: string } {
  return "preview" in file && typeof file.preview === "string";
}

interface FilePreviewProps {
  file: File & { preview: string };
}

function FilePreview({ file }: FilePreviewProps) {
  if (file.type.startsWith("image/")) {
    return (
      <img
        src={file.preview}
        alt={file.name}
        className="w-12 h-12 aspect-square shrink-0 rounded-md object-cover"
      />
    );
  }

  return (
    <FileText className="size-10 text-muted-foreground" aria-hidden="true" />
  );
}
