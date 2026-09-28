"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import {
  CheckoutElementsProvider,
  useCheckoutElements,
} from "@stripe/react-stripe-js/checkout";
import type {
  StripeCheckoutElementsOptions,
  StripeExpressCheckoutElementConfirmEvent,
  StripeElementsOptions,
} from "@stripe/stripe-js";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCurrencyFormat } from "@/hooks/use-currency-format";
import { useDomain } from "@/providers/domain-provider/domain-provider";
import type { CheckoutStripePaymentSession } from "@/services/customer/checkout";
import {
  buildStripeReturnUrl,
  confirmStripePaymentSuccess,
} from "@/services/customer/checkout/checkout-payment";
import { getStripePromise } from "@/lib/stripe/stripe-loader";
import { cn } from "@/lib/utils";
import { PaymentSessionCountdownPill } from "./payment-session-countdown-pill";
import "../checkout-theme.css";

// ---------------------------------------------------------------------------
// Shared appearance / UI helpers
// ---------------------------------------------------------------------------

/**
 * Stripe renders inside its own iframe: page CSS variables (`var(--font-inter)`)
 * and `oklch()` colours do not resolve there, so the card form fell back to a
 * serif system font. Pass concrete values — the vendor's brand colour is read
 * from the page once, as `rgb()`, when the form mounts.
 */
const STRIPE_FONTS = [
  {
    cssSrc:
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap",
  },
];

const STRIPE_TEXT = "#0f172a";
const STRIPE_TEXT_MUTED = "#64748b";
const STRIPE_BORDER = "#e2e8f0";
const STRIPE_SURFACE_MUTED = "#f1f5f9";

function readVendorPrimaryRgb(fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--color-primary")
    .trim();
  if (!raw) return fallback;
  // Normalise any CSS colour (hex, oklch, named…) to rgb() via the browser.
  const probe = document.createElement("span");
  probe.style.color = raw;
  document.body.appendChild(probe);
  const rgb = getComputedStyle(probe).color;
  probe.remove();
  return rgb.startsWith("rgb") ? rgb : fallback;
}

function buildStripeAppearance() {
  const accent = readVendorPrimaryRgb(STRIPE_TEXT);
  return {
    theme: "stripe" as const,
    labels: "above" as const,
    variables: {
      colorPrimary: accent,
      colorBackground: "#ffffff",
      colorText: STRIPE_TEXT,
      colorTextSecondary: STRIPE_TEXT_MUTED,
      colorTextPlaceholder: STRIPE_TEXT_MUTED,
      colorDanger: "#dc2626",
      fontFamily:
        "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      fontSizeBase: "15px",
      spacingUnit: "4px",
      borderRadius: "12px",
      focusBoxShadow: `0 0 0 3px color-mix(in srgb, ${accent} 25%, transparent)`,
      tabIconSelectedColor: accent,
    },
    rules: {
      ".Tab": {
        border: `1px solid ${STRIPE_BORDER}`,
        boxShadow: "none",
      },
      ".Tab:hover": {
        backgroundColor: STRIPE_SURFACE_MUTED,
      },
      ".Tab--selected": {
        border: `2px solid ${accent}`,
        boxShadow: "none",
      },
      ".AccordionItem": {
        border: `1px solid ${STRIPE_BORDER}`,
        boxShadow: "none",
      },
      ".Input": {
        border: `1px solid ${STRIPE_BORDER}`,
        boxShadow: "none",
      },
      ".Input:focus": {
        border: `1px solid ${accent}`,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Shared form body (pure UI — no stripe hooks)
// ---------------------------------------------------------------------------

interface FormBodyProps {
  session: CheckoutStripePaymentSession;
  merchantName: string;
  sessionSecondsLeft: number | null;
  isReady: boolean;
  isSubmitting: boolean;
  errorMessage: string | null;
  hasExpressCheckout: boolean;
  onHasExpressCheckout: (value: boolean) => void;
  onSubmit: () => void;
  onExpressConfirm: (event: StripeExpressCheckoutElementConfirmEvent) => void;
}

function StripeFormBody({
  session,
  merchantName,
  sessionSecondsLeft,
  isReady,
  isSubmitting,
  errorMessage,
  hasExpressCheckout,
  onHasExpressCheckout,
  onSubmit,
  onExpressConfirm,
}: FormBodyProps) {
  const { format: formatMoney } = useCurrencyFormat();

  return (
    <div className="space-y-5">
      {sessionSecondsLeft !== null ? (
        <div
          className={cn(
            "flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5",
            sessionSecondsLeft <= 60
              ? "border-red-200/80 bg-red-50/80"
              : "border-amber-200/80 bg-amber-50/80",
          )}
        >
          <p
            className={cn(
              "text-xs font-medium leading-snug",
              sessionSecondsLeft <= 60 ? "text-red-900" : "text-amber-900",
            )}
          >
            {sessionSecondsLeft <= 60
              ? "Hurry! Session expires soon."
              : "Complete payment before your reservation expires."}
          </p>
          <PaymentSessionCountdownPill
            secondsLeft={sessionSecondsLeft}
            size="md"
          />
        </div>
      ) : null}

      <div className="rounded-xl border border-[color:var(--checkout-border)] bg-[color:var(--checkout-muted)]/30 px-4 py-3.5">
        <div className="grid grid-cols-[1fr_auto] items-end gap-x-6 gap-y-1">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--checkout-muted-foreground)]">
              Booking reference
            </p>
            <p className="truncate text-sm font-bold text-[color:var(--checkout-foreground)]">
              {session.bookingNumber}
            </p>
            <p className="truncate text-xs text-[color:var(--checkout-muted-foreground)]">
              {merchantName}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--checkout-muted-foreground)]">
              Pay today
            </p>
            <p className="text-xl font-bold tabular-nums leading-none text-[color:var(--checkout-foreground)]">
              {formatMoney(session.amount)}
            </p>
          </div>
        </div>
        {session.dueLater != null && session.dueLater > 0 ? (
          <p className="mt-3 border-t border-[color:var(--checkout-border)] pt-3 text-xs text-[color:var(--checkout-muted-foreground)]">
            Remaining balance of {formatMoney(session.dueLater)} will be due
            before your event.
          </p>
        ) : null}
      </div>

      <div className="space-y-3">
        <div className="checkout-stripe-express w-full min-h-[44px]">
          <ExpressCheckoutElement
            options={{
              buttonTheme: { applePay: "black", googlePay: "black" },
              buttonType: { applePay: "plain", googlePay: "buy" },
              layout: { maxColumns: 2, maxRows: 2 },
              paymentMethods: {
                applePay: "always",
                googlePay: "always",
                link: "auto",
                amazonPay: "auto",
                paypal: "auto",
              },
            }}
            onReady={({ availablePaymentMethods }) => {
              onHasExpressCheckout(
                Boolean(
                  availablePaymentMethods &&
                  Object.keys(availablePaymentMethods).length > 0,
                ),
              );
            }}
            onConfirm={onExpressConfirm}
          />
        </div>

        {hasExpressCheckout ? (
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[color:var(--checkout-border)]" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--checkout-muted-foreground)]">
                Or pay another way
              </span>
            </div>
          </div>
        ) : null}

        <div className="checkout-stripe-payment w-full">
          <PaymentElement
            options={{
              layout: { type: "tabs" },
              wallets: { applePay: "never", googlePay: "never", link: "never" },
              business: { name: merchantName },
              fields: { billingDetails: { address: "auto" } },
            }}
          />
        </div>
      </div>

      {errorMessage ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {errorMessage}
        </p>
      ) : null}

      <div className="space-y-4">
        <Button
          type="button"
          onClick={onSubmit}
          disabled={!isReady || isSubmitting}
          className={cn(
            "checkout-stripe-pay-btn h-12 w-full rounded-xl border-0 text-sm font-bold shadow-md",
            "shadow-[oklch(0.208_0.042_265.755/0.2)]",
            "!bg-[var(--checkout-brand-primary,oklch(0.208_0.042_265.755))] !text-white",
            "hover:!brightness-110 disabled:!opacity-55",
          )}
        >
          {isSubmitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing secure payment...
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Pay {formatMoney(session.amount)} securely
            </span>
          )}
        </Button>

        <div className="rounded-xl border border-[color:var(--checkout-border)]/60 bg-[color:var(--checkout-muted)]/25 px-4 py-3">
          <div className="grid grid-cols-1 gap-1.5 text-center text-[10px] font-medium text-[color:var(--checkout-muted-foreground)] sm:grid-cols-3 sm:gap-0">
            <span className="inline-flex items-center justify-center gap-1.5">
              <ShieldCheck className="h-3 w-3 shrink-0 text-emerald-600" />
              256-bit SSL
            </span>
            <span className="sm:border-x sm:border-[color:var(--checkout-border)]">
              PCI DSS compliant
            </span>
            <span>Powered by Stripe</span>
          </div>
          <p className="mt-2.5 text-center text-[10px] leading-relaxed text-[color:var(--checkout-muted-foreground)]">
            Card details are encrypted and processed by Stripe. We never store
            your payment information.
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// A — Payment Intents form (legacy: useStripe + useElements)
// ---------------------------------------------------------------------------

interface FormProps {
  session: CheckoutStripePaymentSession;
  merchantName: string;
  sessionSecondsLeft: number | null;
  successReturnPath?: string;
  onPaymentComplete?: () => void;
  onClose: () => void;
}

function PaymentIntentForm({
  session,
  merchantName,
  sessionSecondsLeft,
  successReturnPath,
  onPaymentComplete,
  onClose,
}: FormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasExpressCheckout, setHasExpressCheckout] = useState(false);

  const finalizeSuccess = useCallback(async () => {
    try {
      await confirmStripePaymentSuccess({
        booking_id: session.bookingId,
        payment_intent_id: session.paymentIntentId,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Payment could not be confirmed with our server.";
      toast.error("Confirmation failed", {
        description: `${message} Booking ${session.bookingNumber} — please contact support if you were charged.`,
      });
      return;
    }

    onPaymentComplete?.();
    onClose();
    const returnUrl = buildStripeReturnUrl(session, {
      path: successReturnPath,
    });
    router.push(`${returnUrl}&verified=1`);
  }, [onClose, onPaymentComplete, router, session, successReturnPath]);

  const runConfirm = useCallback(
    async (
      expressEvent?: StripeExpressCheckoutElementConfirmEvent,
    ): Promise<boolean> => {
      if (!stripe || !elements) return false;

      const returnUrl = buildStripeReturnUrl(session, {
        path: successReturnPath,
      });

      if (!expressEvent) {
        const { error: submitError } = await elements.submit();
        if (submitError) {
          setErrorMessage(
            submitError.message ?? "Please check your payment details.",
          );
          toast.error("Payment failed", {
            description:
              submitError.message ?? "Please check your payment details.",
          });
          return false;
        }
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: returnUrl },
        redirect: "if_required",
      });

      if (error) {
        setErrorMessage(error.message ?? "Payment could not be completed.");
        toast.error("Payment failed", {
          description: error.message ?? "Please check your payment details.",
        });
        return false;
      }

      if (paymentIntent?.status === "succeeded") {
        await finalizeSuccess();
        return true;
      }

      if (paymentIntent?.status === "processing") {
        toast.info("Payment processing", {
          description:
            "Your bank is processing the payment. We'll confirm once it completes.",
        });
      }

      return false;
    },
    [elements, finalizeSuccess, session, stripe, successReturnPath],
  );

  const handleSubmit = async () => {
    if (!stripe || !elements) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await runConfirm();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.";
      setErrorMessage(message);
      toast.error("Payment failed", { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExpressConfirm = async (
    event: StripeExpressCheckoutElementConfirmEvent,
  ) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await runConfirm(event);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.";
      setErrorMessage(message);
      toast.error("Payment failed", { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StripeFormBody
      session={session}
      merchantName={merchantName}
      sessionSecondsLeft={sessionSecondsLeft}
      isReady={Boolean(stripe && elements)}
      isSubmitting={isSubmitting}
      errorMessage={errorMessage}
      hasExpressCheckout={hasExpressCheckout}
      onHasExpressCheckout={setHasExpressCheckout}
      onSubmit={handleSubmit}
      onExpressConfirm={handleExpressConfirm}
    />
  );
}

// ---------------------------------------------------------------------------
// B — Checkout Sessions form (new API: useCheckoutElements + checkout.confirm)
// ---------------------------------------------------------------------------

function CheckoutSessionForm({
  session,
  merchantName,
  sessionSecondsLeft,
  successReturnPath,
  onPaymentComplete,
  onClose,
}: FormProps) {
  const result = useCheckoutElements();
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasExpressCheckout, setHasExpressCheckout] = useState(false);

  const checkout = result.type === "success" ? result.checkout : null;
  const isReady = result.type === "success" && Boolean(checkout);

  const finalizeSuccess = useCallback(async () => {
    try {
      await confirmStripePaymentSuccess({
        booking_id: session.bookingId,
        checkout_session_id: session.checkoutSessionId,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Payment could not be confirmed with our server.";
      toast.error("Confirmation failed", {
        description: `${message} Booking ${session.bookingNumber} — please contact support if you were charged.`,
      });
      return;
    }

    onPaymentComplete?.();
    onClose();
    const returnUrl = buildStripeReturnUrl(session, {
      path: successReturnPath,
    });
    router.push(`${returnUrl}&verified=1`);
  }, [onClose, onPaymentComplete, router, session, successReturnPath]);

  const runConfirm = useCallback(
    async (
      expressEvent?: StripeExpressCheckoutElementConfirmEvent,
    ): Promise<boolean> => {
      if (!checkout) return false;

      const returnUrl = buildStripeReturnUrl(session, {
        path: successReturnPath,
      });

      const confirmResult = await checkout.confirm({
        returnUrl,
        redirect: "if_required",
        ...(expressEvent ? { expressCheckoutConfirmEvent: expressEvent } : {}),
      });

      if (confirmResult.type === "error") {
        setErrorMessage(confirmResult.error.message);
        toast.error("Payment failed", {
          description: confirmResult.error.message,
        });
        return false;
      }

      // type === "success"
      const status = confirmResult.session.status;
      if (status.type === "complete" && status.paymentStatus === "paid") {
        await finalizeSuccess();
        return true;
      }

      if (status.type === "complete" && status.paymentStatus === "unpaid") {
        toast.info("Payment processing", {
          description:
            "Your bank is processing the payment. We'll confirm once it completes.",
        });
      }

      return false;
    },
    [checkout, finalizeSuccess, session, successReturnPath],
  );

  const handleSubmit = async () => {
    if (!checkout) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await runConfirm();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.";
      setErrorMessage(message);
      toast.error("Payment failed", { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExpressConfirm = async (
    event: StripeExpressCheckoutElementConfirmEvent,
  ) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await runConfirm(event);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.";
      setErrorMessage(message);
      toast.error("Payment failed", { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (result.type === "error") {
    return (
      <p
        role="alert"
        className="rounded-xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        {result.error.message}
      </p>
    );
  }

  return (
    <StripeFormBody
      session={session}
      merchantName={merchantName}
      sessionSecondsLeft={sessionSecondsLeft}
      isReady={isReady}
      isSubmitting={isSubmitting}
      errorMessage={errorMessage}
      hasExpressCheckout={hasExpressCheckout}
      onHasExpressCheckout={setHasExpressCheckout}
      onSubmit={handleSubmit}
      onExpressConfirm={handleExpressConfirm}
    />
  );
}

// ---------------------------------------------------------------------------
// Public modal component
// ---------------------------------------------------------------------------

interface CheckoutStripePaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: CheckoutStripePaymentSession | null;
  /** Shared countdown from BookingSummary — avoids duplicate timers. */
  sessionSecondsLeft?: number | null;
  /** Override post-payment redirect path (default: /vendor/payment/success) */
  successReturnPath?: string;
  onPaymentComplete?: () => void;
}

export default function CheckoutStripePaymentModal({
  open,
  onOpenChange,
  session,
  sessionSecondsLeft = null,
  successReturnPath,
  onPaymentComplete,
}: CheckoutStripePaymentModalProps) {
  const { settings } = useDomain();
  const merchantName = settings?.name || "EventWizz";

  const stripePromise = useMemo(() => {
    if (!session?.publishableKey) return null;
    return getStripePromise(session.publishableKey);
  }, [session?.publishableKey]);

  const isCheckoutSession = Boolean(session?.checkoutSessionId);

  // Options for Payment Intents (legacy Elements)
  const piElementsOptions = useMemo<StripeElementsOptions | null>(() => {
    if (!session?.clientSecret || isCheckoutSession) return null;
    return {
      clientSecret: session.clientSecret,
      appearance: buildStripeAppearance(),
      fonts: STRIPE_FONTS,
      loader: "auto",
    };
  }, [session?.clientSecret, isCheckoutSession]);

  // Options for Checkout Sessions
  const csElementsOptions =
    useMemo<StripeCheckoutElementsOptions | null>(() => {
      if (!session?.clientSecret || !isCheckoutSession) return null;
      return {
        appearance: buildStripeAppearance(),
        fonts: STRIPE_FONTS,
        loader: "auto",
      };
    }, [session?.clientSecret, isCheckoutSession]);

  const canRender = Boolean(session && stripePromise);

  // Keep provider mounted while a session exists (single Elements instance)
  if (!session) return null;

  const formProps: FormProps = {
    session,
    merchantName,
    sessionSecondsLeft,
    successReturnPath,
    onPaymentComplete,
    onClose: () => onOpenChange(false),
  };

  return (
    <Dialog open={open} modal onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "checkout-stripe-modal gap-0 overflow-hidden border border-[color:var(--checkout-border)] p-0 shadow-2xl sm:max-w-[440px]",
          "max-h-[min(94vh,780px)] overflow-y-auto",
          "[&>[data-slot=dialog-close]]:top-3.5 [&>[data-slot=dialog-close]]:right-3.5",
          "[&>[data-slot=dialog-close]]:rounded-full [&>[data-slot=dialog-close]]:bg-white/90",
          "[&>[data-slot=dialog-close]]:shadow-sm [&>[data-slot=dialog-close]]:ring-1",
          "[&>[data-slot=dialog-close]]:ring-black/5 [&>[data-slot=dialog-close]]:opacity-100",
        )}
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <div className="border-b border-emerald-600/10 bg-emerald-50 px-5 py-3 pr-12">
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-800">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
            Secure payment · Encrypted checkout
          </div>
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          <DialogHeader className="space-y-1 text-center sm:text-center">
            <DialogTitle className="text-lg font-bold tracking-tight">
              Complete your payment
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              Select a payment method below to confirm your booking.
            </DialogDescription>
          </DialogHeader>

          {!canRender ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-[color:var(--checkout-muted-foreground)]" />
              <p className="text-sm text-[color:var(--checkout-muted-foreground)]">
                Preparing secure checkout...
              </p>
            </div>
          ) : isCheckoutSession ? (
            // ─── Checkout Sessions API (new) ────────────────────────────────
            <CheckoutElementsProvider
              key={session.checkoutSessionId}
              stripe={stripePromise}
              options={{
                clientSecret: session.clientSecret,
                elementsOptions: csElementsOptions ?? undefined,
              }}
            >
              <CheckoutSessionForm {...formProps} />
            </CheckoutElementsProvider>
          ) : (
            // ─── Payment Intents API (legacy) ───────────────────────────────
            <Elements
              key={session.paymentIntentId}
              stripe={stripePromise}
              options={piElementsOptions!}
            >
              <PaymentIntentForm {...formProps} />
            </Elements>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
