"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { DateRange } from "react-day-picker";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Inbox,
  Layers3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { PriorityBadge, StatusBadge } from "./support-badges";
import {
  getAdminQueueStats,
  getAdminStats,
  getLiveAdminConversations,
} from "../_lib/mock-data";
import type { DashboardDateRange } from "../_lib/types";
import {
  ADMIN_QUEUE_LABELS,
  ADMIN_SOURCE_LABELS,
  DASHBOARD_DATE_LABELS,
  formatDashboardPeriodLabel,
  formatRelativeTime,
  toDashboardDateFilter,
} from "../_lib/utils";
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

function QueueCard({
  title,
  open,
  waiting,
}: {
  title: string;
  open: number;
  waiting: number;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Layers3 className="size-4 text-[var(--color-primary)]" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Open</p>
          <p className="mt-1 text-xl font-bold text-foreground">{open}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Waiting</p>
          <p className="mt-1 text-xl font-bold text-foreground">{waiting}</p>
        </div>
      </div>
    </div>
  );
}

export default function AdminSupportDashboard() {
  const [presetRange, setPresetRange] = useState<DashboardDateRange>("7d");
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

  const stats = useMemo(() => getAdminStats(dateFilter), [dateFilter]);
  const queues = useMemo(() => getAdminQueueStats(), []);
  const liveConversations = useMemo(() => getLiveAdminConversations(), []);

  return (
    <div className="min-w-0 space-y-6 pb-2">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
            Overview
          </p>
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

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Total open"
          value={stats.totalOpen}
          hint="Active conversations"
          icon={Inbox}
          iconClassName="bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
        />
        <StatCard
          label="Total resolved"
          value={stats.totalResolved}
          hint={`In ${periodLabel.toLowerCase()}`}
          icon={CheckCircle2}
          iconClassName="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Waiting"
          value={`${stats.waitingCustomer} / ${stats.waitingVendor}`}
          hint="Customer / vendor"
          icon={Clock}
          iconClassName="bg-amber-50 text-amber-600"
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
              open={queue.open}
              waiting={queue.waiting}
            />
          ))}
        </div>
      </div>

      <section className="min-w-0 overflow-hidden rounded-xl border border-[var(--color-border)] bg-white shadow-sm">
        <div className="flex min-w-0 items-center justify-between gap-2 border-b border-[var(--color-border)] px-4 py-4 sm:gap-3 sm:px-5">
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground">Live conversations</h3>
            <p className="text-xs text-muted-foreground">
              Recent open tickets across all venues
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild className="shrink-0 px-2 sm:px-3">
            <Link href="/admin/support/inbox">
              Full inbox
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <ul className="divide-y divide-slate-100">
          {liveConversations.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-5">
              No live conversations right now.
            </li>
          ) : (
            liveConversations.map((conversation) => (
              <li key={conversation.id}>
                <Link
                  href={`/admin/support/inbox/${conversation.id}`}
                  className="flex gap-3 px-4 py-4 transition-colors hover:bg-slate-50 sm:px-5"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                    {conversation.contact.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-1 text-sm font-semibold text-foreground">
                        {conversation.subject}
                      </p>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {formatRelativeTime(conversation.lastMessageAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {conversation.ref} · {conversation.contact.name} ·{" "}
                      {ADMIN_SOURCE_LABELS[conversation.source]} ·{" "}
                      {conversation.venue.name}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={conversation.status} />
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
