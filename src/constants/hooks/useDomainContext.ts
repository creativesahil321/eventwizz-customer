import { useDomainStore } from "@/store/domain.store";
import { useDomain } from "@/providers/domain-provider/domain-provider";
import { useEffect, useState } from "react";

/**
 * A custom hook that provides domain context data
 * Prefers direct Zustand store access but falls back to context API
 */
export const useDomainContext = () => {
  const domainStore = useDomainStore();
  const domainContext = useDomain();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Helper function to get property value with fallback
  const getProperty = <T>(key: keyof typeof domainStore) => {
    if (isClient && typeof window !== "undefined") {
      return (
        key in (domainContext || {})
          ? domainContext[key as keyof typeof domainContext]
          : domainStore[key]
      ) as T;
    }
    return domainStore[key] as T;
  };

  return {
    // Direct store access
    ...domainStore,
    // Properties with fallback to context
    domain: getProperty("domain"),
    tenantId: getProperty("tenantId"),
    website_role: getProperty("website_role"),
    parentDomain: getProperty("parentDomain"),
    settings: getProperty("settings"),
    isLoading: getProperty("isLoading"),
    isDomainRequest: getProperty("isDomainRequest"),
    // Helper methods
    isPrimaryDomain:
      domainStore.domain === null ||
      ["localhost", "127.0.0.1", "eventwizz.local"].includes(
        domainStore.domain
      ),
    isVendorDomain: domainStore.website_role === "vendor",
    isAdminDomain: domainStore.website_role === "admin",
    isCustomerDomain: domainStore.website_role === "customer",
  };
};
