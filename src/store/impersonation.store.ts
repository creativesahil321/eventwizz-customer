import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

/**
 * Minimal, NON-SECRET admin snapshot used to repaint the UI after
 * impersonation ends. The admin's credentials are NOT kept here: the admin
 * session cookie is backed up server-side as an HttpOnly cookie
 * (`/api/auth/impersonation/backup` → `/restore`).
 */
export interface AdminSessionBackup {
  email: string;
  uuid?: string;
  first_name?: string;
  last_name?: string;
  avatar?: string;
  account_type: string;
  active_role?: string;
  status?: string;
  vendor_location_id?: string | null;
}

export interface ImpersonatedVendorInfo {
  id: number;
  name: string;
  email: string;
}

interface ImpersonationState {
  isImpersonating: boolean;
  originalAdmin: AdminSessionBackup | null;
  impersonatedVendor: ImpersonatedVendorInfo | null;
  startedAt: number | null;

  startImpersonation: (
    admin: AdminSessionBackup,
    vendor: ImpersonatedVendorInfo
  ) => void;
  endImpersonation: () => void;
  getOriginalAdmin: () => AdminSessionBackup | null;
}

const STORE_NAME = "impersonation-session";

/**
 * sessionStorage-backed store for impersonation state.
 *
 * Why sessionStorage instead of localStorage:
 * - Tab-scoped: closing the tab automatically ends impersonation
 * - No cross-tab leaks: opening a new tab won't carry impersonation state
 * - Auto-cleanup: browser clears sessionStorage on tab/window close
 * - Small footprint: ~1.5KB total (admin backup + vendor info)
 * - No collision with existing localStorage stores
 */
export const useImpersonationStore = create<ImpersonationState>()(
  persist(
    immer<ImpersonationState>((set, get) => ({
      isImpersonating: false,
      originalAdmin: null,
      impersonatedVendor: null,
      startedAt: null,

      startImpersonation: (admin, vendor) => {
        const current = get();
        if (current.isImpersonating) {
          console.warn(
            "[Impersonation] Nested impersonation blocked. Exit current session first."
          );
          return;
        }

        set((state) => {
          state.isImpersonating = true;
          state.originalAdmin = admin;
          state.impersonatedVendor = vendor;
          state.startedAt = Date.now();
        });
      },

      endImpersonation: () => {
        set((state) => {
          state.isImpersonating = false;
          state.originalAdmin = null;
          state.impersonatedVendor = null;
          state.startedAt = null;
        });
      },

      getOriginalAdmin: () => get().originalAdmin,
    })),
    {
      name: STORE_NAME,
      version: 2,
      // v0 stored the admin's raw Laravel token, v1 the admin's permissions —
      // neither may live in browser storage (permissions come from the API).
      migrate: (persisted) => {
        const state = persisted as { originalAdmin?: Record<string, unknown> | null };
        if (state?.originalAdmin && typeof state.originalAdmin === "object") {
          delete state.originalAdmin.token;
          delete state.originalAdmin.permissions;
        }
        return persisted as ImpersonationState;
      },
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") {
          const mem: Record<string, string> = {};
          return {
            getItem: (name: string) => mem[name] ?? null,
            setItem: (name: string, value: string) => {
              mem[name] = value;
            },
            removeItem: (name: string) => {
              delete mem[name];
            },
          };
        }
        return sessionStorage;
      }),
    }
  )
);

/**
 * Non-hook accessor for checking impersonation state outside of React components
 * (e.g., in API interceptors, middleware helpers)
 */
export const getImpersonationStatus = () => {
  const state = useImpersonationStore.getState();
  return {
    isImpersonating: state.isImpersonating,
    vendorName: state.impersonatedVendor?.name ?? null,
    vendorEmail: state.impersonatedVendor?.email ?? null,
    startedAt: state.startedAt,
    durationMs: state.startedAt ? Date.now() - state.startedAt : 0,
  };
};
