"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Info,
  Loader2,
  Plus,
  ShieldCheck,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { toast } from "sonner";
import type { PaymentGatewayAccount } from "@/services/vendor/payment-gateway/payment-gateway.service";
import type { PaymentGatewayCredentials } from "@/services/vendor/payment-gateway/types";

export type GatewayKind = "stripe" | "paypal";

export const MAX_ACCOUNTS_PER_GATEWAY = 2;
export const MAX_TOTAL_ACCOUNTS = 4;

function maskCredential(value?: string): string {
  if (!value) return "••••••••";
  if (value.length <= 10) return `${value.slice(0, 2)}••••••••`;
  return `${value.slice(0, 6)}••••••••${value.slice(-4)}`;
}

export function accountDisplayId(
  account?: PaymentGatewayAccount,
): string | undefined {
  if (!account) return undefined;
  return (
    account.account_id ||
    account.key ||
    (account.id != null ? String(account.id) : undefined)
  );
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
        "rounded-xl border bg-white p-5 shadow-sm sm:p-6",
        connected ? "border-emerald-300" : "border-[var(--color-border)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

function ConnectedBadge({ count }: { count?: number }) {
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
      {count && count > 0
        ? `${count} linked`
        : "Linked"}
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

function AccountRow({
  icon,
  title,
  detailLabel,
  detailValue,
  isDefault = false,
  onMakeDefault,
  makingDefault,
  onDisconnect,
  disconnecting,
  canRemove = true,
}: {
  icon: React.ReactNode;
  title: string;
  detailLabel: string;
  detailValue?: string;
  isDefault?: boolean;
  onMakeDefault?: () => void;
  makingDefault?: boolean;
  onDisconnect: () => void;
  disconnecting?: boolean;
  /** False when this is the last linked account (must keep at least one). */
  canRemove?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3.5",
        isDefault
          ? "border-emerald-200 bg-emerald-50/50"
          : "border-slate-200 bg-slate-50/60",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative shrink-0">
          {icon}
          {isDefault ? (
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500">
              <Check className="h-2.5 w-2.5 text-white" />
            </span>
          ) : null}
        </div>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-1.5 font-semibold text-slate-900">
            {title}
            {isDefault ? (
              <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                In use
              </span>
            ) : (
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                Not in use
              </span>
            )}
          </p>
          <p className="truncate text-xs text-slate-500">
            {detailLabel}: {maskCredential(detailValue)}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {!isDefault && onMakeDefault ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onMakeDefault}
            disabled={makingDefault || disconnecting}
            className="h-8 border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
          >
            {makingDefault ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : null}
            Set as default
          </Button>
        ) : null}
        {canRemove ? (
          <button
            type="button"
            onClick={onDisconnect}
            disabled={disconnecting || makingDefault}
            className="inline-flex shrink-0 items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900 disabled:opacity-50"
          >
            {disconnecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
            Remove
          </button>
        ) : null}
      </div>
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
  secretFirst?: boolean;
}) {
  const [key, setKey] = useState("");
  const [secret, setSecret] = useState("");
  const canSubmit = key.trim().length > 0 && secret.trim().length > 0;

  const keyField = (
    <div className="space-y-1.5">
      <Label className="text-xs text-slate-600">{keyLabel}</Label>
      <Input
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder={keyPlaceholder}
        autoComplete="off"
        disabled={connecting}
        className="h-10 font-mono text-sm"
      />
    </div>
  );

  const secretField = (
    <div className="space-y-1.5">
      <Label className="text-xs text-slate-600">{secretLabel}</Label>
      <PasswordInput
        value={secret}
        onChange={(e) => setSecret(e.target.value)}
        placeholder={secretPlaceholder}
        autoComplete="off"
        disabled={connecting}
        className="h-10 font-mono text-sm"
      />
    </div>
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="shrink-0 text-sm text-sky-600 hover:text-sky-700"
        >
          Cancel
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
          className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-600 hover:text-sky-700"
        >
          {helpLabel}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <Button
          type="button"
          variant="event-primary"
          onClick={() =>
            canSubmit && onConnect({ key: key.trim(), secret: secret.trim() })
          }
          disabled={connecting || !canSubmit}
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

function AddAccountButton({
  icon,
  label,
  hint,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-4 py-3.5 text-left transition-colors hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {icon}
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 font-medium text-slate-900">
          <Plus className="h-4 w-4" />
          {label}
        </p>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>
    </button>
  );
}

function GatewayBlock({
  title,
  subtitle,
  icon,
  accounts,
  detailLabel,
  canAdd,
  totalAccounts,
  connecting,
  enablingAccountId,
  disconnectingAccountId,
  onAdd,
  showForm,
  onMakeDefault,
  onDisconnect,
  connectPanel,
  extraPerAccount,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accounts: PaymentGatewayAccount[];
  detailLabel: string;
  canAdd: boolean;
  totalAccounts: number;
  connecting?: boolean;
  enablingAccountId?: number | null;
  disconnectingAccountId?: number | null;
  onAdd: () => void;
  showForm: boolean;
  onMakeDefault: (accountId: number) => void;
  onDisconnect: (accountId: number) => void;
  connectPanel: React.ReactNode;
  extraPerAccount?: (account: PaymentGatewayAccount) => React.ReactNode;
}) {
  const atGatewayLimit = accounts.length >= MAX_ACCOUNTS_PER_GATEWAY;
  const atTotalLimit = totalAccounts >= MAX_TOTAL_ACCOUNTS;
  const allowAdd = canAdd && !atGatewayLimit && !atTotalLimit;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          {icon}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-slate-900">{title}</h3>
              {accounts.length > 0 ? (
                <ConnectedBadge count={accounts.length} />
              ) : null}
            </div>
            <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>
        <span className="text-[11px] font-medium text-slate-400">
          {accounts.length} of {MAX_ACCOUNTS_PER_GATEWAY}
        </span>
      </div>

      {accounts.map((account, index) => (
        <div key={account.id} className="space-y-2">
          <AccountRow
            icon={icon}
            title={`${title} account ${index + 1}`}
            detailLabel={detailLabel}
            detailValue={accountDisplayId(account)}
            isDefault={account.is_enabled === true}
            onMakeDefault={() => onMakeDefault(account.id)}
            makingDefault={enablingAccountId === account.id}
            onDisconnect={() => onDisconnect(account.id)}
            disconnecting={disconnectingAccountId === account.id}
            canRemove={totalAccounts > 1}
          />
          {extraPerAccount?.(account)}
        </div>
      ))}

      {showForm ? (
        connectPanel
      ) : allowAdd ? (
        <AddAccountButton
          icon={icon}
          label={
            accounts.length === 0
              ? `Connect a ${title} account`
              : `Add another ${title} account`
          }
          hint={`${accounts.length} of ${MAX_ACCOUNTS_PER_GATEWAY} accounts linked`}
          disabled={connecting}
          onClick={onAdd}
        />
      ) : atGatewayLimit ? (
        <p className="text-xs text-slate-400">
          You already have the maximum of {MAX_ACCOUNTS_PER_GATEWAY} {title}{" "}
          accounts.
        </p>
      ) : atTotalLimit ? (
        <p className="text-xs text-slate-400">
          You already have the maximum of {MAX_TOTAL_ACCOUNTS} payment accounts.
        </p>
      ) : null}
    </div>
  );
}

export type PaymentSettingsSetupLayoutProps = {
  stripeAccounts: PaymentGatewayAccount[];
  paypalAccounts: PaymentGatewayAccount[];
  canAddStripe?: boolean;
  canAddPayPal?: boolean;
  loading?: boolean;
  connectingGateway?: GatewayKind | null;
  enablingAccountId?: number | null;
  disconnectingAccountId?: number | null;
  onConnectStripe: (credentials: PaymentGatewayCredentials) => void;
  onConnectPayPal: (credentials: PaymentGatewayCredentials) => void;
  onMakeDefault: (accountId: number) => void;
  onDisconnect: (accountId: number) => void;
};

export function PaymentSettingsSetupLayout({
  stripeAccounts,
  paypalAccounts,
  canAddStripe = false,
  canAddPayPal = false,
  loading = false,
  connectingGateway = null,
  enablingAccountId = null,
  disconnectingAccountId = null,
  onConnectStripe,
  onConnectPayPal,
  onMakeDefault,
  onDisconnect,
}: PaymentSettingsSetupLayoutProps) {
  const totalAccounts = useMemo(
    () => stripeAccounts.length + paypalAccounts.length,
    [paypalAccounts.length, stripeAccounts.length],
  );

  const cardConnected =
    stripeAccounts.length > 0 || paypalAccounts.length > 0;

  const [adding, setAdding] = useState<GatewayKind | null>(null);
  const prevConnecting = useRef(connectingGateway);

  useEffect(() => {
    if (prevConnecting.current && !connectingGateway) {
      setAdding(null);
    }
    prevConnecting.current = connectingGateway;
  }, [connectingGateway]);

  return (
    <div className="w-full space-y-4">
      <div className="flex gap-2.5 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-3 text-xs leading-relaxed text-sky-900 sm:text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
        <p>
          At least one linked account is required. You can add up to{" "}
          {MAX_ACCOUNTS_PER_GATEWAY} accounts per provider (
          {MAX_TOTAL_ACCOUNTS} in total) and set a default for checkout.
        </p>
      </div>

      {totalAccounts === 0 ? (
        <div className="flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-relaxed text-amber-900 sm:text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p>
            No accounts linked yet. Connect Stripe or PayPal below to accept
            payments.
          </p>
        </div>
      ) : null}

      <SectionCard connected={cardConnected}>
        <div className="mb-1 flex flex-wrap items-center gap-2">
          {cardConnected ? (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="h-4 w-4" />
            </span>
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <CreditCard className="h-4 w-4" />
            </span>
          )}
          <h2 className="text-base font-semibold text-slate-900">
            1. Card payments
          </h2>
          {cardConnected ? (
            <ConnectedBadge
              count={stripeAccounts.length + paypalAccounts.length}
            />
          ) : null}
        </div>
        <p className="mb-5 text-sm text-slate-500">
          Accept Visa, Mastercard and other cards with Stripe and/or PayPal. Up
          to {MAX_ACCOUNTS_PER_GATEWAY} accounts each.
        </p>

        <div className="space-y-6">
          <GatewayBlock
            title="Stripe"
            subtitle="Card payments"
            icon={<StripeIcon />}
            accounts={stripeAccounts}
            detailLabel="Publishable key"
            canAdd={canAddStripe}
            totalAccounts={totalAccounts}
            connecting={connectingGateway === "stripe"}
            enablingAccountId={enablingAccountId}
            disconnectingAccountId={disconnectingAccountId}
            showForm={adding === "stripe"}
            onAdd={() => setAdding("stripe")}
            onMakeDefault={onMakeDefault}
            onDisconnect={onDisconnect}
            connectPanel={
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
                connecting={connectingGateway === "stripe"}
                onCancel={() => setAdding(null)}
                onConnect={onConnectStripe}
              />
            }
          />

          <div className="h-px bg-slate-100" />

          <GatewayBlock
            title="PayPal"
            subtitle="Card payments"
            icon={<PayPalIcon />}
            accounts={paypalAccounts}
            detailLabel="Client ID"
            canAdd={canAddPayPal}
            totalAccounts={totalAccounts}
            connecting={connectingGateway === "paypal"}
            enablingAccountId={enablingAccountId}
            disconnectingAccountId={disconnectingAccountId}
            showForm={adding === "paypal"}
            onAdd={() => setAdding("paypal")}
            onMakeDefault={onMakeDefault}
            onDisconnect={onDisconnect}
            connectPanel={
              <CredentialsConnectPanel
                title="Connect a PayPal account"
                description="Enter your PayPal REST API credentials from the PayPal Developer Dashboard. We check them, then store them securely."
                helpHref="https://developer.paypal.com/dashboard/"
                helpLabel="Where do I find these details?"
                keyLabel="Client ID"
                keyPlaceholder="Your PayPal Client ID"
                secretLabel="Secret"
                secretPlaceholder="Your PayPal secret"
                connecting={connectingGateway === "paypal"}
                onCancel={() => setAdding(null)}
                onConnect={onConnectPayPal}
              />
            }
          />
        </div>
      </SectionCard>


      <p className="text-center text-xs text-slate-400">
        {totalAccounts} of {MAX_TOTAL_ACCOUNTS} accounts linked
        {loading || connectingGateway ? " · Updating…" : ""}
      </p>
    </div>
  );
}
