"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { CheckoutHeaderProps } from "../_lib/types";

export default function CheckoutHeader({ settings }: CheckoutHeaderProps) {
  const router = useRouter();
  const venueName = settings?.name || "EventWizz";

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
          <div className="min-w-0">
            <p className="truncate text-base font-bold uppercase tracking-tight text-[color:var(--checkout-brand-primary)]">
              {venueName}
            </p>
            <p className="text-[11px] font-medium tracking-wider text-[color:var(--checkout-muted-foreground)]">
              EVENT CHECKOUT
            </p>
          </div>
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
