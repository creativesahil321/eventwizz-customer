"use client";

import Link from "next/link";
import { useContext, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ServerContext } from "@/lib/server-context";
import type { ThemeSchema } from "@/types/theme.types";
import {
  isValidPolicySection,
  resolveVendorPolicySection,
  resolveVendorPolicySections,
  type InfoPageContentMap,
  type VendorPolicySectionKey,
} from "@/lib/vendor-cms-content";
import { VendorCmsShell } from "./vendor-cms-shell";
import { CmsPoliciesView } from "@/components/public/cms-policies-view";

export default function VendorPoliciesPage({
  contentByKey,
}: {
  contentByKey?: InfoPageContentMap;
}) {
  const { theme } = useContext(ServerContext);
  const vendorTheme = theme as ThemeSchema;
  const searchParams = useSearchParams();

  const sectionParam = searchParams.get("section");
  const activeSection: VendorPolicySectionKey = isValidPolicySection(
    sectionParam,
  )
    ? sectionParam
    : "terms";

  const sections = useMemo(
    () => resolveVendorPolicySections(vendorTheme, contentByKey),
    [vendorTheme, contentByKey],
  );

  const activeContent = useMemo(
    () => resolveVendorPolicySection(activeSection, vendorTheme, contentByKey),
    [activeSection, vendorTheme, contentByKey],
  );

  return (
    <VendorCmsShell
      logo={vendorTheme?.logo}
      name={vendorTheme?.name}
      title="Policies"
      subtitle="Terms, privacy, and refund information for bookings and use of our site."
      wide
    >
      <CmsPoliciesView
        brandName={vendorTheme?.name || "our venue"}
        sections={sections}
        activeSection={activeSection}
        activeContent={activeContent}
      />
    </VendorCmsShell>
  );
}
