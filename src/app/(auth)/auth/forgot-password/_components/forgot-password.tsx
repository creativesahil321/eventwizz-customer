"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/typography";
import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ForgetPasswordEmailVerifySchema } from "./schema";
import { authService } from "@/services/common/auth/auth.service";
import { setCookie } from "cookies-next";

type EmailVerificationFormValues = z.infer<
  typeof ForgetPasswordEmailVerifySchema
>;

export default function ForgotPassword({
  buttonText = "Submit",
  field = {
    name: "email",
    type: "email",
    label: "Please enter your email address",
    placeholder: "Email",
  },
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmailVerificationFormValues>({
    resolver: zodResolver(ForgetPasswordEmailVerifySchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: EmailVerificationFormValues) => {
    setLoading(true);
    try {
      const response = await authService.forgotPassword(data);

      if (response.status) {
        // Set cookie to track that password reset was requested
        // This will be checked in middleware for the password reset page
        setCookie("password_reset_requested", data.email, {
          maxAge: 60 * 60, // 1 hour expiry
          path: "/",
        });
        router.push("/auth/login");
      }
    } catch (error) {
      console.error("Error sending password reset link:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="w-full">
      <div className="w-full mx-auto">
        <div className="w-full my-5">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="flex flex-col justify-start space-y-2 mb-2">
              <Label className="text-left text-black">{field.label}</Label>
              <Input
                type={field.type}
                placeholder={field.placeholder}
                className={`h-10 ${
                  errors.email
                    ? "border-red-500"
                    : "border border-gray-400 rounded-sm"
                }`}
                id={field.name}
                {...register(field.name as keyof EmailVerificationFormValues)}
              />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>
            <div className="flex flex-col justify-start space-y-2 mb-2 mt-8">
              <Button
                disabled={loading}
                variant="event-primary"
                size="xl"
                className={`w-auto md:w-80 mx-auto`}
              >
                {loading ? (
                  "Sending..."
                ) : (
                  <>
                    {buttonText} <ChevronRight size={12} />
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
