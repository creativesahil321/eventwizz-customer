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
import { SUPPORT_ASSIGNEES } from "../_lib/mock-data";
import type {
  SupportCategory,
  SupportPriority,
  SupportStatus,
} from "../_lib/types";
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  SUPPORT_PRIORITIES,
  SUPPORT_STATUSES,
  VENDOR_CATEGORY_LABELS,
} from "../_lib/utils";
import { cn } from "@/lib/utils";

export type InboxSort = "newest" | "oldest";
export type InboxDateFilter = "all" | "today" | "week" | "month";
export type InboxStatusFilter = SupportStatus | "all";
export type InboxAssigneeFilter = string | "all";

export interface VendorInboxFilters {
  status: InboxStatusFilter;
  priority: SupportPriority | "all";
  assignee: InboxAssigneeFilter;
  category: SupportCategory | "all";
  date: InboxDateFilter;
  sort: InboxSort;
}

export const DEFAULT_VENDOR_INBOX_FILTERS: VendorInboxFilters = {
  status: "all",
  priority: "all",
  assignee: "all",
  category: "all",
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

function FilterPill({ label, active, children }: {
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
            "inline-flex h-9 min-h-9 shrink-0 items-center gap-1.5 rounded-full border-slate-200 bg-white px-3 text-xs font-medium leading-none text-slate-900 shadow-none hover:bg-slate-50",
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
  onChange: (filters: VendorInboxFilters) => void;
  onClear: () => void;
}

export default function VendorSupportInboxFilters({
  filters,
  onChange,
  onClear,
}: VendorSupportInboxFiltersProps) {
  const activeCount = [
    filters.status !== "all",
    filters.priority !== "all",
    filters.assignee !== "all",
    filters.category !== "all",
    filters.date !== "all",
  ].filter(Boolean).length;

  const statusLabel =
    filters.status === "all" ? "Status" : STATUS_LABELS[filters.status];
  const priorityLabel =
    filters.priority === "all" ? "Priority" : PRIORITY_LABELS[filters.priority];
  const assigneeLabel = (() => {
    if (filters.assignee === "all") return "Assignee";
    const assignee = SUPPORT_ASSIGNEES.find((a) => a.id === filters.assignee);
    if (!assignee) return "Assignee";
    if (assignee.id === "unassigned") return "Unassigned";
    return assignee.name.split(" ")[0];
  })();
  const categoryLabel =
    filters.category === "all"
      ? "Category"
      : VENDOR_CATEGORY_LABELS[filters.category];
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
                "inline-flex h-9 min-h-9 shrink-0 items-center gap-1.5 rounded-full border-slate-200 bg-white px-3 text-xs font-medium leading-none text-slate-900 shadow-none hover:bg-slate-50",
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
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Quick filters</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={filters.status === "closed"}
              onCheckedChange={(checked) =>
                onChange({
                  ...filters,
                  status: checked ? "closed" : "all",
                })
              }
            >
              Closed only
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filters.priority === "high"}
              onCheckedChange={(checked) =>
                onChange({
                  ...filters,
                  priority: checked ? "high" : "all",
                })
              }
            >
              High priority only
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filters.assignee === "unassigned"}
              onCheckedChange={(checked) =>
                onChange({
                  ...filters,
                  assignee: checked ? "unassigned" : "all",
                })
              }
            >
              Unassigned only
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
      </div>

      <div className="flex min-w-0 flex-wrap gap-2">
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
              {SUPPORT_ASSIGNEES.map((assignee) => (
                <DropdownMenuRadioItem key={assignee.id} value={assignee.id}>
                  {assignee.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </FilterPill>

        <FilterPill label={categoryLabel} active={filters.category !== "all"}>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuRadioGroup
              value={filters.category}
              onValueChange={(value) =>
                onChange({
                  ...filters,
                  category: value as SupportCategory | "all",
                })
              }
            >
              <DropdownMenuRadioItem value="all">All categories</DropdownMenuRadioItem>
              {(Object.keys(CATEGORY_LABELS) as SupportCategory[]).map(
                (category) => (
                  <DropdownMenuRadioItem key={category} value={category}>
                    {VENDOR_CATEGORY_LABELS[category]}
                  </DropdownMenuRadioItem>
                )
              )}
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
