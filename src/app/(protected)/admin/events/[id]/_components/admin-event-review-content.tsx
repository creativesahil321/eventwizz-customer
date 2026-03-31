"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { EventPreview } from "@/app/(protected)/vendor/events/_components/event-preview";
import { PreviewProvider } from "@/contexts/preview-context";
import { adminEventsService } from "@/services/admin/events/admin-events.service";
import type { EventDetailData } from "@/services/vendor/events/type";

const adminEventQueryKey = (id: string) => ["admin", "event", id] as const;

export function AdminEventReviewContent({
  eventId,
  fromVendor,
}: {
  eventId: string;
  fromVendor?: string | null;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: adminEventQueryKey(eventId),
    queryFn: async () => {
      const res = await adminEventsService.getById(eventId);
      if (!res.status || res.data == null) {
        throw new Error(
          typeof res.message === "string"
            ? res.message
            : "Failed to load event",
        );
      }
      return res.data;
    },
    enabled: Boolean(eventId),
  });

  const finishAndMaybeRedirect = () => {
    void queryClient.invalidateQueries({
      queryKey: adminEventQueryKey(eventId),
    });
    void queryClient.invalidateQueries({ queryKey: ["admin", "venue"] });
    setRejectOpen(false);
    setRejectReason("");
    if (fromVendor) {
      router.push(`/admin/vendors/${fromVendor}`);
    } else {
      void refetch();
    }
  };

  const approveMut = useMutation({
    mutationFn: () => adminEventsService.approve(eventId),
    onSuccess: (res) => {
      if (res.status) finishAndMaybeRedirect();
    },
  });

  const rejectMut = useMutation({
    mutationFn: () =>
      adminEventsService.reject(eventId, { reason: rejectReason.trim() }),
    onSuccess: (res) => {
      if (res.status) finishAndMaybeRedirect();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-xl" />
        <Skeleton className="h-12 w-full max-w-2xl" />
        <Skeleton className="min-h-[420px] w-full rounded-lg" />
      </div>
    );
  }

  if (isError || !data) {
    const backHref = fromVendor
      ? `/admin/vendors/${fromVendor}`
      : "/admin/vendors";
    return (
      <Card className="border-red-200 bg-red-50/40 p-6 space-y-4">
        <h1 className="text-lg font-semibold text-foreground">
          Event review unavailable
        </h1>
        <p className="text-sm text-muted-foreground">
          {error instanceof Error
            ? error.message
            : "This event could not be loaded. The admin event review API may not be available yet."}
        </p>
        <Button variant="event-outline" size="sm" className="gap-1.5" asChild>
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
      </Card>
    );
  }

  const eventPayload = data as EventDetailData;
  const displayName =
    eventPayload.stepOne?.event_name ||
    eventPayload.stepOne?.event_banner_heading ||
    `Event #${eventId}`;

  const backHref = fromVendor
    ? `/admin/vendors/${fromVendor}`
    : "/admin/vendors";

  const canSubmitReject = rejectReason.trim().length >= 3;
  const mutating = approveMut.isPending || rejectMut.isPending;

  return (
    <div className="flex w-full min-w-0 flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <Button
            variant="event-primary"
            size="sm"
            className="gap-1.5 h-8 w-fit"
            asChild
          >
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight title-header text-[var(--color-text)]">
            Review event
          </h1>
          <p className="truncate text-sm text-muted-foreground text-[var(--color-text-dimmed)]">
            {displayName}
          </p>
        </div>
        {/* Request changes: intentionally omitted for now (was: button + Dialog + requestChangesMut). */}
        <div className="flex shrink-0 flex-wrap gap-2 sm:pt-1">
          <Button
            size="sm"
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            disabled={mutating}
            onClick={() => approveMut.mutate()}
          >
            <CheckCircle2 className="h-4 w-4" />
            Approve
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5"
            disabled={mutating}
            onClick={() => setRejectOpen(true)}
          >
            <XCircle className="h-4 w-4" />
            Reject
          </Button>
        </div>
      </div>

      {/* Full width of the admin content column so preview lines up with Back / Approve / Reject above */}
      <div className="relative isolate w-full min-h-[min(70vh,720px)] max-h-[min(88vh,calc(100dvh-9.5rem))] overflow-x-hidden overflow-y-auto rounded-xl border border-slate-200/90 bg-slate-50/80 shadow-[0_1px_3px_rgba(0,0,0,0.06)] scroll-smooth [transform:translateZ(0)] ring-1 ring-slate-200/60">
        <PreviewProvider isPreviewMode>
          <EventPreview
            data={eventPayload}
            siteEssentials={null}
            embedInShell
          />
        </PreviewProvider>
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject event</DialogTitle>
            <DialogDescription>
              Provide a short reason for the vendor (required).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Reject reason</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explain why this listing cannot be approved…"
              rows={4}
              className="resize-y"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="event-outline"
              onClick={() => setRejectOpen(false)}
              disabled={rejectMut.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!canSubmitReject || rejectMut.isPending}
              onClick={() => rejectMut.mutate()}
            >
              {rejectMut.isPending ? "Submitting…" : "Submit rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
