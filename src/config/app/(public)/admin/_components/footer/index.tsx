"use client";

import React, { useContext } from "react";
import Link from "next/link";
import { ServerContext } from "@/lib/server-context";
import { addCacheBusting } from "@/lib/image-utils";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/how-it-works", label: "How It Works" },
];

const LEGAL_LINKS = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
];

const SERVICES = ["Event Planning", "Event Management", "Custom Solutions"];

export default function AdminFooter() {
  const { theme } = useContext(ServerContext);
  const currentYear = new Date().getFullYear();

  const logoPath =
    theme?.logo?.startsWith("/") ||
    theme?.logo?.startsWith("data:") ||
    theme?.logo?.startsWith("http") ||
    theme?.logo?.startsWith("https") ||
    theme?.logo?.startsWith("blob")
      ? theme.logo
      : "/assets/images/logos/eventwizz-logo.png";

  return (
    <footer className="bg-[color:var(--color-footer)] text-[var(--color-on-footer)] py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
          {/* Brand */}
          <div>
            <img
              src={addCacheBusting(logoPath)}
              alt="EventWizz"
              className="h-10 w-auto mb-4"
            />
            <p className="text-sm text-[var(--color-on-footer)]/80 leading-relaxed">
              Creating unforgettable events with professional planning and
              management services.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider">
              Navigation
            </h3>
            <ul className="space-y-2">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-[var(--color-on-footer)]/80 hover:text-[color:var(--color-primary)] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider">
              Legal
            </h3>
            <ul className="space-y-2">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-[var(--color-on-footer)]/80 hover:text-[color:var(--color-primary)] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider">
              Services
            </h3>
            <ul className="space-y-2">
              {SERVICES.map((service) => (
                <li key={service}>
                  <span className="text-sm text-[var(--color-on-footer)]/80">
                    {service}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-[var(--color-on-footer)]/25 pt-6 text-center">
          <p className="text-xs text-[var(--color-on-footer)]/70">
            &copy; {currentYear} EventWizz. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
