import type { Metadata } from "next";
import { AuthLayoutShell } from "./_components/auth-layout-shell";

/** Sign-in / sign-up / password pages: keep them out of search results. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthLayoutShell>{children}</AuthLayoutShell>;
}
