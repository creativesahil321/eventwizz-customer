"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Shield } from "lucide-react";
import { CheckoutHeaderProps } from "../_lib/types";
import { addCacheBusting } from "@/lib/image-utils";

export default function CheckoutHeader({ settings }: CheckoutHeaderProps) {
  const router = useRouter();

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12 sm:h-14">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="shrink-0 flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors text-sm font-medium group"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            <span className="hidden sm:inline">Back</span>
          </button>

          {/* Logo — link home */}
          <div className="flex min-w-0 flex-1 justify-center px-4">
            <Link
              href="/"
              className="flex max-w-full items-center justify-center rounded-sm outline-offset-2 transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
              aria-label="Home"
            >
              {settings?.logo ? (
                <img
                  src={addCacheBusting(settings.logo)}
                  alt={settings?.name || "Venue home"}
                  width={120}
                  height={40}
                  className="h-6 sm:h-7 max-h-7 w-auto max-w-[min(100%,10rem)] object-contain object-center sm:max-w-[12rem]"
                />
              ) : (
                <span className="truncate text-center text-base sm:text-lg font-bold text-gray-900">
                  {settings?.name || "EventWizz"}
                </span>
              )}
            </Link>
          </div>

          {/* Secure Checkout Badge */}
          <div className="flex shrink-0 items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
            <Shield className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span className="text-xs font-medium hidden sm:inline">Secure Checkout</span>
            <span className="text-xs font-medium sm:hidden">Secure</span>
          </div>
        </div>
      </div>
      {/* Subtle gradient accent line */}
      <div className="h-[2px] bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600" />
    </header>
  );
}
