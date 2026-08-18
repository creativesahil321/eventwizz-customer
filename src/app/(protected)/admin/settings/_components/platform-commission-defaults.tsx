"use client";

import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { adminPaymentCommissionService } from "@/services/admin/payment-commission/payment-commission.service";
import { cn } from "@/lib/utils";
import { SettingsSectionCard } from "./settings-section-card";

const QUERY_KEY = ["admin", "payment-settings", "commission"] as const;

function parseOptionalNumber(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * Default platform commission is percentage-only; flat is always 0 on save (API compatibility).
 */
export function PlatformCommissionDefaults() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await adminPaymentCommissionService.get();
      return res.data;
    },
  });

  const [pctStr, setPctStr] = useState("");

  useEffect(() => {
    if (query.data == null) return;
    setPctStr(String(query.data.default_commission_percentage ?? ""));
  }, [query.data]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const pct = parseOptionalNumber(pctStr);
      if (pct == null) {
        return Promise.reject(new Error("Enter a percentage between 0 and 100."));
      }
      if (pct < 0 || pct > 100) {
        return Promise.reject(new Error("Percentage must be between 0 and 100."));
      }
      return adminPaymentCommissionService.update({
        default_commission_percentage: pct,
        default_commission_flat_fee: 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  useEffect(() => {
    saveMutation.reset();
  }, [pctStr]);

  const validationHint = (() => {
    const raw = pctStr.trim();
    if (raw === "") return null;
    const pct = parseOptionalNumber(pctStr);
    if (pct == null) return "Enter a valid number.";
    if (pct < 0 || pct > 100) return "Percentage must be between 0 and 100.";
    return null;
  })();

  const mutationMessage =
    saveMutation.isError && saveMutation.error instanceof Error
      ? saveMutation.error.message
      : null;

  const errorMessage = validationHint ?? mutationMessage;
  const isInitialLoading = query.isLoading && query.fetchStatus !== "idle";

  return (
    <SettingsSectionCard
      title="Payment Settings"
      description="Configure the default platform commission applied when a venue has not set a custom rate."
    >
      <div className="max-w-md space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            Default platform commission
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Applied when a venue has not enabled custom commission on its
            detail page. Use a value from 0 to 100.
          </p>
        </div>

        {isInitialLoading ? (
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-[5.75rem] space-y-1.5">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-9 w-full" />
            </div>
            <Skeleton className="h-9 w-[5.25rem]" />
          </div>
        ) : (
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-[5.75rem] space-y-1.5">
              <Label
                htmlFor="default-commission-pct"
                className="text-xs font-medium text-foreground"
              >
                Fee (%)
              </Label>
              <Input
                id="default-commission-pct"
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step="0.01"
                placeholder="e.g. 10"
                aria-invalid={errorMessage != null}
                className={cn(
                  "h-9 tabular-nums",
                  errorMessage != null &&
                    "border-destructive focus-visible:ring-destructive/30",
                )}
                value={pctStr}
                onChange={(e) => setPctStr(e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="event-primary"
              size="sm"
              className="h-9 min-w-[5.25rem] shrink-0"
              disabled={saveMutation.isPending || Boolean(validationHint)}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        )}

        {query.isError ? (
          <p
            className="rounded-md border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs leading-snug text-amber-900"
            role="status"
          >
            Could not load the saved value. You can still enter a percentage
            and save when the API is available.
          </p>
        ) : null}
        {errorMessage ? (
          <p
            className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}
      </div>
    </SettingsSectionCard>
  );
}
