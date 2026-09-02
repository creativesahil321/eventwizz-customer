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
   * rehydration so a persisted snapshot from a past reload is treated as
   * stale and never overrides fresh server data in the editor.
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
  /**
   * After the editor has applied an in-session preview snapshot once, clear
   * `previewFresh` so a full reload is treated as stale. `previewData` is kept
   * while `previewRequiresSave` so remounts (incl. React Strict Mode) can
   * re-apply the snapshot; call `syncPreviewData` when the user edits media.
   */
  consumePreviewFresh: () => void;
  /**
   * Keep the in-session preview snapshot aligned with editor media edits
   * (upload / remove) so a remount restore does not resurrect a stale image.
   */
  syncPreviewData: (data: SiteEssentialsFormValues) => void;
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

const PREVIEW_STORAGE_KEY = "site-preview-storage";

/**
 * Preview is an editor ↔ preview round-trip within the current tab session.
 * sessionStorage avoids multi-day localStorage snapshots overriding Sites
 * Essentials after API updates. Drop any legacy localStorage copy on boot.
 */
const createPreviewStorage = () => {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(PREVIEW_STORAGE_KEY);
    } catch {
      // ignore quota / privacy mode
    }
  }

  return {
    getItem: (name: string) => {
      if (typeof window === "undefined") return null;
      return sessionStorage.getItem(name);
    },
    setItem: (name: string, value: string) => {
      if (typeof window === "undefined") return;
      try {
        const parsed = JSON.parse(value) as {
          state?: { previewData?: unknown };
        };
        if (!parsed?.state?.previewData) {
          sessionStorage.removeItem(name);
          return;
        }
        sessionStorage.setItem(name, value);
      } catch {
        sessionStorage.removeItem(name);
      }
    },
    removeItem: (name: string) => {
      if (typeof window === "undefined") return;
      sessionStorage.removeItem(name);
      try {
        localStorage.removeItem(name);
      } catch {
        // ignore
      }
    },
  };
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
      consumePreviewFresh: () =>
        set((state) => {
          state.previewFresh = false;
        }),
      syncPreviewData: (data: SiteEssentialsFormValues) =>
        set((state) => {
          if (!state.previewRequiresSave || !state.previewData) return;
          if (data.website_role === "admin") return;
          try {
            state.previewData = serializePreviewData(data);
          } catch (error) {
            console.error("Error syncing preview data:", error);
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
      name: PREVIEW_STORAGE_KEY,
      version: 3,
      // Only keep the key while a real vendor preview snapshot exists.
      // Empty/cleared state (and admin) must not leave a shell in storage.
      storage: createJSONStorage(createPreviewStorage),
      migrate: (persisted, version) => {
        // v3: session-only preview — discard any legacy long-lived snapshot.
        if (version < 3) {
          return {};
        }
        return (persisted as Partial<SitePreviewState> | undefined) ?? {};
      },
      merge: (persisted, current) => {
        const p = persisted as Partial<SitePreviewState> | undefined;
        return {
          ...current,
          ...p,
          // Persisted snapshots are never an editor overlay after reload —
          // only an in-memory Preview → Edit round-trip may mark them fresh.
          // Keep `previewData` so /preview/site can still render after refresh.
          previewFresh: false,
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
      onRehydrateStorage: () => () => {
        // One-time cleanup of the legacy localStorage key after moving to
        // sessionStorage (createPreviewStorage also removes it on boot).
        if (typeof window === "undefined") return;
        try {
          localStorage.removeItem(PREVIEW_STORAGE_KEY);
        } catch {
          // ignore
        }
      },
    },
  ),
);
