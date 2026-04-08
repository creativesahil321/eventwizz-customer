"use client";

import Link from "next/link";
import {
  Facebook,
  Instagram,
  Linkedin,
  MapPin,
  Phone,
  Send,
  Twitter,
  Youtube,
} from "lucide-react";
import { useContext } from "react";
import { ServerContext } from "@/lib/server-context";
import { ThemeSchema } from "@/types/theme.types";
import { addCacheBusting } from "@/lib/image-utils";

interface FooterSectionProps {
  copyright?: string | null;
  logo?: string | null;
}

export default function FooterSection({
  copyright,
  logo,
}: FooterSectionProps = {}) {
  const { theme } = useContext(ServerContext);
  // Cast theme to our known structure
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
  // Current year for copyright
  const currentYear = new Date().getFullYear();

  // Social media icon mapping
  const socialIcons = {
    facebook: Facebook,
    twitter: Twitter,
    instagram: Instagram,
    linkedin: Linkedin,
    youtube: Youtube,
  } as const;

  // Prepare social links from theme data
  const socialLinks = Object.entries(vendorTheme?.socialLinks || {})
    .filter(([, url]) => url && url.trim() !== "")
    .map(([platform, url]) => {
      const IconComponent = socialIcons[platform as keyof typeof socialIcons];
      if (!IconComponent) return null;
      return {
        icon: IconComponent,
        href: url,
        id: platform,
      };
    })
    .filter(
      (link): link is { icon: typeof Facebook; href: string; id: string } =>
        link !== null
    );

  // Prepare contact sections
  const contactDetails = (
    vendorTheme as ThemeSchema & {
      contactDetails?: {
        phoneNumber?: string;
        email?: string;
        address?: string;
        alternativeAddress?: string;
      };
    }
  )?.contactDetails;

  const contactSections = [
    {
      icon: Phone,
      heading: "Phone Number:",
      link: `tel:${contactDetails?.phoneNumber || "+1 (123) 456-7890"}`,
      linkText: contactDetails?.phoneNumber || "+1 (123) 456-7890",
    },
    {
      icon: MapPin,
      heading: "Get Directions:",
      textOne: contactDetails?.address || "123 Main St",
      textTwo: contactDetails?.alternativeAddress || "City, Country",
    },
    {
      icon: Send,
      heading: "Email Address:",
      link: `mailto:${contactDetails?.email || "info@eventwizz.com"}`,
      linkText: contactDetails?.email || "info@eventwizz.com",
    },
  ];

  return (
    <section className="px-4 py-10 bg-[color:var(--color-footer)] text-[var(--color-on-footer)]">
      <div className="max-w-7xl mx-auto border-b border-[var(--color-on-footer)]/20 text-center pb-6">
        <Link href="/">
          <div className="h-20 flex items-center justify-center">
            <img
              src={addCacheBusting(logoPath)}
              className="max-h-12 w-auto object-contain"
              alt={vendorTheme?.name || "EventWizz"}
            />
          </div>
        </Link>
        {socialLinks.length > 0 && (
          <div className="flex justify-center gap-4 my-5">
            {socialLinks.map(({ icon: Icon, href, id }) => (
              <Link
                key={id}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[color:var(--color-primary)] transition-colors"
              >
                <Icon size={20} />
              </Link>
            ))}
          </div>
        )}
      </div>
      <div className="max-w-7xl mx-auto py-8 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        {contactSections.map(
          (
            { icon: Icon, heading, link, linkText, textOne, textTwo },
            index
          ) => (
            <div
              key={index}
              className="flex gap-3 md:gap-4 justify-start items-start px-4 md:px-0"
            >
              <Icon
                className="mt-0.5 flex-shrink-0 text-[color:var(--color-primary)]"
                size={20}
              />
              <div className="flex-1 min-w-0">
                <h6 className="font-bold text-sm md:text-base mb-1">
                  {heading}
                </h6>
                {link ? (
                  <Link
                    href={link}
                    className="text-sm md:text-base break-words hover:text-[color:var(--color-primary)] transition-colors block"
                  >
                    {linkText}
                  </Link>
                ) : (
                  <p className="text-sm md:text-base break-words">
                    {textOne}
                    {textTwo && (
                      <>
                        <br />
                        {textTwo}
                      </>
                    )}
                  </p>
                )}
              </div>
            </div>
          )
        )}
      </div>
      <div className="max-w-7xl mx-auto pt-6 text-center text-[var(--color-on-footer)]/75">
        <p className="text-sm md:text-base">
          {copyright ||
            vendorTheme?.copyright ||
            `© ${currentYear} ${
              vendorTheme?.name || "EventWizz"
            }. All rights reserved.`}
        </p>
      </div>
    </section>
  );
}
