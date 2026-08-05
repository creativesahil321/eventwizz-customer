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
import { usePathname } from "next/navigation";
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
import { useThemeQuery } from "@/hooks/use-theme-query";
import { useDomain } from "@/providers/domain-provider/domain-provider";
import { useIsPreviewMode } from "@/contexts/preview-context";
import { usePreviewNarrowLayout } from "@/hooks/use-preview-narrow-layout";
import { cn } from "@/lib/utils";

interface FooterSectionProps {
  copyright?: string | null;
  logo?: string | null;
  /** When set, show that location's contact alongside head office */
  locationSlug?: string | null;
  /** Optional fields from location/event API (merged over theme) */
  contactOverride?: VenueContactOverride | null;
  /**
   * Prefer this over the host `useThemeQuery` theme for footer contact.
   * Used on `/preview/*` where the platform host theme has admin/dummy contact —
   * pass vendor `contactDetails` + `locations` (same as the live vendor site).
   */
  contactTheme?: Pick<ThemeSchema, "contactDetails" | "locations"> | null;
  /**
   * When provided, replaces theme social links (e.g. onboarding draft — often empty).
   * Pass `{}` / all-empty to hide icons in preview.
   */
  socialLinksOverride?: Partial<
    Record<"facebook" | "twitter" | "instagram" | "linkedin" | "youtube", string>
  > | null;
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
      className={`flex gap-2 ${align === "center" ? "justify-center" : ""}`}
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
}: {
  label: string;
  href: string;
  icon: typeof Phone;
  children: ReactNode;
  external?: boolean;
}) {
  const body = (
    <>
      <span className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-on-footer)]/55">
        <Icon
          className="h-3.5 w-3.5 text-[color:var(--color-primary)]"
          aria-hidden
        />
        {label}
      </span>
      <span className="mt-1.5 block break-words text-center text-sm leading-snug text-[var(--color-on-footer)] transition-colors group-hover:text-[color:var(--color-primary)]">
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
        className="group block min-w-0 text-center"
      >
        {body}
      </a>
    );
  }

  return (
    <Link href={href} className="group block min-w-0 text-center">
      {body}
    </Link>
  );
}

function FooterPageLinks({ centered }: { centered?: boolean }) {
  // Info pages (/policies, /contact) have no site-preview surface — hide the
  // links so vendors aren't taken out of the preview review flow.
  const isPreviewMode = useIsPreviewMode();
  if (isPreviewMode) return null;

  return (
    <nav
      aria-label="Footer pages"
      className={`flex flex-wrap gap-x-4 gap-y-1.5 ${centered ? "justify-center" : ""}`}
    >
      {VENDOR_FOOTER_PAGE_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="text-xs text-[var(--color-on-footer)]/70 transition-colors hover:text-[color:var(--color-primary)] sm:text-sm"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

function ContactLines({
  contact,
  align = "start",
}: {
  contact: ResolvedVenueContact;
  align?: "start" | "center";
}) {
  const centered = align === "center";

  return (
    <div
      className={`flex flex-col gap-2 ${centered ? "items-center" : ""}`}
    >
      {contact.phone ? (
        <Link
          href={`tel:${contact.phone}`}
          className={`inline-flex max-w-full items-start gap-2 text-sm text-[var(--color-on-footer)]/80 transition-colors hover:text-[color:var(--color-primary)] ${
            centered ? "justify-center text-center" : ""
          }`}
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
          className={`inline-flex max-w-full items-start gap-2 text-sm text-[var(--color-on-footer)]/80 transition-colors hover:text-[color:var(--color-primary)] hover:underline hover:underline-offset-2 ${
            centered ? "justify-center text-center" : ""
          }`}
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
          className={`inline-flex max-w-full items-start gap-2 text-sm text-[var(--color-on-footer)]/80 transition-colors hover:text-[color:var(--color-primary)] ${
            centered ? "justify-center text-center" : ""
          }`}
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
  contactTheme,
  socialLinksOverride,
}: FooterSectionProps = {}) {
  const { theme: serverTheme } = useContext(ServerContext);
  const { domain } = useDomain();
  const { data: queryTheme } = useThemeQuery(domain, serverTheme);
  const vendorTheme = (queryTheme ?? serverTheme) as ThemeSchema;
  const narrowPreview = usePreviewNarrowLayout();
  const pathname = usePathname();
  const isPreviewMode = useIsPreviewMode();
  /** Social icons only on live site + Sites Essentials `/preview/site` — not onboarding. */
  const showSocialLinks =
    !isPreviewMode || Boolean(pathname?.includes("/preview/site"));
  /** Live site uses vendor theme; preview passes site-essentials so we never use platform dummy contact. */
  const themeForContact = contactTheme ?? vendorTheme;

  const logoToUse = logo || vendorTheme?.logo;
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

  const socialSource =
    socialLinksOverride !== undefined && socialLinksOverride !== null
      ? socialLinksOverride
      : vendorTheme?.socialLinks || {};

  const socialLinks = showSocialLinks
    ? Object.entries(socialSource)
        .filter(([, url]) => typeof url === "string" && url.trim() !== "")
        .map(([platform, url]) => {
          const IconComponent = socialIcons[platform as keyof typeof socialIcons];
          if (!IconComponent) return null;
          return { icon: IconComponent, href: url as string, id: platform };
        })
        .filter(
          (link): link is { icon: typeof Facebook; href: string; id: string } =>
            link !== null,
        )
    : [];

  const contactBlocks = useMemo(
    () =>
      resolveFooterContactBlocks({
        theme: themeForContact,
        locationSlug,
        override: contactOverride,
      }),
    [themeForContact, locationSlug, contactOverride],
  );

  const isSingleContactFooter = contactBlocks.length <= 1;
  const singleContact = isSingleContactFooter
    ? contactBlocks[0]?.contact
    : null;

  const copyrightText =
    copyright ||
    vendorTheme?.copyright ||
    `© ${currentYear} ${vendorTheme?.name || "EventWizz"}. All rights reserved.`;

  const hasSingleContact =
    singleContact &&
    (singleContact.phone || singleContact.address || singleContact.email);

  return (
    <footer className="bg-[color:var(--color-footer)] text-[var(--color-on-footer)]">
      {isSingleContactFooter ? (
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 md:py-10">
          <div className="flex flex-col items-center text-center">
            {isPreviewMode ? (
              <div className="inline-flex max-w-full cursor-default">
                <img
                  src={addCacheBusting(logoPath)}
                  className="h-8 w-auto max-w-[min(100%,10rem)] object-contain sm:h-9"
                  alt={vendorTheme?.name || "EventWizz"}
                />
              </div>
            ) : (
              <Link href="/" className="inline-flex max-w-full">
                <img
                  src={addCacheBusting(logoPath)}
                  className="h-8 w-auto max-w-[min(100%,10rem)] object-contain sm:h-9"
                  alt={vendorTheme?.name || "EventWizz"}
                />
              </Link>
            )}

            {socialLinks.length > 0 ? (
              <div className="mt-3 sm:mt-4">
                <SocialRow links={socialLinks} align="center" />
              </div>
            ) : null}

            {hasSingleContact ? (
              <>
                {/* Mobile / narrow preview: compact icon + value rows */}
                <div
                  className={cn(
                    "mt-4 w-full max-w-md",
                    !narrowPreview && "sm:hidden",
                  )}
                >
                  <ContactLines contact={singleContact} align="center" />
                </div>

                {/* Desktop preview + live sm+: three-column contact */}
                <div
                  className={cn(
                    "mt-6 w-full max-w-3xl grid-cols-3 gap-5 md:gap-6",
                    narrowPreview ? "hidden" : "hidden sm:grid md:mt-8",
                  )}
                >
                  {singleContact.phone ? (
                    <ContactColumn
                      label="Phone"
                      href={`tel:${singleContact.phone}`}
                      icon={Phone}
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
                    >
                      {singleContact.address}
                    </ContactColumn>
                  ) : null}
                  {singleContact.email ? (
                    <ContactColumn
                      label="Email"
                      href={`mailto:${singleContact.email}`}
                      icon={Mail}
                    >
                      {singleContact.email}
                    </ContactColumn>
                  ) : null}
                </div>
              </>
            ) : null}

            <div className="mt-4 sm:mt-6">
              <FooterPageLinks centered />
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 md:py-10">
          <div className="flex flex-col items-center text-center">
            {isPreviewMode ? (
              <div className="inline-flex max-w-full cursor-default">
                <img
                  src={addCacheBusting(logoPath)}
                  className="h-8 w-auto max-w-[min(100%,10rem)] object-contain sm:h-9"
                  alt={vendorTheme?.name || "EventWizz"}
                />
              </div>
            ) : (
              <Link href="/" className="inline-flex max-w-full">
                <img
                  src={addCacheBusting(logoPath)}
                  className="h-8 w-auto max-w-[min(100%,10rem)] object-contain sm:h-9"
                  alt={vendorTheme?.name || "EventWizz"}
                />
              </Link>
            )}
            {socialLinks.length > 0 ? (
              <div className="mt-3 sm:mt-4">
                <SocialRow links={socialLinks} align="center" />
              </div>
            ) : null}
          </div>

          <div
            className={cn(
              "mx-auto mt-6 grid w-full max-w-3xl grid-cols-1 gap-4",
              !narrowPreview && "sm:mt-8 sm:grid-cols-2 sm:gap-5",
            )}
          >
            {contactBlocks.map((block) => (
              <div
                key={block.id}
                className="min-w-0 rounded-xl border border-[color:color-mix(in_srgb,var(--color-on-footer)_12%,transparent)] px-4 py-4"
              >
                <h6 className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-on-footer)]/70">
                  {block.label}
                </h6>
                <ContactLines contact={block.contact} align="center" />
              </div>
            ))}
          </div>

          <div className="mt-5 flex justify-center sm:mt-6">
            <FooterPageLinks centered />
          </div>
        </div>
      )}

      <div className="border-t border-[color:color-mix(in_srgb,var(--color-on-footer)_10%,transparent)]">
        <div className="mx-auto max-w-7xl px-4 pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))] pt-3 sm:px-6 sm:pb-5 sm:pt-4">
          <div
            className="break-words text-center text-[11px] leading-relaxed text-[var(--color-on-footer)]/55 sm:text-xs [&_a]:underline [&_em]:italic [&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_strong]:font-semibold"
            dangerouslySetInnerHTML={{ __html: copyrightText }}
          />
        </div>
      </div>
    </footer>
  );
}
