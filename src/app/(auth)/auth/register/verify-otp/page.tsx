"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OTPVerificationForm } from "./_components/otp-verification-form";
import { getCookie } from "cookies-next";
import { H1, Paragraph } from "@/components/ui/typography";

export default function VerifyOTPPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Check if we have an email to verify from cookies first, then localStorage
    const emailFromCookie = getCookie("verification_email");
    const emailFromStorage = localStorage.getItem("verification_email");

    if (!emailFromCookie && !emailFromStorage) {
      router.replace("/auth/register");
      return;
    }

    setIsAuthorized(true);
  }, [router]);

  // Show nothing until we verify authorization
  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="w-full flex items-center justify-center py-12">
      <div className="mx-auto w-full max-w-[420px] px-4 flex flex-col items-center">
        <div className="flex flex-col space-y-2 text-center mb-8 w-full">
          <H1>Verify your email</H1>
          <Paragraph>Enter the verification code sent to your email</Paragraph>
        </div>
        <div className="w-full">
          <OTPVerificationForm />
        </div>
      </div>
    </div>
  );
}
