"use client";

import Link from "next/link";
import { useDomain } from "@/providers/domain-provider/domain-provider";

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

export function AuthAlternateLink({ variant }: AuthAlternateLinkProps) {
  const { website_role } = useDomain();

  const linkClassName =
    "font-medium text-black hover:text-black hover:underline";

  if (variant === "register") {
    return (
      <p className="text-center text-sm text-black/70 pt-4">
        Have an account?{" "}
        <Link href="/auth/login" className={linkClassName}>
          Sign in
        </Link>
      </p>
    );
  }

  return (
    <p className="text-center text-sm text-black/70 pt-4">
      Don&apos;t have an account?{" "}
      <Link href={getRegistrationPath(website_role)} className={linkClassName}>
        Sign up
      </Link>
    </p>
  );
}
