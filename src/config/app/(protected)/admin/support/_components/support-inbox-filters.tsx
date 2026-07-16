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
  AdminSupportVenue,
  SupportAssignee,
  SupportPriority,
  SupportSource,
  SupportStatus,
} from "../_lib/types";
import {
  ADMIN_INBOX_STATUS_FILTERS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  SUPPORT_PRIORITIES,
} from "../_lib/utils";
import { cn } from "@/lib/utils";

export type InboxSort = "newest" | "oldest";
export type InboxDateFilter = "all" | "today" | "week" | "month";
export type InboxStatusFilter = SupportStatus | "all";
export type InboxAssigneeFilter = string | "all";
export type InboxVenueFilter = string | "all";
export type InboxSourceFilter = SupportSource | "all";

export interface AdminInboxFilters {
  status: InboxStatusFilter;
  priority: SupportPriority | "all";
  assignee: InboxAssigneeFilter;
  source: InboxSourceFilter;
  venue: InboxVenueFilter;
  date: InboxDateFilter;
  sort: InboxSort;
}

export const DEFAULT_ADMIN_INBOX_FILTERS: AdminInboxFilters = {
  status: "all",
  priority: "all",
  assignee: "all",
  source: "all",
  venue: "all",
  date: "all",
  sort: "newest",
};

const DATE_LABELS: Record<InboxDateFilter, string> = {
  all: "All time",
  today: "Today",
  week: "This week",
  month: "This month",
};

const SORT_LABELS: Record<InboxSort, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
};

function FilterPill({
  label,
  active,
  children,
  className,
}: {
  label: string;
  active?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="min-w-0">
      <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "inline-flex h-9 min-h-9 w-full min-w-0 max-w-full items-center justify-center gap-1.5 rounded-full border-slate-200 bg-white px-2.5 text-xs font-medium leading-none text-slate-900 shadow-none hover:bg-slate-50 sm:w-auto sm:justify-start sm:px-3",
            active && "border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5",
            className
          )}
        >
          <span className="min-w-0 truncate">{label}</span>
          <ChevronDown className="size-3.5 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      {children}
      </DropdownMenu>
    </div>
  );
}

function shortenVenueLabel(name: string): string {
  const firstWord = name.split(" ")[0] ?? name;
  return firstWord.length > 10 ? `${firstWord.slice(0, 9)}…` : firstWord;
}

interface AdminSupportInboxFiltersProps {
  filters: AdminInboxFilters;
  venues?: AdminSupportVenue[];
  assignees?: SupportAssignee[];
  onChange: (filters: AdminInboxFilters) => void;
  onClear: () => void;
}

export default function AdminSupportInboxFilters({
  filters,
  venues = [],
  assignees = [],
  onChange,
  onClear,
}: AdminSupportInboxFiltersProps) {
  const activeCount = [
    filters.status !== "all",
    filters.priority !== "all",
    filters.assignee !== "all",
    filters.source !== "all",
    filters.venue !== "all",
    filters.date !== "all",
  ].filter(Boolean).length;

  const statusLabel =
    filters.status === "all" ? "Status" : STATUS_LABELS[filters.status];
  const priorityLabel =
    filters.priority === "all" ? "Priority" : PRIORITY_LABELS[filters.priority];
  const assigneeLabel = (() => {
    if (filters.assignee === "all") return "Assignee";
    if (filters.assignee === "unassigned") return "Unassigned";
    const assignee = assignees.find((a) => a.id === filters.assignee);
    if (!assignee) return "Assignee";
    return assignee.name.split(" ")[0];
  })();
  const venueLabel = (() => {
    if (filters.venue === "all") return "Venue";
    const venue = venues.find((v) => v.id === filters.venue);
    if (!venue) return "Venue";
    return shortenVenueLabel(venue.name);
  })();
  const dateLabel = DATE_LABELS[filters.date];

  const filtersButton = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "inline-flex h-9 min-h-9 w-full min-w-0 max-w-full items-center justify-center gap-1.5 rounded-full border-slate-200 bg-white px-2.5 text-xs font-medium leading-none text-slate-900 shadow-none hover:bg-slate-50 sm:w-auto sm:justify-start sm:px-3",
            activeCount > 0 &&
              "border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5"
          )}
        >
          <SlidersHorizontal className="size-3.5 shrink-0" />
          <span className="truncate">Filters</span>
          {activeCount > 0 && (
            <span className="ml-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel>Quick filters</DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={filters.source === "vendor"}
          onCheckedChange={(checked) =>
            onChange({
              ...filters,
              source: checked ? "vendor" : "all",
            })
          }
        >
          Vendor tickets
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={filters.source === "customer"}
          onCheckedChange={(checked) =>
            onChange({
              ...filters,
              source: checked ? "customer" : "all",
            })
          }
        >
          Customer tickets
        </DropdownMenuCheckboxItem>
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
  );

  return (
    <div className="min-w-0">
      <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="min-w-0">{filtersButton}</div>

        <FilterPill label={venueLabel} active={filters.venue !== "all"}>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuRadioGroup
              value={filters.venue}
              onValueChange={(value) =>
                onChange({ ...filters, venue: value as InboxVenueFilter })
              }
            >
              <DropdownMenuRadioItem value="all">All venues</DropdownMenuRadioItem>
              {venues.map((venue) => (
                <DropdownMenuRadioItem key={venue.id} value={venue.id}>
                  {venue.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </FilterPill>

        <FilterPill label={statusLabel} active={filters.status !== "all"}>
          <DropdownMenuContent align="start" className="w-44">
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
              {ADMIN_INBOX_STATUS_FILTERS.map((status) => (
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
          <DropdownMenuContent align="start" className="w-52">
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
              <DropdownMenuRadioItem value="unassigned">
                Unassigned
              </DropdownMenuRadioItem>
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
              {Object.entries(DATE_LABELS).map(([value, label]) => (
                <DropdownMenuRadioItem key={value} value={value}>
                  {label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </FilterPill>
      </div>
    </div>
  );
}

export function AdminInboxSortSelect({
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
          className="h-8 max-w-full gap-1 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
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

export function matchesDateFilter(
  iso: string,
  dateFilter: InboxDateFilter
): boolean {
  if (dateFilter === "all") return true;
  const diff = Date.now() - new Date(iso).getTime();
  const day = 86_400_000;
  if (dateFilter === "today") return diff <= day;
  if (dateFilter === "week") return diff <= day * 7;
  if (dateFilter === "month") return diff <= day * 30;
  return true;
}
