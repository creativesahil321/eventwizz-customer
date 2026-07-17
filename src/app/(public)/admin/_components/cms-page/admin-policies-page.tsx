"use client";

import { useMemo, useContext } from "react";
import { useSearchParams } from "next/navigation";
import { ServerContext } from "@/lib/server-context";
import type { ThemeSchema } from "@/types/theme.types";
import AdminHeader from "@/app/(public)/admin/_components/header";
import AdminFooter from "@/app/(public)/admin/_components/footer";
import {
  isValidAdminPolicySection,
  resolveAdminPolicySection,
  resolveAdminPolicySections,
  type InfoPageContentMap,
} from "@/lib/admin-cms-content";
import { CmsPageLayout } from "@/components/public/cms-page-ui";
import { CmsPoliciesView } from "@/components/public/cms-policies-view";

export default function AdminPoliciesPage({
  contentByKey,
}: {
  contentByKey?: InfoPageContentMap;
}) {
  const { theme } = useContext(ServerContext);
  const adminTheme = theme as ThemeSchema;
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");

  const activeSection = isValidAdminPolicySection(sectionParam)
    ? sectionParam
    : "privacy";

  const sections = useMemo(
    () => resolveAdminPolicySections(adminTheme, contentByKey),
    [adminTheme, contentByKey],
  );
  const activeContent = useMemo(
    () => resolveAdminPolicySection(activeSection, adminTheme, contentByKey),
    [activeSection, adminTheme, contentByKey],
  );

  return (
    <CmsPageLayout
      header={<AdminHeader />}
      footer={<AdminFooter />}
      brandName="EventWizz"
      title="Policies"
      subtitle="Privacy, terms, cookies, refunds, and vendor policy information for using the EventWizz platform."
      wide
    >
      <CmsPoliciesView
        brandName="EventWizz"
        sections={sections}
        activeSection={activeSection}
        activeContent={activeContent}
      />
    </CmsPageLayout>
  );
}
