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
import type { SupportCategory, SupportPriority, SupportStatus } from "../_lib/types";
import {
  CATEGORY_LABELS,
  CUSTOMER_INBOX_STATUS_FILTERS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  SUPPORT_PRIORITIES,
} from "../_lib/utils";
import { cn } from "@/lib/utils";

export type InboxSort = "newest" | "oldest";
export type InboxDateFilter = "all" | "today" | "week" | "month";
export type InboxStatusFilter = SupportStatus | "all";

export interface InboxFilters {
  status: InboxStatusFilter;
  priority: SupportPriority | "all";
  category: SupportCategory | "all";
  date: InboxDateFilter;
  sort: InboxSort;
}

export const DEFAULT_INBOX_FILTERS: InboxFilters = {
  status: "all",
  priority: "all",
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

interface FilterPillProps {
  label: string;
  active?: boolean;
  className?: string;
  children: React.ReactNode;
}

function FilterPill({ label, active, className, children }: FilterPillProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 shrink-0 rounded-full border-slate-200 bg-white px-3 text-xs font-medium text-foreground shadow-none hover:bg-slate-50",
            active && "border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5",
            className
          )}
        >
          {label}
          <ChevronDown className="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      {children}
    </DropdownMenu>
  );
}

interface SupportInboxFiltersProps {
  filters: InboxFilters;
  onChange: (filters: InboxFilters) => void;
  onClear: () => void;
}

export default function SupportInboxFilters({
  filters,
  onChange,
  onClear,
}: SupportInboxFiltersProps) {
  const activeCount = [
    filters.status !== "all",
    filters.priority !== "all",
    filters.category !== "all",
    filters.date !== "all",
  ].filter(Boolean).length;

  const statusLabel =
    filters.status === "all" ? "Status" : STATUS_LABELS[filters.status];
  const priorityLabel =
    filters.priority === "all" ? "Priority" : PRIORITY_LABELS[filters.priority];
  const categoryLabel =
    filters.category === "all"
      ? "Category"
      : CATEGORY_LABELS[filters.category];
  const dateLabel = DATE_LABELS[filters.date];

  return (
    <div className="space-y-0">
      <div className="flex min-w-0 flex-wrap gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 shrink-0 rounded-full border-slate-200 bg-white px-3 text-xs font-medium shadow-none hover:bg-slate-50",
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
          <DropdownMenuContent align="start" className="w-52">
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
              {CUSTOMER_INBOX_STATUS_FILTERS.map((status) => (
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
                    {CATEGORY_LABELS[category]}
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

export function InboxSortSelect({
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
