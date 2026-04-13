"use client";

import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { adminPaymentCommissionService } from "@/services/admin/payment-commission/payment-commission.service";
import { cn } from "@/lib/utils";

const QUERY_KEY = ["admin", "payment-settings", "commission"] as const;

function parseOptionalNumber(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * Default platform commission is percentage-only; flat is always 0 on save (API compatibility).
 * Wrapped in a collapsed section so it is not prominent on Payment Settings.
 */
export function PlatformCommissionDefaults() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

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
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-lg border border-[var(--color-border)] bg-white shadow-sm overflow-hidden"
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center justify-between gap-2 px-4 sm:px-6 py-3 text-left text-sm border-0",
            "text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900",
            "transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          )}
        >
          <span className="font-semibold text-foreground tracking-tight">
            Additional payment configuration
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-slate-600 transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t border-slate-100 bg-white px-4 sm:px-6 pb-5 pt-4">
          {/* Narrow column: avoids a huge empty gap between copy and controls */}
          <div className="max-w-md space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Default platform commission
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Applied when a venue has not enabled custom commission on its
                detail page. Use a value from 0 to 100.
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1.5 w-[5.75rem]">
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
                  disabled={isInitialLoading}
                />
              </div>
              <Button
                type="button"
                variant="event-primary"
                size="sm"
                className="h-9 min-w-[5.25rem] shrink-0"
                disabled={
                  saveMutation.isPending || Boolean(validationHint)
                }
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </div>

            <div className="space-y-2">
              {isInitialLoading ? (
                <p className="text-xs text-muted-foreground">
                  Loading current value…
                </p>
              ) : null}
              {query.isError ? (
                <p
                  className="text-xs text-amber-900 bg-amber-50 border border-amber-200/80 rounded-md px-3 py-2 leading-snug"
                  role="status"
                >
                  Could not load the saved value. You can still enter a
                  percentage and save when the API is available.
                </p>
              ) : null}
              {errorMessage ? (
                <p
                  className="text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-md px-3 py-2"
                  role="alert"
                >
                  {errorMessage}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
