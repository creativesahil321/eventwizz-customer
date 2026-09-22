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

const OTP_EXPIRY_SECONDS = 10 * 60;
const OTP_RESEND_SECONDS = 60;

function formatOtpCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function OTPVerificationForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [otp, setOtp] = useState<string[]>(["", "", "", ""]);
  const [expirySeconds, setExpirySeconds] = useState(OTP_EXPIRY_SECONDS);
  const [resendSeconds, setResendSeconds] = useState(OTP_RESEND_SECONDS);
  const inputRefs = [
    useState<HTMLInputElement | null>(null),
    useState<HTMLInputElement | null>(null),
    useState<HTMLInputElement | null>(null),
    useState<HTMLInputElement | null>(null),
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setExpirySeconds((prev) => (prev > 0 ? prev - 1 : 0));
      setResendSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // OTP already verified — keep user on create-password (blocks Back)
    if (getCookie("otp_verified")) {
      router.replace("/auth/register/create-password");
      return;
    }

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

  const blockClipboardInsert = () => {
    toast.error("Please type the code — pasting is not allowed");
  };

  const handleChangeOtp = (value: string, index: number) => {
    // Ignore paste / autofill dumps; only a single typed digit (or clear) is allowed
    if (value.length > 1) return;
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 3) {
      inputRefs[index + 1][0]?.focus();
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
      e.preventDefault();
      blockClipboardInsert();
      return;
    }

    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs[index - 1][0]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    blockClipboardInsert();
  };

  const handleDrop = (e: React.DragEvent<HTMLInputElement>) => {
    e.preventDefault();
    blockClipboardInsert();
  };

  const handleBeforeInput = (e: React.FormEvent<HTMLInputElement>) => {
    const native = e.nativeEvent as InputEvent;
    if (
      native.inputType === "insertFromPaste" ||
      native.inputType === "insertFromDrop" ||
      native.inputType === "insertFromYank"
    ) {
      e.preventDefault();
      blockClipboardInsert();
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

        // Replace so Back cannot return to the OTP page
        router.replace("/auth/register/create-password");
      }
    } catch (error) {
      // Error handling is done by the interceptor
      console.error("❌ OTP Verification Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendSeconds > 0 || loading) {
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
      setExpirySeconds(OTP_EXPIRY_SECONDS);
      setResendSeconds(OTP_RESEND_SECONDS);
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
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-lpignore="true"
              data-1p-ignore="true"
              value={digit}
              onChange={(e) => handleChangeOtp(e.target.value, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onPaste={handlePaste}
              onDrop={handleDrop}
              onBeforeInput={handleBeforeInput}
              autoFocus={index === 0}
              className={cn(
                "w-14 h-14 text-center text-xl border rounded-md focus:ring-2 focus:ring-[var(--color-primary)] focus:outline-none",
                "bg-[var(--color-surface)] text-[var(--color-text)]",
                digit
                  ? "border-[var(--color-primary)] border-2"
                  : "border-[var(--color-border)] border"
              )}
            />
          ))}
        </div>

        <Small className="text-muted-foreground mt-2">
          {expirySeconds > 0
            ? `Code expires in ${formatOtpCountdown(expirySeconds)}`
            : "Code expired — please resend"}
        </Small>

        <Paragraph className="text-sm mt-4">
          Didn&apos;t receive the code?{" "}
          <button
            onClick={handleResendOTP}
            disabled={resendSeconds > 0 || loading}
            className={cn(
              "text-[var(--color-primary)] font-medium hover:underline cursor-pointer focus:outline-none bg-transparent border-none p-0",
              (resendSeconds > 0 || loading) && "opacity-50 cursor-not-allowed"
            )}
            type="button"
          >
            {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : "Resend"}
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
