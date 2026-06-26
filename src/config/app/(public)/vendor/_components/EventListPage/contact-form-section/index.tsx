"use client";

import { MessageSquare, Phone, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useContext } from "react";
import { ServerContext } from "@/lib/server-context";
import { ThemeSchema } from "@/types/theme.types";
import { SiteHeading } from "@/components/public/site-heading";

export default function ContactFormSection() {
  const { theme } = useContext(ServerContext);
  const vendorTheme = theme as ThemeSchema & {
    contactDetails?: {
      phoneNumber?: string;
      email?: string;
      address?: string;
    };
  };

  const phone = vendorTheme?.contactDetails?.phoneNumber || "+1 (123) 456-7890";
  const email = vendorTheme?.contactDetails?.email || "info@eventwizz.com";
  const address = vendorTheme?.contactDetails?.address || "123 Main St, City, Country";

  const contactItems = [
    { Icon: Phone, label: phone, href: `tel:${phone}` },
    { Icon: Mail, label: email, href: `mailto:${email}` },
    { Icon: MapPin, label: address, href: undefined },
  ];

  return (
    <section className="py-16 px-4 bg-[var(--color-background)]">
      <div className="max-w-4xl mx-auto">
        <div className="rounded-3xl bg-[color:color-mix(in_srgb,var(--color-primary)_8%,var(--color-surface))] border border-[color:color-mix(in_srgb,var(--color-primary)_18%,transparent)] px-8 py-10 sm:px-12 sm:py-14 relative overflow-hidden">
          {/* subtle orb */}
          <div
            className="pointer-events-none absolute -top-10 right-10 h-52 w-52 rounded-full bg-[color:color-mix(in_srgb,var(--color-primary)_10%,transparent)] blur-[80px]"
            aria-hidden
          />

          <div className="relative z-10">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.28em] text-[color:var(--color-primary)]">
              Booking and Event Assistance
            </p>
            <SiteHeading
              level={2}
              title="Need Help?"
              variant="onSurface"
              className="mb-3 !text-3xl !font-black tracking-tight md:!text-4xl"
            />
            <p className="mb-8 max-w-md text-base leading-relaxed text-[var(--color-text-dimmed)]">
              Get in touch with our team for any questions about booking events,
              assistance with your account, or general inquiries.
            </p>

            <div className="mb-8 flex flex-wrap gap-6">
              {contactItems.map(({ Icon, label, href }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--color-primary)_14%,transparent)]">
                    <Icon className="h-4 w-4 text-[color:var(--color-primary)]" />
                  </div>
                  {href ? (
                    <a
                      href={href}
                      className="text-sm text-[var(--color-text)] hover:text-[color:var(--color-primary)] transition-colors"
                    >
                      {label}
                    </a>
                  ) : (
                    <span className="text-sm text-[var(--color-text)]">{label}</span>
                  )}
                </div>
              ))}
            </div>

            <Button variant="event-primary" className="gap-2 rounded-full px-7">
              <MessageSquare className="h-4 w-4" />
              Send Message
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
