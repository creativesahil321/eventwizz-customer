"use client";

import Link from "next/link";
import { useContext, useMemo } from "react";
import { Clock, Mail, Phone } from "lucide-react";
import AdminHeader from "@/app/(public)/admin/_components/header";
import AdminFooter from "@/app/(public)/admin/_components/footer";
import {
  resolveAdminContactContent,
  resolveAdminContactDetails,
} from "@/lib/admin-cms-content";
import { ADMIN_SUPPORT_HOURS } from "@/lib/admin-contact-form";
import { ServerContext } from "@/lib/server-context";
import type { ThemeSchema } from "@/types/theme.types";
import {
  CmsPageLayout,
  CMS_PROSE_CLASS,
} from "@/components/public/cms-page-ui";
import { AdminContactForm } from "./admin-contact-form";
import { AdminContactSidebar } from "./admin-contact-sidebar";

function QuickContactCard({
  href,
  external,
  icon: Icon,
  label,
  value,
}: {
  href: string;
  external?: boolean;
  icon: typeof Phone;
  label: string;
  value: string;
}) {
  const cardClass =
    "group flex h-full flex-col rounded-2xl border border-[color:color-mix(in_srgb,var(--color-text)_8%,transparent)] bg-[color:var(--color-surface)] p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:color-mix(in_srgb,var(--color-primary)_35%,transparent)] hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)] md:p-6";

  const inner = (
    <>
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[color:color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[color:var(--color-primary)] transition-colors group-hover:bg-[color:color-mix(in_srgb,var(--color-primary)_18%,transparent)]">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-text-dimmed)]">
        {label}
      </p>
      <p className="mt-1.5 break-words text-sm font-medium leading-snug text-[color:var(--color-text)] md:text-base">
        {value}
      </p>
    </>
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cardClass}
      >
        {inner}
      </a>
    );
  }

  return (
    <Link href={href} className={cardClass}>
      {inner}
    </Link>
  );
}

export default function AdminContactPage() {
  const { theme } = useContext(ServerContext);
  const adminTheme = theme as ThemeSchema;
  const content = useMemo(
    () => resolveAdminContactContent(adminTheme),
    [adminTheme],
  );
  const contactDetails = useMemo(
    () => resolveAdminContactDetails(adminTheme),
    [adminTheme],
  );

  const quickContacts = [
    {
      key: "phone",
      href: `tel:${contactDetails.phoneHref}`,
      icon: Phone,
      label: "Phone",
      value: contactDetails.phone,
    },
    {
      key: "email",
      href: `mailto:${contactDetails.email}`,
      icon: Mail,
      label: "Email",
      value: contactDetails.email,
    },
    {
      key: "hours",
      href: "#contact-form",
      icon: Clock,
      label: "Support hours",
      value: ADMIN_SUPPORT_HOURS,
    },
  ] as const;

  return (
    <CmsPageLayout
      header={<AdminHeader />}
      footer={<AdminFooter />}
      brandName="Get in touch"
      title={content.title}
      subtitle="We're here to help with enquiries relating to EventWizz, onboarding, support, partnerships, and platform assistance."
      wide
    >
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quickContacts.map((item) => (
          <QuickContactCard
            key={item.key}
            href={item.href}
            icon={item.icon}
            label={item.label}
            value={item.value}
          />
        ))}
      </div>

      {content.body ? (
        <div
          className={`${CMS_PROSE_CLASS} mb-8 max-w-3xl`}
          dangerouslySetInnerHTML={{ __html: content.body }}
        />
      ) : null}

      <div
        id="contact-form"
        className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8"
      >
        <div className="lg:col-span-7">
          <AdminContactForm />
        </div>
        <div className="lg:col-span-5">
          <AdminContactSidebar />
        </div>
      </div>
    </CmsPageLayout>
  );
}
