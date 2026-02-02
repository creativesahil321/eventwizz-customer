"use client";

import { createContext, useContext, useEffect, ReactNode } from "react";
import { getDomain, getTenantIdFromDomain } from "@/lib/domain";
import { useDomainStore } from "@/store/domain.store";
import { UserType } from "@/types/auth.types";
import { ThemeSchema } from "@/types/theme.types";

// Use ThemeSchema instead of a limited interface definition
type TenantSettings = ThemeSchema;

interface DomainContextType {
  domain: string | null;
  tenantId: string | null;
  website_role: UserType | null;
  parentDomain: string | null;
  settings: TenantSettings | null;
  isLoading: boolean;
  isDomainRequest: boolean;
}

// Create context for backward compatibility
const DomainContext = createContext<DomainContextType>({
  domain: null,
  tenantId: null,
  website_role: null,
  parentDomain: null,
  settings: null,
  isLoading: true,
  isDomainRequest: false,
});

export const DomainProvider = ({ children }: { children: ReactNode }) => {
  // Use the Zustand store
  const domainStore = useDomainStore();

  // Extract only the values we need to check for changes
  const {
    domain: currentDomain,
    settings: currentSettings,
    isLoading,
  } = domainStore;

  useEffect(() => {
    const loadDomainData = async () => {
      const detectedDomain = getDomain();

      if (!detectedDomain) {
        domainStore.setDomain({
          domain: null,
          tenantId: null,
          website_role: null,
          parentDomain: null,
          settings: null,
          isLoading: false,
          isDomainRequest: false,
        });
        return;
      }

      // Skip if we already have this domain loaded with settings
      if (detectedDomain === currentDomain && currentSettings && !isLoading) {
        return;
      }

      try {
        const tenantData = await getTenantIdFromDomain(detectedDomain);
        domainStore.setDomain({
          domain: detectedDomain,
          tenantId: tenantData?.tenantId || null,
          website_role: tenantData?.website_role || null,
          parentDomain: tenantData?.parentDomain || null,
          settings: tenantData?.settings || null,
          isLoading: false,
          isDomainRequest: true,
        });
      } catch (error) {
        console.error("Error loading domain data", error);
        domainStore.setDomain({
          domain: detectedDomain,
          tenantId: null,
          website_role: null,
          parentDomain: null,
          settings: null,
          isLoading: false,
          isDomainRequest: true,
        });
      }
    };

    loadDomainData();
  }, [currentDomain, currentSettings, isLoading, domainStore]);

  // Provide the Zustand store data through the context
  return (
    <DomainContext.Provider
      value={{
        domain: domainStore.domain,
        tenantId: domainStore.tenantId,
        website_role: domainStore.website_role,
        parentDomain: domainStore.parentDomain,
        settings: domainStore.settings,
        isLoading: domainStore.isLoading,
        isDomainRequest: domainStore.isDomainRequest,
      }}
    >
      {children}
    </DomainContext.Provider>
  );
};

// For backward compatibility, maintain the same hook interface
export const useDomain = () => useContext(DomainContext);
