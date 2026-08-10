"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  MapPin,
  Search,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { LocationSearchFilters } from "./_lib/filter-locations";

export const POPULAR_SEARCH_TAGS = [
  "Wedding Fair",
  "Food Festival",
  "Live Music",
  "Corporate Summit",
] as const;

export type LocationSearchBarProps = {
  cities?: string[];
  id?: string;
  variant?: "default" | "onDark";
  className?: string;
  value: LocationSearchFilters;
  onChange: (value: LocationSearchFilters) => void;
  onSearch: () => void;
};

/**
 * Explore Cities search chrome. Filters are client-side until a search API lands.
 */
export function LocationSearchBar({
  cities = [],
  id,
  variant = "default",
  className,
  value,
  onChange,
  onSearch,
}: LocationSearchBarProps) {
  const [cityOpen, setCityOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);

  const cityOptions = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const city of cities) {
      const trimmed = city?.trim();
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);
      list.push(trimmed);
    }
    return list.sort((a, b) => a.localeCompare(b));
  }, [cities]);

  const patch = (partial: Partial<LocationSearchFilters>) => {
    onChange({ ...value, ...partial });
  };

  const fieldBtnClass =
    "flex min-w-0 flex-1 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-[color:color-mix(in_srgb,var(--color-text)_4%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] sm:min-w-[9rem] sm:gap-2 sm:px-3 sm:py-2 sm:text-sm";

  return (
    <div
      id={id}
      className={cn("mx-auto w-full max-w-3xl scroll-mt-24", className)}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSearch();
        }}
        className="rounded-2xl border border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] bg-[var(--color-surface)] p-1 shadow-[0_10px_28px_-22px_rgba(0,0,0,0.45)] sm:rounded-full sm:p-1"
      >
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-0">
          <label className="relative flex min-w-0 flex-1 items-center gap-1.5 rounded-full px-2.5 py-1.5 sm:gap-2 sm:px-3.5 sm:py-2">
            <Search
              className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)] sm:h-4 sm:w-4"
              aria-hidden
            />
            <input
              id={id ? `${id}-input` : undefined}
              type="search"
              value={value.query}
              onChange={(e) => patch({ query: e.target.value })}
              placeholder="Search event, venue or city..."
              className="min-w-0 flex-1 bg-transparent text-xs text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-dimmed)] sm:text-sm"
              aria-label="Search event, venue or city"
            />
          </label>

          <div
            className="mx-2.5 hidden h-7 w-px shrink-0 bg-[color:color-mix(in_srgb,var(--color-text)_12%,transparent)] sm:block"
            aria-hidden
          />

          {/* City + date share one row on mobile to cut height */}
          <div className="grid grid-cols-2 gap-0.5 sm:contents">
            <Popover open={cityOpen} onOpenChange={setCityOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={fieldBtnClass}
                  aria-label="Filter by city"
                >
                  <MapPin
                    className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)] sm:h-4 sm:w-4"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-[var(--color-text)]">
                    {value.city ?? "Any city"}
                  </span>
                  <ChevronDown
                    className="h-3 w-3 shrink-0 text-[var(--color-text-dimmed)] sm:h-3.5 sm:w-3.5"
                    aria-hidden
                  />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-56 p-1.5"
                style={{
                  background: "var(--color-surface)",
                  color: "var(--color-text)",
                  borderColor:
                    "color-mix(in srgb, var(--color-text) 12%, transparent)",
                }}
              >
                <CityOption
                  label="Any city"
                  selected={value.city === null}
                  onSelect={() => {
                    patch({ city: null });
                    setCityOpen(false);
                  }}
                />
                {cityOptions.map((option) => (
                  <CityOption
                    key={option}
                    label={option}
                    selected={value.city === option}
                    onSelect={() => {
                      patch({ city: option });
                      setCityOpen(false);
                    }}
                  />
                ))}
              </PopoverContent>
            </Popover>

            <div
              className="mx-2.5 hidden h-7 w-px shrink-0 bg-[color:color-mix(in_srgb,var(--color-text)_12%,transparent)] sm:block"
              aria-hidden
            />

            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={fieldBtnClass}
                  aria-label="Filter by date"
                >
                  <CalendarDays
                    className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)] sm:h-4 sm:w-4"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-[var(--color-text)]">
                    {value.date ? format(value.date, "d MMM yyyy") : "Any date"}
                  </span>
                  <ChevronDown
                    className="h-3 w-3 shrink-0 text-[var(--color-text-dimmed)] sm:h-3.5 sm:w-3.5"
                    aria-hidden
                  />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-auto p-0"
                style={{
                  background: "var(--color-surface)",
                  color: "var(--color-text)",
                  borderColor:
                    "color-mix(in srgb, var(--color-text) 12%, transparent)",
                }}
              >
                <Calendar
                  mode="single"
                  selected={value.date ?? undefined}
                  onSelect={(next) => {
                    patch({ date: next ?? null });
                    setDateOpen(false);
                  }}
                  initialFocus
                />
                {value.date ? (
                  <div className="border-t border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] p-2">
                    <button
                      type="button"
                      onClick={() => {
                        patch({ date: null });
                        setDateOpen(false);
                      }}
                      className="w-full rounded-md px-3 py-1.5 text-sm text-[var(--color-text-dimmed)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--color-text)_4%,transparent)] hover:text-[var(--color-text)]"
                    >
                      Clear date
                    </button>
                  </div>
                ) : null}
              </PopoverContent>
            </Popover>
          </div>

          <button
            type="submit"
            className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full bg-[var(--color-primary)] px-3.5 text-xs font-semibold text-[var(--color-primary-foreground)] shadow-sm transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 sm:h-9 sm:gap-2 sm:px-4 sm:text-sm"
          >
            Search
            <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
          </button>
        </div>
      </form>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-1 px-1 sm:mt-3 sm:gap-1.5">
        <span
          className={cn(
            "text-[10px] font-medium sm:text-xs",
            variant === "onDark"
              ? "text-white/70"
              : "text-[var(--color-text-dimmed)]",
          )}
        >
          Popular:
        </span>
        {POPULAR_SEARCH_TAGS.map((tag) => {
          const active =
            value.query.trim().toLowerCase() === tag.toLowerCase();
          return (
            <button
              key={tag}
              type="button"
              onClick={() => patch({ query: tag })}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors sm:px-2.5 sm:py-1 sm:text-xs",
                variant === "onDark"
                  ? active
                    ? "border-white bg-white/20 text-white"
                    : "border-white/35 bg-black/25 text-white/90 backdrop-blur-sm hover:border-white/55 hover:bg-black/35"
                  : active
                    ? "border-[var(--color-primary)] bg-[color:color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-text)]"
                    : "border-[color:color-mix(in_srgb,var(--color-text)_14%,transparent)] bg-transparent text-[var(--color-text)] hover:border-[color:color-mix(in_srgb,var(--color-text)_28%,transparent)]",
              )}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CityOption({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
        selected
          ? "bg-[color:color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-text)]"
          : "text-[var(--color-text)] hover:bg-[color:color-mix(in_srgb,var(--color-text)_5%,transparent)]",
      )}
    >
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {selected ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" />
      ) : null}
    </button>
  );
}
