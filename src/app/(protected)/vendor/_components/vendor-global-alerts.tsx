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
          Stripe, PayPal, or TrueLayer to pay for bookings.{" "}
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
          className="border-b-2 border-amber-400 bg-amber-100 text-amber-950"
          iconClassName="text-amber-700"
        >
          {!gc.connected ? (
            <>
              <span className="font-semibold">
                Connect GoCardless so EventWizz can collect platform fees by
                Direct Debit.
              </span>{" "}
              <Link
                href="/vendor/payment-settings"
                className="ml-1 inline-flex items-center rounded-md bg-amber-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm transition hover:bg-amber-700 sm:ml-2 sm:text-sm"
              >
                Open Payment Settings
              </Link>
            </>
          ) : (
            <>
              <span className="font-semibold">
                GoCardless is connected, but auto-debit is not allowed yet.
              </span>{" "}
              <Link
                href="/vendor/payment-settings"
                className="ml-1 inline-flex items-center rounded-md bg-amber-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm transition hover:bg-amber-700 sm:ml-2 sm:text-sm"
              >
                Allow auto-debit in Payment Settings
              </Link>
            </>
          )}
        </GlobalInfoBanner>
      ) : null}
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
        "flex w-full items-start gap-2.5 px-4 sm:items-center sm:justify-center sm:px-6",
        emphasis ? "py-3.5 text-[15px] sm:text-base" : "py-2.5 text-sm",
        className,
      )}
    >
      <Info
        className={cn(
          "mt-0.5 shrink-0 sm:mt-0",
          emphasis ? "h-5 w-5" : "h-4 w-4",
          iconClassName ?? "text-sky-600",
        )}
        aria-hidden
        strokeWidth={emphasis ? 2.5 : 2}
      />
      <div
        className={cn(
          "min-w-0 leading-snug sm:text-center",
          emphasis && "font-medium",
        )}
      >
        {children}
      </div>
    </div>
  );
}
