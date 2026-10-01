"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import {
  getDomain,
  getTenantIdFromDomain,
  buildTenantDataFromTheme,
  primeTenantDataCache,
} from "@/lib/domain";
import { useDomainStore } from "@/store/domain.store";
import { UserType } from "@/types/auth.types";
import { ThemeSchema } from "@/types/theme.types";
import { ServerContext } from "@/lib/server-context";

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

function buildSsrDomainValue(
  host: string,
  theme: ThemeSchema,
): DomainContextType {
  const tenantData = buildTenantDataFromTheme(host, theme);
  return {
    domain: host,
    tenantId: tenantData.tenantId,
    website_role: tenantData.website_role,
    parentDomain: tenantData.parentDomain,
    settings: tenantData.settings,
    isLoading: false,
    isDomainRequest: true,
  };
}

export const DomainProvider = ({ children }: { children: ReactNode }) => {
  // Use the Zustand store
  const domainStore = useDomainStore();
  // Stable action reference. `domainStore` is a fresh object on every store
  // write, so depending on it below re-ran the effect after each `setDomain`;
  // when the theme API returned no settings the early-return guard never
  // matched and the two looped until React threw "Maximum update depth".
  const setDomain = useDomainStore((state) => state.setDomain);
  const serverContext = useContext(ServerContext);

  // Extract only the values we need to check for changes
  const {
    domain: currentDomain,
    settings: currentSettings,
    isLoading,
  } = domainStore;

  /**
   * Theme is already fetched in the root layout. Expose it on the first render
   * (SSR + hydration) so public heroes can emit <Image preload> in the initial
   * HTML instead of waiting for a client useEffect + skeleton gap.
   */
  const ssrDomainValue = useMemo(() => {
    const ssrTheme = serverContext.theme;
    const serverHost = serverContext.host?.split(":")[0] ?? null;
    if (!ssrTheme || !serverHost) return null;
    return buildSsrDomainValue(serverHost, ssrTheme);
  }, [serverContext.theme, serverContext.host]);

  useEffect(() => {
    const loadDomainData = async () => {
      const detectedDomain = getDomain();

      if (!detectedDomain) {
        setDomain({
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

      const clientHost = detectedDomain.split(":")[0];
      const serverHost = serverContext.host?.split(":")[0] ?? null;
      const ssrTheme = serverContext.theme;
      const canHydrateFromSsr =
        ssrTheme != null && serverHost != null && serverHost === clientHost;

      if (canHydrateFromSsr) {
        if (detectedDomain === currentDomain && currentSettings && !isLoading) {
          return;
        }

        const tenantData = buildTenantDataFromTheme(clientHost, ssrTheme);
        primeTenantDataCache(clientHost, tenantData);
        setDomain({
          domain: detectedDomain,
          tenantId: tenantData.tenantId,
          website_role: tenantData.website_role,
          parentDomain: tenantData.parentDomain,
          settings: tenantData.settings,
          isLoading: false,
          isDomainRequest: true,
        });
        return;
      }

      // Skip if we already have this domain loaded with settings
      if (detectedDomain === currentDomain && currentSettings && !isLoading) {
        return;
      }

      try {
        const tenantData = await getTenantIdFromDomain(detectedDomain);
        setDomain({
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
        setDomain({
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
  }, [
    currentDomain,
    currentSettings,
    isLoading,
    setDomain,
    serverContext.theme,
    serverContext.host,
  ]);

  const contextValue = useMemo((): DomainContextType => {
    // Once the client effect finishes, the store is authoritative (incl. localhost
    // `?domain=` where the store host may differ from the SSR request host).
    if (!domainStore.isLoading) {
      return {
        domain: domainStore.domain,
        tenantId: domainStore.tenantId,
        website_role: domainStore.website_role,
        parentDomain: domainStore.parentDomain,
        settings: domainStore.settings,
        isLoading: false,
        isDomainRequest: domainStore.isDomainRequest,
      };
    }

    // First paint / SSR: serve layout theme immediately so hero <Image preload> is in HTML.
    if (ssrDomainValue) {
      return ssrDomainValue;
    }

    return {
      domain: domainStore.domain,
      tenantId: domainStore.tenantId,
      website_role: domainStore.website_role,
      parentDomain: domainStore.parentDomain,
      settings: domainStore.settings,
      isLoading: domainStore.isLoading,
      isDomainRequest: domainStore.isDomainRequest,
    };
  }, [
    domainStore.domain,
    domainStore.tenantId,
    domainStore.website_role,
    domainStore.parentDomain,
    domainStore.settings,
    domainStore.isLoading,
    domainStore.isDomainRequest,
    ssrDomainValue,
  ]);

  return (
    <DomainContext.Provider value={contextValue}>
      {children}
    </DomainContext.Provider>
  );
};

// For backward compatibility, maintain the same hook interface
export const useDomain = () => useContext(DomainContext);
