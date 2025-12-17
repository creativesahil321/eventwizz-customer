import { env } from "@/env";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toSentenceCase(str: string) {
  return str
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Converts a string into a URL-friendly slug
 * @param str - The string to convert to a slug
 * @returns URL-friendly slug
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/[^\w\-]+/g, "") // Remove all non-word characters
    .replace(/\-\-+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-+/, "") // Trim hyphens from start
    .replace(/-+$/, "") // Trim hyphens from end
    .replace(/[^\da-z\-]/gi, ""); // Final cleanup - only allow alphanumeric and hyphens
}

/**
 * Formats a date string or Date object into a readable format
 * @param value - Date string or Date object to format
 * @param options - Intl.DateTimeFormatOptions to customize the format
 * @returns Formatted date string
 */
export function formatDate(
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  }
): string {
  if (!value) return "";

  const date = typeof value === "string" ? new Date(value) : value;

  if (isNaN(date.getTime())) {
    // Invalid date fallback
    return "";
  }

  return new Intl.DateTimeFormat("en-US", options).format(date);
}

export function formatBytes(
  bytes: number,
  opts: {
    decimals?: number;
    sizeType?: "accurate" | "normal";
  } = {}
) {
  const { decimals = 0, sizeType = "normal" } = opts;

  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const accurateSizes = ["Bytes", "KiB", "MiB", "GiB", "TiB"];
  if (bytes === 0) return "0 Byte";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(decimals)} ${
    sizeType === "accurate" ? accurateSizes[i] ?? "Bytes" : sizes[i] ?? "Bytes"
  }`;
}

/**
 * Formats file upload error messages to be user-friendly
 * @param errorMessage - The raw error message from react-dropzone
 * @param maxSize - The maximum file size in bytes
 * @returns A user-friendly error message
 */
export function formatFileUploadError(errorMessage: string): string {
  // Handle file size errors
  if (
    errorMessage.includes("File is larger than") &&
    errorMessage.includes("bytes")
  ) {
    const bytesMatch = errorMessage.match(/(\d+)\s*bytes/);
    if (bytesMatch) {
      const bytes = parseInt(bytesMatch[1]);
      const formattedSize = formatBytes(bytes);
      return `File is too large. Maximum size allowed is ${formattedSize}`;
    }
  }

  // Handle file type errors
  if (errorMessage.includes("File type must be")) {
    return "File type is not supported. Please check the allowed file types.";
  }

  // Handle too many files errors
  if (errorMessage.includes("Too many files")) {
    return "Too many files selected. Please select fewer files.";
  }

  // Handle file too small errors
  if (
    errorMessage.includes("File is smaller than") &&
    errorMessage.includes("bytes")
  ) {
    const bytesMatch = errorMessage.match(/(\d+)\s*bytes/);
    if (bytesMatch) {
      const bytes = parseInt(bytesMatch[1]);
      const formattedSize = formatBytes(bytes);
      return `File is too small. Minimum size required is ${formattedSize}`;
    }
  }

  // Return the original message if no specific formatting is needed
  return errorMessage;
}

export function absoluteUrl(path: string) {
  return `${env.NEXT_PUBLIC_APP_URL}${path}`;
}

export function formatDateTimeLocal(
  value: string | Date | null | undefined
): string {
  if (!value) return "";

  const date = typeof value === "string" ? new Date(value) : value;

  if (isNaN(date.getTime())) {
    // Invalid Date fallback
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function formatToDateTimeLocal(value: string): string {
  if (!value) return "";

  const date = new Date(value);
  if (isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default async function delay(
  ms: number,
  { signal }: { signal?: AbortSignal }
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal) {
      signal.throwIfAborted();
      signal.addEventListener("abort", abortHandler, { once: true });
    }

    function abortHandler() {
      clearTimeout(timeoutId);
      reject(signal!.reason);
    }

    const timeoutId = setTimeout(() => {
      signal?.removeEventListener("abort", abortHandler);
      resolve();
    }, ms);
  });
}

// utils/detectOS.ts
export function detectOS(): string {
  const userAgent = navigator.userAgent;

  if (/windows phone/i.test(userAgent)) return "Windows Phone";
  if (/win/i.test(userAgent)) return "Windows";
  if (/android/i.test(userAgent)) return "Android";
  if (/linux/i.test(userAgent)) return "Linux";
  if (/iPad|iPhone|iPod/.test(userAgent)) return "iOS";
  if (/mac/i.test(userAgent)) return "macOS";

  return "unknown";
}

export function isServer(): boolean {
  return typeof window === "undefined";
}

/**
 * Safe localStorage utility functions that work in both client and server environments
 */
export const safeLocalStorage = {
  /**
   * Safely get an item from localStorage
   * @param key - The key to get from localStorage
   * @param defaultValue - Optional default value if key doesn't exist or we're in SSR
   */
  getItem: (key: string, defaultValue: string | null = null): string | null => {
    if (typeof window === "undefined") {
      return defaultValue;
    }
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error(`Error reading from localStorage (${key}):`, error);
      return defaultValue;
    }
  },

  /**
   * Safely set an item in localStorage
   * @param key - The key to set in localStorage
   * @param value - The value to set
   * @returns boolean indicating success
   */
  setItem: (key: string, value: string): boolean => {
    if (typeof window === "undefined") {
      return false;
    }
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error(`Error writing to localStorage (${key}):`, error);
      return false;
    }
  },

  /**
   * Safely remove an item from localStorage
   * @param key - The key to remove from localStorage
   * @returns boolean indicating success
   */
  removeItem: (key: string): boolean => {
    if (typeof window === "undefined") {
      return false;
    }
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing from localStorage (${key}):`, error);
      return false;
    }
  },
};

/**
 * Resets all Zustand stores and clears their persisted storage
 * Call this function during logout to ensure all state is cleared
 */
export async function resetAllStores(): Promise<void> {
  try {
    // Import all stores directly to avoid unused variables
    const permissionStore = await import("@/store/permission.store");
    const locationStore = await import("@/store/location.store");
    const domainStore = await import("@/store/domain.store");

    // Reset each store that has a reset method
    permissionStore.usePermissionStore.getState().reset();
    locationStore.useLocationStore.getState().reset();
    domainStore.useDomainStore.getState().reset();

    // Clear persisted storage
    if (typeof window !== "undefined") {
      const storageKeys = [
        "auth-storage",
        "permission-storage",
        "location-storage",
        "domain-storage",
      ];

      storageKeys.forEach((key) => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.error(`Failed to remove ${key} from localStorage:`, error);
        }
      });

      // Clear additional legacy storage items
      const legacyKeys = [
        "onboarding_data",
        "onboarding_active_step",
        "vendor_location_id",
        "event_id",
        "permissions-backup",
      ];

      legacyKeys.forEach((key) => {
        try {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        } catch (error) {
          console.error(`Failed to remove ${key} from localStorage:`, error);
          // Silent error for legacy keys
        }
      });
    }

    console.log("All stores reset successfully");
  } catch (error) {
    console.error("Failed to reset stores:", error);
  }
}

/**
 * Validates and normalizes image URLs for Next.js Image component
 * @param url The image URL to validate
 * @param defaultImage Optional default image path if url is falsy
 * @returns A properly formatted image URL
 */
export const validateImageUrl = (
  url: string | undefined,
  defaultImage: string = "/assets/images/logos/eventwizz-logo.png"
): string => {
  if (!url) return defaultImage;

  // If it's already a full URL, return as is
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  // Ensure local paths start with a forward slash
  return url.startsWith("/") ? url : `/${url}`;
};

/**
 * Creates a File object with preview from a base64 string
 * @param base64Value The base64 string
 * @param fileName The file name to use
 * @returns An array with a single File object or empty array
 */
export const createFileFromBase64 = (
  base64Value: string | undefined,
  fileName: string
): File[] => {
  if (
    !base64Value ||
    typeof base64Value !== "string" ||
    !base64Value.startsWith("data:image")
  ) {
    return [];
  }

  const dummyFile = new File([""], fileName, {
    type: base64Value.startsWith("data:image/png")
      ? "image/png"
      : base64Value.startsWith("data:image/webp")
      ? "image/webp"
      : "image/jpeg",
  });

  Object.defineProperty(dummyFile, "preview", {
    value: base64Value,
    writable: true,
  });

  return [dummyFile];
};

/**
 * Converts a File object to a base64 string
 * @param file The file to convert
 * @returns A Promise that resolves to the base64 string
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

// Normalize both slugs by decoding URL encoding for comparison
export const normalizeSlug = (slug: string) => {
  return decodeURIComponent(slug).toLowerCase().trim();
};

// Helper function to format date and use direct price from API
export const getDateInfo = (dateItem: {
  event_date: string;
  price: number;
}) => {
  // Create a new date object with proper timezone handling
  const dateObj = new Date(`${dateItem.event_date}T12:00:00`);

  // Get day name and month
  const day = dateObj.toLocaleString("default", { weekday: "long" });
  const month = dateObj.toLocaleString("default", { month: "long" });
  const dateNum = dateObj.getDate();

  return {
    day,
    month,
    date: dateNum,
    price: dateItem.price.toFixed(0),
  };
};
