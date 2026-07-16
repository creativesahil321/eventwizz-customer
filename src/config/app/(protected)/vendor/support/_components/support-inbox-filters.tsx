"use client";

import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  SupportAssignee,
  SupportPriority,
  SupportStatus,
  VendorTicketDirection,
} from "../_lib/types";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  SUPPORT_PRIORITIES,
  SUPPORT_STATUSES,
  VENDOR_DIRECTION_LABELS,
} from "../_lib/utils";
import type { VendorSupportQuickFilter } from "@/services/vendor/support";
import { cn } from "@/lib/utils";

export type InboxSort = "newest" | "oldest";
export type InboxDateFilter = "all" | "today" | "week" | "month";
export type InboxStatusFilter = SupportStatus | "all";
export type InboxAssigneeFilter = string | "all";
export type InboxDirectionFilter = VendorTicketDirection | "all";

export interface VendorInboxFilters {
  status: InboxStatusFilter;
  priority: SupportPriority | "all";
  assignee: InboxAssigneeFilter;
  direction: InboxDirectionFilter;
  date: InboxDateFilter;
  sort: InboxSort;
  quickFilters: VendorSupportQuickFilter[];
}

export const DEFAULT_VENDOR_INBOX_FILTERS: VendorInboxFilters = {
  status: "all",
  priority: "all",
  assignee: "all",
  direction: "all",
  date: "all",
  sort: "newest",
  quickFilters: [],
};

const DATE_LABELS: Record<InboxDateFilter, string> = {
  all: "All time",
  today: "Today",
  week: "Last 7 days",
  month: "Last 30 days",
};

const SORT_LABELS: Record<InboxSort, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
};

const QUICK_FILTER_ITEMS: Array<{
  key: VendorSupportQuickFilter;
  label: string;
}> = [
  { key: "closed_only", label: "Closed only" },
  { key: "high_priority_only", label: "High priority only" },
  { key: "admin_tickets_only", label: "Admin tickets only" },
  { key: "unassigned_only", label: "Unassigned only" },
];

function toggleQuickFilter(
  filters: VendorInboxFilters,
  key: VendorSupportQuickFilter,
  checked: boolean
): VendorInboxFilters {
  const set = new Set(filters.quickFilters);
  if (checked) set.add(key);
  else set.delete(key);
  return { ...filters, quickFilters: Array.from(set) };
}

function FilterPill({
  label,
  active,
  children,
}: {
  label: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "inline-flex h-8 min-h-8 shrink-0 items-center gap-1.5 rounded-full border-slate-200 bg-white px-2.5 text-xs font-medium leading-none text-slate-900 shadow-none hover:bg-slate-50",
            active && "border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5"
          )}
        >
          <span className="truncate">{label}</span>
          <ChevronDown className="size-3.5 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      {children}
    </DropdownMenu>
  );
}

interface VendorSupportInboxFiltersProps {
  filters: VendorInboxFilters;
  assignees: SupportAssignee[];
  onChange: (filters: VendorInboxFilters) => void;
  onClear: () => void;
}

export default function VendorSupportInboxFilters({
  filters,
  assignees,
  onChange,
  onClear,
}: VendorSupportInboxFiltersProps) {
  const activeCount = [
    filters.status !== "all",
    filters.priority !== "all",
    filters.assignee !== "all",
    filters.direction !== "all",
    filters.date !== "all",
    filters.quickFilters.length > 0,
  ].filter(Boolean).length;

  const statusLabel =
    filters.status === "all" ? "Status" : STATUS_LABELS[filters.status];
  const priorityLabel =
    filters.priority === "all" ? "Priority" : PRIORITY_LABELS[filters.priority];
  const assigneeLabel = (() => {
    if (filters.assignee === "all") return "Assignee";
    const assignee = assignees.find((a) => a.id === filters.assignee);
    if (!assignee) return "Assignee";
    if (assignee.id === "unassigned") return "Unassigned";
    return assignee.name.split(" ")[0];
  })();
  const directionLabel =
    filters.direction === "all"
      ? "Direction"
      : VENDOR_DIRECTION_LABELS[filters.direction];
  const dateLabel = DATE_LABELS[filters.date];

  return (
    <div className="min-w-0 space-y-2.5">
      <div className="flex min-w-0 flex-wrap gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "inline-flex h-8 min-h-8 shrink-0 items-center gap-1.5 rounded-full border-slate-200 bg-white px-2.5 text-xs font-medium leading-none text-slate-900 shadow-none hover:bg-slate-50",
                activeCount > 0 &&
                  "border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5"
              )}
            >
              <SlidersHorizontal className="size-3.5" />
              Filters
              {activeCount > 0 && (
                <span className="ml-0.5 inline-flex size-4 items-center justify-center rounded-full bg-[var(--color-primary)] text-[10px] font-bold text-white">
                  {activeCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuLabel>Quick filters</DropdownMenuLabel>
            {QUICK_FILTER_ITEMS.map((item) => (
              <DropdownMenuCheckboxItem
                key={item.key}
                checked={filters.quickFilters.includes(item.key)}
                onCheckedChange={(checked) =>
                  onChange(toggleQuickFilter(filters, item.key, Boolean(checked)))
                }
              >
                {item.label}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs"
              onClick={onClear}
            >
              Clear all filters
            </Button>
          </DropdownMenuContent>
        </DropdownMenu>

        <FilterPill label={directionLabel} active={filters.direction !== "all"}>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuRadioGroup
              value={filters.direction}
              onValueChange={(value) =>
                onChange({
                  ...filters,
                  direction: value as InboxDirectionFilter,
                })
              }
            >
              <DropdownMenuRadioItem value="all">All tickets</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="received">
                {VENDOR_DIRECTION_LABELS.received}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="sent">
                {VENDOR_DIRECTION_LABELS.sent}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </FilterPill>

        <FilterPill label={statusLabel} active={filters.status !== "all"}>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuRadioGroup
              value={filters.status}
              onValueChange={(value) =>
                onChange({
                  ...filters,
                  status: value as InboxStatusFilter,
                })
              }
            >
              <DropdownMenuRadioItem value="all">All statuses</DropdownMenuRadioItem>
              {SUPPORT_STATUSES.map((status) => (
                <DropdownMenuRadioItem key={status} value={status}>
                  {STATUS_LABELS[status]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </FilterPill>

        <FilterPill label={priorityLabel} active={filters.priority !== "all"}>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuRadioGroup
              value={filters.priority}
              onValueChange={(value) =>
                onChange({
                  ...filters,
                  priority: value as SupportPriority | "all",
                })
              }
            >
              <DropdownMenuRadioItem value="all">All priorities</DropdownMenuRadioItem>
              {SUPPORT_PRIORITIES.map((priority) => (
                <DropdownMenuRadioItem key={priority} value={priority}>
                  {PRIORITY_LABELS[priority]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </FilterPill>

        <FilterPill label={assigneeLabel} active={filters.assignee !== "all"}>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuRadioGroup
              value={filters.assignee}
              onValueChange={(value) =>
                onChange({
                  ...filters,
                  assignee: value as InboxAssigneeFilter,
                })
              }
            >
              <DropdownMenuRadioItem value="all">All assignees</DropdownMenuRadioItem>
              {assignees.map((assignee) => (
                <DropdownMenuRadioItem key={assignee.id} value={assignee.id}>
                  {assignee.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </FilterPill>

        <FilterPill label={dateLabel} active={filters.date !== "all"}>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuRadioGroup
              value={filters.date}
              onValueChange={(value) =>
                onChange({
                  ...filters,
                  date: value as InboxDateFilter,
                })
              }
            >
              {(Object.keys(DATE_LABELS) as InboxDateFilter[]).map((date) => (
                <DropdownMenuRadioItem key={date} value={date}>
                  {DATE_LABELS[date]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </FilterPill>
      </div>
    </div>
  );
}

export function VendorInboxSortSelect({
  value,
  onChange,
}: {
  value: InboxSort;
  onChange: (sort: InboxSort) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          {SORT_LABELS[value]}
          <ChevronDown className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(v) => onChange(v as InboxSort)}
        >
          <DropdownMenuRadioItem value="newest">Newest first</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="oldest">Oldest first</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
