"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { usePermission } from "@/hooks/usePermission";

export type SiteEssentialsUpdateGateValue = {
  canUpdateSiteEssentials: boolean;
  readOnly: boolean;
};

const SiteEssentialsUpdateContext =
  createContext<SiteEssentialsUpdateGateValue | null>(null);

export function SiteEssentialsUpdateProvider({
  children,
}: {
  children: ReactNode;
}) {
  const canUpdateSiteEssentials = usePermission("update-site-essential");
  const value = useMemo(
    () => ({
      canUpdateSiteEssentials,
      readOnly: !canUpdateSiteEssentials,
    }),
    [canUpdateSiteEssentials],
  );

  return (
    <SiteEssentialsUpdateContext.Provider value={value}>
      {children}
    </SiteEssentialsUpdateContext.Provider>
  );
}

export function useSiteEssentialsUpdateGate(): SiteEssentialsUpdateGateValue {
  const ctx = useContext(SiteEssentialsUpdateContext);
  if (!ctx) {
    throw new Error(
      "useSiteEssentialsUpdateGate must be used within SiteEssentialsUpdateProvider",
    );
  }
  return ctx;
}
