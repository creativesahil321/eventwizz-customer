"use client";

import type { ReactNode } from "react";
import { useContext, useMemo } from "react";
import { resolveAdminCompanyInfo } from "@/lib/admin-cms-content";
import { ServerContext } from "@/lib/server-context";
import type { ThemeSchema } from "@/types/theme.types";
import { CmsContentPanel } from "@/components/public/cms-page-ui";

const TECH_SUPPORT_TIPS = [
  "your name",
  "your business name",
  "screenshots where applicable",
  "a brief description of the issue",
] as const;

function SidebarCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <CmsContentPanel className="p-5 md:p-6">
      <h3
        className="text-base font-bold text-[color:var(--color-text)]"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {title}
      </h3>
      <div className="mt-3 text-sm leading-relaxed text-[color:var(--color-text-dimmed)]">
        {children}
      </div>
    </CmsContentPanel>
  );
}

export function AdminContactSidebar() {
  const { theme } = useContext(ServerContext);
  const companyInfo = useMemo(
    () => resolveAdminCompanyInfo(theme as ThemeSchema),
    [theme],
  );

  return (
    <div className="space-y-4">
      <SidebarCard title="Company Information">
        <p>{companyInfo.legalName}</p>
        <p className="mt-2">Company Number: {companyInfo.companyNumber}</p>
        <p className="mt-2">{companyInfo.registeredOffice}</p>
      </SidebarCard>

      <SidebarCard title="Registered Office">
        <p>{companyInfo.registeredOffice}</p>
      </SidebarCard>

      <SidebarCard title="Technical Support">
        <p>When contacting us about a technical issue, please include:</p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          {TECH_SUPPORT_TIPS.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </SidebarCard>
    </div>
  );
}
