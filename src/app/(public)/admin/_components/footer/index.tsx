"use client";

import React, { useState, useContext } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Facebook, Instagram, Linkedin, Twitter, Youtube } from "lucide-react";
import { ServerContext } from "@/lib/server-context";
import { addCacheBusting } from "@/lib/image-utils";

type ThemeAPIResponse = {
  colors?: {
    primary: string;
    secondary: string;
    // other color properties...
  };
  contactDetails?: {
    email?: string;
    phone?: string;
    address?: string;
  };
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
    instagram?: string;
  };
  logo?: string;
  name?: string;
  copyright?: string;
};

export default function AdminFooter() {
  const [email, setEmail] = useState("");
  const { theme } = useContext(ServerContext);

  // Cast to our known API structure
  const apiTheme = theme as unknown as ThemeAPIResponse;
  // Use same logo logic as header: support /, data:, http(s), blob so Site Essentials logo shows correctly
  const logoPath =
    theme?.logo?.startsWith("/") ||
    theme?.logo?.startsWith("data:") ||
    theme?.logo?.startsWith("http") ||
    theme?.logo?.startsWith("https") ||
    theme?.logo?.startsWith("blob")
      ? theme.logo
      : "/assets/images/logos/eventwizz-logo.png";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Newsletter signup:", email);
    setEmail("");
  };

  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[color:var(--color-footer)] text-[color:var(--color-text)] py-8">
      <div className="container mx-auto px-4">
        {/* Main footer content */}
        <div className="flex flex-col md:flex-row justify-between items-start mb-8">
          {/* Logo and Name */}
          <div className="mb-6 md:mb-0">
            <div className="flex items-center mb-4">
              <img
                src={addCacheBusting(logoPath)}
                alt={apiTheme?.name || "EventWizz"}
                className="mr-2 h-[50px] w-auto"
              />
            </div>

            {/* Newsletter */}
            <h3 className="text-sm font-medium mb-4">Newsletter Sign Up</h3>
            <form onSubmit={handleSubmit} className="flex">
              <Input
                type="email"
                placeholder="Email"
                className="bg-[color:var(--color-surface)] border-[color:var(--color-surface)] text-[color:var(--color-text)] rounded-r-none h-10 w-48"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button
                type="submit"
                className="bg-[color:var(--color-primary)] text-white px-4 rounded-r flex items-center justify-center h-10"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </form>
          </div>

          {/* Business Hours */}
          <div className="mb-6 md:mb-0">
            <h3 className="text-sm font-medium mb-4">Business Hours</h3>
            <p className="text-xs text-[color:var(--color-text-dimmed)] mb-1">
              Monday – Saturday 11am - 11pm
            </p>
            <p className="text-xs text-[color:var(--color-text-dimmed)]">
              Sunday – 12am - 8pm
            </p>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-sm font-medium mb-4">Contact Us</h3>
            {apiTheme?.contactDetails?.phone && (
              <div className="flex items-center mb-2">
                <div className="flex items-center space-x-2">
                  <svg
                    className="h-4 w-4 text-[color:var(--color-text-dimmed)]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  <span className="text-xs text-[color:var(--color-text-dimmed)]">
                    {apiTheme.contactDetails.phone}
                  </span>
                </div>
              </div>
            )}

            {apiTheme?.contactDetails?.email && (
              <div className="flex items-center">
                <div className="flex items-center space-x-2">
                  <svg
                    className="h-4 w-4 text-[color:var(--color-text-dimmed)]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="text-xs text-[color:var(--color-text-dimmed)]">
                    {apiTheme.contactDetails.email}
                  </span>
                </div>
              </div>
            )}

            {apiTheme?.contactDetails?.address && (
              <div className="flex items-center mt-2">
                <div className="flex items-center space-x-2">
                  <svg
                    className="h-4 w-4 text-[color:var(--color-text-dimmed)]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span className="text-xs text-[color:var(--color-text-dimmed)]">
                    {apiTheme.contactDetails.address}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom copyright and social links */}
        <div className="border-t border-[color:var(--color-surface)] pt-4 flex flex-col md:flex-row justify-between items-center">
          <p className="text-xs text-[color:var(--color-text-dimmed)]">
            Copyright © {currentYear} {apiTheme?.name || "EventWizz"}. All
            rights reserved.
          </p>

          <div className="flex space-x-4 mt-4 md:mt-0">
            {apiTheme?.socialLinks?.facebook && (
              <Link
                href={apiTheme.socialLinks.facebook}
                className="text-[color:var(--color-text-dimmed)] hover:text-[color:var(--color-primary)] transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Facebook size={14} />
              </Link>
            )}

            {apiTheme?.socialLinks?.twitter && (
              <Link
                href={apiTheme.socialLinks.twitter}
                className="text-[color:var(--color-text-dimmed)] hover:text-[color:var(--color-primary)] transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Twitter size={14} />
              </Link>
            )}

            {apiTheme?.socialLinks?.linkedin && (
              <Link
                href={apiTheme.socialLinks.linkedin}
                className="text-[color:var(--color-text-dimmed)] hover:text-[color:var(--color-primary)] transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Linkedin size={14} />
              </Link>
            )}

            {apiTheme?.socialLinks?.youtube && (
              <Link
                href={apiTheme.socialLinks.youtube}
                className="text-[color:var(--color-text-dimmed)] hover:text-[color:var(--color-primary)] transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Youtube size={14} />
              </Link>
            )}

            {apiTheme?.socialLinks?.instagram && (
              <Link
                href={apiTheme.socialLinks.instagram}
                className="text-[color:var(--color-text-dimmed)] hover:text-[color:var(--color-primary)] transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Instagram size={14} />
              </Link>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
