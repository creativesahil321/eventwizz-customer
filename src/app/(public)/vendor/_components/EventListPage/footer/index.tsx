"use client";

import Link from "next/link";
import {
  Facebook,
  Instagram,
  Linkedin,
  MapPin,
  Phone,
  Mail,
  Twitter,
  Youtube,
} from "lucide-react";
import { useContext, useMemo, type ReactNode } from "react";
import { ServerContext } from "@/lib/server-context";
import { ThemeSchema } from "@/types/theme.types";
import { addCacheBusting } from "@/lib/image-utils";
import {
  buildMapsDirectionsUrl,
  resolveFooterContactBlocks,
  type ResolvedVenueContact,
  type VenueContactOverride,
} from "@/lib/resolve-venue-contact";
import { VENDOR_FOOTER_PAGE_LINKS } from "@/lib/vendor-cms-content";

interface FooterSectionProps {
  copyright?: string | null;
  logo?: string | null;
  /** When set, show that location's contact alongside head office */
  locationSlug?: string | null;
  /** Optional fields from location/event API (merged over theme) */
  contactOverride?: VenueContactOverride | null;
}

function SocialRow({
  links,
  align = "start",
}: {
  links: Array<{ icon: typeof Facebook; href: string; id: string }>;
  align?: "start" | "center";
}) {
  if (links.length === 0) return null;

  return (
    <div
      className={`flex gap-2.5 ${align === "center" ? "justify-center" : ""}`}
    >
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

function ContactColumn({
  label,
  href,
  icon: Icon,
  children,
  external,
  align = "start",
}: {
  label: string;
  href: string;
  icon: typeof Phone;
  children: ReactNode;
  external?: boolean;
  align?: "start" | "center";
}) {
  const centered = align === "center";
  const valueClass =
    "mt-2.5 block text-sm font-normal leading-snug text-[var(--color-on-footer)] transition-colors group-hover:text-[color:var(--color-primary)] md:text-base";

  const body = (
    <>
      <span
        className={`flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-[var(--color-on-footer)]/65 ${
          centered ? "justify-center" : ""
        }`}
      >
        <Icon
          className="h-4 w-4 text-[color:var(--color-primary)]"
          aria-hidden
        />
        {label}
      </span>
      <span className={`${valueClass} ${centered ? "text-center" : ""}`}>
        {children}
      </span>
    </>
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`group block min-w-0 ${centered ? "text-center" : ""}`}
      >
        {body}
      </a>
    );
  }

  return (
    <Link
      href={href}
      className={`group block min-w-0 ${centered ? "text-center" : ""}`}
    >
      {body}
    </Link>
  );
}

function FooterPageLinks({ centered }: { centered?: boolean }) {
  return (
    <nav
      aria-label="Footer pages"
      className={`flex flex-wrap gap-x-5 gap-y-2 ${centered ? "justify-center" : ""}`}
    >
      {VENDOR_FOOTER_PAGE_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="text-sm text-[var(--color-on-footer)]/70 transition-colors hover:text-[color:var(--color-primary)]"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

function ContactLines({ contact }: { contact: ResolvedVenueContact }) {
  return (
    <div className="flex flex-col gap-2.5">
      {contact.phone ? (
        <Link
          href={`tel:${contact.phone}`}
          className="inline-flex items-start gap-2 text-sm text-[var(--color-on-footer)]/80 transition-colors hover:text-[color:var(--color-primary)]"
        >
          <Phone
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--color-primary)]"
            aria-hidden
          />
          <span className="break-words">{contact.phone}</span>
        </Link>
      ) : null}
      {contact.address ? (
        <a
          href={buildMapsDirectionsUrl(contact.address)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-start gap-2 text-sm text-[var(--color-on-footer)]/80 transition-colors hover:text-[color:var(--color-primary)] hover:underline hover:underline-offset-2"
        >
          <MapPin
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--color-primary)]"
            aria-hidden
          />
          <span className="break-words">{contact.address}</span>
        </a>
      ) : null}
      {contact.email ? (
        <Link
          href={`mailto:${contact.email}`}
          className="inline-flex items-start gap-2 text-sm text-[var(--color-on-footer)]/80 transition-colors hover:text-[color:var(--color-primary)]"
        >
          <Mail
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--color-primary)]"
            aria-hidden
          />
          <span className="break-words">{contact.email}</span>
        </Link>
      ) : null}
    </div>
  );
}

export default function FooterSection({
  copyright,
  logo,
  locationSlug,
  contactOverride,
}: FooterSectionProps = {}) {
  const { theme } = useContext(ServerContext);
  const vendorTheme = theme as ThemeSchema;

  const logoToUse = logo || theme?.logo;
  const logoPath =
    logoToUse?.startsWith("/") ||
    logoToUse?.startsWith("data:") ||
    logoToUse?.startsWith("http") ||
    logoToUse?.startsWith("https") ||
    logoToUse?.startsWith("blob")
      ? logoToUse
      : "/assets/images/logos/eventwizz-logo.png";
  const currentYear = new Date().getFullYear();

  const socialIcons = {
    facebook: Facebook,
    twitter: Twitter,
    instagram: Instagram,
    linkedin: Linkedin,
    youtube: Youtube,
  } as const;

  const socialLinks = Object.entries(vendorTheme?.socialLinks || {})
    .filter(([, url]) => url && url.trim() !== "")
    .map(([platform, url]) => {
      const IconComponent = socialIcons[platform as keyof typeof socialIcons];
      if (!IconComponent) return null;
      return { icon: IconComponent, href: url, id: platform };
    })
    .filter(
      (link): link is { icon: typeof Facebook; href: string; id: string } =>
        link !== null,
    );

  const contactBlocks = useMemo(
    () =>
      resolveFooterContactBlocks({
        theme: vendorTheme,
        locationSlug,
        override: contactOverride,
      }),
    [vendorTheme, locationSlug, contactOverride],
  );

  const isMainPageFooter = !locationSlug && contactBlocks.length <= 1;
  const singleContact = isMainPageFooter ? contactBlocks[0]?.contact : null;

  const copyrightText =
    copyright ||
    vendorTheme?.copyright ||
    `© ${currentYear} ${vendorTheme?.name || "EventWizz"}. All rights reserved.`;

  return (
    <footer className="bg-[color:var(--color-footer)] text-[var(--color-on-footer)]">
      {isMainPageFooter ? (
        /* Main page: centered brand + contact columns */
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-14">
          <div className="flex flex-col items-center text-center">
            <Link href="/" className="inline-flex">
              <img
                src={addCacheBusting(logoPath)}
                className="h-10 w-auto object-contain"
                alt={vendorTheme?.name || "EventWizz"}
              />
            </Link>
            <div className="mt-5">
              <SocialRow links={socialLinks} align="center" />
            </div>

            {singleContact &&
            (singleContact.phone ||
              singleContact.address ||
              singleContact.email) ? (
              <div className="mt-10 grid w-full max-w-3xl grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-6">
                {singleContact.phone ? (
                  <ContactColumn
                    label="Phone"
                    href={`tel:${singleContact.phone}`}
                    icon={Phone}
                    align="center"
                  >
                    {singleContact.phone}
                  </ContactColumn>
                ) : null}
                {singleContact.address ? (
                  <ContactColumn
                    label="Visit us"
                    href={buildMapsDirectionsUrl(singleContact.address)}
                    icon={MapPin}
                    external
                    align="center"
                  >
                    {singleContact.address}
                  </ContactColumn>
                ) : null}
                {singleContact.email ? (
                  <ContactColumn
                    label="Email"
                    href={`mailto:${singleContact.email}`}
                    icon={Mail}
                    align="center"
                  >
                    {singleContact.email}
                  </ContactColumn>
                ) : null}
              </div>
            ) : null}

            <div className="mt-10">
              <FooterPageLinks centered />
            </div>
          </div>
        </div>
      ) : (
        /* Location / event pages: brand + labeled venue columns */
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-8">
            <div className="md:col-span-4">
              <Link href="/" className="inline-flex">
                <img
                  src={addCacheBusting(logoPath)}
                  className="h-10 w-auto object-contain"
                  alt={vendorTheme?.name || "EventWizz"}
                />
              </Link>
              <div className="mt-5">
                <SocialRow links={socialLinks} />
              </div>
            </div>

            {contactBlocks.length > 0 && (
              <div className="md:col-span-8">
                <div
                  className={`grid grid-cols-1 gap-8 ${
                    contactBlocks.length >= 2
                      ? "sm:grid-cols-2"
                      : "sm:grid-cols-1 sm:max-w-sm"
                  }`}
                >
                  {contactBlocks.map((block) => (
                    <div key={block.id}>
                      <h6 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-on-footer)]/45">
                        {block.label}
                      </h6>
                      <ContactLines contact={block.contact} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 md:col-span-12">
            <FooterPageLinks />
          </div>
        </div>
      )}

      <div className="border-t border-[color:color-mix(in_srgb,var(--color-on-footer)_10%,transparent)]">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div
            className={`text-xs text-[var(--color-on-footer)]/55 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_em]:italic [&_a]:underline ${
              isMainPageFooter ? "text-center" : ""
            }`}
            dangerouslySetInnerHTML={{ __html: copyrightText }}
          />
        </div>
      </div>
    </footer>
  );
}
