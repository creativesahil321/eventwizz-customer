"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { addCacheBusting } from "@/lib/image-utils";
import { CheckoutHeaderProps } from "../_lib/types";

const DEFAULT_LOGO = "/assets/images/logos/eventwizz-logo.png";

function resolveSiteLogo(logo?: string | null): string {
  if (
    logo &&
    (logo.startsWith("/") ||
      logo.startsWith("data:") ||
      logo.startsWith("http") ||
      logo.startsWith("https") ||
      logo.startsWith("blob"))
  ) {
    return logo;
  }
  return DEFAULT_LOGO;
}

export default function CheckoutHeader({ settings }: CheckoutHeaderProps) {
  const router = useRouter();
  const logoPath = resolveSiteLogo(settings?.logo);
  const brandName = settings?.name || "EventWizz";

  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--checkout-border)] bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-6 sm:py-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full text-[color:var(--checkout-muted-foreground)] transition-colors hover:bg-[color:var(--checkout-muted)] hover:text-[color:var(--checkout-foreground)]"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <Link
            href="/"
            aria-label={`${brandName} home`}
            className="flex min-w-0 items-center"
          >
            <img
              src={addCacheBusting(logoPath)}
              alt={brandName}
              width={200}
              height={56}
              className="max-h-11 w-auto max-w-[min(100%,10rem)] object-contain sm:max-h-12 sm:max-w-[min(100%,12rem)]"
            />
          </Link>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/10">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Secure Checkout</span>
          <span className="sm:hidden">Secure</span>
        </div>
      </div>
    </header>
  );
}
