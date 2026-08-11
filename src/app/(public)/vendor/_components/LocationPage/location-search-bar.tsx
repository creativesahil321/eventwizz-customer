"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  isBefore,
  startOfDay,
  startOfMonth,
} from "date-fns";
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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { usePublicAvailability } from "@/services/common/public-search";
import type { LocationSearchFilters } from "./_lib/search-filters";

export type SearchAvailabilityScope = {
  domain?: string | null;
  q?: string;
  city?: string | null;
  location_slug?: string | null;
  /** Off for Site Essentials preview / offline chrome. */
  enabled?: boolean;
};

export type LocationSearchBarProps = {
  cities?: string[];
  id?: string;
  className?: string;
  value: LocationSearchFilters;
  onChange: (value: LocationSearchFilters) => void;
  onSearch: () => void;
  /**
   * Location pages already know the city — hide the dropdown and optionally
   * show a locked city chip instead.
   */
  hideCity?: boolean;
  lockedCityLabel?: string | null;
  /**
   * When set, the date picker loads `/availability` and only enables
   * days that have bookable slots (plus clears past dates).
   */
  availability?: SearchAvailabilityScope;
};

function clampAvailabilityRange(month: Date): { from: string; to: string } {
  const fromDate = startOfMonth(month);
  const preferredTo = endOfMonth(addMonths(month, 2));
  const maxTo = addDays(fromDate, 91); // API max window = 92 days inclusive
  const toDate = isBefore(preferredTo, maxTo) ? preferredTo : maxTo;
  return {
    from: format(fromDate, "yyyy-MM-dd"),
    to: format(toDate, "yyyy-MM-dd"),
  };
}

/**
 * Shared search chrome for multi-location home and location-page heroes.
 * Data layer is wired via public search APIs in parent consumers.
 */
export function LocationSearchBar({
  cities = [],
  id,
  className,
  value,
  onChange,
  onSearch,
  hideCity = false,
  lockedCityLabel = null,
  availability,
}: LocationSearchBarProps) {
  const [cityOpen, setCityOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() =>
    startOfMonth(value.date ?? new Date()),
  );

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

  const availabilityEnabled =
    Boolean(availability?.domain) && availability?.enabled !== false;

  const range = useMemo(
    () => clampAvailabilityRange(calendarMonth),
    [calendarMonth],
  );

  const availabilityParams = useMemo(() => {
    if (!availabilityEnabled) return null;
    return {
      from: range.from,
      to: range.to,
      q: availability?.q?.trim() || undefined,
      city: availability?.location_slug
        ? undefined
        : availability?.city?.trim() || undefined,
      location_slug: availability?.location_slug?.trim() || undefined,
      group_by: "date" as const,
    };
  }, [
    availabilityEnabled,
    range.from,
    range.to,
    availability?.q,
    availability?.city,
    availability?.location_slug,
  ]);

  const availabilityQuery = usePublicAvailability(
    availability?.domain,
    availabilityParams,
    { enabled: availabilityEnabled && dateOpen },
  );

  const availableDateSet = useMemo(() => {
    const set = new Set<string>();
    for (const day of availabilityQuery.data?.days ?? []) {
      if (day.slot_count > 0) set.add(day.date);
    }
    return set;
  }, [availabilityQuery.data?.days]);

  const today = startOfDay(new Date());
  const restrictToAvailability =
    availabilityEnabled &&
    (availabilityQuery.isSuccess || availableDateSet.size > 0);

  const fieldBtnClass =
    "flex min-w-0 flex-1 items-center gap-1.5 rounded-full px-2.5 py-2 text-left text-sm transition-colors hover:bg-[color:color-mix(in_srgb,var(--color-text)_4%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] sm:min-w-[9rem] sm:gap-2 sm:px-3 sm:py-2";

  /** Location pages: hide locked city on small screens — already on that city. */
  const showLockedCity = hideCity && Boolean(lockedCityLabel);

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
        className="rounded-2xl border border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] bg-[var(--color-surface)] p-1.5 shadow-[0_10px_32px_-20px_rgba(0,0,0,0.28)] sm:rounded-full sm:p-1"
      >
        <div
          className={cn(
            "flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-0",
            hideCity && "sm:gap-0",
          )}
        >
          <label className="relative flex min-w-0 flex-1 items-center gap-2 rounded-full px-3 py-2.5 sm:px-3.5 sm:py-2">
            <Search
              className="h-4 w-4 shrink-0 text-[var(--color-primary)]"
              aria-hidden
            />
            <input
              id={id ? `${id}-input` : undefined}
              type="search"
              value={value.query}
              onChange={(e) => patch({ query: e.target.value })}
              placeholder={
                hideCity
                  ? "Search events..."
                  : "Search event, venue or city..."
              }
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-dimmed)]"
              aria-label={
                hideCity ? "Search events" : "Search event, venue or city"
              }
            />
          </label>

          <div
            className="mx-2.5 hidden h-7 w-px shrink-0 bg-[color:color-mix(in_srgb,var(--color-text)_12%,transparent)] sm:block"
            aria-hidden
          />

          {/*
            Mobile location search: [date] [Search] on one row (no city chip).
            Multi-city / desktop: city + date + search in the pill.
          */}
          <div
            className={cn(
              "gap-1.5 sm:contents",
              hideCity ? "grid grid-cols-[1fr_auto]" : "grid grid-cols-2",
            )}
          >
            {showLockedCity ? (
              <div
                className={cn(
                  fieldBtnClass,
                  "hidden cursor-default hover:bg-transparent sm:flex",
                )}
                aria-label={`Location ${lockedCityLabel}`}
              >
                <MapPin
                  className="h-4 w-4 shrink-0 text-[var(--color-primary)]"
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate text-[var(--color-text)]">
                  {lockedCityLabel}
                </span>
              </div>
            ) : null}

            {!hideCity ? (
              <Popover open={cityOpen} onOpenChange={setCityOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={fieldBtnClass}
                    aria-label="Filter by city"
                  >
                    <MapPin
                      className="h-4 w-4 shrink-0 text-[var(--color-primary)]"
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate text-[var(--color-text)]">
                      {value.city ?? "Any city"}
                    </span>
                    <ChevronDown
                      className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-dimmed)]"
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
            ) : null}

            <div
              className="mx-2.5 hidden h-7 w-px shrink-0 bg-[color:color-mix(in_srgb,var(--color-text)_12%,transparent)] sm:block"
              aria-hidden
            />

            <Popover
              open={dateOpen}
              onOpenChange={(open) => {
                setDateOpen(open);
                if (open) {
                  setCalendarMonth(startOfMonth(value.date ?? new Date()));
                }
              }}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={fieldBtnClass}
                  aria-label="Filter by date"
                >
                  <CalendarDays
                    className="h-4 w-4 shrink-0 text-[var(--color-primary)]"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-[var(--color-text)]">
                    {value.date ? format(value.date, "d MMM yyyy") : "Any date"}
                  </span>
                  <ChevronDown
                    className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-dimmed)]"
                    aria-hidden
                  />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-auto max-w-[calc(100vw-2rem)] p-0"
                style={{
                  background: "var(--color-surface)",
                  color: "var(--color-text)",
                  borderColor:
                    "color-mix(in srgb, var(--color-text) 12%, transparent)",
                }}
              >
                {availabilityEnabled &&
                availabilityQuery.isFetching &&
                availableDateSet.size === 0 ? (
                  <div className="space-y-2 p-3" aria-busy>
                    <Skeleton className="mx-auto h-5 w-28" />
                    <Skeleton className="h-56 w-[252px]" />
                  </div>
                ) : (
                  <Calendar
                    mode="single"
                    month={calendarMonth}
                    onMonthChange={setCalendarMonth}
                    selected={value.date ?? undefined}
                    onSelect={(next) => {
                      patch({ date: next ?? null });
                      setDateOpen(false);
                    }}
                    disabled={(date) => {
                      if (isBefore(startOfDay(date), today)) return true;
                      if (!restrictToAvailability) return false;
                      return !availableDateSet.has(format(date, "yyyy-MM-dd"));
                    }}
                    initialFocus
                  />
                )}
                {availabilityEnabled ? (
                  <p className="border-t border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] px-3 py-2 text-[11px] text-[var(--color-text-dimmed)]">
                    {availabilityQuery.isError
                      ? "Couldn’t load available dates."
                      : availableDateSet.size === 0 &&
                          !availabilityQuery.isFetching
                        ? "No available dates in this range."
                        : "Only dates with available events are selectable."}
                  </p>
                ) : null}
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

            <button
              type="submit"
              className={cn(
                "inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full bg-[var(--color-primary)] px-4 text-sm font-semibold text-[var(--color-primary-foreground)] shadow-sm transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 sm:h-9 sm:px-4",
                !hideCity && "col-span-2 sm:col-span-1",
              )}
            >
              Search
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </form>
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
