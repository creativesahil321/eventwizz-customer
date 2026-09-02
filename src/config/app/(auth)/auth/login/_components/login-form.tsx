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
import { signIn } from "next-auth/react";
import { authService } from "@/services/common/auth/auth.service";
import { detectOS } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { usePermissionStore } from "@/store/permission.store";
import {
  AuthUser,
  UserType,
  StaffRole,
  LoginResponse,
} from "@/types/auth.types";
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

export default function LoginForm() {
  const [loading, setLoading] = React.useState(false);
  const [redirecting, setRedirecting] = React.useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { website_role, parentDomain } = useDomain();
  const callbackUrl = searchParams.get("callbackUrl");

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

      // Call API to get auth token
      const response = (await authService.login({
        email: data.email,
        password: data.password,
        user_agent: navigator.userAgent,
        os: detectOS(),
        ip_address: "192.168.1.100",
        domain_name: domain || undefined,
      })) as LoginResponse;

      if (!response.status) {
        throw new Error(response.message || "Login failed");
      }

      if (response.data.token) {
        clearOnboardingBrowserState();

        // Store auth data in Zustand
        const store = useAuthStore.getState();
        const account_type = (response.data.account_type ||
          response.data.active_role ||
          "vendor") as UserType;
        const active_role = (response.data.active_role || "") as StaffRole;

        const userData: AuthUser = {
          uuid: response.data.user.uuid,
          first_name: response.data.user.first_name,
          last_name: response.data.user.last_name,
          email: response.data.user.email,
          avatar: response.data.user.avatar,
          status: response.data.user.status || "active",
          active_role,
          account_type,
        };

        store.login(response.data.token, userData);

        // Store permissions if available
        if (response.data.permissions?.length) {
          const permissionStore = usePermissionStore.getState();
          permissionStore.setPermissions(response.data.permissions);

          try {
            sessionStorage.setItem(
              "permissions-backup",
              JSON.stringify(response.data.permissions)
            );
            localStorage.setItem(
              "permission-storage",
              JSON.stringify({
                state: {
                  permissions: response.data.permissions,
                  isLoaded: true,
                },
                version: 0,
              })
            );
          } catch (e) {
            console.error("Error storing permissions:", e);
            // Silent error
          }
        }

        // Location data is now handled by TanStack Query and Zustand store
        // The LocationInitializer component will handle this on page load
      }

      // Get metadata for redirection
      const isVendorOnboarded =
        (response.data.account_type || response.data.active_role) ===
          "vendor" &&
        "isOnboarded" in response.data &&
        response.data.isOnboarded === true;

      // Show redirecting state before NextAuth call
      setRedirecting(true);

      // Establish NextAuth session
      try {
        const userData = response.data.user;
        const account_type = (response.data.account_type ||
          response.data.active_role ||
          "vendor") as UserType;
        const active_role = (response.data.active_role || "") as StaffRole;
        const vendorLocationId = response.data.vendor_location_id
          ? String(response.data.vendor_location_id)
          : null;
        const permissions = JSON.stringify(response.data.permissions || []);

        // Location data is now handled by TanStack Query and Zustand store
        // No need to serialize location data for NextAuth

        const hasPaymentProvider = Boolean(
          response.data.has_payment_provider
        );

        const result = await signIn("credentials", {
          redirect: false,
          email: data.email,
          password: data.password,
          remember: data.remember,
          token: response.data.token,
          active_role,
          account_type,
          userId: userData.uuid?.toString(),
          uuid: userData.uuid || null,
          isOnboarded: isVendorOnboarded.toString(),
          registration: "false",
          domain_name: domain || undefined,
          first_name: userData.first_name,
          last_name: userData.last_name,
          avatar: userData.avatar,
          on_boarding_step: response.data.on_boarding_step?.toString(),
          vendor_location_id: vendorLocationId,
          event_id: response.data.event_id
            ? String(response.data.event_id)
            : undefined,
          status: userData.status,
          permissions,
          has_payment_provider: String(hasPaymentProvider),
        });

        if (result?.error) {
          throw new Error(result.error);
        }

        // Prefer safe callbackUrl for customers (e.g. return to checkout after booking)
        try {
          router.push(
            resolvePostLoginRedirect({
              accountType: account_type,
              isVendorOnboarded,
              callbackUrl,
            }),
          );
        } catch (error) {
          console.error("Error redirecting:", error);
          setRedirecting(false);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error in NextAuth session:", error);
        setLoading(false);
        setRedirecting(false);
      }
    } catch (error) {
      console.error("Error in login form:", error);
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
            <AuthAlternateLink variant="login" />
          </div>
        </form>
      </div>
    </OAuthErrorBoundary>
  );
}
