"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Info,
  Zap,
  Shield,
  Globe,
  ExternalLink,
} from "lucide-react";
import { Shell } from "@/components/shell";
import { PermissionRoute } from "@/components/permission";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────
   Dummy state for platform-level gateway connections.
   In production these would come from an admin API.
───────────────────────────────────────────────────── */

type GatewayStatus = "connected" | "disconnected" | "pending";

interface GatewayState {
  status: GatewayStatus;
  accountId?: string;
  connecting: boolean;
}

const INITIAL: Record<string, GatewayState> = {
  stripe: {
    status: "connected",
    accountId: "acct_1NxKy2LkdIwHu7ix",
    connecting: false,
  },
  truelayer: { status: "disconnected", connecting: false },
};

function StatusBadge({ status }: { status: GatewayStatus }) {
  if (status === "connected")
    return (
      <Badge className="gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">
        <CheckCircle2 className="h-3 w-3" /> Connected
      </Badge>
    );
  if (status === "pending")
    return (
      <Badge className="gap-1 bg-amber-100 text-amber-700 hover:bg-amber-100 border-0">
        <Loader2 className="h-3 w-3 animate-spin" /> Pending
      </Badge>
    );
  return (
    <Badge className="gap-1 bg-slate-100 text-slate-500 hover:bg-slate-100 border-0">
      <AlertCircle className="h-3 w-3" /> Not connected
    </Badge>
  );
}

export default function AdminPaymentSettingsPage() {
  const [gateways, setGateways] = useState(INITIAL);

  const simulate = (key: string, next: GatewayStatus, accountId?: string) => {
    setGateways((prev) => ({
      ...prev,
      [key]: { ...prev[key], connecting: true },
    }));
    setTimeout(() => {
      setGateways((prev) => ({
        ...prev,
        [key]: { status: next, accountId, connecting: false },
      }));
    }, 1500);
  };

  const stripe = gateways.stripe;
  const truelayer = gateways.truelayer;

  return (
    <PermissionRoute
      permissionKey="read-account"
      fallbackPath="/admin/dashboard"
    >
      <section className="page text-black min-w-0 pb-20 sm:pb-24">
        <Shell className="gap-4">
          <div className="flex flex-col gap-4 min-w-0">
            {/* Page header — same structure as admin Payments / vendor dashboard */}
            <header className="flex w-full items-center justify-between gap-2 overflow-auto bg-white border border-[var(--color-border)] shadow-md rounded-lg p-4 sm:p-6 mb-4 min-w-0">
              <nav className="flex flex-col justify-start items-start gap-2 relative">
                <h1 className="text-2xl mb-0 title-header font-bold text-black">
                  Payment Settings
                </h1>
                <p className="text-muted-foreground">
                  Manage platform-level payment gateways. Vendors connect to
                  your Stripe account via Stripe Connect and your TrueLayer
                  account for bank transfers. No API keys required — all
                  connections are handled through OAuth.
                </p>
              </nav>
            </header>

            {/* How it works info */}
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600 shrink-0" />
              <AlertDescription className="text-blue-900 text-sm">
                <strong>How vendor payments work:</strong> When a vendor
                connects a payment gateway on their dashboard, they connect
                directly to{" "}
                <strong>your platform Stripe Connect account</strong> or{" "}
                <strong>TrueLayer account</strong>. You set the commission
                splits and payouts are handled automatically.
              </AlertDescription>
            </Alert>

            {/* ── Stripe Connect ── */}
            <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-sm overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-slate-100">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    {/* Stripe logo */}
                    <div className="w-12 h-12 rounded-lg bg-[#635BFF]/10 flex items-center justify-center shrink-0">
                      <svg
                        className="w-7 h-7"
                        viewBox="0 0 24 24"
                        fill="#635BFF"
                      >
                        <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-semibold text-foreground">
                          Stripe Connect
                        </h2>
                        <Sparkles className="h-4 w-4 text-violet-500" />
                        <StatusBadge status={stripe.status} />
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Platform Stripe Connect account — vendors connect via
                        OAuth, no keys shared.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {stripe.status === "connected" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 text-rose-600 border-rose-200 hover:bg-rose-50"
                        disabled={stripe.connecting}
                        onClick={() => simulate("stripe", "disconnected")}
                      >
                        {stripe.connecting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <AlertCircle className="h-4 w-4" />
                        )}
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        variant="event-primary"
                        size="sm"
                        className="gap-2"
                        disabled={stripe.connecting}
                        onClick={() =>
                          simulate(
                            "stripe",
                            "connected",
                            "acct_1NxKy2LkdIwHu7ix",
                          )
                        }
                      >
                        {stripe.connecting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Zap className="h-4 w-4" />
                        )}
                        Connect Stripe
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6 space-y-4">
                {/* Account info when connected */}
                {stripe.status === "connected" && stripe.accountId && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        Platform Stripe Account
                      </p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        {stripe.accountId}
                      </p>
                    </div>
                    <a
                      href="https://dashboard.stripe.com/connect/accounts/overview"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Stripe Dashboard
                      </Button>
                    </a>
                  </div>
                )}

                {/* Features */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      icon: Zap,
                      label: "Instant payouts",
                      desc: "Funds split automatically on booking",
                    },
                    {
                      icon: Shield,
                      label: "No key sharing",
                      desc: "Vendors connect via OAuth, not API keys",
                    },
                    {
                      icon: Globe,
                      label: "Global reach",
                      desc: "200+ countries and currencies supported",
                    },
                  ].map((f) => (
                    <div
                      key={f.label}
                      className="flex items-start gap-2.5 rounded-lg border border-slate-100 p-3"
                    >
                      <div className="h-7 w-7 rounded-md bg-violet-50 flex items-center justify-center shrink-0">
                        <f.icon className="h-3.5 w-3.5 text-violet-600" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground">
                          {f.label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {f.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Commission settings note */}
                <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    Commission splits
                  </span>{" "}
                  are configured per venue on the{" "}
                  <span className="text-primary font-medium cursor-pointer hover:underline">
                    Commission Overview
                  </span>{" "}
                  page and applied automatically at checkout via Stripe
                  Connect&apos;s application fee mechanism.
                </div>
              </div>
            </div>

            {/* ── OR separator ── */}
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 border-t border-[var(--color-border)]" />
              <span className="text-xs text-muted-foreground px-1">OR</span>
              <div className="flex-1 border-t border-[var(--color-border)]" />
            </div>

            {/* ── TrueLayer ── */}
            <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-sm overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-slate-100">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 text-2xl">
                      🏦
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-semibold text-foreground">
                          TrueLayer
                        </h2>
                        <Sparkles className="h-4 w-4 text-green-500" />
                        <StatusBadge status={truelayer.status} />
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Platform-level bank-to-bank transfer account — FCA
                        regulated, instant settlement.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {truelayer.status === "connected" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 text-rose-600 border-rose-200 hover:bg-rose-50"
                        disabled={truelayer.connecting}
                        onClick={() => simulate("truelayer", "disconnected")}
                      >
                        {truelayer.connecting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <AlertCircle className="h-4 w-4" />
                        )}
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        variant="event-primary"
                        size="sm"
                        className="gap-2"
                        disabled={truelayer.connecting}
                        onClick={() =>
                          simulate("truelayer", "connected", "tl-platform-001")
                        }
                      >
                        {truelayer.connecting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Zap className="h-4 w-4" />
                        )}
                        Connect TrueLayer
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6 space-y-4">
                {truelayer.status === "connected" && truelayer.accountId && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        Platform TrueLayer Account
                      </p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        {truelayer.accountId}
                      </p>
                    </div>
                    <a
                      href="https://console.truelayer.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                      >
                        <ExternalLink className="h-3 w-3" />
                        TrueLayer Console
                      </Button>
                    </a>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      icon: Zap,
                      label: "40% lower fees",
                      desc: "No card network fees — direct bank rails",
                    },
                    {
                      icon: Shield,
                      label: "FCA regulated",
                      desc: "Authorised by Financial Conduct Authority",
                    },
                    {
                      icon: Globe,
                      label: "Instant settlement",
                      desc: "Funds land same day, not T+2",
                    },
                  ].map((f) => (
                    <div
                      key={f.label}
                      className={cn(
                        "flex items-start gap-2.5 rounded-lg border border-slate-100 p-3",
                      )}
                    >
                      <div className="h-7 w-7 rounded-md bg-emerald-50 flex items-center justify-center shrink-0">
                        <f.icon className="h-3.5 w-3.5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground">
                          {f.label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {f.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <Alert className="border-green-200 bg-green-50">
                  <Info className="h-4 w-4 text-green-700 shrink-0" />
                  <AlertDescription className="text-green-900 text-xs">
                    Vendors select TrueLayer at checkout and customers pay
                    directly from their banking app. No card details captured —
                    funds go straight to your platform account and are split to
                    the vendor automatically.
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          </div>
        </Shell>
      </section>
    </PermissionRoute>
  );
}
