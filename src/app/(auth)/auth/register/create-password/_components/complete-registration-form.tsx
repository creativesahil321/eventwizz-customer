"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/typography";
import { toast } from "sonner";
import { authService } from "@/services/common/auth/auth.service";
import { env } from "@/env";
import { signIn } from "next-auth/react";
import { registerSchema } from "./schema";
import { getCookie, deleteCookie } from "cookies-next";
import { useAuthStore } from "@/store/auth.store";
import { AuthUser, UserType, StaffRole } from "@/types/auth.types";
import { usePermissionStore } from "@/store/permission.store";
import { Loader2 } from "lucide-react";
import { RegistrationResponse } from "@/types/api.types";

type RegisterFormValues = z.infer<typeof registerSchema>;

// Define response type to match the API

export function CompleteRegistrationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const email = searchParams?.get("email") || "";

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: email,
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    // Get email from cookies first, then fallback to localStorage
    const emailFromCookie = getCookie("verification_email") as string;
    const emailFromStorage = localStorage.getItem("verification_email");

    const emailToUse = emailFromCookie || emailFromStorage;

    if (emailToUse) {
      setValue("email", emailToUse);
    } else {
      router.replace("/auth/register");
    }
  }, [router, setValue]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const onSubmit = async (data: RegisterFormValues) => {
    setLoading(true);
    try {
      // Get website_role from cookies or localStorage
      const websiteRole =
        getCookie("verification_website_role") ||
        localStorage.getItem("verification_website_role") ||
        "customer";

      // Determine account type based on domain role using mapping
      const accountTypeMap: Record<string, string> = {
        admin: "vendor",
        vendor: "customer",
        customer: "customer",
      };

      const accountType =
        accountTypeMap[websiteRole as keyof typeof accountTypeMap] ||
        "customer";

      // Always use the actual hostname for domain, without any fallbacks
      const domain =
        typeof window !== "undefined" ? window.location.hostname : "";

      const response = (await authService.completeRegistration({
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        password: data.password,
        password_confirmation: data.confirmPassword,
        account_type: accountType,
        domain_name: domain,
      })) as unknown as RegistrationResponse;

      if (response.status) {
        // Clear registration data
        const cookieKeys = [
          "verification_email",
          "verification_website_role",
          "verification_domain",
          "verification_parentDomain",
          "verification_account_type",
          "otp_verified",
        ];

        cookieKeys.forEach((key) => {
          deleteCookie(key);
          localStorage.removeItem(key);
        });

        // Get user data and token from response
        const userData = response.data.user;
        const token = response.data.token;
        const active_role = response.data.active_role;
        const account_type = response.data.account_type;

        // Update auth store with user data
        if (token) {
          // Access auth store directly and update it
          const authStore = useAuthStore.getState();

          // Extract account_type and active_role from response
          const accountType = (account_type ||
            active_role ||
            "vendor") as UserType; // Cast to UserType
          const userRole = (active_role || "") as StaffRole; // Cast to StaffRole

          // Convert user data to proper AuthUser type with standardized naming
          const authUserData: AuthUser = {
            uuid: userData.uuid,
            first_name: userData.first_name,
            last_name: userData.last_name,
            email: userData.email,
            avatar: userData.avatar,
            status: userData.status || "active",
            active_role: userRole, // Staff role for permissions (renamed from role)
            account_type: accountType, // User type for navigation (renamed from user_type)
          };

          // Update the auth store
          authStore.login(token, authUserData);
        }

        // Store permissions
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
          } catch {
            // Silent error
          }
        }

        // Ensure vendor_location_id is properly formatted as a string if it exists
        const vendorLocationId = response.data.vendor_location_id
          ? String(response.data.vendor_location_id)
          : null;

        // Show redirecting state before NextAuth call
        setRedirecting(true);

        // Log in the user with NextAuth using the returned token and full user data
        const result = await signIn("credentials", {
          redirect: false,
          email: data.email,
          registration: "true",
          token: token,
          active_role: active_role, // Updated from role
          account_type: account_type, // Added account_type for clarity
          userId: userData.uuid?.toString(),
          uuid: userData.uuid || null,
          isOnboarded: "false", // New vendors are not onboarded by default
          first_name: userData.first_name,
          last_name: userData.last_name,
          avatar: userData.avatar,
          on_boarding_step: response.data.on_boarding_step?.toString(),
          vendor_location_id: vendorLocationId,
          status: userData.status,
          permissions: response.data.permissions
            ? JSON.stringify(response.data.permissions)
            : JSON.stringify([]),
        });

        if (result?.error) {
          toast.error(result?.error || "Failed to sign in after registration");
          router.push("/auth/login");
        } else {
          // Redirect based on account type
          if (accountType === "vendor") {
            router.push("/on-boarding");
          } else {
            router.push(`/${accountType}/dashboard`);
          }
        }
      } else {
        // Error is handled by axios interceptor
        setLoading(false);
      }
    } catch (error) {
      if (env.NEXT_PUBLIC_DEV_MODE) {
        console.error("❌ Registration Error:", error);
      }
      setLoading(false);
    }
  };

  // Show same dark full-screen loader as auth layout — one continuous transition, no white flash
  if (redirecting) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-slate-400" aria-hidden />
          <p className="text-sm text-slate-500">Taking you to your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 ">
        <div className="space-y-2">
          <Label>First Name</Label>
          <Input
            id="firstName"
            type="text"
            className={`h-10 ${errors.firstName ? "border-red-500" : ""}`}
            placeholder="Enter your first name"
            {...register("firstName")}
          />
          {errors.firstName && (
            <p className="text-xs text-red-500">{errors.firstName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Last Name</Label>
          <Input
            id="lastName"
            type="text"
            className={`h-10 ${errors.lastName ? "border-red-500" : ""}`}
            placeholder="Enter your last name"
            {...register("lastName")}
          />
          {errors.lastName && (
            <p className="text-xs text-red-500">{errors.lastName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Email</Label>
          <Input
            id="email"
            type="email"
            className="h-10 bg-gray-50"
            placeholder="name@example.com"
            {...register("email")}
            disabled
          />
          {errors.email && (
            <p className="text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label>Password</Label>
            <Button
              variant="event-ghost"
              type="button"
              onClick={togglePasswordVisibility}
            >
              {showPassword ? "Hide" : "Show"}
            </Button>
          </div>
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            className={`h-10 ${errors.password ? "border-red-500" : ""}`}
            placeholder="Create a password"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            className={`h-10 ${errors.confirmPassword ? "border-red-500" : ""}`}
            placeholder="Confirm your password"
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-red-500">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={loading}
          variant="event-primary"
          size="xl"
          className="w-full mt-2"
        >
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </div>
  );
}
