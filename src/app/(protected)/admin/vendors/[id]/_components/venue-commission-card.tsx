"use client";

import React, { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { adminVenuesService } from "@/services/admin/venues/venues.service";
import { cn } from "@/lib/utils";
import { useCurrencyFormat } from "@/hooks/use-currency-format";
import type { VenueCommissionSettings } from "../_lib/types";

type CommissionMode = "none" | "percentage" | "flat";

const PCT_MIN = 1;
const PCT_MAX = 20;
const FLAT_MIN = 1;
const FLAT_MAX = 20;

interface VenueCommissionCardProps {
  venue: { id: number; commissionSettings: VenueCommissionSettings };
}

function parseOptionalNumber(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Single active fee type; legacy data with both set defaults to percentage. */
function modeFromSettings(c: VenueCommissionSettings): CommissionMode {
  if (!c.useCustomCommission) {
    return "none";
  }
  const pctVal = c.commissionPercentage ?? 0;
  const flatVal = c.commissionFlatFee ?? 0;
  if (pctVal > 0 && flatVal > 0) {
    return "percentage";
  }
  if (pctVal > 0) {
    return "percentage";
  }
  if (flatVal > 0) {
    return "flat";
  }
  return "none";
}

const CUSTOM_FEE_ROWS: {
  mode: "percentage" | "flat";
  title: string;
  getDescription: (formatFlatRange: string) => string;
}[] = [
  {
    mode: "percentage",
    title: "Percentage fee",
    getDescription: () =>
      `Charge ${PCT_MIN}%–${PCT_MAX}% of each payment as platform fee.`,
  },
  {
    mode: "flat",
    title: "Flat fee",
    getDescription: (formatFlatRange) =>
      `Charge a fixed ${formatFlatRange} per booking payment.`,
  },
];

function pctFieldMessage(pctStr: string): string | null {
  const raw = pctStr.trim();
  if (raw === "") return null;
  const pct = parseOptionalNumber(pctStr);
  if (pct == null) {
    return `Enter a valid percentage (${PCT_MIN}–${PCT_MAX}%).`;
  }
  if (pct < PCT_MIN || pct > PCT_MAX) {
    return `Percentage must be between ${PCT_MIN} and ${PCT_MAX}%.`;
  }
  return null;
}

function flatFieldMessage(
  flatStr: string,
  formatFlatRange: string,
): string | null {
  const raw = flatStr.trim();
  if (raw === "") return null;
  const flat = parseOptionalNumber(flatStr);
  if (flat == null) {
    return `Enter a valid amount (${formatFlatRange}).`;
  }
  if (flat < FLAT_MIN || flat > FLAT_MAX) {
    return `Flat fee must be between ${formatFlatRange}.`;
  }
  return null;
}

export function VenueCommissionCard({ venue }: VenueCommissionCardProps) {
  const queryClient = useQueryClient();
  const { format, symbol } = useCurrencyFormat();
  const formatFlatRange = `${format(FLAT_MIN)}–${format(FLAT_MAX)}`;
  const c = venue.commissionSettings;
  const groupLabelId = `venue-commission-options-${venue.id}`;
  const switchId = `venue-commission-custom-toggle-${venue.id}`;

  const [customEnabled, setCustomEnabled] = useState(
    () => c.useCustomCommission,
  );
  const [mode, setMode] = useState<CommissionMode>(() => modeFromSettings(c));
  const [pctStr, setPctStr] = useState(() =>
    c.commissionPercentage != null ? String(c.commissionPercentage) : "",
  );
  const [flatStr, setFlatStr] = useState(() =>
    c.commissionFlatFee != null ? String(c.commissionFlatFee) : "",
  );
  const [pctBlurred, setPctBlurred] = useState(false);
  const [flatBlurred, setFlatBlurred] = useState(false);

  useEffect(() => {
    setCustomEnabled(venue.commissionSettings.useCustomCommission);
    setMode(modeFromSettings(venue.commissionSettings));
    setPctStr(
      venue.commissionSettings.commissionPercentage != null
        ? String(venue.commissionSettings.commissionPercentage)
        : "",
    );
    setFlatStr(
      venue.commissionSettings.commissionFlatFee != null
        ? String(venue.commissionSettings.commissionFlatFee)
        : "",
    );
    setPctBlurred(false);
    setFlatBlurred(false);
  }, [
    venue.commissionSettings.useCustomCommission,
    venue.commissionSettings.commissionPercentage,
    venue.commissionSettings.commissionFlatFee,
  ]);

  useEffect(() => {
    if (customEnabled && mode === "none") {
      setMode("percentage");
    }
  }, [customEnabled, mode]);

  useEffect(() => {
    setPctBlurred(false);
    setFlatBlurred(false);
  }, [mode]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!customEnabled) {
        return adminVenuesService.updateVenue(venue.id, {
          use_custom_commission: false,
        });
      }

      if (mode === "percentage") {
        const pct = parseOptionalNumber(pctStr);
        if (pct == null) {
          return Promise.reject(
            new Error(
              `Percentage must be between ${PCT_MIN} and ${PCT_MAX}%.`,
            ),
          );
        }
        if (pct < PCT_MIN || pct > PCT_MAX) {
          return Promise.reject(
            new Error(
              `Percentage must be between ${PCT_MIN} and ${PCT_MAX}%.`,
            ),
          );
        }
        return adminVenuesService.updateVenueCommission(venue.id, {
          venue_commission_mode: "percentage",
          venue_commission_value: pct,
        });
      }

      if (mode === "flat") {
        const flat = parseOptionalNumber(flatStr);
        if (flat == null) {
          return Promise.reject(
            new Error(`Flat fee must be between ${formatFlatRange}.`),
          );
        }
        if (flat < FLAT_MIN || flat > FLAT_MAX) {
          return Promise.reject(
            new Error(`Flat fee must be between ${formatFlatRange}.`),
          );
        }
        return adminVenuesService.updateVenueCommission(venue.id, {
          venue_commission_mode: "flat",
          venue_commission_value: flat,
        });
      }

      return Promise.reject(new Error("Choose percentage or flat fee."));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "venue", String(venue.id)],
      });
    },
  });

  useEffect(() => {
    saveMutation.reset();
  }, [customEnabled, mode, pctStr, flatStr]);

  const activeMode: "percentage" | "flat" =
    mode === "flat" ? "flat" : "percentage";

  const blockingReason = (() => {
    if (!customEnabled) return false;
    if (activeMode === "percentage") {
      const pct = parseOptionalNumber(pctStr);
      if (pct == null || pct < PCT_MIN || pct > PCT_MAX) {
        return true;
      }
    }
    if (activeMode === "flat") {
      const flat = parseOptionalNumber(flatStr);
      if (flat == null || flat < FLAT_MIN || flat > FLAT_MAX) {
        return true;
      }
    }
    return false;
  })();

  const pctErrorShown: string | null =
    customEnabled && activeMode === "percentage"
      ? pctFieldMessage(pctStr) ??
        (pctBlurred && pctStr.trim() === ""
          ? `Enter a percentage between ${PCT_MIN} and ${PCT_MAX}%.`
          : null)
      : null;

  const flatErrorShown: string | null =
    customEnabled && activeMode === "flat"
      ? flatFieldMessage(flatStr, formatFlatRange) ??
        (flatBlurred && flatStr.trim() === ""
          ? `Enter a flat fee between ${formatFlatRange}.`
          : null)
      : null;

  const fieldErrorMessage =
    customEnabled && activeMode === "percentage"
      ? pctErrorShown
      : customEnabled && activeMode === "flat"
        ? flatErrorShown
        : null;

  const alreadyUsingPlatformDefault =
    !customEnabled && !c.useCustomCommission;
  const saveDisabled =
    saveMutation.isPending ||
    (customEnabled && blockingReason) ||
    alreadyUsingPlatformDefault;

  const mutationMessage =
    saveMutation.isError && saveMutation.error instanceof Error
      ? saveMutation.error.message
      : null;

  return (
    <Card className="bg-white border-[var(--color-border)] shadow-sm overflow-hidden gap-0 py-0">
      <CardHeader className="space-y-0 px-6 pt-6 pb-4 border-b border-slate-100">
        <CardTitle className="text-base title-header font-semibold text-foreground">
          Venue commission
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          Leave unset to use the default from Payment Settings, or choose a
          custom fee for Stripe Connect at checkout.
        </p>
      </CardHeader>
      <CardContent className="space-y-5 px-6 pt-5 pb-6">
        <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5 min-w-0">
            <Label
              htmlFor={switchId}
              className="text-sm font-medium text-foreground cursor-pointer"
            >
              Custom commission for this venue
            </Label>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Turn on to set a venue-specific percentage or flat fee. When off,
              Payment Settings defaults apply.
            </p>
          </div>
          <Switch
            id={switchId}
            checked={customEnabled}
            onCheckedChange={setCustomEnabled}
            className="shrink-0 self-start sm:self-center"
            aria-label="Enable custom commission for this venue"
          />
        </div>

        {customEnabled ? (
          <>
            <fieldset className="space-y-3 border-0 p-0 m-0 min-w-0">
              <legend
                id={groupLabelId}
                className="text-sm font-medium text-foreground mb-0 block w-full"
              >
                Fee for this venue
              </legend>
              <RadioGroup
                className="flex flex-col gap-2.5 pt-0.5"
                value={activeMode}
                onValueChange={(v) => setMode(v as "percentage" | "flat")}
                aria-labelledby={groupLabelId}
              >
                {CUSTOM_FEE_ROWS.map(({ mode: rowMode, title, getDescription }) => {
                  const inputId = `venue-commission-${venue.id}-${rowMode}`;
                  const selected = activeMode === rowMode;
                  return (
                    <label
                      key={rowMode}
                      htmlFor={inputId}
                      className={cn(
                        "flex cursor-pointer gap-3 rounded-lg border p-3.5 transition-colors",
                        selected
                          ? "border-[var(--color-primary)]/45 bg-[#f8fafa] shadow-sm"
                          : "border-slate-200 bg-slate-50/50 hover:border-slate-300/80",
                      )}
                    >
                      <RadioGroupItem
                        value={rowMode}
                        id={inputId}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <span className="text-sm font-medium text-foreground leading-snug block">
                          {title}
                        </span>
                        <span className="text-xs text-muted-foreground leading-relaxed block">
                          {getDescription(formatFlatRange)}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </RadioGroup>
            </fieldset>

            <div className="rounded-lg border border-slate-200 bg-slate-50/40 px-4 py-4">
              {activeMode === "percentage" ? (
                <div className="space-y-2 max-w-[15rem]">
                  <Label
                    htmlFor={`venue-commission-pct-${venue.id}`}
                    className="text-sm font-medium text-foreground"
                  >
                    Platform fee (%)
                  </Label>
                  <Input
                    id={`venue-commission-pct-${venue.id}`}
                    type="number"
                    inputMode="decimal"
                    min={PCT_MIN}
                    max={PCT_MAX}
                    step="0.01"
                    placeholder="e.g. 10"
                    aria-invalid={fieldErrorMessage != null}
                    className={cn(
                      "h-10 tabular-nums bg-white",
                      fieldErrorMessage != null &&
                        "border-destructive focus-visible:ring-destructive/30",
                    )}
                    value={pctStr}
                    onChange={(e) => setPctStr(e.target.value)}
                    onBlur={() => setPctBlurred(true)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Allowed range: {PCT_MIN}%–{PCT_MAX}%.
                  </p>
                </div>
              ) : null}
              {activeMode === "flat" ? (
                <div className="space-y-2 max-w-[15rem]">
                  <Label
                    htmlFor={`venue-commission-flat-${venue.id}`}
                    className="text-sm font-medium text-foreground"
                  >
                    Flat amount ({symbol})
                  </Label>
                  <Input
                    id={`venue-commission-flat-${venue.id}`}
                    type="number"
                    inputMode="decimal"
                    min={FLAT_MIN}
                    max={FLAT_MAX}
                    step="0.01"
                    placeholder={formatFlatRange}
                    aria-invalid={fieldErrorMessage != null}
                    className={cn(
                      "h-10 tabular-nums bg-white",
                      fieldErrorMessage != null &&
                        "border-destructive focus-visible:ring-destructive/30",
                    )}
                    value={flatStr}
                    onChange={(e) => setFlatStr(e.target.value)}
                    onBlur={() => setFlatBlurred(true)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Allowed range: {formatFlatRange}.
                  </p>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground rounded-md border border-dashed border-slate-200 bg-slate-50/40 px-4 py-3">
            Platform default commission from Payment Settings is used for
            this venue.
          </p>
        )}

        <div className="space-y-2">
          {fieldErrorMessage ? (
            <p
              className="text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-md px-3 py-2"
              role="alert"
            >
              {fieldErrorMessage}
            </p>
          ) : null}
          {mutationMessage ? (
            <p
              className="text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-md px-3 py-2"
              role="alert"
            >
              {mutationMessage}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-0.5">
          <Button
            type="button"
            variant="event-primary"
            size="sm"
            className="w-full sm:w-auto min-w-[140px]"
            disabled={saveDisabled}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
