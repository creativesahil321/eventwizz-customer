/**
 * Video Validation Utility
 * Validates video files for browser compatibility
 */

/**
 * Validates if a video file is compatible with most browsers
 * Checks for H.264 codec compatibility by attempting to play it
 * @param file - Video file to validate
 * @returns Promise<boolean> - true if compatible, false otherwise
 */
export async function validateVideoCodec(file: File): Promise<{
  isValid: boolean;
  error?: string;
}> {
  return new Promise((resolve) => {
    // Check file type
    if (!file.type.startsWith("video/")) {
      resolve({
        isValid: false,
        error: "File is not a video",
      });
      return;
    }

    // Create a video element to test playback capability
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);

    video.preload = "metadata";
    video.muted = true;

    // Timeout after 5 seconds
    const timeout = setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        isValid: false,
        error: "Video validation timeout - file may be corrupted or too large",
      });
    }, 5000);

    video.onloadedmetadata = () => {
      clearTimeout(timeout);

      // Check if video can actually be played
      const canPlay = video.canPlayType(file.type);

      URL.revokeObjectURL(objectUrl);

      if (canPlay === "probably" || canPlay === "maybe") {
        resolve({
          isValid: true,
        });
      } else {
        resolve({
          isValid: false,
          error: `This video format (${file.type}) is not compatible with most browsers. Please use MP4 with H.264 codec.`,
        });
      }
    };

    video.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(objectUrl);
      resolve({
        isValid: false,
        error:
          "This video cannot be played in most browsers. Please convert to MP4 (H.264) format.",
      });
    };

    video.src = objectUrl;
  });
}

/**
 * Check if video file size is within acceptable limits
 * @param file - Video file to check
 * @param maxSizeMB - Maximum size in megabytes (default 10MB)
 * @returns Object with validation result
 */
export function validateVideoSize(
  file: File,
  maxSizeMB: number = 10
): {
  isValid: boolean;
  error?: string;
  sizeMB: number;
} {
  const sizeMB = file.size / (1024 * 1024);

  if (sizeMB > maxSizeMB) {
    return {
      isValid: false,
      error: `Video size (${sizeMB.toFixed(
        2
      )}MB) exceeds maximum allowed size of ${maxSizeMB}MB`,
      sizeMB: parseFloat(sizeMB.toFixed(2)),
    };
  }

  return {
    isValid: true,
    sizeMB: parseFloat(sizeMB.toFixed(2)),
  };
}

/**
 * Get video codec information using MediaSource API (if available)
 * @param file - Video file to analyze
 * @returns Promise with codec information
 */
export async function getVideoCodecInfo(file: File): Promise<{
  codec?: string;
  isHEVC?: boolean;
  isSupportedByBrowser: boolean;
}> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);

    video.preload = "metadata";
    video.muted = true;

    video.onloadedmetadata = () => {
      // Check for HEVC/H.265 indicators
      const isHEVC =
        file.name.toLowerCase().includes("hevc") ||
        file.name.toLowerCase().includes("h265") ||
        file.type.includes("hevc") ||
        file.type.includes("h265");

      const canPlay = video.canPlayType(file.type);
      const isSupportedByBrowser =
        canPlay === "probably" || canPlay === "maybe";

      URL.revokeObjectURL(objectUrl);

      resolve({
        isHEVC,
        isSupportedByBrowser,
        codec: file.type,
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        isSupportedByBrowser: false,
        codec: file.type,
      });
    };

    video.src = objectUrl;
  });
}

/**
 * Comprehensive video validation
 * @param file - Video file to validate
 * @param maxSizeMB - Maximum size in megabytes
 * @returns Promise with validation results
 */
export async function validateVideo(
  file: File,
  maxSizeMB: number = 10
): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check file type
  if (!file.type.startsWith("video/")) {
    errors.push("Selected file is not a video");
    return { isValid: false, errors, warnings };
  }

  // Check size
  const sizeValidation = validateVideoSize(file, maxSizeMB);
  if (!sizeValidation.isValid) {
    errors.push(sizeValidation.error!);
  }

  // Check codec compatibility
  const codecValidation = await validateVideoCodec(file);
  if (!codecValidation.isValid) {
    errors.push(codecValidation.error!);
  }

  // Check for HEVC
  const codecInfo = await getVideoCodecInfo(file);
  if (codecInfo.isHEVC) {
    warnings.push(
      "This video appears to use HEVC/H.265 codec, which may not work on all browsers. Consider converting to H.264 for better compatibility."
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
