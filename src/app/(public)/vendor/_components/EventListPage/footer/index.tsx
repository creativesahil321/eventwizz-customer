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
import { useContext, useMemo } from "react";
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
import { useTheme } from "@/providers/theme-provider/ThemeContext";
import { useIsPreviewMode } from "@/contexts/preview-context";
import { usePreviewNarrowLayout } from "@/hooks/use-preview-narrow-layout";
import { cn } from "@/lib/utils";
import { hasPlainText } from "@/lib/plain-text-length";
import { PREVIEW_REVIEW_CHROME_HEIGHT_VAR } from "@/hooks/use-preview-review-chrome-height";

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
    Record<
      "facebook" | "twitter" | "instagram" | "linkedin" | "youtube",
      string
    >
  > | null;
}

function SocialRow({
  links,
}: {
  links: Array<{ icon: typeof Facebook; href: string; id: string }>;
}) {
  if (links.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      {links.map(({ icon: Icon, href, id }) => (
        <Link
          key={id}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={id}
          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-on-footer)]/65 transition-colors duration-200 hover:bg-[color:color-mix(in_srgb,var(--color-on-footer)_8%,transparent)] hover:text-[color:var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
        >
          <Icon size={15} />
        </Link>
      ))}
    </div>
  );
}

function FooterPageLinks() {
  // Info pages (/policies, /contact) have no site-preview surface — hide the
  // links so vendors aren't taken out of the preview review flow.
  const isPreviewMode = useIsPreviewMode();
  if (isPreviewMode) return null;

  return (
    <nav
      aria-label="Footer pages"
      className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1"
    >
      {VENDOR_FOOTER_PAGE_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="text-xs text-[var(--color-on-footer)]/65 transition-colors hover:text-[color:var(--color-primary)]"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

function ContactLines({ contact }: { contact: ResolvedVenueContact }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      {contact.phone ? (
        <Link
          href={`tel:${contact.phone}`}
          className="inline-flex max-w-full items-center gap-1.5 text-[13px] leading-snug text-[var(--color-on-footer)]/75 transition-colors hover:text-[color:var(--color-primary)]"
        >
          <Phone
            className="h-3.5 w-3.5 shrink-0 text-[color:var(--color-primary)]"
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
          className="inline-flex max-w-full items-start gap-1.5 text-[13px] leading-snug text-[var(--color-on-footer)]/75 transition-colors hover:text-[color:var(--color-primary)] hover:underline hover:underline-offset-2"
        >
          <MapPin
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--color-primary)]"
            aria-hidden
          />
          <span className="break-words text-left sm:text-center">
            {contact.address}
          </span>
        </a>
      ) : null}
      {contact.email ? (
        <Link
          href={`mailto:${contact.email}`}
          className="inline-flex max-w-full items-center gap-1.5 text-[13px] leading-snug text-[var(--color-on-footer)]/75 transition-colors hover:text-[color:var(--color-primary)]"
        >
          <Mail
            className="h-3.5 w-3.5 shrink-0 text-[color:var(--color-primary)]"
            aria-hidden
          />
          <span className="break-words">{contact.email}</span>
        </Link>
      ) : null}
    </div>
  );
}

function FooterBrand({
  logoPath,
  brandName,
  isPreviewMode,
}: {
  logoPath: string;
  brandName: string;
  isPreviewMode: boolean;
}) {
  const { mediaVersion } = useTheme();
  const image = (
    <img
      src={addCacheBusting(logoPath, mediaVersion)}
      className="h-8 w-auto max-w-[min(100%,10rem)] object-contain"
      alt={brandName}
    />
  );

  if (isPreviewMode) {
    return <div className="inline-flex max-w-full cursor-default">{image}</div>;
  }

  return (
    <Link href="/" className="inline-flex max-w-full">
      {image}
    </Link>
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
  /** Social icons on live site + site/event previews — not onboarding. */
  const showSocialLinks =
    !isPreviewMode ||
    Boolean(pathname?.includes("/preview/site")) ||
    Boolean(pathname?.includes("/preview/event"));
  /**
   * Fixed bottom review chrome exists on site/onboarding preview only.
   * Event preview (`/preview/event`, editor embed) has no chrome — do not pad.
   */
  const needsReviewChromePadding =
    Boolean(pathname?.includes("/preview/site")) ||
    Boolean(pathname?.includes("/preview/onboarding"));
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
  const brandName = vendorTheme?.name || "EventWizz";

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
          const IconComponent =
            socialIcons[platform as keyof typeof socialIcons];
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

  const resolvedCopyright =
    (hasPlainText(copyright) ? copyright : null) ||
    (hasPlainText(vendorTheme?.copyright) ? vendorTheme?.copyright : null) ||
    `© ${currentYear} ${brandName}. All rights reserved.`;

  const hasSingleContact =
    singleContact &&
    (singleContact.phone || singleContact.address || singleContact.email);

  return (
    <footer
      className="bg-[color:var(--color-footer)] text-[var(--color-on-footer)]"
      style={
        needsReviewChromePadding
          ? {
              paddingBottom: `var(${PREVIEW_REVIEW_CHROME_HEIGHT_VAR}, 9rem)`,
            }
          : undefined
      }
    >
      <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-8">
        <div className="flex flex-col items-center text-center">
          <FooterBrand
            logoPath={logoPath}
            brandName={brandName}
            isPreviewMode={isPreviewMode}
          />

          {socialLinks.length > 0 ? (
            <div className="mt-3">
              <SocialRow links={socialLinks} />
            </div>
          ) : null}

          {isSingleContactFooter && hasSingleContact ? (
            <div className="mt-4 w-full max-w-md">
              <ContactLines contact={singleContact} />
            </div>
          ) : null}

          {!isSingleContactFooter ? (
            <div
              className={cn(
                "mt-5 grid w-full max-w-2xl grid-cols-1 gap-5",
                !narrowPreview && "sm:grid-cols-2 sm:gap-8",
              )}
            >
              {contactBlocks.map((block, index) => (
                <div
                  key={block.id}
                  className={cn(
                    "min-w-0",
                    !narrowPreview &&
                      index > 0 &&
                      "sm:border-l sm:border-[color:color-mix(in_srgb,var(--color-on-footer)_10%,transparent)] sm:pl-8",
                  )}
                >
                  <h6 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-on-footer)]/50">
                    {block.label}
                  </h6>
                  <ContactLines contact={block.contact} />
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-4">
            <FooterPageLinks />
          </div>
        </div>
      </div>

      <div className="border-t border-[color:color-mix(in_srgb,var(--color-on-footer)_8%,transparent)]">
        <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6">
          <div
            className="break-words text-center text-[11px] leading-relaxed text-[var(--color-on-footer)]/70 [&_a]:underline [&_em]:italic [&_p]:mb-0 [&_strong]:font-semibold"
            dangerouslySetInnerHTML={{ __html: resolvedCopyright }}
          />
        </div>
      </div>
    </footer>
  );
}
