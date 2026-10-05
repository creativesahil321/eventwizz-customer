"use client";

import { Button } from "@/components/ui/button";
// import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";
import { useForm } from "react-hook-form";
import { LoginFormInputs, loginSchema } from "./schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn, getSession } from "next-auth/react";
import { toast } from "sonner";
import { UserType } from "@/types/auth.types";
import { AuthRedirectingSkeleton } from "@/app/(auth)/_components/auth-redirecting-skeleton";
import { useDomain } from "@/providers/domain-provider/domain-provider";
import { OAuthErrorBoundary } from "@/components/auth/OAuthErrorBoundary";
import { OAuthSkeleton } from "@/components/auth/OAuthSkeleton";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { handleUrlErrorParams } from "@/lib/auth/url-utils";
import { resolvePostLoginRedirect } from "@/lib/auth/safe-callback-url";
import { AuthAlternateLink } from "@/app/(auth)/_components/auth-alternate-link";
import { AuthLegalNotice } from "@/app/(auth)/_components/auth-legal-notice";
import { clearOnboardingBrowserState } from "@/lib/clear-vendor-browser-session";

type LoginFormProps = {
  stayOnPage?: boolean;
  callbackUrlOverride?: string | null;
};

export default function LoginForm({
  stayOnPage = false,
  callbackUrlOverride,
}: LoginFormProps = {}) {
  const [loading, setLoading] = React.useState(false);
  const [redirecting, setRedirecting] = React.useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { website_role, parentDomain } = useDomain();
  const callbackUrl = callbackUrlOverride ?? searchParams.get("callbackUrl");

  // Handle error from URL parameters (for OAuth errors)
  React.useEffect(() => {
    handleUrlErrorParams();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInputs>({
    mode: "onChange",
    resolver: zodResolver(loginSchema),
    defaultValues: {
      remember: false,
    },
  });

  const handleLoginForm = async (data: LoginFormInputs) => {
    setLoading(true);
    try {
      const domain =
        typeof window !== "undefined" ? window.location.hostname : "";

      // Log in through NextAuth's Credentials provider. The call to the Laravel
      // login API happens SERVER-SIDE inside `authorize()`, so the token and the
      // raw backend response never appear in the browser Network tab. We only
      // send the credentials the server needs.
      const result = await signIn("credentials", {
        redirect: false,
        email: data.email,
        password: data.password,
        remember: data.remember ? "true" : "false",
        registration: "false",
        domain_name: domain || undefined,
      });

      if (!result || result.error) {
        const message =
          result?.error && result.error !== "CredentialsSignin"
            ? result.error
            : "Invalid email or password.";
        toast.error(message);
        setLoading(false);
        return;
      }

      // Session cookie is set. Read it back for post-login routing decisions.
      // Permissions are loaded from the API by PermissionProvider (not the JWT).
      clearOnboardingBrowserState();
      setRedirecting(true);

      const session = await getSession();
      const account_type = (session?.user?.account_type || "vendor") as UserType;
      const isVendorOnboarded =
        account_type === "vendor" && Boolean(session?.user?.isOnboarded);

      if (stayOnPage) {
        const next =
          callbackUrl ||
          `${window.location.pathname}${window.location.search}` ||
          "/vendor/door-scan";
        window.location.replace(next);
        return;
      }

      router.push(
        resolvePostLoginRedirect({
          accountType: account_type,
          isVendorOnboarded,
          callbackUrl,
        }),
      );
    } catch (error) {
      console.error("Error in login form:", error);
      toast.error("Something went wrong while signing in. Please try again.");
      setLoading(false);
      setRedirecting(false);
    }
  };

  // Show fullscreen loader when redirecting
  if (redirecting) {
    return <AuthRedirectingSkeleton />;
  }

  return (
    <OAuthErrorBoundary>
      <div className="grid gap-6">
        <form
          method="post"
          noValidate
          onSubmit={handleSubmit(handleLoginForm)}
        >
          <div className="grid gap-4">
            <div className="grid gap-2">
              <div className="grid gap-3">
                {loading ? (
                  <OAuthSkeleton variant="compact" />
                ) : (
                  <OAuthButtons
                    website_role={website_role || undefined}
                    parentDomain={parentDomain || undefined}
                    callbackUrl={callbackUrl || undefined}
                  />
                )}
              </div>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-[var(--color-border,#e5e7eb)]" />
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-wide">
                  <span className="bg-[var(--color-surface,#fff)] px-4 text-[var(--color-text-dimmed,#6b7280)]">
                    Or with email
                  </span>
                </div>
              </div>

              <div className="grid gap-2">
                <label
                  htmlFor="email"
                  className="font-medium text-[var(--color-text)]"
                >
                  Email address
                </label>
                <Input
                  id="email"
                  placeholder="name@example.com"
                  type="email"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect="off"
                  className={`h-11 px-3 border-0 border-b-2 border-[var(--color-primary,#019ead)] text-[var(--color-text)] focus:border-[var(--color-primary-dark,#018795)] focus:outline-none focus:ring-0 ${
                    errors.email ? "border-red-500" : ""
                  }`}
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-sm text-[var(--color-error,#ef4444)]">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="font-medium text-[var(--color-text)]"
                  >
                    Password
                  </label>

                  <Link
                    href={`/auth/forgot-password`}
                    className="text-sm font-medium  text-[var(--color-primary)]  hover:text-[var(--color-primary-hover)] hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <PasswordInput
                  id="password"
                  placeholder="••••••••"
                  autoCapitalize="none"
                  autoComplete="current-password"
                  autoCorrect="off"
                  className={`h-11 px-3 border-0 border-b-2 border-[var(--color-primary,#019ead)] text-[var(--color-text)] focus:border-[var(--color-primary-dark,#018795)] focus:outline-none focus:ring-0 ${
                    errors.password ? "border-red-500" : ""
                  }`}
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-sm text-red-500">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  className="border-black "
                  {...register("remember")}
                />
                <label
                  htmlFor="remember"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-black"
                >
                  Remember me
                </label>
              </div> */}
            </div>

            <Button
              variant="event-primary"
              type="submit"
              disabled={loading || redirecting}
            >
              {loading
                ? "Signing in..."
                : redirecting
                ? "Redirecting..."
                : "Sign in"}
            </Button>

            <AuthLegalNotice variant="login" />
            <AuthAlternateLink variant="login" callbackUrl={callbackUrl} />
          </div>
        </form>
      </div>
    </OAuthErrorBoundary>
  );
}
