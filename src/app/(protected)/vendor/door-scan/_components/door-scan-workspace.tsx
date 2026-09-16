"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Shell } from "@/components/shell";
import {
  ProtectedPageHeader,
  pageCardClassName,
} from "@/app/(protected)/_components/page-header-card";
import { usePermissions } from "@/hooks/usePermission";
import { Button } from "@/components/ui/button";
import { RadioGroup } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useCheckInDoorEntry,
  useScanDoorEntry,
} from "@/services/vendor/bookings/query";
import type { DoorEntryScanData } from "@/services/vendor/bookings/type";
import { DoorQrScanner, type DoorScanTokenSource } from "./door-qr-scanner";
import { DoorScanDateOption } from "./door-scan-date-option";
import { getDoorEntryError } from "../_lib/door-entry-errors";
import { doorScanConfirmHint } from "../_lib/door-entry-date-kind";
import {
  extractDoorEntryToken,
  isNamedVendorSite,
  notVenueInvoiceQrMessage,
} from "../_lib/door-entry-token";
import { useVendorSiteIdentity } from "../_lib/use-vendor-site-identity";
import { playDoorScanSound } from "../_lib/door-scan-sounds";

export function DoorScanWorkspace() {
  const { permissions, isLoaded: permissionsReady } = usePermissions();
  const canUpdateBooking = permissions.includes("update-booking");
  const siteName = useVendorSiteIdentity();
  const namedSite = isNamedVendorSite(siteName);
  const rejectQrMessage = notVenueInvoiceQrMessage(siteName);
  const scanMutation = useScanDoorEntry();
  const checkInMutation = useCheckInDoorEntry();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryToken =
    searchParams.get("t") || searchParams.get("token") || "";

  const [token, setToken] = useState<string | null>(null);
  const [result, setResult] = useState<DoorEntryScanData | null>(null);
  const [selectedDateId, setSelectedDateId] = useState<string>("");
  const [banner, setBanner] = useState<{
    tone: "error" | "success";
    message: string;
  } | null>(null);

  const lastTokenRef = useRef("");
  const lookupGenerationRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bookingPanelRef = useRef<HTMLElement>(null);

  const clearRetryTimer = () => {
    if (retryTimerRef.current != null) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  };

  const resetForNextGuest = useCallback(() => {
    clearRetryTimer();
    lookupGenerationRef.current += 1;
    lastTokenRef.current = "";
    setToken(null);
    setResult(null);
    setSelectedDateId("");
    setBanner(null);
    scanMutation.reset();
    checkInMutation.reset();
    if (queryToken) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("t");
      params.delete("token");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    }
  }, [
    checkInMutation,
    pathname,
    queryToken,
    router,
    scanMutation,
    searchParams,
  ]);

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

  useEffect(() => {
    if (!result?.booking_id) return;
    const timer = window.setTimeout(() => {
      bookingPanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [result?.booking_id]);

  const syncTokenQuery = useCallback(
    (nextToken: string) => {
      const current = extractDoorEntryToken(queryToken);
      if (current === nextToken) return;
      const params = new URLSearchParams(searchParams.toString());
      params.delete("token");
      params.set("t", nextToken);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, queryToken, router, searchParams],
  );

  const lookupToken = useCallback(
    (raw: string, source: DoorScanTokenSource | "url" | "refresh" = "camera") => {
      const next = raw.trim();
      if (!next) return;
      const extracted = extractDoorEntryToken(next);
      const force = source === "photo" || source === "refresh";
      if (!extracted) {
        if (!force && next === lastTokenRef.current) return;
        lookupGenerationRef.current += 1;
        lastTokenRef.current = next;
        setToken(null);
        setResult(null);
        setSelectedDateId("");
        setBanner({ tone: "error", message: rejectQrMessage });
        toast.error(rejectQrMessage);
        playDoorScanSound("error");
        retryTimerRef.current = setTimeout(() => {
          lastTokenRef.current = "";
        }, 1500);
        return;
      }

      if (!force && extracted === lastTokenRef.current) return;

      clearRetryTimer();
      lookupGenerationRef.current += 1;
      const generation = lookupGenerationRef.current;
      lastTokenRef.current = extracted;
      setToken(extracted);
      setBanner(null);
      if (source !== "refresh") {
        setResult(null);
        setSelectedDateId("");
      }
      if (source === "photo") {
        syncTokenQuery(extracted);
      }
      scanMutation.mutate(extracted, {
        onSuccess: (data) => {
          if (generation !== lookupGenerationRef.current) return;
          applyScanResult(data);
          playDoorScanSound("found");
        },
        onError: (error) => {
          if (generation !== lookupGenerationRef.current) return;
          const mapped = getDoorEntryError(error);
          setResult(null);
          setSelectedDateId("");
          setBanner({ tone: "error", message: mapped.message });
          toast.error(mapped.message);
          playDoorScanSound("error");
          retryTimerRef.current = setTimeout(() => {
            lastTokenRef.current = "";
          }, 1500);
        },
      });
    },
    [applyScanResult, rejectQrMessage, scanMutation, syncTokenQuery],
  );

  const lookupTokenRef = useRef(lookupToken);
  lookupTokenRef.current = lookupToken;

  useEffect(() => {
    if (!queryToken) return;
    lookupTokenRef.current(queryToken, "url");
  }, [queryToken]);

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
  const confirmHint = result ? doorScanConfirmHint(result.dates) : null;

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
          playDoorScanSound("success");
          lookupToken(token, "refresh");
        },
        onError: (error) => {
          const mapped = getDoorEntryError(error);
          setBanner({ tone: "error", message: mapped.message });
          toast.error(mapped.message);
          playDoorScanSound("error");
        },
      },
    );
  };

  const cameraEnabled = !result && !scanMutation.isPending;
  const showBookingPanel =
    Boolean(result) || scanMutation.isPending || Boolean(banner);

  return (
    <Shell className="gap-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <ProtectedPageHeader
        locationScope="venue"
        title="Door Scan"
        className="min-w-0"
        description={
          namedSite
            ? `Point the camera at the ${siteName} invoice QR. Check-in is only for today's event date.`
            : "Point the camera at the invoice QR. Check-in is only for today's event date."
        }
        actions={
          result ? (
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={resetForNextGuest}
            >
              Scan next guest
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <section className={pageCardClassName("min-w-0")}>
          <h2 className="text-base font-semibold mb-3">Scanner</h2>
          <DoorQrScanner
            enabled={cameraEnabled}
            pausedLabel={
              scanMutation.isPending
                ? "Looking up this booking…"
                : "Camera paused — confirm below."
            }
            onToken={lookupToken}
          />
        </section>

        <section
          ref={bookingPanelRef}
          tabIndex={-1}
          className={cn(
            pageCardClassName("min-w-0 scroll-mt-24 outline-none"),
            !showBookingPanel && "hidden lg:block",
          )}
        >
          <h2 className="text-base font-semibold mb-3">Booking</h2>

          {banner ? (
            <div
              role="status"
              className={cn(
                "mb-4 rounded-xl border px-3 py-2.5 text-sm font-medium",
                banner.tone === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-destructive/30 bg-destructive/5 text-destructive",
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
            <p className="hidden lg:block text-sm text-muted-foreground leading-relaxed">
              {namedSite
                ? `Scan a ${siteName} invoice QR. Today's paid date is selected when there is one — other dates wait until their event day.`
                : "Scan an invoice QR. Today's paid date is selected when there is one — other dates wait until their event day."}
            </p>
          ) : null}

          {result ? (
            <div className={cn("space-y-5", scanMutation.isPending && "opacity-70")}>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Guest
                </p>
                <p className="text-2xl font-semibold tracking-tight">
                  {result.booking_number}
                </p>
                <p className="text-base font-medium">{result.guest_name}</p>
                <p className="text-sm text-muted-foreground">{result.event_name}</p>
                <Link
                  href={`/vendor/booking-history/${result.booking_id}`}
                  className="inline-block pt-1 text-sm text-[var(--color-primary)] underline-offset-4 hover:underline"
                >
                  Open booking
                </Link>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Event dates</p>
                  <p className="text-sm text-muted-foreground">
                    Only today's event date can be checked in. Other paid dates
                    stay on the booking until their day.
                  </p>
                </div>
                <RadioGroup
                  value={selectedDateId || undefined}
                  onValueChange={setSelectedDateId}
                  className="gap-2"
                >
                  {result.dates.map((row) => (
                    <DoorScanDateOption
                      key={row.booking_date_id}
                      row={row}
                      selected={selectedDateId === String(row.booking_date_id)}
                      isVenueToday={
                        result.suggested_booking_date_id === row.booking_date_id
                      }
                    />
                  ))}
                </RadioGroup>
              </div>

              <div className="sticky bottom-0 -mx-4 sm:-mx-6 border-t border-[var(--color-border)] bg-white px-4 py-3 sm:px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                {!permissionsReady ? (
                  <Skeleton className="h-12 w-full" />
                ) : canUpdateBooking ? (
                  <div className="space-y-2">
                    <Button
                      type="button"
                      size="lg"
                      className="h-12 w-full text-base"
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
                    {confirmHint ? (
                      <p className="text-center text-sm text-muted-foreground">
                        {confirmHint}
                      </p>
                    ) : null}
                  </div>
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
