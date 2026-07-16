"use client";

import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { buildMapsDirectionsUrl } from "@/lib/resolve-venue-contact";
import type { ResolvedVenueContact } from "@/lib/resolve-venue-contact";
import { cn } from "@/lib/utils";

interface VendorContactCardsProps {
  contact: ResolvedVenueContact;
  className?: string;
}

function ContactCard({
  href,
  external,
  icon: Icon,
  label,
  value,
}: {
  href: string;
  external?: boolean;
  icon: typeof Phone;
  label: string;
  value: string;
}) {
  const cardClass =
    "group flex h-full flex-col rounded-2xl border border-[color:color-mix(in_srgb,var(--color-text)_8%,transparent)] bg-[color:var(--color-surface)] p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:color-mix(in_srgb,var(--color-primary)_35%,transparent)] hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)] md:p-6";

  const inner = (
    <>
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[color:color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[color:var(--color-primary)] transition-colors group-hover:bg-[color:color-mix(in_srgb,var(--color-primary)_18%,transparent)]">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-text-dimmed)]">
        {label}
      </p>
      <p className="mt-1.5 break-words text-sm font-medium leading-snug text-[color:var(--color-text)] md:text-base">
        {value}
      </p>
    </>
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cardClass}
      >
        {inner}
      </a>
    );
  }

  return (
    <Link href={href} className={cardClass}>
      {inner}
    </Link>
  );
}

export function VendorContactCards({
  contact,
  className,
}: VendorContactCardsProps) {
  const items = [
    contact.phone
      ? {
          key: "phone",
          href: `tel:${contact.phone}`,
          icon: Phone,
          label: "Phone",
          value: contact.phone,
        }
      : null,
    contact.email
      ? {
          key: "email",
          href: `mailto:${contact.email}`,
          icon: Mail,
          label: "Email",
          value: contact.email,
        }
      : null,
    contact.address
      ? {
          key: "address",
          href: buildMapsDirectionsUrl(contact.address),
          icon: MapPin,
          label: "Visit us",
          value: contact.address,
          external: true,
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    href: string;
    icon: typeof Phone;
    label: string;
    value: string;
    external?: boolean;
  }>;

  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {items.map((item) => (
        <ContactCard
          key={item.key}
          href={item.href}
          external={item.external}
          icon={item.icon}
          label={item.label}
          value={item.value}
        />
      ))}
    </div>
  );
}
