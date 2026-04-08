"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label, Small } from "@/components/ui/typography";
import { ChevronRight } from "lucide-react";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema } from "./schema";
import { z } from "zod";
import { authService } from "@/services/common/auth/auth.service";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { deleteCookie } from "cookies-next";

type RegisterForm = z.infer<typeof registerSchema>;

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = React.useState(false);
  const [token, setToken] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterForm>({
    mode: "onChange",
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirm_password: "",
    },
  });

  useEffect(() => {
    // Get token from URL
    const tokenParam = searchParams.get("token");
    const emailParam = searchParams.get("email");

    if (tokenParam) {
      setToken(tokenParam);
    }

    if (emailParam) {
      setValue("email", emailParam);
    }
  }, [searchParams, setValue]);

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    try {
      if (!token) {
        toast.error("Reset token is missing");
        return;
      }

      const resetData = {
        token,
        email: data.email,
        password: data.password,
        password_confirmation: data.confirm_password,
      };

      const response = await authService.resetPassword(resetData);

      if (response.status) {
        // Clear the password_reset_requested cookie
        deleteCookie("password_reset_requested");
        router.push("/auth/login");
      }
    } catch (error) {
      console.error("Error resetting password:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="w-full">
      <div className="w-full mx-auto">
        <div className="w-full my-5">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="flex flex-col justify-start space-y-2 mb-4">
              <Label className="text-left">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="abc@gmail.com"
                {...register("email")}
                className="border border-gray-400 rounded-sm"
              />
              {errors.email && (
                <Small className="text-red-500 text-left">
                  {errors.email.message}
                </Small>
              )}
            </div>

            <div className="flex flex-col justify-start space-y-2 mb-4">
              <Label className="text-left">Password</Label>
              <PasswordInput
                id="password"
                placeholder="******"
                autoComplete="new-password"
                {...register("password")}
                className="border border-gray-400 rounded-sm"
              />
              {errors.password && (
                <Small className="text-red-500 text-left">
                  {errors.password.message}
                </Small>
              )}
            </div>

            <div className="flex flex-col justify-start space-y-2 mb-4">
              <Label className="text-left">Confirm Password</Label>
              <PasswordInput
                id="confirm_password"
                placeholder="******"
                autoComplete="new-password"
                ariaPasswordField="confirm password"
                {...register("confirm_password")}
                className="border border-gray-400 rounded-sm"
              />
              {errors.confirm_password && (
                <Small className="text-red-500 text-left">
                  {errors.confirm_password.message}
                </Small>
              )}
            </div>

            <div className="flex flex-col justify-start space-y-2 mb-2 mt-8">
              <Button
                type="submit"
                variant="event-primary"
                size="xl"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  "Resetting..."
                ) : (
                  <>
                    Reset Password <ChevronRight size={12} />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
