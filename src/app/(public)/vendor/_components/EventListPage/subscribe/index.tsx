"use client";

import { useState } from "react";
import { CheckCircle2, Info, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SiteHeading } from "@/components/public/site-heading";
import { useIsPreviewMode } from "@/contexts/preview-context";
import { usePreviewMobileLayout } from "@/hooks/use-preview-narrow-layout";
import type { HeadingEmphasis } from "@/lib/heading-emphasis";
import { cn } from "@/lib/utils";
import { PUBLIC_SECTION_PY_CLASS, PUBLIC_CHROME_CONTAINER_CLASS } from "@/lib/public-rhythm";
import { useDomain } from "@/providers/domain-provider/domain-provider";
import { useAuthStore } from "@/store/auth.store";
import { useLocationStore } from "@/store/location.store";
import {
  newsletterApiMessage,
  newsletterEmailFieldError,
  useCustomerNewsletterToggle,
  usePublicSubscribe,
  useResendNewsletterConfirmation,
  useThemeNewsletterSubscription,
  type NewsletterSubscribeResult,
  type SubscribePayload,
} from "@/services/common/newsletter";

interface SubscribeSectionProps {
  /**
   * Heading emphasis resolved by the parent (same source as the hero) so preview
   * and live stay 1:1. When omitted, `SiteHeading` falls back to theme context.
   */
  emphasis?: HeadingEmphasis;
}

export default function SubscribeSection({
  emphasis,
}: SubscribeSectionProps = {}) {
  const isPreviewMode = useIsPreviewMode();
  const isSessionChecked = useAuthStore((s) => s.isSessionChecked);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accountType = useAuthStore((s) => s.account_type);
  const { isLoggedInCustomer } = useThemeNewsletterSubscription();

  const authPending = !isPreviewMode && !isSessionChecked;
  const awaitingCustomerTheme =
    !isPreviewMode &&
    isSessionChecked &&
    isAuthenticated &&
    accountType === "customer" &&
    !isLoggedInCustomer;

  return (
    <SubscribeShell
      emphasis={emphasis}
      subtitle={
        isLoggedInCustomer
          ? "Get drops for new dates and venues — we'll use your account email, no spam."
          : "Get drops for new dates and venues — one short form, no spam."
      }
    >
      {authPending || awaitingCustomerTheme ? (
        <SubscribeCardSkeleton />
      ) : isLoggedInCustomer ? (
        <CustomerSubscribeCard />
      ) : (
        <GuestSubscribeForm />
      )}
    </SubscribeShell>
  );
}

function SubscribeShell({
  emphasis,
  subtitle,
  children,
}: {
  emphasis?: HeadingEmphasis;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("relative overflow-hidden bg-[var(--color-surface)]", PUBLIC_SECTION_PY_CLASS)}>
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,color-mix(in_srgb,var(--color-primary)_8%,transparent),transparent)]"
        aria-hidden
      />
      <div
        className={cn(
          PUBLIC_CHROME_CONTAINER_CLASS,
          "relative z-10 text-center",
        )}
      >
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--color-primary)]">
          Stay updated
        </p>
        <SiteHeading
          level={2}
          align="center"
          title="Never miss what's on"
          emphasis={emphasis}
          variant="onSurface"
          className="mb-4 !text-3xl !font-semibold tracking-tight !text-[var(--color-on-surface)] md:!text-4xl"
        />
        <p className="mx-auto mb-8 max-w-xl text-base text-[var(--color-text-dimmed)] md:mb-9 md:text-lg">
          {subtitle}
        </p>
        {children}
      </div>
    </section>
  );
}

function subscribeCardClass(narrowPreview: boolean) {
  return cn(
    "mx-auto flex max-w-4xl flex-col items-stretch justify-center gap-3 rounded-[20px] border border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] bg-[var(--color-surface)] p-5 shadow-[0_16px_40px_-28px_rgba(0,0,0,0.28)]",
    !narrowPreview && "md:flex-row md:flex-wrap md:items-center md:p-6",
  );
}

function SubscribeCardSkeleton() {
  const narrowPreview = usePreviewMobileLayout();
  return (
    <div className={subscribeCardClass(narrowPreview)}>
      <Skeleton className="h-[42px] w-full rounded-xl md:min-w-[160px] md:flex-1" />
      <Skeleton className="h-[42px] w-full rounded-xl md:min-w-[200px] md:flex-1" />
      <Skeleton className="h-[42px] w-full rounded-xl md:min-w-[160px] md:flex-1" />
      <Skeleton className="h-[42px] w-full rounded-xl md:w-32" />
    </div>
  );
}

function CustomerSubscribeCard() {
  const narrowPreview = usePreviewMobileLayout();
  const { settings } = useDomain();
  const locationId = useLocationStore((s) => s.getLocationId());
  const email = useAuthStore((s) => s.user?.email) ?? null;
  const { isSubscribed } = useThemeNewsletterSubscription();
  const toggle = useCustomerNewsletterToggle();

  const brandName = settings?.name ?? "this venue";

  return (
    <>
      <div className={subscribeCardClass(narrowPreview)}>
        <p className="min-w-0 flex-1 text-left text-sm leading-relaxed text-[var(--color-text-dimmed)] md:text-[15px]">
          {isSubscribed ? (
            <>
              You&apos;re receiving event updates from {brandName}
              {email ? (
                <>
                  {" "}
                  as{" "}
                  <span className="font-medium text-[var(--color-on-surface)]">
                    {email}
                  </span>
                </>
              ) : null}
              .
            </>
          ) : (
            <>
              Subscribe with your account
              {email ? (
                <>
                  {" "}
                  (
                  <span className="font-medium text-[var(--color-on-surface)]">
                    {email}
                  </span>
                  )
                </>
              ) : null}
              . No confirmation email needed.
            </>
          )}
        </p>
        {isSubscribed ? (
          <Button
            type="button"
            variant="outline"
            className="h-[42px] shrink-0 rounded-xl px-6 font-semibold"
            disabled={toggle.isPending}
            onClick={() => toggle.mutate("unsubscribe")}
          >
            {toggle.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Unsubscribing...
              </>
            ) : (
              "Unsubscribe"
            )}
          </Button>
        ) : (
          <Button
            type="button"
            variant="event-primary"
            className="h-[42px] shrink-0 rounded-xl px-6 font-semibold"
            disabled={toggle.isPending}
            onClick={() =>
              toggle.mutate({
                action: "subscribe",
                ...(locationId ? { location_id: locationId } : {}),
              })
            }
          >
            {toggle.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Subscribing...
              </>
            ) : (
              "Subscribe"
            )}
          </Button>
        )}
      </div>
      <p className="mx-auto mt-4 max-w-md text-center text-xs leading-relaxed text-[var(--color-text-dimmed)] sm:mt-5 sm:text-[13px]">
        No spam. Only event updates. Unsubscribe anytime.
      </p>
    </>
  );
}

function GuestSubscribeForm() {
  const isPreviewMode = useIsPreviewMode();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [checkEmail, setCheckEmail] = useState<string | null>(null);
  const [justSubscribed, setJustSubscribed] = useState<string | null>(null);
  const [inlineInfo, setInlineInfo] = useState<{
    result: Extract<
      NewsletterSubscribeResult,
      "confirmation_pending" | "already_subscribed"
    >;
    message: string;
  } | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [lastPayload, setLastPayload] = useState<SubscribePayload | null>(null);
  const narrowPreview = usePreviewMobileLayout();
  const locationId = useLocationStore((s) => s.getLocationId());
  const subscribeMutation = usePublicSubscribe();
  const resendMutation = useResendNewsletterConfirmation();

  const applyResult = (data: {
    result: NewsletterSubscribeResult;
    message: string;
  }) => {
    switch (data.result) {
      case "pending":
        setInlineInfo(null);
        setJustSubscribed(null);
        setCheckEmail(data.message);
        setFormData({ name: "", email: "", phone: "" });
        break;
      case "confirmation_pending":
      case "already_subscribed":
        setCheckEmail(null);
        setJustSubscribed(null);
        setInlineInfo({ result: data.result, message: data.message });
        break;
      case "subscribed":
        setInlineInfo(null);
        setCheckEmail(null);
        setJustSubscribed(data.message);
        setFormData({ name: "", email: "", phone: "" });
        break;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (e.target.name === "email") {
      if (emailError) setEmailError(null);
      if (inlineInfo) setInlineInfo(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPreviewMode || subscribeMutation.isPending) return;
    setEmailError(null);
    const payload: SubscribePayload = {
      email: formData.email.trim(),
      name: formData.name.trim() || undefined,
      phone: formData.phone.trim() || undefined,
      source: "landing",
      ...(locationId ? { location_id: locationId } : {}),
    };
    subscribeMutation.mutate(payload, {
      onSuccess: (data) => {
        setLastPayload(payload);
        applyResult(data);
      },
      onError: (error) => {
        const fieldError = newsletterEmailFieldError(error);
        if (fieldError) {
          setEmailError(fieldError);
          return;
        }
        toast.error(
          newsletterApiMessage(
            error,
            "Could not subscribe. Please try again.",
          ),
        );
      },
    });
  };

  const handleResend = () => {
    if (!lastPayload || resendMutation.isPending) return;
    resendMutation.mutate(lastPayload, {
      onSuccess: (data) => applyResult(data),
      onError: (error) => {
        toast.error(
          newsletterApiMessage(
            error,
            "Could not resend the confirmation email. Please try again.",
          ),
        );
      },
    });
  };

  const fieldClass =
    "h-[42px] rounded-xl border-[color:color-mix(in_srgb,var(--color-text)_14%,transparent)] bg-[var(--color-background)]/90 text-[var(--color-text)] placeholder:text-[var(--color-text-dimmed)] focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]";

  if (checkEmail) {
    return (
      <SubscribeSuccessPanel
        variant="pending"
        message={checkEmail}
        resendPending={resendMutation.isPending}
        onResend={lastPayload ? handleResend : undefined}
        onReset={() => {
          setCheckEmail(null);
          resendMutation.reset();
        }}
      />
    );
  }

  if (justSubscribed) {
    return (
      <SubscribeSuccessPanel
        variant="subscribed"
        message={justSubscribed}
        onReset={() => setJustSubscribed(null)}
      />
    );
  }

  return (
    <>
      {inlineInfo ? (
        <SubscribeInfoBanner
          result={inlineInfo.result}
          message={inlineInfo.message}
          resendPending={resendMutation.isPending}
          onResend={
            inlineInfo.result === "confirmation_pending" && lastPayload
              ? handleResend
              : undefined
          }
        />
      ) : null}
      <form
        onSubmit={handleSubmit}
        className={cn(
          "mx-auto grid max-w-4xl grid-cols-1 items-start gap-3 rounded-[20px] border border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] bg-[var(--color-surface)] p-5 shadow-[0_16px_40px_-28px_rgba(0,0,0,0.28)]",
          !narrowPreview && "md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center md:p-6",
        )}
      >
        <Input
          type="text"
          name="name"
          placeholder="Your Name"
          value={formData.name}
          onChange={handleChange}
          disabled={subscribeMutation.isPending}
          className={cn(fieldClass, "w-full min-w-0")}
        />

        <div className="min-w-0 w-full">
          <Input
            type="email"
            name="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={subscribeMutation.isPending}
            aria-invalid={emailError ? true : undefined}
            aria-describedby={emailError ? "subscribe-email-error" : undefined}
            className={cn(fieldClass, "w-full")}
          />
          {emailError ? (
            <p
              id="subscribe-email-error"
              role="alert"
              className="mt-1.5 text-left text-xs text-destructive"
            >
              {emailError}
            </p>
          ) : null}
        </div>

        <Input
          type="tel"
          name="phone"
          placeholder="Mobile Number"
          value={formData.phone}
          onChange={handleChange}
          disabled={subscribeMutation.isPending}
          className={cn(fieldClass, "w-full min-w-0")}
        />

        <Button
          type="submit"
          variant="event-primary"
          disabled={isPreviewMode || subscribeMutation.isPending}
          title={isPreviewMode ? "Preview only — subscribe is disabled" : undefined}
          className="h-[42px] shrink-0 rounded-xl px-6 font-semibold"
        >
          {subscribeMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Subscribe"
          )}
        </Button>
      </form>

      <p className="mx-auto mt-4 max-w-md text-center text-xs leading-relaxed text-[var(--color-text-dimmed)] sm:mt-5 sm:text-[13px]">
        No spam. Only event updates. Unsubscribe anytime.
      </p>
    </>
  );
}

function SubscribeInfoBanner({
  result,
  message,
  resendPending,
  onResend,
}: {
  result: Extract<
    NewsletterSubscribeResult,
    "confirmation_pending" | "already_subscribed"
  >;
  message: string;
  resendPending: boolean;
  onResend?: () => void;
}) {
  const title =
    result === "confirmation_pending"
      ? "Check your inbox"
      : "Already subscribed";

  return (
    <div
      role="status"
      className="mx-auto mb-4 flex max-w-4xl flex-col items-start gap-3 rounded-[20px] border border-sky-200 bg-sky-50 px-5 py-4 text-left sm:flex-row sm:items-center"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700">
        {result === "confirmation_pending" ? (
          <Mail className="h-5 w-5" />
        ) : (
          <Info className="h-5 w-5" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--color-on-surface)]">
          {title}
        </p>
        <p className="mt-0.5 text-sm leading-relaxed text-[var(--color-text-dimmed)]">
          {message}
        </p>
      </div>
      {onResend ? (
        <Button
          type="button"
          variant="outline"
          className="shrink-0 rounded-xl"
          disabled={resendPending}
          onClick={onResend}
        >
          {resendPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            "Resend email"
          )}
        </Button>
      ) : null}
    </div>
  );
}

function SubscribeSuccessPanel({
  variant,
  message,
  resendPending,
  onResend,
  onReset,
}: {
  variant: "pending" | "subscribed";
  message: string;
  resendPending?: boolean;
  onResend?: () => void;
  onReset: () => void;
}) {
  const isPending = variant === "pending";
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-3 rounded-[20px] border border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] bg-[var(--color-surface)] p-8 text-center shadow-[0_16px_40px_-28px_rgba(0,0,0,0.28)]">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        {isPending ? (
          <Mail className="h-7 w-7" />
        ) : (
          <CheckCircle2 className="h-7 w-7" />
        )}
      </div>
      <h3 className="text-xl font-semibold text-[var(--color-on-surface)]">
        {isPending ? "Check your email" : "You're subscribed"}
      </h3>
      <p className="max-w-md text-sm leading-relaxed text-[var(--color-text-dimmed)]">
        {message}
      </p>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
        {isPending && onResend ? (
          <Button
            variant="outline"
            className="rounded-xl"
            disabled={resendPending}
            onClick={onResend}
          >
            {resendPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Resend email"
            )}
          </Button>
        ) : null}
        <Button variant="outline" className="rounded-xl" onClick={onReset}>
          Add another email
        </Button>
      </div>
    </div>
  );
}
