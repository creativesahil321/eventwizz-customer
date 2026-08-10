/**
 * Image Cropper Types
 * Professional image cropping with react-easy-crop
 */

import { Area } from "react-easy-crop";

/**
 * Aspect ratio presets for different image types
 */
export const ASPECT_RATIOS = {
  square: 1 / 1, // Avatar / logo (1:1)
  landscape: 16 / 9, // Site / location hero & cover backgrounds
  cinematic: 21 / 9, // Ultra-wide event banner (21:9)
  portrait: 3 / 4, // Portrait slots
  free: undefined, // Full image / gallery — user's choice
} as const;

export type AspectRatioKey = keyof typeof ASPECT_RATIOS;
export type AspectRatioValue = (typeof ASPECT_RATIOS)[AspectRatioKey];

/**
 * Cropper configuration options
 */
export interface CropperConfig {
  /** Aspect ratio constraint (e.g., 16/9, 1/1, or undefined for free crop) */
  aspectRatio?: number;
  /** Minimum zoom level (default: 1) */
  minZoom?: number;
  /** Maximum zoom level (default: 3) */
  maxZoom?: number;
  /** Initial zoom level (default: 1) */
  initialZoom?: number;
  /** Enable rotation controls (default: true) */
  enableRotation?: boolean;
  /** Max output dimensions in pixels */
  maxWidth?: number;
  maxHeight?: number;
  /** Compression quality (0-1, default: 0.9) */
  quality?: number;
  /** Target file size in KB (will compress to meet this if possible) */
  maxSizeKB?: number;
}

/**
 * Cropped image result
 */
export interface CroppedImage {
  /** Cropped image as File object ready for upload */
  file: File;
  /** Preview URL for display (remember to revoke later) */
  previewUrl: string;
  /** Original file size in bytes */
  originalSize: number;
  /** Cropped file size in bytes */
  croppedSize: number;
  /** Compression ratio (0-1) */
  compressionRatio: number;
  /** Output dimensions */
  width: number;
  height: number;
}

/**
 * Crop state for internal management
 */
export interface CropState {
  crop: { x: number; y: number };
  zoom: number;
  rotation: number;
  croppedAreaPixels: Area | null;
}

/**
 * Props for ImageCropper component
 */
export interface ImageCropperProps {
  /** Source image file or URL */
  image: File | string;
  /** Callback when cropping is complete */
  onComplete: (croppedImage: CroppedImage) => void;
  /** Callback when user cancels */
  onCancel: () => void;
  /** Cropper configuration */
  config?: CropperConfig;
  /** Custom class name for styling */
  className?: string;
}

/**
 * Default cropper configuration
 */
export const DEFAULT_CROPPER_CONFIG: Required<CropperConfig> = {
  aspectRatio: ASPECT_RATIOS.free as unknown as number,
  minZoom: 1,
  maxZoom: 3,
  initialZoom: 1,
  enableRotation: true,
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.9,
  maxSizeKB: 500,
};
