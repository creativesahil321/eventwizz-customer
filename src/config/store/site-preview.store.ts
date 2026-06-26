import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { SiteEssentialsFormValues } from "@/app/(protected)/_shared/sites-essentials/_lib/schema";
import type { PreviewLocationItem } from "@/app/(protected)/_shared/sites-essentials/_lib/preview-locations";

export type SitePreviewScope = "main" | "location";
export type SitePreviewReviewStep = SitePreviewScope;

export type StartPreviewReviewOptions = {
  /** Multi-location: skip main home and open the location review step first. */
  openOnLocation?: boolean;
  /** Which location to show when `openOnLocation` is true. */
  initialLocationIndex?: number;
};

interface SitePreviewState {
  previewData: SiteEssentialsFormValues | null;
  previewScope: SitePreviewScope;
  reviewStep: SitePreviewReviewStep;
  mainPageApproved: boolean;
  /** Ordered locations to review after main home (multi-location). */
  previewLocations: PreviewLocationItem[];
  currentLocationIndex: number;
  approvedLocationSlugs: string[];
  /** Detects stale localStorage from another vendor/session (domain or site name). */
  previewVendorKey: string | null;
  setPreviewData: (data: SiteEssentialsFormValues) => void;
  setPreviewScope: (scope: SitePreviewScope) => void;
  setReviewStep: (step: SitePreviewReviewStep) => void;
  setMainPageApproved: (approved: boolean) => void;
  setCurrentLocationIndex: (index: number) => void;
  approveLocationSlug: (slug: string) => void;
  startPreviewReview: (
    hasMultipleLocations: boolean,
    locations: PreviewLocationItem[],
    vendorKey?: string,
    options?: StartPreviewReviewOptions,
  ) => void;
  clearPreviewData: () => void;
}

const serializePreviewData = (
  data: SiteEssentialsFormValues,
): SiteEssentialsFormValues => {
  const serialized = { ...data };

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
  if (serialized.main_landing_cover_image instanceof File) {
    serialized.main_landing_cover_image = URL.createObjectURL(
      serialized.main_landing_cover_image,
    );
  }

  return serialized;
};

export const useSitePreviewStore = create<SitePreviewState>()(
  persist(
    immer((set) => ({
      previewData: null,
      previewScope: "main" as SitePreviewScope,
      reviewStep: "main" as SitePreviewReviewStep,
      mainPageApproved: false,
      previewLocations: [],
      currentLocationIndex: 0,
      approvedLocationSlugs: [],
      previewVendorKey: null,
      setPreviewScope: (scope: SitePreviewScope) =>
        set((state) => {
          state.previewScope = scope;
        }),
      setReviewStep: (step: SitePreviewReviewStep) =>
        set((state) => {
          state.reviewStep = step;
          state.previewScope = step;
        }),
      setMainPageApproved: (approved: boolean) =>
        set((state) => {
          state.mainPageApproved = approved;
        }),
      setCurrentLocationIndex: (index: number) =>
        set((state) => {
          const locations = state.previewLocations ?? [];
          const maxIndex = Math.max(0, locations.length - 1);
          state.currentLocationIndex = Math.max(0, Math.min(index, maxIndex));
        }),
      approveLocationSlug: (slug: string) =>
        set((state) => {
          if (!slug) return;
          if (!Array.isArray(state.approvedLocationSlugs)) {
            state.approvedLocationSlugs = [];
          }
          if (state.approvedLocationSlugs.includes(slug)) return;
          state.approvedLocationSlugs.push(slug);
        }),
      startPreviewReview: (hasMultipleLocations, locations, vendorKey, options) =>
        set((state) => {
          state.previewLocations = locations ?? [];
          state.approvedLocationSlugs = [];
          state.previewVendorKey = vendorKey?.trim() || null;

          const openOnLocation =
            options?.openOnLocation ??
            state.previewScope === "location";
          const maxIndex = Math.max(0, (locations ?? []).length - 1);
          const initialIndex = Math.min(
            Math.max(0, options?.initialLocationIndex ?? 0),
            maxIndex,
          );

          if (hasMultipleLocations && openOnLocation) {
            state.reviewStep = "location";
            state.previewScope = "location";
            state.currentLocationIndex = initialIndex;
            state.mainPageApproved = false;
          } else if (hasMultipleLocations) {
            state.reviewStep = "main";
            state.previewScope = "main";
            state.currentLocationIndex = 0;
            state.mainPageApproved = false;
          } else {
            state.reviewStep = "location";
            state.previewScope = "location";
            state.currentLocationIndex = initialIndex;
            state.mainPageApproved = true;
          }
        }),
      setPreviewData: (data: SiteEssentialsFormValues) =>
        set((state) => {
          try {
            const serializedData = serializePreviewData(data);
            state.previewData = serializedData;
          } catch (error) {
            console.error("Error serializing preview data:", error);
            const safeCopy = { ...data };
            if (safeCopy.logo instanceof File) safeCopy.logo = null;
            if (safeCopy.favicon instanceof File) safeCopy.favicon = null;
            if (safeCopy.cover_image instanceof File)
              safeCopy.cover_image = null;
            if (safeCopy.cover_video instanceof File)
              safeCopy.cover_video = null;
            if (safeCopy.main_landing_cover_image instanceof File)
              safeCopy.main_landing_cover_image = null;
            state.previewData = safeCopy;
          }
        }),
      clearPreviewData: () =>
        set((state) => {
          state.previewData = null;
          state.previewScope = "main";
          state.reviewStep = "main";
          state.mainPageApproved = false;
          state.previewLocations = [];
          state.currentLocationIndex = 0;
          state.approvedLocationSlugs = [];
          state.previewVendorKey = null;
        }),
    })),
    {
      name: "site-preview-storage",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted, version) => {
        const p = persisted as Partial<SitePreviewState> | undefined;
        if (version < 2) {
          return {
            ...p,
            previewLocations: [],
            approvedLocationSlugs: [],
            currentLocationIndex: 0,
            reviewStep: "main" as SitePreviewReviewStep,
            previewScope: "main" as SitePreviewScope,
            mainPageApproved: false,
            previewVendorKey: null,
          };
        }
        return p ?? {};
      },
      merge: (persisted, current) => {
        const p = persisted as Partial<SitePreviewState> | undefined;
        return {
          ...current,
          ...p,
          previewLocations: Array.isArray(p?.previewLocations)
            ? p.previewLocations
            : [],
          approvedLocationSlugs: Array.isArray(p?.approvedLocationSlugs)
            ? p.approvedLocationSlugs
            : [],
          currentLocationIndex:
            typeof p?.currentLocationIndex === "number"
              ? p.currentLocationIndex
              : 0,
          previewVendorKey:
            typeof p?.previewVendorKey === "string" ? p.previewVendorKey : null,
        };
      },
    },
  ),
);
