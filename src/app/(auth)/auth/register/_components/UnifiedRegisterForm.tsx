"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { authService } from "@/services/common/auth/auth.service";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDomain } from "@/providers/domain-provider/domain-provider";
import { setCookie, deleteCookie } from "cookies-next";
import { restartRegisterEmailVerification } from "@/lib/register-otp-gate";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { AuthAlternateLink } from "@/app/(auth)/_components/auth-alternate-link";
import { AuthLegalNotice } from "@/app/(auth)/_components/auth-legal-notice";

const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  account_type: z.string(),
  domain: z.string().optional(),
  parentDomain: z.string().optional(),
  website_role: z.string().optional(),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

type UnifiedRegisterFormProps = {
  accountType: "customer" | "vendor";
};

export function UnifiedRegisterForm({ accountType }: UnifiedRegisterFormProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const { domain, website_role, parentDomain, isDomainRequest } = useDomain();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    mode: "onChange",
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
    },
  });

  // Starting (or restarting) this form means a new OTP is required.
  useEffect(() => {
    restartRegisterEmailVerification(deleteCookie);
  }, []);
  useEffect(() => {
    if (isDomainRequest) {
      if (domain) setValue("domain", domain);
      if (parentDomain) setValue("parentDomain", parentDomain);
      setValue("account_type", accountType);
      setValue("website_role", website_role || "");
    } else {
      setValue("account_type", accountType);
    }
  }, [
    isDomainRequest,
    domain,
    website_role,
    parentDomain,
    setValue,
    accountType,
  ]);

  const handleEmailVerification = async (data: RegisterFormValues) => {
    setLoading(true);
    try {
      // A previous OTP success must not skip the new code screen.
      restartRegisterEmailVerification(deleteCookie);

      // Get domain from domain store or current hostname
      const domainValue =
        domain ||
        (typeof window !== "undefined" ? window.location.hostname : null);

      await authService.verifyEmail({
        email: data.email,
        domain: domainValue || undefined,
      });

      // Store registration data in cookies and localStorage
      const cookieOptions = { maxAge: 60 * 15, path: "/" };
      setCookie("verification_email", data.email, cookieOptions);
      setCookie("verification_account_type", data.account_type, cookieOptions);
      setCookie(
        "verification_website_role",
        data.website_role || website_role || "",
        cookieOptions
      );

      if (data.domain) {
        setCookie("verification_domain", data.domain, cookieOptions);
      }

      if (data.parentDomain) {
        setCookie(
          "verification_parentDomain",
          data.parentDomain,
          cookieOptions
        );
      }

      // Also use localStorage for redundancy
      localStorage.setItem("verification_email", data.email);
      localStorage.setItem("verification_account_type", data.account_type);
      localStorage.setItem(
        "verification_website_role",
        data.website_role || website_role || ""
      );

      if (data.domain) {
        localStorage.setItem("verification_domain", data.domain);
      }

      if (data.parentDomain) {
        localStorage.setItem("verification_parentDomain", data.parentDomain);
      }

      router.replace("/auth/register/verify-otp");
    } catch {
      // Error handling is done by the interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6">
      <form onSubmit={handleSubmit(handleEmailVerification)}>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <div className="grid gap-3">
              <OAuthButtons
                website_role={website_role || undefined}
                parentDomain={parentDomain || undefined}
              />
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
              <Label
                htmlFor="email"
                className="font-medium text-[var(--color-text)]"
              >
                {accountType === "vendor"
                  ? "Business Email address"
                  : "Email address"}
              </Label>
              <Input
                id="email"
                placeholder={
                  accountType === "vendor"
                    ? "business@example.com"
                    : "name@example.com"
                }
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
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Hidden fields for domain information */}
            <input type="hidden" {...register("account_type")} />
            <input type="hidden" {...register("domain")} />
            <input type="hidden" {...register("parentDomain")} />
            <input type="hidden" {...register("website_role")} />
          </div>

          <Button variant="event-primary" type="submit" disabled={loading}>
            {loading ? "Verifying..." : "Verify email"}
          </Button>

          <AuthLegalNotice variant="register" />
          <AuthAlternateLink variant="register" />
        </div>
      </form>
    </div>
  );
}
