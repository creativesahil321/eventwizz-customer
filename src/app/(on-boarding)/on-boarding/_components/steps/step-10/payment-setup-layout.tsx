"use client";

import React, { useState } from "react";
import {
  Building2,
  Check,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Info,
  Loader2,
  Lock,
  ShieldCheck,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import type { PaymentGatewayCredentials } from "@/services/vendor/payment-gateway/types";
import { guidedInsetSectionSurfaceClass } from "../../guided-section-surface";
import { guidedOnboardingSkipButtonClass } from "../../guided-sticky-approval-bar";

export type CardProvider = "stripe" | "paypal";

export function maskCredential(value?: string): string {
  if (!value) return "••••••••";
  if (value.length <= 10) return `${value.slice(0, 2)}••••••••`;
  return `${value.slice(0, 6)}••••••••${value.slice(-4)}`;
}

function SectionCard({
  children,
  className,
  connected,
}: {
  children: React.ReactNode;
  className?: string;
  connected?: boolean;
}) {
  return (
    <section
      className={cn(
        guidedInsetSectionSurfaceClass(
          cn(
            "p-3.5 sm:p-4",
            connected ? "border-emerald-500/40 hover:border-emerald-500/50" : undefined,
          ),
        ),
        className,
      )}
    >
      {children}
    </section>
  );
}

function ConnectedBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-400">
      Linked
    </span>
  );
}

function OptionalBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-white/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
      Optional
    </span>
  );
}

function StripeIcon({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-lg bg-[#635BFF] text-lg font-bold text-white",
        className,
      )}
    >
      S
    </div>
  );
}

function PayPalIcon({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-lg bg-[#0070BA] text-lg font-bold text-white",
        className,
      )}
    >
      P
    </div>
  );
}

function FeatureList({
  items,
  muted,
}: {
  items: string[];
  muted?: boolean;
}) {
  return (
    <ul className="mt-3 space-y-1.5">
      {items.map((item) => (
        <li
          key={item}
          className={cn(
            "flex items-center gap-2 text-xs",
            muted ? "text-slate-500" : "text-slate-300",
          )}
        >
          <Check
            className={cn(
              "h-3.5 w-3.5 shrink-0",
              muted ? "text-slate-600" : "text-emerald-400",
            )}
          />
          {item}
        </li>
      ))}
    </ul>
  );
}

function ProviderTile({
  selected,
  locked,
  disabled,
  onClick,
  icon,
  name,
  subtitle,
  features,
}: {
  selected?: boolean;
  locked?: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  name: string;
  subtitle: string;
  features: string[];
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || locked}
      className={cn(
        "relative w-full rounded-xl border p-4 text-left transition-all",
        selected &&
          "border-[var(--color-primary,#3b82f6)] bg-[color-mix(in_srgb,var(--color-primary,#3b82f6)_12%,transparent)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-primary,#3b82f6)_35%,transparent)]",
        !selected &&
          !locked &&
          "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]",
        locked && "cursor-not-allowed border-white/5 bg-white/[0.02] opacity-50",
      )}
    >
      {locked && (
        <Lock className="absolute right-3 top-3 h-4 w-4 text-slate-500" />
      )}
      <div className="flex items-start gap-3">
        {icon}
        <div className="min-w-0">
          <p className="font-semibold text-white">{name}</p>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>
      <FeatureList items={features} muted={locked && !selected} />
    </button>
  );
}

function ConnectedRow({
  icon,
  title,
  detailLabel,
  detailValue,
  onDisconnect,
  disconnecting,
}: {
  icon: React.ReactNode;
  title: string;
  detailLabel: string;
  detailValue?: string;
  onDisconnect: () => void;
  disconnecting?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/25 bg-black/30 px-4 py-3.5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative shrink-0">
          {icon}
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500">
            <Check className="h-2.5 w-2.5 text-white" />
          </span>
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-semibold text-white">
            {title}
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </p>
          <p className="truncate text-xs text-slate-400">
            {detailLabel}: {maskCredential(detailValue)}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onDisconnect}
        disabled={disconnecting}
        className="inline-flex shrink-0 items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-white disabled:opacity-50"
      >
        {disconnecting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <X className="h-4 w-4" />
        )}
        Remove
      </button>
    </div>
  );
}

function CredentialsConnectPanel({
  title,
  description,
  helpHref,
  helpLabel,
  keyLabel,
  keyPlaceholder,
  secretLabel,
  secretPlaceholder,
  onConnect,
  onCancel,
  connecting,
  cancelLabel = "Change provider",
  /** Stripe dashboard order: secret on top, publishable below */
  secretFirst = false,
}: {
  title: string;
  description: string;
  helpHref: string;
  helpLabel: string;
  keyLabel: string;
  keyPlaceholder: string;
  secretLabel: string;
  secretPlaceholder: string;
  onConnect: (credentials: PaymentGatewayCredentials) => void;
  onCancel: () => void;
  connecting?: boolean;
  cancelLabel?: string;
  secretFirst?: boolean;
}) {
  const [key, setKey] = useState("");
  const [secret, setSecret] = useState("");

  const canSubmit = key.trim().length > 0 && secret.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit || connecting) return;
    onConnect({ key: key.trim(), secret: secret.trim() });
  };

  const keyField = (
    <div className="space-y-1.5">
      <Label htmlFor="gateway-key" className="text-xs text-slate-300">
        {keyLabel}
      </Label>
      <Input
        id="gateway-key"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder={keyPlaceholder}
        autoComplete="off"
        disabled={connecting}
        className="h-10 border-white/15 bg-black/30 font-mono text-sm text-white placeholder:text-slate-500"
      />
    </div>
  );

  const secretField = (
    <div className="space-y-1.5">
      <Label htmlFor="gateway-secret" className="text-xs text-slate-300">
        {secretLabel}
      </Label>
      <PasswordInput
        id="gateway-secret"
        value={secret}
        onChange={(e) => setSecret(e.target.value)}
        placeholder={secretPlaceholder}
        autoComplete="off"
        disabled={connecting}
        className="h-10 border-white/15 bg-black/30 font-mono text-sm text-white placeholder:text-slate-500"
      />
    </div>
  );

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-black/25 p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-white">{title}</p>
          <p className="mt-1 text-xs text-slate-400">{description}</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="shrink-0 text-sm text-sky-400 hover:text-sky-300"
        >
          {cancelLabel}
        </button>
      </div>

      <div className="space-y-3">
        {secretFirst ? (
          <>
            {secretField}
            {keyField}
          </>
        ) : (
          <>
            {keyField}
            {secretField}
          </>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <a
          href={helpHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-400 hover:text-sky-300"
        >
          {helpLabel}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={connecting || !canSubmit}
          variant="event-primary"
          className="h-10 rounded-lg px-5"
        >
          {connecting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="mr-2 h-4 w-4" />
          )}
          {connecting ? "Checking…" : "Check and connect"}
        </Button>
      </div>
    </div>
  );
}

export type PaymentSetupLayoutProps = {
  stripeConnected: boolean;
  paypalConnected: boolean;
  stripeAccountId?: string;
  paypalAccountId?: string;
  /** Rendered inside the existing bank-transfer card. Hidden, with the divider, when omitted. */
  bankTransfer?: React.ReactNode;
  bankTransferConnected?: boolean;
  loading?: boolean;
  disconnecting?: CardProvider | null;
  onConnectStripe: (credentials: PaymentGatewayCredentials) => void;
  onConnectPayPal: (credentials: PaymentGatewayCredentials) => void;
  onDisconnectStripe: () => void;
  onDisconnectPayPal: () => void;
  onSkip: () => void;
  onFinish: () => void;
  finishDisabled?: boolean;
  /** When false, parent renders Skip / Finish (e.g. guided shell footer). */
  showFooter?: boolean;
};

export function PaymentSetupLayout({
  stripeConnected,
  paypalConnected,
  stripeAccountId,
  paypalAccountId,
  bankTransfer,
  bankTransferConnected = false,
  loading = false,
  disconnecting = null,
  onConnectStripe,
  onConnectPayPal,
  onDisconnectStripe,
  onDisconnectPayPal,
  onSkip,
  onFinish,
  finishDisabled = false,
  showFooter = true,
}: PaymentSetupLayoutProps) {
  const cardConnected = stripeConnected || paypalConnected;

  const [selectedCard, setSelectedCard] = useState<CardProvider | null>(
    stripeConnected ? "stripe" : paypalConnected ? "paypal" : null,
  );

  const showCardPicker = !cardConnected;

  return (
    <div className="w-full space-y-3">
      {/* 1. Card payments */}
      <SectionCard connected={cardConnected}>
        <div className="mb-1 flex flex-wrap items-center gap-2">
          {cardConnected ? (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <Check className="h-4 w-4" />
            </span>
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-slate-300">
              <CreditCard className="h-4 w-4" />
            </span>
          )}
          <h2 className="text-base font-semibold text-white">
            1. Card payments
          </h2>
          {cardConnected && <ConnectedBadge />}
        </div>
        <p className="mb-3 text-sm text-slate-400">
          Accept Visa, Mastercard and other cards with Stripe or PayPal.
        </p>

        {stripeConnected ? (
          <ConnectedRow
            icon={<StripeIcon />}
            title="Stripe linked"
            detailLabel="Publishable key"
            detailValue={stripeAccountId}
            onDisconnect={onDisconnectStripe}
            disconnecting={disconnecting === "stripe"}
          />
        ) : paypalConnected ? (
          <ConnectedRow
            icon={<PayPalIcon />}
            title="PayPal linked"
            detailLabel="Client ID"
            detailValue={paypalAccountId}
            onDisconnect={onDisconnectPayPal}
            disconnecting={disconnecting === "paypal"}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ProviderTile
                selected={selectedCard === "stripe"}
                locked={selectedCard === "paypal"}
                disabled={loading}
                onClick={() => setSelectedCard("stripe")}
                icon={<StripeIcon />}
                name="Stripe"
                subtitle="Card payments"
                features={[
                  "Quick set-up",
                  "Automatic payouts",
                  "Visa, Mastercard and more",
                ]}
              />
              <ProviderTile
                selected={selectedCard === "paypal"}
                locked={selectedCard === "stripe"}
                disabled={loading}
                onClick={() => setSelectedCard("paypal")}
                icon={<PayPalIcon />}
                name="PayPal"
                subtitle="Card payments"
                features={[
                  "Quick set-up",
                  "Instant payouts",
                  "Trusted by millions",
                ]}
              />
            </div>

            {selectedCard === "stripe" && (
              <CredentialsConnectPanel
                title="Connect a Stripe account"
                description="Enter your Stripe API keys from the Stripe Dashboard. We check them, then store them securely."
                helpHref="https://dashboard.stripe.com/apikeys"
                helpLabel="Where do I find these keys?"
                keyLabel="Publishable key"
                keyPlaceholder="pk_live_… or pk_test_…"
                secretLabel="Secret key"
                secretPlaceholder="sk_live_… or sk_test_…"
                secretFirst
                onConnect={onConnectStripe}
                onCancel={() => setSelectedCard(null)}
                connecting={loading}
              />
            )}
            {selectedCard === "paypal" && (
              <CredentialsConnectPanel
                title="Connect a PayPal account"
                description="Enter your PayPal REST API credentials from the PayPal Developer Dashboard. We check them, then store them securely."
                helpHref="https://developer.paypal.com/dashboard/"
                helpLabel="Where do I find these details?"
                keyLabel="Client ID"
                keyPlaceholder="Your PayPal Client ID"
                secretLabel="Secret"
                secretPlaceholder="Your PayPal secret"
                onConnect={onConnectPayPal}
                onCancel={() => setSelectedCard(null)}
                connecting={loading}
              />
            )}

            {showCardPicker && (
              <div className="mt-4 flex gap-2.5 rounded-xl border border-sky-500/25 bg-sky-500/10 px-3.5 py-3 text-xs leading-relaxed text-sky-100">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
                <p>
                  You can only use one card provider at a time during set-up.
                  You can add more accounts later in Payment settings.
                </p>
              </div>
            )}
          </>
        )}
      </SectionCard>

      {bankTransfer ? (
        <>
          <div className="my-3 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              And / or
            </span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <SectionCard connected={bankTransferConnected}>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              {bankTransferConnected ? (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <Check className="h-4 w-4" />
                </span>
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-slate-300">
                  <Building2 className="h-4 w-4" />
                </span>
              )}
              <h2 className="text-base font-semibold text-white">
                2. Bank transfers
              </h2>
              <OptionalBadge />
              {bankTransferConnected ? <ConnectedBadge /> : null}
            </div>
            <p className="mb-3 text-sm text-slate-400">
              Let customers pay straight from their bank account.
            </p>
            {bankTransfer}
          </SectionCard>
        </>
      ) : null}

      {/* Footer */}
      {showFooter && (
        <div className="mt-6 flex w-full min-w-0 flex-col items-center justify-center gap-3 border-t border-white/[0.08] pt-5">
          <p className="text-center text-xs text-slate-400">
            {cardConnected || bankTransferConnected
              ? "You're ready to continue to domain."
              : "Link at least one payment account, or skip payment and continue to domain."}
          </p>
          <div className="flex w-full min-w-0 flex-row flex-wrap items-center justify-center gap-3">
            <Button
              type="button"
              variant="event-outline"
              onClick={onSkip}
              disabled={loading}
              className={guidedOnboardingSkipButtonClass}
            >
              Skip payment and continue
            </Button>
            <Button
              type="button"
              variant="event-primary"
              onClick={onFinish}
              disabled={loading || finishDisabled}
              className="shrink-0 rounded-full px-8 py-2 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Continue to domain"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
