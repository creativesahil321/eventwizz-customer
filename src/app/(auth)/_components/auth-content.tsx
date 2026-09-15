"use client";

import { usePathname } from "next/navigation";
import { useDomain } from "@/providers/domain-provider/domain-provider";
import { appConfig } from "@/config/app";
import { resolveCurrencySymbol } from "@/lib/currency-format";

type StatItem = {
  value: string;
  label: string;
};

function AuthPanel({
  title,
  description,
  stats,
  trust,
}: {
  title: string;
  description: string;
  stats?: StatItem[];
  trust?: string;
}) {
  return (
    <div className="flex flex-col gap-6 max-w-md">
      <div className="space-y-3">
        <h2 className="font-heading text-3xl lg:text-4xl font-bold tracking-tight text-[var(--color-text)] leading-[1.15]">
          {title}
        </h2>
        <p className="text-sm lg:text-base text-[var(--color-text-dimmed)] leading-relaxed">
          {description}
        </p>
      </div>

      {stats && stats.length > 0 ? (
        <div className="grid grid-cols-3 gap-2.5">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-[var(--color-text)]/8 bg-[var(--color-surface)] px-2 py-3.5 text-center shadow-sm"
            >
              <div className="font-heading text-base lg:text-lg font-bold text-[var(--color-primary)] leading-none mb-1.5">
                {stat.value}
              </div>
              <div className="text-[10px] lg:text-xs text-[var(--color-text-dimmed)] leading-snug">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {trust ? (
        <p className="flex items-start gap-2 text-xs lg:text-sm text-[var(--color-text-dimmed)]">
          <svg
            className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary)]"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span>{trust}</span>
        </p>
      ) : null}
    </div>
  );
}

export function AuthContent({
  callbackUrl,
}: {
  callbackUrl?: string | null;
}) {
  const pathname = usePathname();
  const { settings } = useDomain();
  const siteName = settings?.name || appConfig.name;
  const currencySymbol = resolveCurrencySymbol(settings?.currency_symbol);

  const segments = pathname?.split("/") || [];
  const isRegister = segments.includes("register");
  const isCustomer = segments.includes("customer");
  const isVendor = segments.includes("vendor");
  const isLogin = segments.includes("login");
  const isDoorScan =
    pathname?.startsWith("/vendor/door-scan") ||
    (callbackUrl ?? "").includes("/vendor/door-scan") ||
    (callbackUrl ?? "").includes("/entry");
  const isVendorOnboarding =
    (callbackUrl ?? "").includes("/on-boarding");

  if (isRegister && isCustomer) {
    return (
      <AuthPanel
        title="Discover Amazing Events Near You!"
        description="Join our community of event enthusiasts. Get early access to tickets, exclusive discounts, and personalised event recommendations tailored just for you."
        stats={[
          { value: "Early access", label: "To new dates" },
          { value: "Your bookings", label: "In one place" },
          { value: "Secure", label: "Checkout" },
        ]}
        trust="Create an account to book and manage events"
      />
    );
  }

  if (isRegister && isVendor) {
    return (
      <AuthPanel
        title="Start Growing Your Event Business Today!"
        description="Join thousands of successful event organisers who have transformed their business with EventWizz. Our platform provides everything you need to manage and grow your events."
        stats={[
          { value: "15M+", label: "Tickets Sold" },
          { value: `${currencySymbol}500M`, label: "Revenue Generated" },
          { value: "10K+", label: "Active Vendors" },
        ]}
        trust="Trusted by over 50,000 organisers worldwide"
      />
    );
  }

  if (isLogin || isDoorScan) {
    if (isDoorScan) {
      return (
        <AuthPanel
          title="Check guests in"
          description={`Sign in with your ${siteName} staff account to open Door Scan. If you are already signed in as a venue user, this page opens the scanner.`}
          trust="Door staff sign-in stays on this page"
        />
      );
    }

    if (isVendorOnboarding) {
      return (
        <AuthPanel
          title={`Welcome back to ${siteName}`}
          description="Sign in to continue setting up your venue website. We’ll pick up your onboarding where you left off."
          trust="For event organisers setting up their EventWizz site"
        />
      );
    }

    const resumeCheckout = Boolean(
      callbackUrl &&
        (callbackUrl.includes("/checkout") ||
          callbackUrl.includes("/vendor/checkout")),
    );

    if (resumeCheckout) {
      return (
        <AuthPanel
          title="Save your booking"
          description={`Sign in to ${siteName} to keep the date you selected and finish checkout. Your selection is saved — you’ll return to the same booking after login.`}
          trust="We only use your account to complete and manage this booking"
        />
      );
    }

    return (
      <AuthPanel
        title={`Welcome Back to ${siteName}`}
        description="Sign in to book events, manage your bookings, and pick up right where you left off."
        trust="Secure sign-in for bookings and your account"
      />
    );
  }

  return (
    <AuthPanel
      title={`Welcome to ${siteName}`}
      description="The complete platform for event management and ticketing. Join us to create, manage, and grow your events with ease."
    />
  );
}
