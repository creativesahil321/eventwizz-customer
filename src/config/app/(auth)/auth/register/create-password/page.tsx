"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CompleteRegistrationForm } from "./_components/complete-registration-form";
import { H1, Paragraph } from "@/components/ui/typography";
import { getCookie } from "cookies-next";

export default function CreatePasswordPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Check if OTP was verified (from cookies first, then fallback to email check)
    const otpVerified = getCookie("otp_verified");
    const emailFromCookie = getCookie("verification_email");
    const emailFromStorage = localStorage.getItem("verification_email");

    if (!otpVerified || (!emailFromCookie && !emailFromStorage)) {
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
          <H1>Create a free account</H1>
          <Paragraph>Complete your registration</Paragraph>
        </div>
        <div className="w-full">
          <CompleteRegistrationForm />
        </div>
      </div>
    </div>
  );
}
