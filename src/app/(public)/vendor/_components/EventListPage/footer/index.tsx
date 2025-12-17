"use client";

import Image from "next/image";
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

export default function FooterSection() {
  const { theme } = useContext(ServerContext);
  // Cast theme to our known structure
  const vendorTheme = theme as ThemeSchema;

  const logoPath =
    theme?.logo?.startsWith("/") ||
    theme?.logo?.startsWith("data:") ||
    theme?.logo?.startsWith("http") ||
    theme?.logo?.startsWith("https")
      ? theme.logo
      : "/assets/images/logos/eventwizz-logo.png";
  // Current year for copyright
  const currentYear = new Date().getFullYear();

  // Prepare social links
  const socialLinks = [
    {
      icon: Facebook,
      href: "/#",
      id: "facebook",
    },
    {
      icon: Twitter,
      href: "/#",
      id: "twitter",
    },
    {
      icon: Instagram,
      href: "/#",
      id: "instagram",
    },
    {
      icon: Linkedin,
      href: "/#",
      id: "linkedin",
    },
    {
      icon: Youtube,
      href: "/#",
      id: "youtube",
    },
  ];

  // Prepare contact sections
  const contactSections = [
    {
      icon: Phone,
      heading: "Phone Number:",
      link: `tel:${
        vendorTheme?.contactDetails?.phoneNumber || "+1 (123) 456-7890"
      }`,
      linkText: vendorTheme?.contactDetails?.phoneNumber || "+1 (123) 456-7890",
    },
    {
      icon: MapPin,
      heading: "Get Directions:",
      textOne: vendorTheme?.contactDetails?.address || "123 Main St",
      textTwo:
        vendorTheme?.contactDetails?.alternativeAddress || "City, Country",
    },
    {
      icon: Send,
      heading: "Email Address:",
      link: `mailto:${
        vendorTheme?.contactDetails?.email || "info@eventwizz.com"
      }`,
      linkText: vendorTheme?.contactDetails?.email || "info@eventwizz.com",
    },
  ];

  return (
    <section className="p-10 bg-[color:var(--color-footer)]">
      <div className="container mx-auto border-b border-white/20 text-center pb-6">
        <Link href="/">
          <div className="h-20 flex items-center justify-center">
            <Image
              src={logoPath}
              width={120}
              height={40}
              className="max-h-12 w-auto object-contain"
              alt={vendorTheme?.name || "EventWizz"}
              priority
            />
          </div>
        </Link>
        <div className="flex justify-center gap-4 my-5">
          {socialLinks.map(({ icon: Icon, href }, index) => (
            <Link
              key={index}
              href={href}
              target="_blank"
              className="hover:text-[color:var(--color-primary)] transition-colors"
            >
              <Icon size={20} />
            </Link>
          ))}
        </div>
      </div>
      <div className="container mx-auto py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        {contactSections.map(
          (
            { icon: Icon, heading, link, linkText, textOne, textTwo },
            index
          ) => (
            <div
              key={index}
              className="flex gap-4 justify-center md:justify-start"
            >
              <Icon
                className="mt-1 text-[color:var(--color-primary)]"
                size={22}
              />
              <div>
                <h6 className="font-bold">{heading}</h6>
                {link ? (
                  <Link
                    href={link}
                    className="hover:text-[color:var(--color-primary)] transition-colors"
                  >
                    {linkText}
                  </Link>
                ) : (
                  <p>
                    {textOne}
                    <br />
                    {textTwo}
                  </p>
                )}
              </div>
            </div>
          )
        )}
      </div>
      <div className="container mx-auto pt-6 text-center text-[color:var(--color-text-dimmed)]">
        <p>
          {vendorTheme?.copyright ||
            `© ${currentYear} ${
              vendorTheme?.name || "EventWizz"
            }. All rights reserved.`}
        </p>
      </div>
    </section>
  );
}
