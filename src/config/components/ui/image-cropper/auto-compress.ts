/**
 * Automatic Image Compression Utility
 * Compresses images automatically before validation to prevent size limit errors
 */

import imageCompression from "browser-image-compression";

export interface AutoCompressOptions {
  /**
   * Maximum file size in MB - images larger than this will be compressed
   * @default 2
   */
  maxSizeMB?: number;

  /**
   * Maximum width or height in pixels
   * @default 1920
   */
  maxWidthOrHeight?: number;

  /**
   * Compression quality (0.1 to 1.0)
   * @default 0.85 (good balance between quality and size)
   */
  quality?: number;

  /**
   * Use Web Worker for compression (better performance)
   * @default true
   */
  useWebWorker?: boolean;

  /**
   * Target file size in MB - compression will try to reach this
   * If not specified, uses maxSizeMB
   */
  targetSizeMB?: number;
}

/**
 * Automatically compresses an image file if it exceeds size limits
 * Returns the compressed file (or original if compression not needed)
 *
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Promise<File> - Compressed file or original if no compression needed
 */
export async function autoCompressImage(
  file: File,
  options: AutoCompressOptions = {}
): Promise<File> {
  // Only compress image files
  if (!file.type.startsWith("image/")) {
    return file;
  }

  const {
    maxSizeMB = 2,
    maxWidthOrHeight = 1920,
    quality = 0.85,
    useWebWorker = true,
    targetSizeMB,
  } = options;

  // Check if file needs compression
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  const targetSizeBytes = targetSizeMB
    ? targetSizeMB * 1024 * 1024
    : maxSizeBytes;

  // If file is already within limits, return as-is
  if (file.size <= targetSizeBytes) {
    return file;
  }

  try {
    // Compression options
    const compressionOptions = {
      maxSizeMB: targetSizeMB || maxSizeMB,
      maxWidthOrHeight,
      useWebWorker,
      initialQuality: quality,
      // Progressive compression - try multiple quality levels if needed
      alwaysKeepResolution: false,
    };

    // Compress the image
    const compressedFile = await imageCompression(file, compressionOptions);

    // Ensure we return a File object (not Blob)
    if (!(compressedFile instanceof File)) {
      const blob = compressedFile as Blob;
      return new File([blob], file.name, {
        type: blob.type || file.type,
        lastModified: Date.now(),
      });
    }

    return compressedFile;
  } catch (error) {
    console.warn("Auto-compression failed, using original file:", error);
    // Return original file if compression fails
    return file;
  }
}

/**
 * Automatically compresses multiple image files
 *
 * @param files - Array of files to compress
 * @param options - Compression options
 * @returns Promise<File[]> - Array of compressed files
 */
export async function autoCompressImages(
  files: File[],
  options: AutoCompressOptions = {}
): Promise<File[]> {
  const compressedFiles = await Promise.all(
    files.map((file) => autoCompressImage(file, options))
  );

  return compressedFiles;
}
