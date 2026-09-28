"use client";

import * as React from "react";
import { CheckCircle2, FileText, Loader2, Upload, X } from "lucide-react";
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
import {
  autoCompressImage,
  autoCompressImages,
} from "@/components/ui/image-cropper/auto-compress";

/** Group dropzone rejections so "too many files" variants always merge (avoids toast spam). */
function aggregateRejectionKey(error: {
  code?: string;
  message: string;
}): string {
  const lower = error.message.toLowerCase();
  if (error.code === "too-many-files" || lower.includes("too many files")) {
    return "too-many-files";
  }
  return error.code ?? error.message;
}

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

  /** Fires while drop → crop → optimize is in progress (for parent overlays). */
  onBusyChange?: (busy: boolean) => void;
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
    autoCompress: autoCompressProp,
    autoCompressMaxSizeMB = 2,
    moreLabel = false,
    onBusyChange,
    className,
    ...dropzoneProps
  } = props;

  /**
   * One compress pass after crop when cropping is on.
   * Ignores `autoCompress={true}` with `enableCropping` so profile/onboarding stay fast.
   */
  const autoCompress = enableCropping
    ? false
    : (autoCompressProp ?? true);

  // Detect if video types are in the accept prop
  const isVideoUploader = React.useMemo(() => {
    if (!accept) return false;
    const acceptKeys = Object.keys(accept);
    return acceptKeys.some((key) => key.startsWith("video/"));
  }, [accept]);

  /** PDFs/docs only — no image crop/compress messaging */
  const isDocumentOnlyUploader = React.useMemo(() => {
    if (!accept) return false;
    const keys = Object.keys(accept);
    if (keys.length === 0) return false;
    return !keys.some(
      (key) => key.startsWith("image/") || key.startsWith("video/"),
    );
  }, [accept]);

  const isPdfOnlyUploader = React.useMemo(() => {
    if (!accept) return false;
    const keys = Object.keys(accept);
    return keys.length > 0 && keys.every((key) => key === "application/pdf");
  }, [accept]);

  const [files, setFiles] = useControllableState({
    prop: valueProp,
    onChange: onValueChange,
  });

  // Cropping state
  const [cropDialogOpen, setCropDialogOpen] = React.useState(false);
  const [fileToCrop, setFileToCrop] = React.useState<File | null>(null);
  const [pendingFiles, setPendingFiles] = React.useState<File[]>([]);
  const [imageWorkflowBusy, setImageWorkflowBusy] = React.useState(false);

  const setImageWorkflowBusyState = React.useCallback(
    (busy: boolean) => {
      setImageWorkflowBusy(busy);
      onBusyChange?.(busy);
    },
    [onBusyChange],
  );

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
        }),
      );

      const updatedFiles = files ? [...files, ...newFiles] : newFiles;

      // Update files state
      setFiles(updatedFiles);

      // Process any remaining pending files
      if (pendingFiles.length > 0) {
        const [nextFile, ...rest] = pendingFiles;
        setPendingFiles(rest);
        setFileToCrop(nextFile);
        setCropDialogOpen(true);
        setImageWorkflowBusyState(true);
      } else {
        setImageWorkflowBusyState(false);
      }

      if (pendingFiles.length > 0) {
        return;
      }

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
      pendingFiles,
      maxFileCount,
      onUpload,
      setFiles,
      setImageWorkflowBusyState,
    ],
  );

  // Handle cropping cancellation
  const handleCropCancel = React.useCallback(() => {
    setCropDialogOpen(false);
    setFileToCrop(null);
    setPendingFiles([]);
    setImageWorkflowBusyState(false);
    toast.info("Image upload cancelled");
  }, [setImageWorkflowBusyState]);

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

      // When cropping is enabled, compress only once after crop (faster — onboarding path).
      const shouldPreCompress = autoCompress && !enableCropping;
      const willOpenCropper =
        enableCropping && acceptedFiles.some((file) => isImageFile(file));

      if (willOpenCropper || shouldPreCompress) {
        setImageWorkflowBusyState(true);
      }

      let processedFiles = [...acceptedFiles];
      let openedCropper = false;

      try {
      if (rejectedFiles.length > 0) {
        const rejectedImageFiles: File[] = [];
        type OtherRejectionAgg = {
          message: string;
          count: number;
          sampleName: string;
          code?: string;
        };
        const otherRejections = new Map<string, OtherRejectionAgg>();

        rejectedFiles.forEach(({ file, errors }) => {
          // Oversized images can be recovered via pre-compress (non-crop path).
          const isSizeError = errors.some(
            (error) =>
              error.message.includes("larger than") ||
              error.code === "file-too-large",
          );

          if (shouldPreCompress && isImageFile(file) && isSizeError) {
            rejectedImageFiles.push(file);
          } else {
            for (const error of errors) {
              const formattedMessage = formatFileUploadError(error.message);
              const key = aggregateRejectionKey(error);
              const prev = otherRejections.get(key);
              if (prev) {
                prev.count += 1;
              } else {
                otherRejections.set(key, {
                  message: formattedMessage,
                  count: 1,
                  sampleName: file.name,
                  code:
                    key === "too-many-files" ? "too-many-files" : error.code,
                });
              }
            }
          }
        });

        otherRejections.forEach(
          ({ message, count, sampleName, code }, mapKey) => {
            if (code === "too-many-files" || mapKey === "too-many-files") {
              toast.error(
                count === 1
                  ? `File ${sampleName} was not added: ${message}`
                  : `${count} files were skipped — you can add up to ${maxFileCount} file${
                      maxFileCount === 1 ? "" : "s"
                    } at a time.`,
              );
              return;
            }
            if (count === 1) {
              toast.error(`File ${sampleName} was rejected: ${message}`);
            } else {
              toast.error(`${count} files were rejected: ${message}`);
            }
          },
        );

        // Compress rejected image files (only when pre-compress path is active)
        if (rejectedImageFiles.length > 0) {
          try {
            toast.info(
              `Compressing ${rejectedImageFiles.length} large image${
                rejectedImageFiles.length > 1 ? "s" : ""
              }...`,
              { duration: 2000 },
            );

            const compressedFiles = await autoCompressImages(
              rejectedImageFiles,
              {
                maxSizeMB: autoCompressMaxSizeMB,
                maxWidthOrHeight: 1920,
                quality: 0.85,
                useWebWorker: true,
              },
            );

            // Add compressed files to processed files
            processedFiles = [...processedFiles, ...compressedFiles];
          } catch (error) {
            console.warn("Auto-compression failed:", error);
            toast.error(
              "Failed to compress some images. Please try smaller files.",
            );
          }
        }
      }

      if (shouldPreCompress && processedFiles.length > 0) {
        try {
          const thresholdBytes = autoCompressMaxSizeMB * 1024 * 1024;
          const compressOpts = {
            maxSizeMB: autoCompressMaxSizeMB,
            maxWidthOrHeight: 1920,
            quality: 0.85,
            useWebWorker: true,
          };
          const hasLarge = processedFiles.some(
            (file) => isImageFile(file) && file.size > thresholdBytes,
          );

          if (hasLarge) {
            processedFiles = await Promise.all(
              processedFiles.map((file) =>
                isImageFile(file) && file.size > thresholdBytes
                  ? autoCompressImage(file, compressOpts)
                  : file,
              ),
            );
          }
        } catch (error) {
          console.warn("Auto-compression failed, using original files:", error);
        }
      }

        // Check if we need cropping for images
        if (enableCropping && processedFiles.length > 0) {
          const imagesToCrop = processedFiles.filter(isImageFile);
          const otherFiles = processedFiles.filter((f) => !isImageFile(f));

          if (imagesToCrop.length > 0) {
            openedCropper = true;
            const [firstImage, ...restImages] = imagesToCrop;
            setFileToCrop(firstImage);
            setPendingFiles([...restImages, ...otherFiles]);
            setCropDialogOpen(true);
            return;
          }
        }

        const newFiles = processedFiles.map((file) =>
          Object.assign(file, {
            preview: URL.createObjectURL(file),
          }),
        );

        const updatedFiles = files ? [...files, ...newFiles] : newFiles;

        setFiles(updatedFiles);

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
      } finally {
        if (!openedCropper) {
          setImageWorkflowBusyState(false);
        }
      }
    },
    [
      files,
      maxFileCount,
      multiple,
      onUpload,
      setFiles,
      enableCropping,
      autoCompress,
      autoCompressMaxSizeMB,
      setImageWorkflowBusyState,
    ],
  );
  function onRemove(index: number) {
    if (!files) return;

    if (typeof propOnRemove === "function") {
      propOnRemove(index);
    }
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
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

  const isDisabled =
    disabled ||
    (files?.length ?? 0) >= maxFileCount ||
    imageWorkflowBusy;

  const showDropzoneBusyOverlay =
    imageWorkflowBusy && (files?.length ?? 0) === 0 && !cropDialogOpen;

  return (
    <>
      <div className="relative flex flex-col gap-6 overflow-hidden">
        <Dropzone
          onDrop={onDrop}
          accept={accept}
          // When autoCompress or cropping is enabled, allow large images through.
          // Crop path optimizes after crop; compress path optimizes in onDrop.
          maxSize={
            (autoCompress || enableCropping) && !isDocumentOnlyUploader
              ? 100 * 1024 * 1024
              : maxSize
          }
          maxFiles={maxFileCount}
          multiple={maxFileCount > 1 || multiple}
          disabled={isDisabled}
        >
          {({ getRootProps, getInputProps, isDragActive }) => (
            <div
              {...getRootProps()}
              className={cn(
                "group relative grid min-h-52 w-full cursor-pointer place-items-center rounded-lg border-2 border-dashed border-muted-foreground/25 px-4 py-4 text-center transition hover:bg-muted/25 sm:px-5 sm:py-2.5",
                "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isDragActive && "border-muted-foreground/50",
                isDisabled && "pointer-events-none opacity-60",
                className,
              )}
              {...dropzoneProps}
            >
              <input {...getInputProps()} />
              {showDropzoneBusyOverlay ? (
                <div
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-lg bg-background/90 px-4"
                  aria-live="polite"
                  aria-busy="true"
                >
                  <Loader2
                    className="size-10 animate-spin text-primary"
                    aria-hidden="true"
                  />
                  <div className="space-y-1 text-center">
                    <p className="text-sm font-semibold text-foreground">
                      Processing image…
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {enableCropping
                        ? "Opening crop & optimize — please wait"
                        : "Optimizing — please wait"}
                    </p>
                  </div>
                </div>
              ) : null}
              {isDragActive ? (
                <div className="flex flex-col items-center justify-center gap-4 sm:px-5">
                  <div className="rounded-full border border-dashed p-3 shrink-0">
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
                <div className="flex min-h-0 w-full flex-col items-center justify-center gap-4 px-1 sm:px-5">
                  <div className="rounded-full border border-dashed p-3 shrink-0">
                    <Upload
                      className="size-7 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="flex min-w-0 flex-col gap-1 text-center">
                    <p className="font-medium text-muted-foreground">
                      Drag {`'n'`} drop files here, or click to select files
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {moreLabel
                        ? maxFileCount > 1
                          ? isDocumentOnlyUploader
                            ? `You can add ${maxFileCount === Infinity ? "more" : maxFileCount} more files`
                            : `You can add ${maxFileCount === Infinity ? "more" : maxFileCount} more images`
                          : isDocumentOnlyUploader
                            ? "You can add 1 more file"
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
                      {(() => {
                        if (isVideoUploader) return "";
                        if (isDocumentOnlyUploader) {
                          return isPdfOnlyUploader
                            ? ` (PDF only, up to ${formatBytes(maxSize)})`
                            : ` (up to ${formatBytes(maxSize)} each)`;
                        }
                        if (enableCropping || autoCompress) {
                          return ` (images will be automatically optimized)`;
                        }
                        return ` (up to ${formatBytes(maxSize)} each)`;
                      })()}
                    </p>
                    {!isVideoUploader &&
                      !isDocumentOnlyUploader &&
                      (enableCropping || autoCompress) && (
                        <p className="text-xs text-blue-600 font-medium mt-1">
                          {enableCropping
                            ? "✂️ Images will be cropped & optimized automatically"
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
                  showReadyIcon
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
            // Prefer explicit prop; fall back to cropConfig so presets aren't wiped by `undefined`
            aspectRatio: aspectRatio ?? cropConfig.aspectRatio,
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
  /** When true, show a check when the file is not actively uploading */
  showReadyIcon?: boolean;
}

function FileCard({ file, progress, onRemove, showReadyIcon }: FileCardProps) {
  const progressTracked = progress !== undefined;
  const uploading = progressTracked && progress < 100;
  const uploadComplete = progressTracked && progress >= 100;
  const showCheck = showReadyIcon && (!progressTracked || uploadComplete);
  const displayName =
    file.name.length > 24 ? `${file.name.slice(0, 21)}…` : file.name;

  return (
    <div className="relative flex items-center gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {isFileWithPreview(file) ? <FilePreview file={file} /> : null}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-col gap-px">
            <p className="line-clamp-1 text-sm font-medium text-foreground/80">
              {displayName}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatBytes(file.size)}
            </p>
          </div>
          {uploading ? <Progress value={progress} /> : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {showCheck ? (
          <span className="flex items-center" title="Ready to upload">
            <CheckCircle2
              className="size-5 text-emerald-500"
              aria-hidden="true"
            />
            <span className="sr-only">File ready</span>
          </span>
        ) : null}
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
