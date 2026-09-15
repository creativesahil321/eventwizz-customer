"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, QrCode } from "lucide-react";
import { toast } from "sonner";
import { Shell } from "@/components/shell";
import { LocationScopedTitle } from "@/components/location-indicator";
import { usePermissions } from "@/hooks/usePermission";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useCheckInDoorEntry,
  useScanDoorEntry,
} from "@/services/vendor/bookings/query";
import type { DoorEntryScanData } from "@/services/vendor/bookings/type";
import { DoorQrScanner } from "./door-qr-scanner";
import { getDoorEntryError } from "../_lib/door-entry-errors";
import {
  isEventWizzDoorEntryToken,
  NOT_EVENTWIZZ_QR_MESSAGE,
} from "../_lib/door-entry-token";
import {
  formatDoorEntryDate,
  formatDoorEntryDateTime,
} from "../_lib/format-door-entry-date";

function dateRowTone(row: DoorEntryScanData["dates"][number]) {
  const status = (row.entry_status || "").toLowerCase();
  const label = row.entry_label.toLowerCase();
  if (row.can_check_in) {
    return "border-emerald-200 bg-emerald-50/70";
  }
  if (status.includes("checked") || label.includes("checked in")) {
    return "border-sky-200 bg-sky-50/70";
  }
  if (status.includes("cancel") || status.includes("refund") || label.includes("cancel") || label.includes("refund")) {
    return "border-rose-200 bg-rose-50/70";
  }
  return "border-[var(--color-border)] bg-muted/40";
}

export function DoorScanWorkspace() {
  const { permissions, isLoaded: permissionsReady } = usePermissions();
  const canUpdateBooking = permissions.includes("update-booking");
  const scanMutation = useScanDoorEntry();
  const checkInMutation = useCheckInDoorEntry();

  const [token, setToken] = useState<string | null>(null);
  const [result, setResult] = useState<DoorEntryScanData | null>(null);
  const [selectedDateId, setSelectedDateId] = useState<string>("");
  const [banner, setBanner] = useState<{
    tone: "error" | "success";
    message: string;
  } | null>(null);

  const lastTokenRef = useRef("");
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRetryTimer = () => {
    if (retryTimerRef.current != null) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  };

  const resetForNextGuest = useCallback(() => {
    clearRetryTimer();
    lastTokenRef.current = "";
    setToken(null);
    setResult(null);
    setSelectedDateId("");
    setBanner(null);
    scanMutation.reset();
    checkInMutation.reset();
  }, [checkInMutation, scanMutation]);

  useEffect(() => () => clearRetryTimer(), []);

  const applyScanResult = useCallback((data: DoorEntryScanData) => {
    setResult(data);
    const suggested = data.dates.find(
      (row) =>
        row.booking_date_id === data.suggested_booking_date_id &&
        row.can_check_in,
    );
    setSelectedDateId(suggested ? String(suggested.booking_date_id) : "");
  }, []);

  const lookupToken = useCallback(
    (raw: string) => {
      const next = raw.trim();
      if (!next) return;
      if (next === lastTokenRef.current) return;

      if (!isEventWizzDoorEntryToken(next)) {
        lastTokenRef.current = next;
        setToken(null);
        setResult(null);
        setSelectedDateId("");
        setBanner({ tone: "error", message: NOT_EVENTWIZZ_QR_MESSAGE });
        toast.error(NOT_EVENTWIZZ_QR_MESSAGE);
        retryTimerRef.current = setTimeout(() => {
          lastTokenRef.current = "";
        }, 1500);
        return;
      }

      lastTokenRef.current = next;
      setToken(next);
      setBanner(null);
      scanMutation.mutate(next, {
        onSuccess: (data) => {
          applyScanResult(data);
        },
        onError: (error) => {
          const mapped = getDoorEntryError(error);
          setResult(null);
          setSelectedDateId("");
          setBanner({ tone: "error", message: mapped.message });
          toast.error(mapped.message);
          retryTimerRef.current = setTimeout(() => {
            lastTokenRef.current = "";
          }, 1500);
        },
      });
    },
    [applyScanResult, scanMutation],
  );

  const selectedDate = useMemo(
    () =>
      result?.dates.find(
        (row) => String(row.booking_date_id) === selectedDateId,
      ) ?? null,
    [result, selectedDateId],
  );

  const canConfirm =
    canUpdateBooking &&
    Boolean(token) &&
    Boolean(selectedDate?.can_check_in) &&
    !checkInMutation.isPending &&
    !scanMutation.isPending;

  const handleCheckIn = () => {
    if (!token || !selectedDate?.can_check_in) return;
    checkInMutation.mutate(
      {
        token,
        booking_date_id: selectedDate.booking_date_id,
      },
      {
        onSuccess: (response) => {
          const message =
            response.message?.trim() ||
            "Checked in. The whole booking is admitted for that date.";
          setBanner({ tone: "success", message });
          toast.success(message);
          scanMutation.mutate(token, {
            onSuccess: (data) => applyScanResult(data),
          });
        },
        onError: (error) => {
          const mapped = getDoorEntryError(error);
          setBanner({ tone: "error", message: mapped.message });
          toast.error(mapped.message);
        },
      },
    );
  };

  const cameraEnabled = !result && !scanMutation.isPending;

  return (
    <Shell className="gap-2">
      <div className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-6 mb-4 min-w-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl title-header font-bold text-black flex items-center gap-2">
              <QrCode className="h-6 w-6" />
              <LocationScopedTitle title="Door Scan" />
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              Scan the QR on the guest invoice. Confirm check-in for one date —
              that admits the whole booking for that night. Switch venue in the
              header if you are on the door at another location.
            </p>
          </div>
          {result ? (
            <Button type="button" variant="outline" onClick={resetForNextGuest}>
              Scan next guest
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-4 sm:p-6 min-w-0">
          <h2 className="text-lg font-semibold mb-4">Scanner</h2>
          <DoorQrScanner
            enabled={cameraEnabled}
            pausedLabel={
              scanMutation.isPending
                ? "Looking up this booking…"
                : "Camera paused while you confirm this booking."
            }
            onToken={lookupToken}
          />
        </section>

        <section className="bg-white rounded-lg border border-[var(--color-border)] shadow-md p-4 sm:p-6 min-w-0">
          <h2 className="text-lg font-semibold mb-4">Booking</h2>

          {banner ? (
            <div
              role="status"
              className={cn(
                "mb-4 rounded-md border px-3 py-2 text-sm",
                banner.tone === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-destructive/40 bg-destructive/5 text-destructive",
              )}
            >
              {banner.message}
            </div>
          ) : null}

          {scanMutation.isPending && !result ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-5 w-64" />
              <div className="space-y-2 pt-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          ) : null}

          {!scanMutation.isPending && !result ? (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Photograph or paste the QR from a <strong>booking invoice</strong>
                — not a Google or random test QR.
              </p>
              <p>
                To get one: Finalize with Door entry QR = Yes, make a paid
                booking, download the invoice, then scan that code. Invoices
                printed before this deploy need to be downloaded again. Check-in
                needs the update-booking permission.
              </p>
            </div>
          ) : null}

          {result ? (
            <div className={cn("space-y-5", scanMutation.isPending && "opacity-70")}
            >
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Booking
                </p>
                <p className="text-xl font-semibold">{result.booking_number}</p>
                <p className="text-base">{result.guest_name}</p>
                <p className="text-sm text-muted-foreground">{result.event_name}</p>
                <Link
                  href={`/vendor/booking-history/${result.booking_id}`}
                  className="text-sm text-[var(--color-primary)] underline-offset-4 hover:underline"
                >
                  Open booking
                </Link>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">Event dates</p>
                <RadioGroup
                  value={selectedDateId || undefined}
                  onValueChange={setSelectedDateId}
                  className="gap-2"
                >
                  {result.dates.map((row) => {
                    const id = String(row.booking_date_id);
                    const isSuggested =
                      result.suggested_booking_date_id === row.booking_date_id;
                    return (
                      <Label
                        key={id}
                        htmlFor={`door-date-${id}`}
                        className={cn(
                          "flex items-start gap-3 rounded-lg border p-3 font-normal",
                          dateRowTone(row),
                          selectedDateId === id &&
                            row.can_check_in &&
                            "ring-2 ring-[var(--color-primary)]",
                          !row.can_check_in && "cursor-not-allowed opacity-80",
                        )}
                      >
                        <RadioGroupItem
                          id={`door-date-${id}`}
                          value={id}
                          disabled={!row.can_check_in}
                          className="mt-1"
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">
                              {formatDoorEntryDate(row.booking_date)}
                            </span>
                            {isSuggested ? (
                              <Badge variant="primary">Today</Badge>
                            ) : null}
                          </div>
                          {row.room_name ? (
                            <p className="text-sm text-muted-foreground">
                              {row.room_name}
                            </p>
                          ) : null}
                          <p className="text-sm">{row.entry_label}</p>
                          {row.checked_in_at ? (
                            <p className="text-xs text-muted-foreground">
                              Checked in {formatDoorEntryDateTime(row.checked_in_at)}
                            </p>
                          ) : null}
                        </div>
                      </Label>
                    );
                  })}
                </RadioGroup>
              </div>

              <div className="sticky bottom-0 -mx-4 sm:-mx-6 border-t border-[var(--color-border)] bg-white px-4 py-3 sm:px-6">
                {!permissionsReady ? (
                  <Skeleton className="h-12 w-full" />
                ) : canUpdateBooking ? (
                  <Button
                    type="button"
                    size="lg"
                    className="h-12 w-full"
                    disabled={!canConfirm}
                    onClick={handleCheckIn}
                  >
                    {checkInMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Confirm check-in
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    You can view this booking, but check-in needs the
                    update-booking permission.
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </Shell>
  );
}
