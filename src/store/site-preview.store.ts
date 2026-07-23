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
  /**
   * When false, preview is view-only (no unsaved editor changes) —
   * browse pages and close without Approve & save.
   */
  requiresSave?: boolean;
};

interface SitePreviewState {
  previewData: SiteEssentialsFormValues | null;
  /**
   * True only while `previewData` was set during the CURRENT browser session
   * (the editor → preview → editor round-trip). Reset to false on every
   * rehydration so a persisted snapshot from a past session/reload is treated
   * as stale and never overrides fresh server data in the editor.
   */
  previewFresh: boolean;
  /**
   * True when the editor had unsaved changes (or preview was edited).
   * False = view-only browse; no Approve & save required.
   */
  previewRequiresSave: boolean;
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
  setPreviewRequiresSave: (requiresSave: boolean) => void;
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

/**
 * Info-page CMS bodies are large (up to ~20k chars each) and the preview flow
 * never renders them — the public pages fetch this content from the info-pages
 * API instead. Excluding them keeps the persisted `site-preview-storage` lean,
 * and the editor back-fills them from the server on restore.
 */
const PREVIEW_OMITTED_KEYS = [
  "terms_and_conditions",
  "privacy_policy",
  "refund_policy",
  "cookie_policy",
  "vendor_terms",
  "about_page_content",
  "how_it_works_page_content",
  "contact_page_content",
] as const satisfies ReadonlyArray<keyof SiteEssentialsFormValues>;

const serializePreviewData = (
  data: SiteEssentialsFormValues,
): SiteEssentialsFormValues => {
  const serialized = { ...data };

  for (const key of PREVIEW_OMITTED_KEYS) {
    delete serialized[key];
  }

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
      previewFresh: false,
      previewRequiresSave: false,
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
      setPreviewRequiresSave: (requiresSave: boolean) =>
        set((state) => {
          state.previewRequiresSave = requiresSave;
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
          state.previewRequiresSave = options?.requiresSave ?? false;

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
          // Vendor-only: admin Site Essentials must never populate preview storage.
          if (data.website_role === "admin") return;

          state.previewFresh = true;
          try {
            const serializedData = serializePreviewData(data);
            state.previewData = serializedData;
          } catch (error) {
            console.error("Error serializing preview data:", error);
            const safeCopy = { ...data };
            for (const key of PREVIEW_OMITTED_KEYS) {
              delete safeCopy[key];
            }
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
          state.previewFresh = false;
          state.previewRequiresSave = false;
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
      // Only keep the key while a real vendor preview snapshot exists.
      // Empty/cleared state (and admin) must not leave a shell in localStorage.
      storage: createJSONStorage(() => ({
        getItem: (name) => {
          if (typeof window === "undefined") return null;
          return localStorage.getItem(name);
        },
        setItem: (name, value) => {
          if (typeof window === "undefined") return;
          try {
            const parsed = JSON.parse(value) as {
              state?: { previewData?: unknown };
            };
            if (!parsed?.state?.previewData) {
              localStorage.removeItem(name);
              return;
            }
            localStorage.setItem(name, value);
          } catch {
            localStorage.removeItem(name);
          }
        },
        removeItem: (name) => {
          if (typeof window === "undefined") return;
          localStorage.removeItem(name);
        },
      })),
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
          // Persisted preview snapshots are always stale on load — only the
          // in-session round-trip may mark them fresh again.
          previewFresh: false,
          // Don't force Approve & save after a full page reload.
          previewRequiresSave: false,
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
