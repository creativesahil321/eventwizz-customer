/**
 * Image Cropping Utilities
 * Canvas-based image cropping and compression functions
 */

import { Area } from "react-easy-crop";
import imageCompression from "browser-image-compression";
import { CroppedImage, CropperConfig, DEFAULT_CROPPER_CONFIG } from "./types";

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
      0.95
    );
  });
}

/**
 * Resize image to fit within max dimensions while maintaining aspect ratio
 */
function resizeImage(
  canvas: HTMLCanvasElement,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let { width, height } = canvas;

  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.floor(width * ratio);
    height = Math.floor(height * ratio);
  }

  return { width, height };
}

/**
 * Compress image blob to reduce file size
 */
async function compressImageBlob(
  blob: Blob,
  originalFilename: string,
  config: CropperConfig
): Promise<File> {
  const options = {
    maxSizeMB: (config.maxSizeKB || DEFAULT_CROPPER_CONFIG.maxSizeKB) / 1024, // Convert KB to MB
    maxWidthOrHeight:
      config.maxWidth || config.maxHeight || DEFAULT_CROPPER_CONFIG.maxWidth,
    useWebWorker: true,
    initialQuality: config.quality || DEFAULT_CROPPER_CONFIG.quality,
  };

  try {
    // Convert blob to file for compression
    const file = new File([blob], originalFilename, {
      type: blob.type,
      lastModified: Date.now(),
    });

    // Compress
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

    console.log("✅ Compression successful, returning File:", compressedFile);
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

  // Step 1: Crop the image
  const { blob, url, width, height } = await getCroppedImg(
    imageSrc,
    croppedAreaPixels,
    rotation
  );

  // Step 2: Resize if needed (already handled by getCroppedImg, but we could add additional logic here)
  const dimensions = resizeImage(
    document.createElement("canvas"),
    mergedConfig.maxWidth,
    mergedConfig.maxHeight
  );

  // Step 3: Compress the cropped image
  const compressedFile = await compressImageBlob(
    blob,
    originalFile.name,
    mergedConfig
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
    width: dimensions.width || width,
    height: dimensions.height || height,
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
