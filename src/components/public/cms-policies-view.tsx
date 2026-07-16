"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  CmsContentPanel,
  CMS_PROSE_CLASS,
} from "@/components/public/cms-page-ui";

export interface CmsPolicySectionItem {
  key: string;
  label: string;
  title: string;
  body: string;
}

function buildPoliciesHref(section: string): string {
  return `/policies?section=${section}`;
}

function PolicyNavLink({
  href,
  label,
  isActive,
  variant = "sidebar",
}: {
  href: string;
  label: string;
  isActive: boolean;
  variant?: "sidebar" | "pill";
}) {
  const base =
    variant === "pill"
      ? "inline-flex shrink-0 items-center rounded-full px-4 py-2 text-sm font-medium transition-colors"
      : "block rounded-xl px-4 py-3 text-sm transition-colors";

  return (
    <Link
      href={href}
      className={cn(
        base,
        isActive
          ? "bg-[color:var(--color-primary)] font-semibold text-white shadow-sm"
          : variant === "pill"
            ? "border border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] bg-[color:var(--color-surface)] text-[color:var(--color-text-dimmed)] hover:border-[color:color-mix(in_srgb,var(--color-primary)_30%,transparent)] hover:text-[color:var(--color-text)]"
            : "text-[color:var(--color-text-dimmed)] hover:bg-[color:color-mix(in_srgb,var(--color-text)_4%,transparent)] hover:text-[color:var(--color-text)]",
      )}
      aria-current={isActive ? "page" : undefined}
    >
      {label}
    </Link>
  );
}

interface CmsPoliciesViewProps {
  brandName: string;
  sections: CmsPolicySectionItem[];
  activeSection: string;
  activeContent: CmsPolicySectionItem;
}

export function CmsPoliciesView({
  brandName,
  sections,
  activeSection,
  activeContent,
}: CmsPoliciesViewProps) {
  return (
    <>
      <nav
        aria-label="Policy sections"
        className="mb-6 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden"
      >
        {sections.map((section) => (
          <PolicyNavLink
            key={section.key}
            href={buildPoliciesHref(section.key)}
            label={section.label}
            isActive={section.key === activeSection}
            variant="pill"
          />
        ))}
      </nav>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        <aside className="hidden lg:col-span-4 lg:block xl:col-span-3">
          <CmsContentPanel className="sticky top-28 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-text-dimmed)]">
              On this page
            </p>
            <nav
              aria-label="Policy sections"
              className="mt-4 flex flex-col gap-1"
            >
              {sections.map((section) => (
                <PolicyNavLink
                  key={section.key}
                  href={buildPoliciesHref(section.key)}
                  label={section.label}
                  isActive={section.key === activeSection}
                  variant="sidebar"
                />
              ))}
            </nav>
          </CmsContentPanel>
        </aside>

        <article className="lg:col-span-8 xl:col-span-9">
          <CmsContentPanel>
            <div className="mb-6 border-b border-[color:color-mix(in_srgb,var(--color-text)_8%,transparent)] pb-6">
              <h2
                className="text-2xl font-bold tracking-tight text-[color:var(--color-text)] md:text-3xl"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {activeContent.title}
              </h2>
              <p className="mt-2 text-sm text-[color:var(--color-text-dimmed)]">
                Last updated information for {brandName}.
              </p>
            </div>

            <div
              className={CMS_PROSE_CLASS}
              dangerouslySetInnerHTML={{ __html: activeContent.body }}
            />
          </CmsContentPanel>
        </article>
      </div>
    </>
  );
}
