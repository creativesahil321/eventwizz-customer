"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Shield, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CheckoutHeaderProps } from "../_lib/types";
import { addCacheBusting } from "@/lib/image-utils";

export default function CheckoutHeader({ settings }: CheckoutHeaderProps) {
  const router = useRouter();

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="shrink-0 flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          {/* Logo — link home (matches public vendor header) */}
          <div className="flex min-w-0 flex-1 justify-center px-2">
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
                  className="h-8 max-h-8 w-auto max-w-[min(100%,10rem)] object-contain object-center sm:max-w-[12rem]"
                />
              ) : (
                <span className="truncate text-center text-xl font-bold text-gray-900">
                  {settings?.name || "EventWizz"}
                </span>
              )}
            </Link>
          </div>

          {/* Security Badges */}
          <div className="flex shrink-0 items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Secure</span>
            </div>
            <div className="flex items-center gap-1">
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">SSL</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
