"use client";

import Link from "next/link";
import {
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
} from "lucide-react";
import { useContext, useMemo, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ServerContext } from "@/lib/server-context";
import { ThemeSchema } from "@/types/theme.types";
import { addCacheBusting } from "@/lib/image-utils";
import { BrandLogoImage } from "@/components/shared/brand-logo-image";
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
import { usePreviewMobileLayout } from "@/hooks/use-preview-narrow-layout";
import { cn } from "@/lib/utils";
import { hasPlainText, toPlainSnippet } from "@/lib/plain-text-length";
import { firstFooterBrandDescription } from "@/lib/footer-brand-description";
import { PREVIEW_REVIEW_CHROME_HEIGHT_VAR } from "@/hooks/use-preview-review-chrome-height";
import { PUBLIC_CHROME_CONTAINER_CLASS } from "@/lib/public-rhythm";
import { PreviewEditRegion } from "@/components/preview/preview-edit-hint";

const FOOTER_SOCIAL_PLATFORMS = [
  "facebook",
  "twitter",
  "instagram",
  "linkedin",
  "youtube",
] as const;

export type FooterSocialPlatform = (typeof FOOTER_SOCIAL_PLATFORMS)[number];

/** Site Essentials / API may send `null` for unused platforms. */
export type FooterSocialLinksOverride = Partial<
  Record<FooterSocialPlatform, string | null>
> | null;

/** Drop `null` so footer props stay `string | undefined`. */
export function toFooterSocialLinksOverride(
  links:
    | Partial<Record<FooterSocialPlatform, string | null | undefined>>
    | null
    | undefined,
): Partial<Record<FooterSocialPlatform, string>> | undefined {
  if (!links) return undefined;
  const next: Partial<Record<FooterSocialPlatform, string>> = {};
  for (const platform of FOOTER_SOCIAL_PLATFORMS) {
    const value = links[platform];
    if (typeof value === "string") next[platform] = value;
  }
  return next;
}

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
  socialLinksOverride?: FooterSocialLinksOverride;
  /**
   * Dedicated footer blurb under the logo (`footer_brand_description`).
   * Preview shells must pass this (or the already-resolved fallback chain)
   * so the host EventWizz SEO description cannot leak into the footer.
   * Live pages may omit it; the footer then uses theme GET.
   */
  brandDescription?: string | null;
  /**
   * Onboarding preview: logo + footer blurb jump to branding (step 2).
   * Enquiries (phone / email / address) jump to venue contact (step 1).
   */
  onEditFooter?: () => void;
  onEditLogo?: () => void;
  onEditEnquiries?: () => void;
}

const VISIT_LINKS: Array<{ href: string; label: string }> = [
  { href: "/", label: "All venues" },
  { href: "/contact", label: "Contact" },
  { href: "/customer/bookings", label: "My bookings" },
];

function SocialRow({
  links,
  className,
}: {
  links: Array<{ icon: typeof Facebook; href: string; id: string }>;
  className?: string;
}) {
  if (links.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-1.5",
        className,
      )}
    >
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

function FooterColumnHeading({ children }: { children: ReactNode }) {
  return (
    <h6 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-primary)]">
      {children}
    </h6>
  );
}

function FooterTextLink({
  href,
  children,
  isPreviewMode,
}: {
  href: string;
  children: ReactNode;
  isPreviewMode: boolean;
}) {
  const className =
    "block text-sm leading-relaxed text-[var(--color-on-footer)]/80 transition-colors hover:text-[color:var(--color-primary)]";

  if (isPreviewMode) {
    return <span className={className}>{children}</span>;
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function FooterPageLinks({
  isPreviewMode,
  className,
}: {
  isPreviewMode: boolean;
  className?: string;
}) {
  if (isPreviewMode) return null;

  return (
    <nav
      aria-label="Footer pages"
      className={cn("flex flex-wrap items-center gap-x-4 gap-y-1", className)}
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

const ENQUIRY_LINE_CLASS =
  "text-sm leading-relaxed text-[var(--color-on-footer)]/80 transition-colors hover:text-[color:var(--color-primary)]";

function EnquiriesLines({
  contact,
  asPlainText,
}: {
  contact: ResolvedVenueContact;
  asPlainText: boolean;
}) {
  return (
    <div className="flex flex-col items-start gap-1.5 text-left">
      {contact.phone ? (
        asPlainText ? (
          <span className={ENQUIRY_LINE_CLASS}>{contact.phone}</span>
        ) : (
          <Link href={`tel:${contact.phone}`} className={ENQUIRY_LINE_CLASS}>
            {contact.phone}
          </Link>
        )
      ) : null}
      {contact.email ? (
        asPlainText ? (
          <span className={cn(ENQUIRY_LINE_CLASS, "break-all")}>
            {contact.email}
          </span>
        ) : (
          <Link
            href={`mailto:${contact.email}`}
            className={cn(ENQUIRY_LINE_CLASS, "break-all")}
          >
            {contact.email}
          </Link>
        )
      ) : null}
      {contact.address ? (
        asPlainText ? (
          <span className={ENQUIRY_LINE_CLASS}>{contact.address}</span>
        ) : (
          <a
            href={buildMapsDirectionsUrl(contact.address)}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              ENQUIRY_LINE_CLASS,
              "hover:underline hover:underline-offset-2",
            )}
          >
            {contact.address}
          </a>
        )
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
    <BrandLogoImage
      src={addCacheBusting(logoPath, mediaVersion)}
      className="max-h-10 max-w-[min(100%,12rem)] sm:max-h-11"
      alt={brandName}
      width={200}
      height={116}
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
  brandDescription,
  onEditFooter,
  onEditLogo,
  onEditEnquiries,
}: FooterSectionProps = {}) {
  const { theme: serverTheme } = useContext(ServerContext);
  const { domain } = useDomain();
  const { data: queryTheme } = useThemeQuery(domain, serverTheme);
  const vendorTheme = (queryTheme ?? serverTheme) as ThemeSchema;
  const narrowPreview = usePreviewMobileLayout();
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

  const enquiriesContact = contactBlocks[0]?.contact ?? null;
  const hasEnquiries =
    enquiriesContact &&
    (enquiriesContact.phone ||
      enquiriesContact.email ||
      enquiriesContact.address);

  const locationLinks = useMemo(() => {
    const seen = new Set<string>();
    const list: Array<{ href: string; label: string }> = [];
    for (const location of themeForContact?.locations ?? []) {
      const label = location.city?.trim();
      const slug = location.slug?.trim();
      if (!label || !slug || seen.has(slug.toLowerCase())) continue;
      seen.add(slug.toLowerCase());
      list.push({ href: `/${slug}`, label });
    }
    return list;
  }, [themeForContact?.locations]);

  /** Multi-venue only — a single city in the footer looks like leftover nav. */
  const showLocations = locationLinks.length > 1;

  const brandBlurb = toPlainSnippet(
    firstFooterBrandDescription(
      brandDescription,
      isPreviewMode ? null : vendorTheme?.footer_brand_description,
      isPreviewMode ? null : vendorTheme?.about_description,
      isPreviewMode ? null : vendorTheme?.seo?.description,
    ),
    180,
  );

  const resolvedCopyright =
    (hasPlainText(copyright) ? copyright : null) ||
    (hasPlainText(vendorTheme?.copyright) ? vendorTheme?.copyright : null) ||
    null;

  const brandColumnClass = cn(
    "col-span-2 flex min-w-0 flex-col items-center text-center",
    !narrowPreview &&
      "sm:col-span-1 sm:items-start sm:text-left lg:max-w-sm lg:flex-1 @max-5xl/preview:!max-w-none @max-5xl/preview:!flex-none",
  );
  const enquiriesColumnClass = cn(
    "min-w-0",
    !narrowPreview && "lg:w-56 lg:shrink-0 @max-5xl/preview:!w-auto",
  );
  const brandMark = (
    <FooterBrand
      logoPath={logoPath}
      brandName={brandName}
      isPreviewMode={isPreviewMode}
    />
  );
  const brandColumn = (
    <>
      {onEditLogo ? (
        <PreviewEditRegion
          label="logo"
          onEdit={onEditLogo}
          className="inline-flex max-w-full"
          hoverFrameClassName="rounded-md"
        >
          {brandMark}
        </PreviewEditRegion>
      ) : (
        brandMark
      )}
      {brandBlurb ? (
        <p className="mt-4 max-w-xs text-sm leading-relaxed text-[var(--color-on-footer)]/75">
          {brandBlurb}
        </p>
      ) : null}
      {socialLinks.length > 0 ? (
        <div className="mt-5">
          <SocialRow
            links={socialLinks}
            className={!narrowPreview ? "sm:justify-start" : "justify-center"}
          />
        </div>
      ) : null}
    </>
  );

  return (
    <footer
      data-preview-footer=""
      className="bg-[color:var(--color-footer)] text-[var(--color-on-footer)]"
      style={
        needsReviewChromePadding
          ? {
              paddingBottom: `var(${PREVIEW_REVIEW_CHROME_HEIGHT_VAR}, 9rem)`,
            }
          : undefined
      }
    >
      <div className={cn(PUBLIC_CHROME_CONTAINER_CLASS, "py-8 sm:py-14")}>
        <div
          className={cn(
            "grid grid-cols-2 gap-x-6 gap-y-8 text-left",
            !narrowPreview &&
              "lg:flex lg:flex-row lg:items-start lg:justify-between lg:gap-10 @max-5xl/preview:!grid @max-5xl/preview:!gap-x-6 @max-5xl/preview:!gap-y-8",
          )}
        >
          {onEditFooter ? (
            <PreviewEditRegion
              label="branding"
              onEdit={onEditFooter}
              className={brandColumnClass}
              hoverFrameClassName="rounded-md"
            >
              {brandColumn}
            </PreviewEditRegion>
          ) : (
            <div className={brandColumnClass}>{brandColumn}</div>
          )}

          {showLocations ? (
            <div
              className={cn(
                "col-span-2 min-w-0",
                !narrowPreview &&
                  "sm:col-span-1 lg:w-40 lg:shrink-0 @max-5xl/preview:!w-auto",
              )}
            >
              <FooterColumnHeading>Locations</FooterColumnHeading>
              <nav
                aria-label="Venue locations"
                className={cn(
                  "grid grid-cols-2 gap-x-4 gap-y-2",
                  !narrowPreview &&
                    "lg:flex lg:flex-col lg:gap-2 @max-5xl/preview:!grid @max-5xl/preview:!grid-cols-2 @max-5xl/preview:!gap-x-4 @max-5xl/preview:!gap-y-2",
                )}
              >
                {locationLinks.map((link) => (
                  <FooterTextLink
                    key={link.href}
                    href={link.href}
                    isPreviewMode={isPreviewMode}
                  >
                    {link.label}
                  </FooterTextLink>
                ))}
              </nav>
            </div>
          ) : null}

          <div
            className={cn(
              "min-w-0",
              !narrowPreview && "lg:w-40 lg:shrink-0 @max-5xl/preview:!w-auto",
            )}
          >
            <FooterColumnHeading>Visit</FooterColumnHeading>
            <nav aria-label="Visit" className="flex flex-col gap-2">
              {VISIT_LINKS.map((link) => (
                <FooterTextLink
                  key={link.href}
                  href={link.href}
                  isPreviewMode={isPreviewMode}
                >
                  {link.label}
                </FooterTextLink>
              ))}
            </nav>
          </div>

          {hasEnquiries && enquiriesContact ? (
            onEditEnquiries ? (
              <PreviewEditRegion
                label="contact details"
                onEdit={onEditEnquiries}
                className={enquiriesColumnClass}
                hoverFrameClassName="rounded-md"
              >
                <FooterColumnHeading>Enquiries</FooterColumnHeading>
                <EnquiriesLines contact={enquiriesContact} asPlainText />
              </PreviewEditRegion>
            ) : (
              <div className={enquiriesColumnClass}>
                <FooterColumnHeading>Enquiries</FooterColumnHeading>
                <EnquiriesLines
                  contact={enquiriesContact}
                  asPlainText={isPreviewMode}
                />
              </div>
            )
          ) : null}
        </div>
      </div>

      <div className="border-t border-[color:color-mix(in_srgb,var(--color-on-footer)_10%,transparent)]">
        <div
          className={cn(
            PUBLIC_CHROME_CONTAINER_CLASS,
            "flex flex-col items-center justify-between gap-3 py-4 text-center",
            !narrowPreview && "sm:flex-row sm:items-center sm:text-left",
          )}
        >
          {resolvedCopyright ? (
            <div
              className="break-words text-[11px] leading-relaxed text-[var(--color-on-footer)]/70 [&_a]:underline [&_em]:italic [&_p]:mb-0 [&_strong]:font-semibold"
              dangerouslySetInnerHTML={{ __html: resolvedCopyright }}
            />
          ) : (
            <p className="break-words text-[11px] leading-relaxed text-[var(--color-on-footer)]/70">
              © <span suppressHydrationWarning>{currentYear}</span> {brandName}
            </p>
          )}
          <FooterPageLinks
            isPreviewMode={isPreviewMode}
            className={cn(
              "justify-center",
              !narrowPreview && "sm:justify-end",
            )}
          />
        </div>
      </div>
    </footer>
  );
}
