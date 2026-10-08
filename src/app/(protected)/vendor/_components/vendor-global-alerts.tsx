"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Info } from "lucide-react";
import { useProfileData } from "@/app/(protected)/_shared/profile/_lib";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";

/**
 * Alert strip above the main header, same width as the header (not over the sidebar).
 * No dismiss button — always visible while flags require it.
 */
export function VendorGlobalAlerts() {
  const accountType = useAuthStore((s) => s.account_type);
  const { data: session, status, update } = useSession();
  const { data: profileResponse, isLoading: isProfileLoading } = useProfileData(
    {},
    "vendor",
  );

  const fromProfile = profileResponse?.data?.has_payment_provider;
  const fromSession = session?.user?.has_payment_provider;
  const hasPaymentProvider =
    typeof fromProfile === "boolean" ? fromProfile : fromSession === true;

  const gc = profileResponse?.data?.gocardless;

  useEffect(() => {
    if (typeof fromProfile !== "boolean") return;
    if (fromProfile === fromSession) return;
    void update({ has_payment_provider: fromProfile });
  }, [fromProfile, fromSession, update]);

  if (accountType !== "vendor") return null;
  if (status === "loading") return null;

  const waitingPaymentFlag =
    typeof fromProfile !== "boolean" &&
    fromSession === undefined &&
    isProfileLoading;

  const showPaymentGatewayBanner =
    !waitingPaymentFlag && hasPaymentProvider === false;

  const showGoCardlessBanner =
    gc?.enabled === true && (!gc.connected || !gc.auto_debit_allowed);

  if (!showPaymentGatewayBanner && !showGoCardlessBanner) return null;

  return (
    <div className="w-full min-w-0">
      {showPaymentGatewayBanner ? (
        <GlobalInfoBanner className="border-b border-sky-200 bg-sky-50 text-sky-950">
          You haven&apos;t connected a payment gateway yet. Customers need
          Stripe or PayPal to pay for bookings.{" "}
          <Link
            href="/vendor/payment-settings"
            className="font-semibold underline underline-offset-2 hover:text-sky-800"
          >
            Open Payment Settings
          </Link>
        </GlobalInfoBanner>
      ) : null}

      {showGoCardlessBanner && gc ? (
        <GlobalInfoBanner
          emphasis
          className="border-b border-amber-300 bg-amber-100 text-amber-950"
          iconClassName="text-amber-700"
        >
          {!gc.connected ? (
            <BannerMessageWithCta
              shortMessage="Connect GoCardless for platform fee Direct Debit."
              message="Connect GoCardless so EventWizz can collect platform fees by Direct Debit."
              href="/vendor/payment-settings"
              shortCta="Settings"
              cta="Open Payment Settings"
            />
          ) : (
            <BannerMessageWithCta
              shortMessage="GoCardless connected — allow auto-debit to continue."
              message="GoCardless is connected, but auto-debit is not allowed yet."
              href="/vendor/payment-settings"
              shortCta="Allow"
              cta="Allow auto-debit in Payment Settings"
            />
          )}
        </GlobalInfoBanner>
      ) : null}
    </div>
  );
}

const bannerCtaClassName =
  "inline-flex shrink-0 items-center justify-center rounded-md bg-amber-600 px-2.5 py-1 text-[11px] font-bold leading-none text-white shadow-sm transition hover:bg-amber-700 sm:px-2.5 sm:py-1 sm:text-xs";

function BannerMessageWithCta({
  shortMessage,
  message,
  href,
  shortCta,
  cta,
}: {
  shortMessage: string;
  message: string;
  href: string;
  shortCta: string;
  cta: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
      <p className="min-w-0 flex-1 text-xs font-semibold leading-snug sm:text-sm">
        <span className="sm:hidden">{shortMessage}</span>
        <span className="hidden sm:inline">{message}</span>
      </p>
      <Link href={href} className={bannerCtaClassName}>
        <span className="sm:hidden">{shortCta}</span>
        <span className="hidden sm:inline">{cta}</span>
      </Link>
    </div>
  );
}

function GlobalInfoBanner({
  children,
  className,
  iconClassName,
  emphasis = false,
}: {
  children: React.ReactNode;
  className?: string;
  iconClassName?: string;
  emphasis?: boolean;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex w-full items-center gap-2 px-3 sm:justify-center sm:gap-2.5 sm:px-6",
        emphasis ? "py-2 text-xs sm:py-2.5 sm:text-sm" : "py-2 text-xs sm:py-2.5 sm:text-sm",
        className,
      )}
    >
      <Info
        className={cn(
          "size-3.5 shrink-0 sm:size-4",
          iconClassName ?? "text-sky-600",
        )}
        aria-hidden
        strokeWidth={emphasis ? 2.25 : 2}
      />
      <div className="min-w-0 flex-1 sm:flex-none sm:max-w-4xl">
        {children}
      </div>
    </div>
  );
}
