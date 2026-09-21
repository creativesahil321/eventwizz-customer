"use client";

import { useContext } from "react";
import Link from "next/link";
import {
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
} from "lucide-react";
import { ServerContext } from "@/lib/server-context";
import { addCacheBusting } from "@/lib/image-utils";
import {
  ADMIN_FOOTER_BRAND_DESCRIPTION,
  ADMIN_FOOTER_DISCLAIMER,
  ADMIN_FOOTER_NAV_LINKS,
  resolveAdminCompanyInfo,
  resolveAdminCopyright,
} from "@/lib/admin-cms-content";
import { ThemeSchema } from "@/types/theme.types";
import FAQSection from "../faq-section";
import { BrandLogoImage } from "@/components/shared/brand-logo-image";
import { PUBLIC_CHROME_CONTAINER_CLASS } from "@/lib/public-rhythm";
import { cn } from "@/lib/utils";

function SocialRow({
  links,
}: {
  links: Array<{ icon: typeof Facebook; href: string; id: string }>;
}) {
  if (links.length === 0) return null;

  return (
    <div className="mt-5 flex flex-wrap items-center gap-2.5">
      {links.map(({ icon: Icon, href, id }) => (
        <Link
          key={id}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={id}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-[color:color-mix(in_srgb,var(--color-on-footer)_15%,transparent)] text-[var(--color-on-footer)]/70 transition-colors hover:border-[color:var(--color-primary)] hover:text-[color:var(--color-primary)]"
        >
          <Icon size={14} />
        </Link>
      ))}
    </div>
  );
}

export default function AdminFooter() {
  const { theme } = useContext(ServerContext);
  const adminTheme = theme as ThemeSchema;
  const companyInfo = resolveAdminCompanyInfo(adminTheme);
  const copyright = resolveAdminCopyright(adminTheme);
  // Copyright is now a rich-text field that can hold both a legal disclaimer and
  // the © line. When set, render it as HTML in place of the hardcoded fallback.
  const customCopyrightHtml = adminTheme?.copyright?.trim();

  const logoPath =
    theme?.logo?.startsWith("/") ||
    theme?.logo?.startsWith("data:") ||
    theme?.logo?.startsWith("http") ||
    theme?.logo?.startsWith("https") ||
    theme?.logo?.startsWith("blob")
      ? theme.logo
      : "/assets/images/logos/eventwizz-logo.png";

  const socialIcons = {
    facebook: Facebook,
    twitter: Twitter,
    instagram: Instagram,
    linkedin: Linkedin,
    youtube: Youtube,
  } as const;

  const socialLinks = Object.entries(adminTheme?.socialLinks || {})
    .filter(([, url]) => Boolean(url && url.trim() !== ""))
    .map(([platform, url]) => {
      const IconComponent = socialIcons[platform as keyof typeof socialIcons];
      if (!IconComponent || !url) return null;
      return { icon: IconComponent, href: url, id: platform };
    })
    .filter(
      (link): link is { icon: typeof Facebook; href: string; id: string } =>
        link !== null,
    );

  return (
    <>
      {/* Shown on every admin page just above the footer */}
      <FAQSection />
      <footer className="bg-[color:var(--color-footer)] text-[var(--color-on-footer)]">
      <div className={cn(PUBLIC_CHROME_CONTAINER_CLASS, "py-12 md:py-14")}>
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          {/* Brand */}
          <div className="lg:col-span-4">
            <BrandLogoImage
              src={addCacheBusting(logoPath)}
              alt="EventWizz"
              className="h-9 w-auto"
              chrome="footer"
            />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[var(--color-on-footer)]/75">
              {ADMIN_FOOTER_BRAND_DESCRIPTION}
            </p>
            <SocialRow links={socialLinks} />
          </div>

          {/* Company information — legal entity, not duplicate policy links */}
          <div className="lg:col-span-4">
            <h3
              className="text-base font-bold text-[var(--color-on-footer)]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Company Information
            </h3>
            <address className="mt-4 space-y-2 text-sm not-italic leading-relaxed text-[var(--color-on-footer)]/80">
              <p>{companyInfo.legalName}</p>
              <p>Company Number: {companyInfo.companyNumber}</p>
              <p>
                Registered Office:
                <br />
                {companyInfo.registeredOffice}
              </p>
              <p>
                Phone:{" "}
                <Link
                  href={`tel:${companyInfo.phoneHref}`}
                  className="transition-colors hover:text-[color:var(--color-primary)]"
                >
                  {companyInfo.phone}
                </Link>
              </p>
              <p>
                Email:{" "}
                <Link
                  href={`mailto:${companyInfo.email}`}
                  className="transition-colors hover:text-[color:var(--color-primary)]"
                >
                  {companyInfo.email}
                </Link>
              </p>
            </address>
          </div>

          {/* Main navigation only — policy sub-pages live under Terms & Privacy */}
          <div className="lg:col-span-4">
            <h3
              className="text-base font-bold text-[var(--color-on-footer)]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Links
            </h3>
            <nav aria-label="Footer navigation" className="mt-4">
              <ul className="space-y-2.5">
                {ADMIN_FOOTER_NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-[var(--color-on-footer)]/80 transition-colors hover:text-[color:var(--color-primary)]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        <div className="mt-10 border-t border-[var(--color-on-footer)]/20 pt-8">
          {customCopyrightHtml ? (
            <div
              className="mx-auto max-w-4xl text-center text-xs leading-relaxed text-[var(--color-on-footer)]/65 [&_p]:mb-3 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_em]:italic [&_a]:underline [&_a]:transition-colors hover:[&_a]:text-[color:var(--color-primary)]"
              dangerouslySetInnerHTML={{ __html: customCopyrightHtml }}
            />
          ) : (
            <>
              <p className="mx-auto max-w-4xl text-center text-xs leading-relaxed text-[var(--color-on-footer)]/60">
                {ADMIN_FOOTER_DISCLAIMER}
              </p>
              <p className="mt-4 text-center text-xs text-[var(--color-on-footer)]/70">
                {copyright}
              </p>
            </>
          )}
        </div>
      </div>
      </footer>
    </>
  );
}
