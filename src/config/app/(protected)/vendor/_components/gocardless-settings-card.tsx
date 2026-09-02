"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Info, Loader2 } from "lucide-react";
import { useProfileData } from "@/app/(protected)/_shared/profile/_lib";
import {
  vendorGoCardlessService,
  type GoCardlessAuthFlowResponse,
} from "@/services/vendor/gocardless/gocardless.service";
import { cn } from "@/lib/utils";

type PendingAction = "connect" | "allow" | null;

/**
 * GoCardless block on Vendor Payment Settings.
 *
 * Source: GET /api/v1/profile → data.gocardless flags.
 * Messages/button labels are hardcoded — the API does not return UI copy.
 * Connect / Allow auto-debit redirect via authorisation_url.
 * Toasts come from the API interceptor only — do not toast here.
 */
export function GoCardlessSettingsCard() {
  const queryClient = useQueryClient();
  const { data: profileResponse, isLoading } = useProfileData({}, "vendor");
  const gc = profileResponse?.data?.gocardless;
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  if (isLoading) return null;

  // Rule 1: enabled === false → hide completely
  if (!gc || gc.enabled !== true) return null;

  const connected = gc.connected === true;
  const autoDebitAllowed = gc.auto_debit_allowed === true;

  // Rules 2–4: hardcoded messages + buttons from flags only
  let message: string;
  let buttonLabel: string;
  let buttonVariant: "default" | "outline";
  let badge: string;
  let badgeClass: string;
  let action: PendingAction = null;

  if (!connected) {
    message =
      "Connect GoCardless so EventWizz can collect platform fees by Direct Debit.";
    buttonLabel = "Connect GoCardless";
    buttonVariant = "default";
    badge = "Not connected";
    badgeClass = "bg-slate-100 text-slate-700 border-slate-200";
    action = "connect";
  } else if (!autoDebitAllowed) {
    message = "GoCardless is connected, but auto-debit is not allowed yet.";
    buttonLabel = "Allow auto-debit";
    buttonVariant = "default";
    badge = "Connected";
    badgeClass = "bg-sky-100 text-sky-800 border-sky-200";
    action = "allow";
  } else {
    message = "GoCardless auto-debit is active.";
    buttonLabel = "Disconnect";
    buttonVariant = "outline";
    badge = "Auto-debit active";
    badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-200";
  }

  async function redirectFromAuthFlow(response: GoCardlessAuthFlowResponse) {
    if (!response.status || !response.data) return;

    if (response.data.already_active) {
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      return;
    }

    const url = response.data.authorisation_url?.trim();
    if (!url) return;

    window.location.href = url;
  }

  async function handleAction(next: Exclude<PendingAction, null>) {
    if (pendingAction) return;
    setPendingAction(next);

    try {
      const response =
        next === "connect"
          ? await vendorGoCardlessService.connect()
          : await vendorGoCardlessService.allowAutoDebit();
      await redirectFromAuthFlow(response);
    } catch (error) {
      console.error("GoCardless action error:", error);
    } finally {
      setPendingAction(null);
    }
  }

  const isBusy = pendingAction !== null;
  const loadingLabel =
    pendingAction === "allow" ? "Allowing…" : "Connecting…";

  return (
    <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-4 sm:p-6 min-w-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-50">
            <Building2 className="h-5 w-5 text-sky-700" />
          </div>
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-black">GoCardless</h2>
              <Badge
                variant="outline"
                className={cn("font-medium", badgeClass)}
              >
                {badge}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground flex gap-2">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-sky-600" />
              <span>{message}</span>
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant={buttonVariant}
          className="shrink-0"
          disabled={isBusy}
          onClick={action ? () => void handleAction(action) : undefined}
        >
          {isBusy && action ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {loadingLabel}
            </>
          ) : (
            buttonLabel
          )}
        </Button>
      </div>
    </div>
  );
}
