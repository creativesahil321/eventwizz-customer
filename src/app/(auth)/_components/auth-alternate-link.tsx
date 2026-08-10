"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDomain } from "@/providers/domain-provider/domain-provider";
import { getSafeCallbackUrl } from "@/lib/auth/safe-callback-url";

type AuthAlternateLinkProps = {
  variant: "login" | "register";
};

function getRegistrationPath(website_role: string | null | undefined) {
  if (!website_role) return "/auth/register/customer";

  const paths = {
    admin: "/auth/register/vendor",
    vendor: "/auth/register/customer",
    customer: "/auth/register/customer",
  };

  return (
    paths[website_role as keyof typeof paths] || "/auth/register/customer"
  );
}

function withCallbackUrl(path: string, callbackUrl: string | null): string {
  const safe = getSafeCallbackUrl(callbackUrl);
  if (!safe) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}callbackUrl=${encodeURIComponent(safe)}`;
}

export function AuthAlternateLink({ variant }: AuthAlternateLinkProps) {
  const { website_role } = useDomain();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  const linkClassName =
    "font-medium text-[var(--color-text)] hover:text-[var(--color-primary)] hover:underline";

  if (variant === "register") {
    return (
      <p className="text-center text-sm text-[var(--color-text-dimmed)] pt-3">
        Have an account?{" "}
        <Link
          href={withCallbackUrl("/auth/login", callbackUrl)}
          className={linkClassName}
        >
          Sign in
        </Link>
      </p>
    );
  }

  return (
    <p className="text-center text-sm text-[var(--color-text-dimmed)] pt-3">
      Don&apos;t have an account?{" "}
      <Link
        href={withCallbackUrl(getRegistrationPath(website_role), callbackUrl)}
        className={linkClassName}
      >
        Sign up
      </Link>
    </p>
  );
}
