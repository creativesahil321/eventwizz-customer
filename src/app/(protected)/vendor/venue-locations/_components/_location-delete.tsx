"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { cn } from "@/lib/utils";
import {
  useDeleteLocation,
  useSendLocationDeleteOtp,
  useVerifyLocationDeleteOtp,
} from "../_lib/queries";
import type { Location } from "../_lib/types";

const CONFIRM_PHRASE = "delete this location";
const OTP_LENGTH = 4;
const RESEND_SECONDS = 60;

type DeleteStep = "send" | "otp" | "confirm";

const STEPS: Array<{ id: DeleteStep; label: string }> = [
  { id: "send", label: "Send code" },
  { id: "otp", label: "Verify" },
  { id: "confirm", label: "Confirm" },
];

interface DeleteLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: Location;
}

/**
 * Security-first location delete UI.
 * Toasts are handled by the root api-client interceptor — do not toast here.
 */
export default function DeleteLocationDialog({
  open,
  onOpenChange,
  location,
}: DeleteLocationDialogProps) {
  const [step, setStep] = useState<DeleteStep>("send");
  const [otp, setOtp] = useState("");
  const [phraseInput, setPhraseInput] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [resendIn, setResendIn] = useState(0);

  const sendOtpMutation = useSendLocationDeleteOtp();
  const verifyOtpMutation = useVerifyLocationDeleteOtp();
  const deleteMutation = useDeleteLocation();

  const resourceLabel =
    location.city?.trim() ||
    location.name?.trim() ||
    `Location #${location.id}`;

  const phraseReady =
    phraseInput.trim().toLowerCase() === CONFIRM_PHRASE.toLowerCase();
  const otpReady = otp.length === OTP_LENGTH;
  const isBusy =
    sendOtpMutation.isPending ||
    verifyOtpMutation.isPending ||
    deleteMutation.isPending;
  const activeStepIndex = STEPS.findIndex((item) => item.id === step);

  useEffect(() => {
    if (!open) {
      setStep("send");
      setOtp("");
      setPhraseInput("");
      setMaskedEmail("");
      setResendIn(0);
      sendOtpMutation.reset();
      verifyOtpMutation.reset();
      deleteMutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when dialog closes/opens
  }, [open]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setInterval(() => {
      setResendIn((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendIn]);

  const handleSendOtp = async () => {
    try {
      const response = await sendOtpMutation.mutateAsync(location.id);
      const data = (
        response as {
          data?: {
            masked_email?: string;
            resend_after?: number;
            expires_in?: number;
          };
        }
      )?.data;
      setMaskedEmail(data?.masked_email?.trim() || "the account owner's email");
      setResendIn(data?.resend_after ?? data?.expires_in ?? RESEND_SECONDS);
      setOtp("");
      setStep("otp");
    } catch {
      // Root interceptor shows the error toast
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpReady) return;
    try {
      await verifyOtpMutation.mutateAsync({ id: location.id, otp });
      setStep("confirm");
    } catch {
      // Root interceptor shows the error toast
    }
  };

  const handleDelete = async () => {
    if (!otpReady || !phraseReady) return;
    try {
      await deleteMutation.mutateAsync({
        id: location.id,
        otp,
        confirmation: CONFIRM_PHRASE,
      });
      onOpenChange(false);
    } catch {
      // Root interceptor shows the error toast
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="flex w-[calc(100%-1.5rem)] max-w-lg flex-col gap-0 overflow-hidden rounded-lg p-0 max-h-[min(92dvh,calc(100dvh-1.5rem))]">
        <AlertDialogHeader className="shrink-0 space-y-3 border-b border-border px-4 py-4 text-left sm:space-y-4 sm:px-6 sm:py-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 ring-1 ring-red-100">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 space-y-0.5">
              <AlertDialogTitle className="text-lg font-semibold tracking-tight">
                Delete location
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-muted-foreground">
                This permanently removes the location and linked data.
              </AlertDialogDescription>
            </div>
          </div>

          <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-muted/30 px-3.5 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Location
            </p>
            <p
              className="mt-1 break-words text-sm font-semibold leading-snug text-foreground"
              title={resourceLabel}
            >
              {resourceLabel}
            </p>
            {location.address?.trim() ? (
              <p
                className="mt-1 break-words text-xs leading-relaxed text-muted-foreground line-clamp-2"
                title={location.address}
              >
                {location.address}
              </p>
            ) : null}
          </div>

          <ol className="grid grid-cols-3 gap-2" aria-label="Verification steps">
            {STEPS.map((item, index) => {
              const done = index < activeStepIndex;
              const active = index === activeStepIndex;
              return (
                <li
                  key={item.id}
                  className={cn(
                    "min-w-0 rounded-lg border px-1.5 py-2 text-center sm:px-2",
                    done && "border-emerald-200 bg-emerald-50",
                    active &&
                      "border-[var(--color-primary)]/30 bg-[color:color-mix(in_srgb,var(--color-primary)_8%,white)]",
                    !done && !active && "border-border bg-muted/30",
                  )}
                >
                  <p
                    className={cn(
                      "text-[10px] font-semibold uppercase tracking-[0.12em]",
                      done && "text-emerald-700",
                      active && "text-[var(--color-primary)]",
                      !done && !active && "text-muted-foreground",
                    )}
                  >
                    Step {index + 1}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 truncate text-xs font-medium",
                      done && "text-emerald-800",
                      active && "text-foreground",
                      !done && !active && "text-muted-foreground",
                    )}
                  >
                    {item.label}
                  </p>
                </li>
              );
            })}
          </ol>
        </AlertDialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
          {step === "send" ? (
            <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background text-foreground shadow-sm ring-1 ring-border">
                  <Mail className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1 space-y-1 text-sm">
                  <p className="font-medium text-foreground">
                    Verify with the owner’s email
                  </p>
                  <p className="leading-relaxed text-muted-foreground">
                    We’ll send a one-time code to the{" "}
                    <span className="font-semibold text-foreground">
                      account owner
                    </span>
                    .
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="event-primary"
                className="w-full"
                disabled={isBusy}
                onClick={() => void handleSendOtp()}
              >
                {sendOtpMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending code…
                  </>
                ) : (
                  <>
                    <LockKeyhole className="mr-2 h-4 w-4" />
                    Send verification code
                  </>
                )}
              </Button>
            </div>
          ) : null}

          {step === "otp" ? (
            <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Enter verification code
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Code sent to{" "}
                  <span className="break-all font-mono font-semibold text-foreground">
                    {maskedEmail || "the account owner's email"}
                  </span>
                </p>
              </div>

              <div className="flex justify-center overflow-x-auto py-1">
                <InputOTP
                  maxLength={OTP_LENGTH}
                  value={otp}
                  onChange={setOtp}
                  pattern={REGEXP_ONLY_DIGITS}
                  inputMode="numeric"
                  autoFocus
                  disabled={isBusy}
                  containerClassName="gap-1.5 sm:gap-2"
                >
                  <InputOTPGroup className="gap-1.5 sm:gap-2">
                    {Array.from({ length: OTP_LENGTH }).map((_, index) => (
                      <InputOTPSlot
                        key={index}
                        index={index}
                        className="h-11 w-10 rounded-lg border border-input bg-white text-lg font-bold text-slate-900 shadow-sm first:rounded-lg first:border-l last:rounded-lg sm:h-12 sm:w-11"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  className="text-xs font-medium text-[var(--color-primary)] underline-offset-2 hover:underline disabled:no-underline disabled:opacity-50"
                  disabled={isBusy || resendIn > 0}
                  onClick={() => void handleSendOtp()}
                >
                  {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
                </button>
                <Button
                  type="button"
                  variant="event-primary"
                  className="w-full sm:w-auto"
                  disabled={!otpReady || isBusy}
                  onClick={() => void handleVerifyOtp()}
                >
                  {verifyOtpMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    "Verify code"
                  )}
                </Button>
              </div>
            </div>
          ) : null}

          {step === "confirm" ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium text-emerald-900">Code verified</p>
                  <p className="mt-0.5 break-all text-xs text-emerald-800/80">
                    Confirmed for{" "}
                    <span className="font-mono font-semibold">
                      {maskedEmail || "the account owner's email"}
                    </span>
                  </p>
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-4">
                <Label
                  htmlFor="ew-location-delete-phrase"
                  className="text-sm font-medium text-foreground"
                >
                  Final confirmation
                </Label>
                <p className="select-none text-xs text-muted-foreground">
                  Type{" "}
                  <span className="pointer-events-none select-none rounded bg-muted px-1.5 py-0.5 font-mono font-semibold text-foreground">
                    {CONFIRM_PHRASE}
                  </span>{" "}
                  to enable deletion. Paste is disabled — you must type it.
                </p>
                <Input
                  id="ew-location-delete-phrase"
                  type="text"
                  name="ew-location-delete-phrase"
                  autoFocus
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  data-1p-ignore
                  data-lpignore="true"
                  data-form-type="other"
                  value={phraseInput}
                  onChange={(e) => setPhraseInput(e.target.value)}
                  onPaste={(e) => e.preventDefault()}
                  onDrop={(e) => e.preventDefault()}
                  onCopy={(e) => e.preventDefault()}
                  onCut={(e) => e.preventDefault()}
                  placeholder="Type the phrase above"
                  disabled={isBusy}
                  className="font-mono"
                />
              </div>
            </div>
          ) : null}

          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs leading-relaxed text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>
              Related events, bookings, and linked data will be removed. This
              cannot be undone.
            </p>
          </div>
        </div>

        <AlertDialogFooter className="shrink-0 gap-2 border-t border-border bg-muted/20 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:px-6 sm:py-4">
          <AlertDialogCancel
            disabled={isBusy}
            className="mt-0 w-full min-w-0 sm:w-auto sm:min-w-[96px]"
          >
            Cancel
          </AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={step !== "confirm" || !phraseReady || isBusy}
            className="w-full min-w-0 sm:w-auto sm:min-w-[150px]"
            onClick={() => void handleDelete()}
          >
            {deleteMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting…
              </>
            ) : (
              "Delete location"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
