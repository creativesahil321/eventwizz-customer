"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { DateRange } from "react-day-picker";
import {
  ArrowRight,
  CheckCircle2,
  Inbox,
  Layers3,
  Loader2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  PriorityBadge,
  SourceBadge,
  StatusBadge,
  VenueBadge,
} from "./support-badges";
import type { DashboardDateRange } from "../_lib/types";
import {
  ADMIN_QUEUE_LABELS,
  DASHBOARD_DATE_LABELS,
  formatDashboardPeriodLabel,
  formatRelativeTime,
  toDashboardDateFilter,
} from "../_lib/utils";
import {
  mapAdminSupportDashboardStats,
  mapAdminSupportLiveConversations,
  mapAdminSupportQueueStats,
  useAdminSupportDashboard,
} from "@/services/admin/support";
import { cn } from "@/lib/utils";

const DATE_RANGES: DashboardDateRange[] = ["today", "7d", "30d"];

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  iconClassName,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ElementType;
  iconClassName: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
          {hint ? (
            <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full",
            iconClassName
          )}
        >
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}

function QueueCard({ title, open }: { title: string; open: number }) {
  return (
    <div className="min-w-0 rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Layers3 className="size-4 text-[var(--color-primary)]" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="mt-4">
        <p className="text-xs text-muted-foreground">Open</p>
        <p className="mt-1 text-xl font-bold text-foreground">{open}</p>
      </div>
    </div>
  );
}

export default function AdminSupportDashboard() {
  const [presetRange, setPresetRange] = useState<DashboardDateRange>("today");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();

  const dateFilter = useMemo(
    () => toDashboardDateFilter(presetRange, customRange),
    [presetRange, customRange]
  );
  const periodLabel = useMemo(
    () => formatDashboardPeriodLabel(dateFilter),
    [dateFilter]
  );
  const hasCustomRange = Boolean(customRange?.from && customRange?.to);

  const { data, isLoading, isFetching, isError, refetch } =
    useAdminSupportDashboard(dateFilter);

  const stats = useMemo(
    () =>
      data?.data
        ? mapAdminSupportDashboardStats(data.data)
        : {
            totalOpen: 0,
            totalResolved: 0,
            customerTickets: 0,
            vendorTickets: 0,
          },
    [data?.data]
  );
  const queues = useMemo(
    () => mapAdminSupportQueueStats(data?.data?.queues),
    [data?.data?.queues]
  );
  const liveConversations = useMemo(
    () => mapAdminSupportLiveConversations(data?.data?.live_conversations),
    [data?.data?.live_conversations]
  );

  return (
    <div className="min-w-0 space-y-6 pb-2">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
              Overview
            </p>
            {isFetching && !isLoading ? (
              <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Support health across all venues — {periodLabel.toLowerCase()}.
          </p>
        </div>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <div className="grid min-w-0 grid-cols-3 gap-2 sm:flex sm:flex-wrap">
            {DATE_RANGES.map((range) => (
              <Button
                key={range}
                type="button"
                variant={
                  !hasCustomRange && presetRange === range
                    ? "event-primary"
                    : "outline"
                }
                size="sm"
                className={cn(
                  "h-8 rounded-full px-2 text-[11px] sm:px-3 sm:text-xs",
                  (hasCustomRange || presetRange !== range) &&
                    "border-slate-300 bg-white text-slate-900 hover:bg-slate-50 hover:text-slate-900"
                )}
                onClick={() => {
                  setPresetRange(range);
                  setCustomRange(undefined);
                }}
              >
                {DASHBOARD_DATE_LABELS[range]}
              </Button>
            ))}
          </div>
          <div className="w-full min-w-0 sm:w-auto sm:min-w-[280px]">
            <DateRangePicker
              date={customRange}
              onDateChange={setCustomRange}
              placeholder="Filter by date range"
              showClear
              disableFutureDates
            />
          </div>
        </div>
      </div>

      {isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center">
          <p className="text-sm text-red-700">
            Couldn’t load the support dashboard.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 rounded-full"
            onClick={() => refetch()}
          >
            Try again
          </Button>
        </div>
      ) : null}

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Total open"
          value={isLoading ? "—" : stats.totalOpen}
          hint="Active conversations"
          icon={Inbox}
          iconClassName="bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
        />
        <StatCard
          label="Total resolved"
          value={isLoading ? "—" : stats.totalResolved}
          hint={`In ${periodLabel.toLowerCase()}`}
          icon={CheckCircle2}
          iconClassName="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Customer / vendor"
          value={
            isLoading
              ? "—"
              : `${stats.customerTickets} / ${stats.vendorTickets}`
          }
          hint="Open tickets by source"
          icon={Users}
          iconClassName="bg-sky-50 text-sky-600"
        />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">Queues</h3>
          <Button variant="ghost" size="sm" asChild className="h-8 px-2">
            <Link href="/admin/support/inbox">
              Manage
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
          {queues.map((queue) => (
            <QueueCard
              key={queue.queue}
              title={ADMIN_QUEUE_LABELS[queue.queue]}
              open={isLoading ? 0 : queue.open}
            />
          ))}
        </div>
      </div>

      <section className="min-w-0 overflow-hidden rounded-xl border border-[var(--color-border)] bg-white shadow-sm">
        <div className="flex min-w-0 items-center justify-between gap-2 border-b border-[var(--color-border)] px-4 py-4 sm:gap-3 sm:px-5">
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground">Live conversations</h3>
            <p className="text-xs text-muted-foreground">
              Recent customer and vendor tickets across all venues
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="shrink-0 px-2 sm:px-3"
          >
            <Link href="/admin/support/inbox">
              Full inbox
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <ul className="divide-y divide-slate-100">
          {isLoading ? (
            <li className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted-foreground sm:px-5">
              <Loader2 className="size-4 animate-spin" />
              Loading conversations…
            </li>
          ) : liveConversations.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-5">
              No live conversations right now.
            </li>
          ) : (
            liveConversations.map((conversation) => (
              <li key={conversation.id}>
                <Link
                  href={`/admin/support/inbox/${conversation.id}`}
                  className="flex gap-3 px-4 py-2.5 transition-colors hover:bg-slate-50 sm:px-5"
                >
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600">
                    {conversation.contactName.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-1 text-xs font-semibold text-foreground">
                        {conversation.subject}
                      </p>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {formatRelativeTime(conversation.lastMessageAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {conversation.ref} · {conversation.contactName}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      <SourceBadge source={conversation.source} />
                      <VenueBadge name={conversation.venue.name} />
                      <StatusBadge
                        status={conversation.status}
                        label={conversation.statusLabel}
                      />
                      <PriorityBadge priority={conversation.priority} />
                    </div>
                  </div>
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
