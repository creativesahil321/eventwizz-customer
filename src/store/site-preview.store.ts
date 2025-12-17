import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { SiteEssentialsFormValues } from "@/app/(protected)/_shared/sites-essentials/_lib/schema";

interface SitePreviewState {
  previewData: SiteEssentialsFormValues | null;
  setPreviewData: (data: SiteEssentialsFormValues) => void;
  clearPreviewData: () => void;
}

// Function to serialize data excluding File objects for persistence
const serializePreviewData = (
  data: SiteEssentialsFormValues
): SiteEssentialsFormValues => {
  const serialized = { ...data };

  // Convert File objects to object URLs for preview purposes
  // These object URLs are only for preview display, not for form submission
  if (serialized.logo instanceof File) {
    serialized.logo = URL.createObjectURL(serialized.logo);
  }
  if (serialized.favicon instanceof File) {
    serialized.favicon = URL.createObjectURL(serialized.favicon);
  }
  if (serialized.cover_image instanceof File) {
    serialized.cover_image = URL.createObjectURL(serialized.cover_image);
  }
  if (serialized.cover_video instanceof File) {
    serialized.cover_video = URL.createObjectURL(serialized.cover_video);
  }

  return serialized;
};

export const useSitePreviewStore = create<SitePreviewState>()(
  persist(
    immer((set) => ({
      previewData: null,
      setPreviewData: (data: SiteEssentialsFormValues) =>
        set((state) => {
          try {
            // Serialize the data to handle File objects appropriately
            const serializedData = serializePreviewData(data);
            state.previewData = serializedData;
          } catch (error) {
            console.error("Error serializing preview data:", error);
            // Fallback - create a safe copy excluding File objects
            const safeCopy = { ...data };
            if (safeCopy.logo instanceof File) safeCopy.logo = null;
            if (safeCopy.favicon instanceof File) safeCopy.favicon = null;
            if (safeCopy.cover_image instanceof File)
              safeCopy.cover_image = null;
            if (safeCopy.cover_video instanceof File)
              safeCopy.cover_video = null;
            state.previewData = safeCopy;
          }
        }),
      clearPreviewData: () =>
        set((state) => {
          state.previewData = null;
        }),
    })),
    {
      name: "site-preview-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
