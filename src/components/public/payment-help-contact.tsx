"use client";

import { useContext } from "react";
import { ServerContext } from "@/lib/server-context";
import { resolvePublicPageContact } from "@/lib/resolve-venue-contact";
import type { ThemeSchema } from "@/types/theme.types";
import { cn } from "@/lib/utils";

/** Only used when the venue has no contact email configured. */
export const PLATFORM_SUPPORT_EMAIL = "support@eventwizz.com";

/**
 * The venue's own contact details for payment result pages. Customers book
 * with the venue — showing the platform inbox (or a placeholder phone number)
 * there reads as a different company and breaks trust.
 */
export function usePaymentSupportContact() {
  const { theme } = useContext(ServerContext);
  const resolved = resolvePublicPageContact({
    theme: theme as ThemeSchema | null,
  });
  const venueName = (theme as ThemeSchema | null)?.name?.trim() || null;
  return {
    venueName,
    email: resolved.email || PLATFORM_SUPPORT_EMAIL,
    phone: resolved.phone || null,
  };
}

function telHref(phone: string): string {
  return `tel:${phone.replace(/[^+\d]/g, "")}`;
}

type PaymentHelpContactProps = {
  /** `inline`: one centred line (success). `list`: email / phone rows (cancel). */
  variant?: "inline" | "list";
  className?: string;
};

export function PaymentHelpContact({
  variant = "inline",
  className,
}: PaymentHelpContactProps) {
  const { venueName, email, phone } = usePaymentSupportContact();
  const linkClass =
    "font-medium text-[color:var(--color-primary)] underline-offset-2 hover:underline";

  if (variant === "list") {
    return (
      <div className={cn("space-y-2", className)}>
        <p className="text-sm">
          <span className="font-medium text-gray-700">Email:</span>{" "}
          <a href={`mailto:${email}`} className={linkClass}>
            {email}
          </a>
        </p>
        {phone ? (
          <p className="text-sm">
            <span className="font-medium text-gray-700">Phone:</span>{" "}
            <a href={telHref(phone)} className={linkClass}>
              {phone}
            </a>
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("text-center", className)}>
      <p className="text-sm text-gray-600">
        Questions about your booking? Contact{" "}
        {venueName ? `${venueName} at ` : "us at "}
        <a href={`mailto:${email}`} className={linkClass}>
          {email}
        </a>
        {phone ? (
          <>
            {" "}
            or{" "}
            <a href={telHref(phone)} className={linkClass}>
              {phone}
            </a>
          </>
        ) : null}
      </p>
    </div>
  );
}
