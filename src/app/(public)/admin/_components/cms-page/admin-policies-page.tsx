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
} from "@/lib/admin-cms-content";
import { CmsPageLayout } from "@/components/public/cms-page-ui";
import { CmsPoliciesView } from "@/components/public/cms-policies-view";

export default function AdminPoliciesPage() {
  const { theme } = useContext(ServerContext);
  const adminTheme = theme as ThemeSchema;
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");

  const activeSection = isValidAdminPolicySection(sectionParam)
    ? sectionParam
    : "privacy";

  const sections = useMemo(
    () => resolveAdminPolicySections(adminTheme),
    [adminTheme],
  );
  const activeContent = useMemo(
    () => resolveAdminPolicySection(activeSection, adminTheme),
    [activeSection, adminTheme],
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
