"use client";

import { AlertCircle, Mail, Phone } from "lucide-react";

interface VenueContactNoticeProps {
  title?: string;
  message?: string;
  phone?: string | null;
  email?: string | null;
}

export default function VenueContactNotice({
  title = "Please contact the venue for assistance.",
  message,
  phone,
  email,
}: VenueContactNoticeProps) {
  const hasPhone = Boolean(phone?.trim());
  const hasEmail = Boolean(email?.trim());

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-5 text-center sm:px-4 sm:py-6">
      <AlertCircle className="mx-auto mb-3 h-8 w-8 text-amber-500" />
      <p className="text-balance text-sm font-semibold text-amber-900 sm:text-base">
        {title}
      </p>
      {message && (
        <p className="mt-1.5 text-balance text-sm text-amber-800">{message}</p>
      )}
      {(hasPhone || hasEmail) && (
        <div className="mt-4 flex flex-col items-stretch gap-2 sm:items-center">
          {hasPhone && (
            <a
              href={`tel:${phone!.replace(/\s/g, "")}`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-amber-800 underline underline-offset-2 transition-colors hover:bg-amber-100/60 hover:text-amber-950 active:scale-[0.98] sm:min-h-0 sm:justify-start sm:bg-transparent sm:px-0"
            >
              <Phone className="h-4 w-4 flex-shrink-0" />
              <span className="break-all">{phone}</span>
            </a>
          )}
          {hasEmail && (
            <a
              href={`mailto:${email}`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-amber-800 underline underline-offset-2 transition-colors hover:bg-amber-100/60 hover:text-amber-950 active:scale-[0.98] sm:min-h-0 sm:justify-start sm:bg-transparent sm:px-0"
            >
              <Mail className="h-4 w-4 flex-shrink-0" />
              <span className="break-all">{email}</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}
