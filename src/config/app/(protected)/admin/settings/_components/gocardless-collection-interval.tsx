"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { adminPaymentCommissionService } from "@/services/admin/payment-commission/payment-commission.service";
import {
  DEFAULT_GOCARDLESS_COLLECTION_INTERVAL_DAYS,
  MAX_GOCARDLESS_COLLECTION_INTERVAL_DAYS,
  MIN_GOCARDLESS_COLLECTION_INTERVAL_DAYS,
} from "@/services/admin/payment-commission/types";
import { cn } from "@/lib/utils";

const QUERY_KEY = [
  "admin",
  "payment-settings",
  "gocardless-collection-interval",
] as const;

function parseIntervalDays(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  return Number.isInteger(n) ? n : null;
}

function readSavedDays(data: unknown): number {
  if (!data || typeof data !== "object") {
    return DEFAULT_GOCARDLESS_COLLECTION_INTERVAL_DAYS;
  }
  const rec = data as Record<string, unknown>;
  const raw =
    rec.gocardless_collection_interval_days ?? rec.collection_interval_days;
  const n = Number(raw);
  if (Number.isInteger(n) && n >= MIN_GOCARDLESS_COLLECTION_INTERVAL_DAYS) {
    return n;
  }
  return DEFAULT_GOCARDLESS_COLLECTION_INTERVAL_DAYS;
}

/**
 * Platform-only: how often EventWizz auto-debits commission via GoCardless.
 * Not shown on vendor Payment Settings.
 */
export function GocardlessCollectionInterval() {
  const queryClient = useQueryClient();
  const [daysStr, setDaysStr] = useState(
    String(DEFAULT_GOCARDLESS_COLLECTION_INTERVAL_DAYS),
  );

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res =
        await adminPaymentCommissionService.getGocardlessCollectionInterval();
      return res.data;
    },
  });

  useEffect(() => {
    if (query.data == null) return;
    setDaysStr(String(readSavedDays(query.data)));
  }, [query.data]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const days = parseIntervalDays(daysStr);
      if (days == null) {
        return Promise.reject(
          new Error(
            `Enter a whole number of days from ${MIN_GOCARDLESS_COLLECTION_INTERVAL_DAYS} to ${MAX_GOCARDLESS_COLLECTION_INTERVAL_DAYS}.`,
          ),
        );
      }
      if (
        days < MIN_GOCARDLESS_COLLECTION_INTERVAL_DAYS ||
        days > MAX_GOCARDLESS_COLLECTION_INTERVAL_DAYS
      ) {
        return Promise.reject(
          new Error(
            `Interval must be between ${MIN_GOCARDLESS_COLLECTION_INTERVAL_DAYS} and ${MAX_GOCARDLESS_COLLECTION_INTERVAL_DAYS} days.`,
          ),
        );
      }
      return adminPaymentCommissionService.updateGocardlessCollectionInterval({
        gocardless_collection_interval_days: days,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  useEffect(() => {
    saveMutation.reset();
  }, [daysStr]);

  const validationHint = (() => {
    const raw = daysStr.trim();
    if (raw === "") return null;
    const days = parseIntervalDays(daysStr);
    if (days == null) return "Enter a whole number of days.";
    if (
      days < MIN_GOCARDLESS_COLLECTION_INTERVAL_DAYS ||
      days > MAX_GOCARDLESS_COLLECTION_INTERVAL_DAYS
    ) {
      return `Must be between ${MIN_GOCARDLESS_COLLECTION_INTERVAL_DAYS} and ${MAX_GOCARDLESS_COLLECTION_INTERVAL_DAYS} days.`;
    }
    return null;
  })();

  const mutationMessage =
    saveMutation.isError && saveMutation.error instanceof Error
      ? saveMutation.error.message
      : null;

  const errorMessage = validationHint ?? mutationMessage;
  const isInitialLoading = query.isLoading && query.fetchStatus !== "idle";

  return (
    <div className="max-w-md space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">
          GoCardless collection interval
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          How often EventWizz automatically collects platform commission from
          each venue’s GoCardless account. Default is{" "}
          {DEFAULT_GOCARDLESS_COLLECTION_INTERVAL_DAYS} days. Venues cannot
          change this.
        </p>
      </div>

      {isInitialLoading ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-[7.5rem] space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
          <Skeleton className="h-9 w-[5.25rem]" />
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-[7.5rem] space-y-1.5">
            <Label
              htmlFor="gocardless-collection-interval-days"
              className="text-xs font-medium text-foreground"
            >
              Interval (days)
            </Label>
            <Input
              id="gocardless-collection-interval-days"
              type="number"
              inputMode="numeric"
              min={MIN_GOCARDLESS_COLLECTION_INTERVAL_DAYS}
              max={MAX_GOCARDLESS_COLLECTION_INTERVAL_DAYS}
              step={1}
              placeholder={String(DEFAULT_GOCARDLESS_COLLECTION_INTERVAL_DAYS)}
              aria-invalid={errorMessage != null}
              className={cn(
                "h-9 tabular-nums",
                errorMessage != null &&
                  "border-destructive focus-visible:ring-destructive/30",
              )}
              value={daysStr}
              onChange={(e) => setDaysStr(e.target.value)}
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
          Could not load the saved interval. The default of{" "}
          {DEFAULT_GOCARDLESS_COLLECTION_INTERVAL_DAYS} days is shown. You can
          still enter a value and save when the API is available.
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
  );
}