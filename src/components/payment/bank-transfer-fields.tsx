"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import type { BankTransferConnectResult } from "@/services/vendor/payment-gateway/bank-transfer";

export type BankTransferSourceAccount = {
  id: number;
  label: string;
};

export type BankTransferLinkedAccount = {
  id: number;
  maskedKey?: string;
  isEnabled?: boolean;
};

type ConnectMode = "same" | "keys";

export type BankTransferFieldsProps = {
  variant: "onboarding" | "settings";
  hasOnlineAccount: boolean;
  sourceAccounts: BankTransferSourceAccount[];
  defaultSourceAccountId?: number | null;
  linkedAccounts: BankTransferLinkedAccount[];
  canAdd?: boolean;
  connecting?: boolean;
  disconnectingId?: number | null;
  enablingAccountId?: number | null;
  onConnect: (input: {
    sourceAccountId?: number;
    publishableKey?: string;
    secret?: string;
    replaceId?: number;
  }) => Promise<BankTransferConnectResult>;
  onDisconnect: (accountId: number) => void;
  onMakeDefault?: (accountId: number) => void;
};

function maskKey(value?: string): string {
  if (!value) return "••••••••";
  if (value.includes("•") || value.includes("*")) return value;
  if (value.length <= 10) return `${value.slice(0, 2)}••••••••`;
  return `${value.slice(0, 6)}••••••••${value.slice(-4)}`;
}

export function BankTransferFields({
  variant,
  hasOnlineAccount,
  sourceAccounts,
  defaultSourceAccountId,
  linkedAccounts,
  canAdd = false,
  connecting = false,
  disconnectingId = null,
  enablingAccountId = null,
  onConnect,
  onDisconnect,
  onMakeDefault,
}: BankTransferFieldsProps) {
  const dark = variant === "onboarding";
  const connected = linkedAccounts.length > 0;
  const showOptionA = sourceAccounts.length > 0;
  const atOnboardingLimit = variant === "onboarding" && connected;
  const showAdd =
    variant === "settings" ? canAdd && linkedAccounts.length < 2 : !connected;
  const showReplace =
    variant === "settings" && !canAdd && linkedAccounts.length > 0;

  const [mode, setMode] = useState<ConnectMode>(showOptionA ? "same" : "keys");
  const [sourceAccountId, setSourceAccountId] = useState<number | undefined>(
    defaultSourceAccountId ?? sourceAccounts[0]?.id,
  );
  const [publishableKey, setPublishableKey] = useState("");
  const [secret, setSecret] = useState("");
  const [replaceId, setReplaceId] = useState<number | undefined>(
    linkedAccounts.find((account) => account.isEnabled !== true)?.id ??
      linkedAccounts[0]?.id,
  );
  const [formOpen, setFormOpen] = useState(variant === "onboarding" && !connected);
  const [replacing, setReplacing] = useState(false);
  const [message, setMessage] = useState("");
  const [secretError, setSecretError] = useState<string>();
  const [sourceError, setSourceError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const optionAWasAvailable = useRef(showOptionA);

  useEffect(() => {
    if (!optionAWasAvailable.current && showOptionA) setMode("same");
    optionAWasAvailable.current = showOptionA;
  }, [showOptionA]);

  const activeSourceId = useMemo(() => {
    if (sourceAccounts.some((account) => account.id === sourceAccountId)) {
      return sourceAccountId;
    }
    return sourceAccounts[0]?.id;
  }, [sourceAccountId, sourceAccounts]);

  const clearErrors = () => {
    setMessage("");
    setSecretError(undefined);
    setSourceError(undefined);
    setFormError(undefined);
  };

  const submit = async () => {
    clearErrors();
    const usingSame = mode === "same" && showOptionA;
    const result = await onConnect({
      sourceAccountId: usingSame ? activeSourceId : undefined,
      publishableKey: usingSame ? undefined : publishableKey,
      secret: usingSame ? undefined : secret,
      replaceId: replacing ? replaceId : undefined,
    });
    if (!result.status) {
      setMessage(result.message);
      setSecretError(result.fieldErrors.secret);
      setSourceError(result.fieldErrors.sourceAccountId);
      setFormError(
        result.fieldErrors.paymentGateway || result.fieldErrors.credentials,
      );
      return;
    }
    setPublishableKey("");
    setSecret("");
    setFormOpen(false);
    setReplacing(false);
  };

  const heading = dark ? "text-white" : "text-slate-900";
  const muted = dark ? "text-slate-400" : "text-slate-500";
  const inputClass = dark
    ? "border-white/15 bg-black/30 text-white placeholder:text-slate-500"
    : undefined;

  return (
    <div className="space-y-3">
      {linkedAccounts.map((account, index) => (
        <div
          key={account.id}
          className={cn(
            "flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3.5",
            dark
              ? "border-white/10 bg-white/[0.03]"
              : account.isEnabled
                ? "border-emerald-200 bg-emerald-50/50"
                : "border-slate-200 bg-slate-50/60",
          )}
        >
          <div className="min-w-0">
            <p className={cn("font-semibold", heading)}>
              {variant === "onboarding"
                ? "Bank Transfer connected"
                : `Bank Transfer account ${index + 1}`}
              {variant === "settings" ? (
                <span
                  className={cn(
                    "ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    account.isEnabled
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 text-slate-600",
                  )}
                >
                  {account.isEnabled ? "In use" : "Not in use"}
                </span>
              ) : null}
            </p>
            <p className={cn("truncate text-xs", muted)}>
              Key: {maskKey(account.maskedKey)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {variant === "settings" &&
            account.isEnabled !== true &&
            onMakeDefault ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onMakeDefault(account.id)}
                disabled={
                  enablingAccountId === account.id ||
                  disconnectingId === account.id
                }
              >
                {enablingAccountId === account.id ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : null}
                Set as default
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onDisconnect(account.id)}
              disabled={disconnectingId === account.id || connecting}
            >
              {disconnectingId === account.id ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : null}
              {variant === "onboarding" ? "Disconnect" : "Remove"}
            </Button>
          </div>
        </div>
      ))}

      {variant === "onboarding" && connected ? (
        <p className={cn("text-xs", muted)}>
          You can add another later in Payment Settings.
        </p>
      ) : null}

      {!hasOnlineAccount && !connected ? (
        <p className={cn("text-sm", dark ? "text-slate-300" : "text-slate-600")}>
          Connect an online payment method first to add bank transfer.
        </p>
      ) : null}

      {hasOnlineAccount && !atOnboardingLimit && (showAdd || showReplace) ? (
        formOpen || replacing ? (
          <div className="space-y-4">
            {message ? (
              <p className="text-sm text-red-500" role="alert">
                {message}
              </p>
            ) : null}
            {formError ? (
              <p className="text-sm text-red-500" role="alert">
                {formError}
              </p>
            ) : null}

            {showReplace && replacing && linkedAccounts.length > 1 ? (
              <div className="space-y-2">
                <Label className={heading}>Account to replace</Label>
                <select
                  className={cn(
                    "h-10 w-full rounded-md border px-3 text-sm",
                    dark
                      ? "border-white/15 bg-black/30 text-white"
                      : "border-slate-200 bg-white text-slate-900",
                  )}
                  value={replaceId ?? ""}
                  onChange={(event) => setReplaceId(Number(event.target.value))}
                >
                  {linkedAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {maskKey(account.maskedKey)}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="space-y-3">
              {showOptionA ? (
                <label className={cn("flex items-start gap-2 text-sm", heading)}>
                  <input
                    type="radio"
                    name={`bank-transfer-mode-${variant}`}
                    className="mt-1"
                    checked={mode === "same"}
                    onChange={() => {
                      setMode("same");
                      clearErrors();
                    }}
                  />
                  <span>Use my connected online payment account</span>
                </label>
              ) : null}
              {showOptionA && mode === "same" && sourceAccounts.length > 1 ? (
                <div className="space-y-1 pl-6">
                  <select
                    className={cn(
                      "h-10 w-full rounded-md border px-3 text-sm",
                      dark
                        ? "border-white/15 bg-black/30 text-white"
                        : "border-slate-200 bg-white text-slate-900",
                    )}
                    value={activeSourceId ?? ""}
                    onChange={(event) =>
                      setSourceAccountId(Number(event.target.value))
                    }
                  >
                    {sourceAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.label}
                      </option>
                    ))}
                  </select>
                  {sourceError ? (
                    <p className="text-xs text-red-500">{sourceError}</p>
                  ) : null}
                </div>
              ) : null}
              {showOptionA &&
              mode === "same" &&
              sourceAccounts.length <= 1 &&
              sourceError ? (
                <p className="pl-6 text-xs text-red-500">{sourceError}</p>
              ) : null}

              <label className={cn("flex items-start gap-2 text-sm", heading)}>
                <input
                  type="radio"
                  name={`bank-transfer-mode-${variant}`}
                  className="mt-1"
                  checked={mode === "keys" || !showOptionA}
                  onChange={() => {
                    setMode("keys");
                    clearErrors();
                  }}
                />
                <span>Use different account keys</span>
              </label>

              {mode === "keys" || !showOptionA ? (
                <div className="grid gap-3 pl-6 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className={heading}>Publishable key</Label>
                    <Input
                      value={publishableKey}
                      onChange={(event) => setPublishableKey(event.target.value)}
                      autoComplete="off"
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className={heading}>Secret key</Label>
                    <PasswordInput
                      value={secret}
                      onChange={(event) => setSecret(event.target.value)}
                      autoComplete="off"
                      ariaPasswordField="secret key"
                      className={inputClass}
                    />
                    {secretError ? (
                      <p className="text-xs text-red-500">{secretError}</p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              {variant === "settings" ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFormOpen(false);
                    setReplacing(false);
                    clearErrors();
                  }}
                  disabled={connecting}
                >
                  Cancel
                </Button>
              ) : null}
              <Button
                type="button"
                variant="event-primary"
                onClick={() => void submit()}
                disabled={connecting}
              >
                {connecting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="mr-2 h-4 w-4" />
                )}
                {connecting
                  ? "Checking…"
                  : replacing
                    ? "Replace"
                    : "Check and connect"}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (showReplace) {
                setReplacing(true);
                setReplaceId(
                  linkedAccounts.find((account) => account.isEnabled !== true)
                    ?.id ?? linkedAccounts[0]?.id,
                );
              }
              setFormOpen(true);
              setMode(showOptionA ? "same" : "keys");
            }}
          >
            {showReplace ? "Replace" : "Add account"}
          </Button>
        )
      ) : null}
    </div>
  );
}
