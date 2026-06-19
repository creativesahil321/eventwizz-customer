"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { authService } from "@/services/common/auth/auth.service";
import { cn } from "@/lib/utils";
import { Paragraph, Small } from "@/components/ui/typography";
import { getCookie, setCookie } from "cookies-next";
import { useDomainStore } from "@/store/domain.store";

export function OTPVerificationForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [otp, setOtp] = useState<string[]>(["", "", "", ""]);
  const [timer, setTimer] = useState(60);
  const inputRefs = [
    useState<HTMLInputElement | null>(null),
    useState<HTMLInputElement | null>(null),
    useState<HTMLInputElement | null>(null),
    useState<HTMLInputElement | null>(null),
  ];

  // Countdown timer for OTP expiration
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  useEffect(() => {
    // Try to get email from cookies first, fallback to localStorage
    const emailFromCookie = getCookie("verification_email") as string;
    const emailFromStorage = localStorage.getItem("verification_email");

    const emailToUse = emailFromCookie || emailFromStorage;

    if (emailToUse) {
      setEmail(emailToUse);
    } else {
      router.replace("/auth/register");
    }
  }, [router]);

  const handleChangeOtp = (value: string, index: number) => {
    // Only allow numbers
    if (!/^\d*$/.test(value)) return;

    // Update the OTP array
    const newOtp = [...otp];
    newOtp[index] = value.slice(0, 1); // Only take the first digit
    setOtp(newOtp);

    // Auto-focus next input when a digit is entered
    if (value && index < 3) {
      inputRefs[index + 1][0]?.focus();
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    // Move to previous input on backspace if current input is empty
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs[index - 1][0]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text/plain").trim();

    // Only proceed if the pasted data contains only digits
    if (!/^\d+$/.test(pastedData)) return;

    const digits = pastedData.slice(0, 4).split("");
    const newOtp = [...otp];

    digits.forEach((digit, index) => {
      if (index < 4) {
        newOtp[index] = digit;
      }
    });

    setOtp(newOtp);

    // Focus the appropriate input based on paste length
    if (digits.length < 4) {
      inputRefs[digits.length][0]?.focus();
    } else {
      // Focus the last input if all digits are filled
      inputRefs[3][0]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    const otpString = otp.join("");
    if (otpString.length !== 4) {
      toast.error("Please enter a valid 4-digit OTP");
      return;
    }

    if (!email) {
      toast.error("Email not found. Please try again");
      router.replace("/auth/register");
      return;
    }

    setLoading(true);
    try {
      // Get domain from domain store or current hostname
      const domainValue =
        useDomainStore.getState().domain ||
        (typeof globalThis.window !== "undefined"
          ? globalThis.window.location.hostname
          : null);

      // Call verifyOTP with returnFullResponse option
      const response = await authService.verifyOTP({
        email,
        otp: otpString,
        domain: domainValue || undefined,
      });

      // If verification is successful
      if (response.status === true) {
        // Set cookie to indicate OTP verification success
        setCookie("otp_verified", "true", { maxAge: 60 * 15, path: "/" });

        // Navigate to create password page
        const nextPath = "/auth/register/create-password";
        router.push(nextPath);
      }
    } catch (error) {
      // Error handling is done by the interceptor
      console.error("❌ OTP Verification Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    // Don't allow resend if timer is active or loading
    if (timer > 0 || loading) {
      return;
    }

    if (!email) {
      toast.error("Email not found. Please try again");
      router.replace("/auth/register");
      return;
    }

    setLoading(true);
    try {
      // Get domain from domain store or current hostname
      const domainValue =
        useDomainStore.getState().domain ||
        (typeof globalThis.window !== "undefined"
          ? globalThis.window.location.hostname
          : null);

      await authService.verifyEmail({
        email,
        domain: domainValue || undefined,
      });
      setTimer(60); // Reset timer to 60 seconds
      setOtp(["", "", "", ""]);
      inputRefs[0][0]?.focus();
    } catch (error) {
      // Error handling is done by the interceptor
      console.error("❌ Resend OTP Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6">
      <div className="grid gap-2 text-center">
        <Paragraph className="text-sm text-muted-foreground mb-6">
          Enter the verification code sent to
          <br />
          {email}
        </Paragraph>

        <div className="flex justify-center gap-2">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                const [, setRef] = inputRefs[index];
                setRef(el);
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChangeOtp(e.target.value, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onPaste={handlePaste}
              autoFocus={index === 0}
              className={cn(
                "w-14 h-14 text-center text-xl border rounded-md focus:ring-2 focus:ring-[var(--color-primary)] focus:outline-none text-black",
                digit
                  ? "border-[var(--color-primary)] bg-white border-2"
                  : "border-[var(--color-border)] bg-white border"
              )}
            />
          ))}
        </div>

        <Small className="text-muted-foreground mt-2">
          Otp: {timer > 0 ? `${timer}s` : "Expired"}
        </Small>

        <Paragraph className="text-sm mt-4">
          Didn&apos;t receive the code?{" "}
          <button
            onClick={handleResendOTP}
            disabled={timer > 0 || loading}
            className={cn(
              "text-[var(--color-primary)] font-medium hover:underline cursor-pointer focus:outline-none bg-transparent border-none p-0",
              (timer > 0 || loading) && "opacity-50 cursor-not-allowed"
            )}
            type="button"
          >
            Resend
          </button>
        </Paragraph>
      </div>
      <Button
        onClick={handleVerifyOTP}
        disabled={loading || otp.some((digit) => !digit)}
        variant="event-primary"
        className="w-full"
      >
        Verify email
      </Button>
    </div>
  );
}
