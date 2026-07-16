"use client";

import { useContext } from "react";
import { ServerContext } from "@/lib/server-context";
import type { ThemeSchema } from "@/types/theme.types";
import { isVendorPublicSite, type VendorCmsPageKey } from "@/lib/vendor-cms-content";
import VendorPoliciesPage from "@/app/(public)/vendor/_components/cms-page/vendor-policies-page";
import VendorContactPage from "@/app/(public)/vendor/_components/cms-page/vendor-contact-page";
import AdminPoliciesPage from "@/app/(public)/admin/_components/cms-page/admin-policies-page";
import AdminContactPage from "@/app/(public)/admin/_components/cms-page/admin-contact-page";

interface PublicCmsPageGateProps {
  page: VendorCmsPageKey;
}

export function PublicCmsPageGate({ page }: PublicCmsPageGateProps) {
  const { subdomain, theme } = useContext(ServerContext);
  const vendorTheme = theme as ThemeSchema | null;

  if (isVendorPublicSite(subdomain, vendorTheme)) {
    return page === "policies" ? <VendorPoliciesPage /> : <VendorContactPage />;
  }

  return page === "policies" ? <AdminPoliciesPage /> : <AdminContactPage />;
}

/** @deprecated Use PublicCmsPageGate */
export const VendorCmsPageGate = PublicCmsPageGate;
