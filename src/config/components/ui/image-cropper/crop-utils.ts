/**
 * Image Cropping Utilities
 * Canvas-based image cropping and compression functions
 */

import { Area } from "react-easy-crop";
import imageCompression from "browser-image-compression";
import { CroppedImage, CropperConfig, DEFAULT_CROPPER_CONFIG } from "./types";

/** Cap pixels for the crop UI — ~1.5× output size, max 1920px (onboarding-fast path). */
export function resolveCropPreviewMaxDimension(config: CropperConfig): number {
  const w = config.maxWidth ?? DEFAULT_CROPPER_CONFIG.maxWidth;
  const h = config.maxHeight ?? DEFAULT_CROPPER_CONFIG.maxHeight;
  return Math.min(Math.round(Math.max(w, h, 960) * 1.5), 1920);
}

/**
 * Downscale very large sources before react-easy-crop so canvas crop + compress stay fast.
 */
export async function createDownscaledPreviewUrl(
  file: File,
  maxDimension: number,
): Promise<{ url: string; revoke: () => void }> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await createImage(objectUrl);
    const longest = Math.max(image.naturalWidth, image.naturalHeight);
    if (longest <= maxDimension) {
      return { url: objectUrl, revoke: () => URL.revokeObjectURL(objectUrl) };
    }

    const scale = maxDimension / longest;
    const width = Math.round(image.naturalWidth * scale);
    const height = Math.round(image.naturalHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }
    ctx.drawImage(image, 0, 0, width, height);
    URL.revokeObjectURL(objectUrl);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) =>
          result ? resolve(result) : reject(new Error("Canvas is empty")),
        "image/jpeg",
        0.92,
      );
    });
    const url = URL.createObjectURL(blob);
    return { url, revoke: () => URL.revokeObjectURL(url) };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

/**
 * Creates a HTMLImageElement from a file or URL
 */
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    // Required for CORS if loading from external URL
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

/**
 * Converts degrees to radians
 */
function getRadianAngle(degreeValue: number): number {
  return (degreeValue * Math.PI) / 180;
}

/**
 * Returns the new bounding area of a rotated rectangle
 */
function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation);

  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

/**
 * Extract the cropped area from the image
 * Supports rotation and zoom
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0,
  flip = { horizontal: false, vertical: false }
): Promise<{ blob: Blob; url: string; width: number; height: number }> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  const rotRad = getRadianAngle(rotation);

  // Calculate bounding box of the rotated image
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation
  );

  // Set canvas size to match the bounding box
  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  // Translate canvas context to a central location to allow rotating around the center
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
  ctx.translate(-image.width / 2, -image.height / 2);

  // Draw rotated image
  ctx.drawImage(image, 0, 0);

  // Extract the cropped area
  const data = ctx.getImageData(
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height
  );

  // Set canvas size to final desired crop size
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // Paste generated crop into canvas
  ctx.putImageData(data, 0, 0);

  // Convert canvas to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas is empty"));
          return;
        }
        const url = URL.createObjectURL(blob);
        resolve({
          blob,
          url,
          width: pixelCrop.width,
          height: pixelCrop.height,
        });
      },
      "image/jpeg",
      0.88
    );
  });
}

/** Shrink crop output before library compression (fewer pixels = faster). */
async function resizeBlobToFit(
  blob: Blob,
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
): Promise<{ blob: Blob; width: number; height: number }> {
  if (width <= maxWidth && height <= maxHeight) {
    return { blob, width, height };
  }

  const ratio = Math.min(maxWidth / width, maxHeight / height);
  const nextWidth = Math.max(1, Math.floor(width * ratio));
  const nextHeight = Math.max(1, Math.floor(height * ratio));

  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = nextWidth;
    canvas.height = nextHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return { blob, width, height };
    }
    ctx.drawImage(bitmap, 0, 0, nextWidth, nextHeight);
    const resized = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) =>
          result ? resolve(result) : reject(new Error("Canvas is empty")),
        "image/jpeg",
        0.88,
      );
    });
    return { blob: resized, width: nextWidth, height: nextHeight };
  } finally {
    bitmap.close();
  }
}

/**
 * Compress image blob to reduce file size
 */
async function compressImageBlob(
  blob: Blob,
  originalFilename: string,
  config: CropperConfig
): Promise<File> {
  const maxWidth = config.maxWidth || DEFAULT_CROPPER_CONFIG.maxWidth;
  const maxHeight = config.maxHeight || DEFAULT_CROPPER_CONFIG.maxHeight;
  const targetBytes =
    (config.maxSizeKB || DEFAULT_CROPPER_CONFIG.maxSizeKB) * 1024;

  if (blob.size <= targetBytes) {
    return new File([blob], originalFilename, {
      type: blob.type || "image/jpeg",
      lastModified: Date.now(),
    });
  }

  const options = {
    maxSizeMB: targetBytes / (1024 * 1024),
    maxWidthOrHeight: Math.max(maxWidth, maxHeight),
    useWebWorker: true,
    initialQuality: config.quality || DEFAULT_CROPPER_CONFIG.quality,
  };

  try {
    const file = new File([blob], originalFilename, {
      type: blob.type,
      lastModified: Date.now(),
    });

    const compressedFile = await imageCompression(file, options);

    // ENSURE we return a proper File object (not a Blob)
    // imageCompression might return a Blob in some cases
    if (!(compressedFile instanceof File)) {
      console.warn("⚠️ imageCompression returned Blob, converting to File");
      return new File([compressedFile], originalFilename, {
        type: (compressedFile as unknown as File).type || blob.type,
        lastModified: Date.now(),
      });
    }

    return compressedFile;
  } catch (error) {
    console.error("Compression error:", error);
    // Return original file if compression fails
    return new File([blob], originalFilename, {
      type: blob.type,
      lastModified: Date.now(),
    });
  }
}

/**
 * Complete cropping pipeline: crop + resize + compress
 * Returns a ready-to-upload File object
 */
export async function getCroppedAndCompressedImage(
  imageSrc: string,
  croppedAreaPixels: Area,
  rotation: number,
  originalFile: File,
  config: CropperConfig = {}
): Promise<CroppedImage> {
  // Merge with default config
  const mergedConfig = { ...DEFAULT_CROPPER_CONFIG, ...config };

  const maxWidth = mergedConfig.maxWidth ?? DEFAULT_CROPPER_CONFIG.maxWidth;
  const maxHeight = mergedConfig.maxHeight ?? DEFAULT_CROPPER_CONFIG.maxHeight;

  const { blob: croppedBlob, url, width, height } = await getCroppedImg(
    imageSrc,
    croppedAreaPixels,
    rotation,
  );

  const { blob: sizedBlob, width: outWidth, height: outHeight } =
    await resizeBlobToFit(croppedBlob, width, height, maxWidth, maxHeight);

  const compressedFile = await compressImageBlob(
    sizedBlob,
    originalFile.name,
    mergedConfig,
  );

  // Calculate compression ratio
  const originalSize = originalFile.size;
  const croppedSize = compressedFile.size;
  const compressionRatio = 1 - croppedSize / originalSize;

  return {
    file: compressedFile,
    previewUrl: url,
    originalSize,
    croppedSize,
    compressionRatio,
    width: outWidth,
    height: outHeight,
  };
}

/**
 * Optimize the full original image (no crop) — resize + compress only.
 * Use when the user wants to keep the entire uploaded frame.
 */
export async function getOptimizedFullImage(
  originalFile: File,
  config: CropperConfig = {}
): Promise<CroppedImage> {
  const mergedConfig = { ...DEFAULT_CROPPER_CONFIG, ...config };
  const maxWidth = mergedConfig.maxWidth ?? DEFAULT_CROPPER_CONFIG.maxWidth;
  const maxHeight = mergedConfig.maxHeight ?? DEFAULT_CROPPER_CONFIG.maxHeight;

  const { width, height } = await getImageDimensions(originalFile);
  const { blob: sizedBlob, width: outWidth, height: outHeight } =
    await resizeBlobToFit(originalFile, width, height, maxWidth, maxHeight);

  const compressedFile = await compressImageBlob(
    sizedBlob,
    originalFile.name,
    mergedConfig,
  );

  const previewUrl = URL.createObjectURL(compressedFile);
  const originalSize = originalFile.size;
  const croppedSize = compressedFile.size;

  return {
    file: compressedFile,
    previewUrl,
    originalSize,
    croppedSize,
    compressionRatio: 1 - croppedSize / originalSize,
    width: outWidth,
    height: outHeight,
  };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Calculate compression percentage for display
 */
export function formatCompressionRatio(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

/**
 * Validate image file
 */
export function validateImageFile(
  file: File,
  options: {
    maxSizeMB?: number;
    allowedTypes?: string[];
  } = {}
): { valid: boolean; error?: string } {
  const {
    maxSizeMB = 10,
    allowedTypes = ["image/jpeg", "image/png", "image/webp"],
  } = options;

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed: ${allowedTypes.join(", ")}`,
    };
  }

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
}

/**
 * Get image dimensions from file
 */
export async function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await createImage(url);
    return { width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}
