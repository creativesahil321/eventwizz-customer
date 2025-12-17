import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { ThemeSchema } from "@/types/theme.types";
import { UserType } from "@/types/auth.types";

interface DomainState {
  domain: string | null;
  tenantId: string | null;
  website_role: UserType | null;
  parentDomain: string | null;
  settings: ThemeSchema | null;
  isLoading: boolean;
  isDomainRequest: boolean;
  sidebarCollapsed: boolean;

  // Actions
  setDomain: (data: Partial<DomainState>) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  reset: () => void;
}

export const useDomainStore = create<DomainState>()(
  persist(
    immer<DomainState>((set) => ({
      // Initial state
      domain: null,
      tenantId: null,
      website_role: null,
      parentDomain: null,
      settings: null,
      isLoading: true,
      isDomainRequest: false,
      sidebarCollapsed: false,

      // Actions
      setDomain: (data) =>
        set((state) => {
          const newState = { ...state, ...data };

          // Ensure website_role is synchronized between top level and settings
          if (data.settings?.website_role && !data.website_role) {
            newState.website_role = data.settings.website_role as UserType;
          }

          return newState;
        }),

      setSidebarCollapsed: (collapsed) =>
        set((state) => {
          state.sidebarCollapsed = collapsed;
        }),

      reset: () =>
        set({
          domain: null,
          tenantId: null,
          website_role: null,
          parentDomain: null,
          settings: null,
          isLoading: false,
          isDomainRequest: false,
          sidebarCollapsed: false,
        }),
    })),
    {
      name: "domain-storage",
      partialize: (state) => ({
        domain: state.domain,
        tenantId: state.tenantId,
        website_role: state.website_role,
        parentDomain: state.parentDomain,
        settings: state.settings,
        isDomainRequest: state.isDomainRequest,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
