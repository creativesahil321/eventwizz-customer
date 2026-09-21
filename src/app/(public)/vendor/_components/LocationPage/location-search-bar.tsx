"use client";

import { useMemo, useState, type ReactNode } from "react";
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
  Loader2,
  MapPin,
  Navigation,
  Search,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  eventThemesBySlugFromSearchResults,
  seasonThemesByDateFromEvents,
} from "@/lib/event-season-theme";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { requestUserLocation } from "@/lib/request-user-location";
import {
  previewHideUntilSm,
  previewSearchFieldsLocationUntilSm,
  previewSearchFieldsMultiUntilSm,
  previewSearchFieldsUntilSm,
  previewSearchFormUntilSm,
  previewSearchStackUntilSm,
  previewSearchSubmitFullUntilSm,
  previewSearchSubmitUntilSm,
} from "@/lib/preview-container-layout";
import { usePreviewMobileLayout } from "@/hooks/use-preview-narrow-layout";
import {
  usePublicAvailability,
  usePublicEventCatalog,
} from "@/services/common/public-search";
import type { LocationSearchFilters } from "./_lib/search-filters";
import { locationSearchQueryPlaceholder } from "./_lib/search-filters";

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
  /** Optional event counts keyed by city name (same labels as `cities`). */
  cityEventCounts?: Record<string, number>;
  id?: string;
  className?: string;
  value: LocationSearchFilters;
  onChange: (value: LocationSearchFilters) => void;
  onSearch: () => void;
  hideCity?: boolean;
  /** Multi-location vendors search this venue; single-location vendors search events. */
  hasMultipleLocations?: boolean;
  /** Optional. Kept for callers; location chrome no longer shows a city chip. */
  lockedCityLabel?: string | null;
  /**
   * When set, the date picker loads `/availability` and only enables
   * days that have bookable slots (plus clears past dates).
   */
  availability?: SearchAvailabilityScope;
  /**
   * Show "Near Me" in the city menu (multi-location home). Off on
   * single-location pages / when `hideCity` is true.
   */
  enableNearMe?: boolean;
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
  cityEventCounts,
  id,
  className,
  value,
  onChange,
  onSearch,
  hideCity = false,
  hasMultipleLocations = false,
  availability,
  enableNearMe = false,
}: LocationSearchBarProps) {
  const isPreviewMobile = usePreviewMobileLayout();
  const [cityOpen, setCityOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [nearMeLoading, setNearMeLoading] = useState(false);
  const [nearMeError, setNearMeError] = useState<string | null>(null);
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

  const queryPlaceholder = locationSearchQueryPlaceholder({
    hideCity,
    hasMultipleLocations,
  });
  const cityFieldLabel = value.nearMe ? "Near Me" : (value.city ?? "Any city");

  const handleSelectAnyCity = () => {
    setNearMeError(null);
    patch({
      city: null,
      nearMe: false,
      nearMeCoords: null,
    });
    setCityOpen(false);
  };

  const handleSelectCity = (option: string) => {
    setNearMeError(null);
    patch({
      city: option,
      nearMe: false,
      nearMeCoords: null,
    });
    setCityOpen(false);
  };

  const handleSelectNearMe = async () => {
    setNearMeError(null);
    setNearMeLoading(true);
    // Always hit the browser API on click so the permission prompt can appear
    // (skipping stale localStorage cache that would silently "succeed").
    const result = await requestUserLocation({ forcePrompt: true });
    setNearMeLoading(false);

    if (!result.ok) {
      setNearMeError(result.message);
      return;
    }

    patch({
      city: null,
      nearMe: true,
      nearMeCoords: result.coords,
    });
    setCityOpen(false);
    // Kick search so results refresh immediately after permission grant.
    onSearch();
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

  const catalogQuery = usePublicEventCatalog(availability?.domain, {
    enabled: availabilityEnabled && dateOpen,
  });

  const availableDateSet = useMemo(() => {
    const set = new Set<string>();
    for (const day of availabilityQuery.data?.days ?? []) {
      if (day.slot_count > 0) set.add(day.date);
    }
    return set;
  }, [availabilityQuery.data?.days]);

  const seasonThemesByDate = useMemo(() => {
    const themesBySlug = eventThemesBySlugFromSearchResults(
      catalogQuery.data?.results ?? [],
    );
    return seasonThemesByDateFromEvents(
      (availabilityQuery.data?.days ?? []).filter((day) => day.slot_count > 0),
      themesBySlug,
    );
  }, [availabilityQuery.data?.days, catalogQuery.data?.results]);

  const today = startOfDay(new Date());
  // Only lock the calendar when we actually have bookable days.
  // Success + empty set used to disable every day → date stayed "Any date".
  const restrictToAvailability =
    availabilityEnabled &&
    availabilityQuery.isSuccess &&
    availableDateSet.size > 0;

  const fieldBtnClass = cn(
    "flex h-11 min-w-0 flex-1 items-center gap-1 rounded-full px-3 text-left text-sm transition-colors hover:bg-[color:color-mix(in_srgb,var(--color-text)_4%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] sm:min-w-[9rem] sm:gap-2 sm:px-3.5",
    "@max-sm/preview:!h-11 @max-sm/preview:!min-w-0 @max-sm/preview:!px-3",
    isPreviewMobile && "!h-11 !min-w-0 !px-3",
  );

  return (
    <div
      id={id}
      className={cn("w-full max-w-3xl scroll-mt-24", className)}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSearch();
        }}
        className={cn(
          "rounded-2xl border border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] bg-[var(--color-surface)] p-1.5 shadow-[0_10px_32px_-20px_rgba(0,0,0,0.28)] sm:rounded-full sm:p-1",
          previewSearchFormUntilSm,
          isPreviewMobile && "!rounded-xl !p-1",
        )}
      >
        <div
          className={cn(
            "flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-0",
            previewSearchStackUntilSm,
            isPreviewMobile && "!flex-col !items-stretch !gap-1",
          )}
        >
          <label className="relative flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full px-4 sm:px-5 @max-sm/preview:!h-11 @max-sm/preview:!px-4">
            <Search
              className="h-4 w-4 shrink-0 text-[var(--color-primary)]"
              aria-hidden
            />
            <input
              id={id ? `${id}-input` : undefined}
              type="search"
              value={value.query}
              onChange={(e) => patch({ query: e.target.value })}
              placeholder={queryPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-dimmed)] max-sm:placeholder:text-xs"
              aria-label={queryPlaceholder}
            />
          </label>

          <div
            className={cn(
              "mx-2.5 hidden h-7 w-px shrink-0 bg-[color:color-mix(in_srgb,var(--color-text)_12%,transparent)] sm:block",
              previewHideUntilSm,
              isPreviewMobile && "!hidden",
            )}
            aria-hidden
          />

          {/*
            Location page (hideCity): query | date | Search events — same as live.
            Multi-city home: query | city | date | Search events.
          */}
          <div
            className={cn(
              "gap-1 sm:contents",
              hideCity
                ? "grid grid-cols-[minmax(0,1fr)_auto]"
                : "grid grid-cols-2",
              previewSearchFieldsUntilSm,
              hideCity
                ? previewSearchFieldsLocationUntilSm
                : previewSearchFieldsMultiUntilSm,
              isPreviewMobile &&
                (hideCity
                  ? "!grid !grid-cols-[minmax(0,1fr)_auto]"
                  : "!grid !grid-cols-2"),
            )}
          >
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
                      {cityFieldLabel}
                    </span>
                    <ChevronDown
                      className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-dimmed)]"
                      aria-hidden
                    />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-64 p-1.5"
                  style={{
                    background: "var(--color-surface)",
                    color: "var(--color-text)",
                    borderColor:
                      "color-mix(in srgb, var(--color-text) 12%, transparent)",
                  }}
                >
                  <CityOption
                    label="Any city"
                    selected={!value.nearMe && value.city === null}
                    onSelect={handleSelectAnyCity}
                  />
                  {enableNearMe ? (
                    <>
                      <CityOption
                        label="Near Me"
                        icon={
                          nearMeLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--color-primary)]" />
                          ) : (
                            <Navigation className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                          )
                        }
                        selected={value.nearMe}
                        disabled={nearMeLoading}
                        onSelect={() => {
                          void handleSelectNearMe();
                        }}
                      />
                      {nearMeError ? (
                        <p className="px-3 py-2 text-xs leading-snug text-red-600">
                          {nearMeError}
                        </p>
                      ) : null}
                    </>
                  ) : null}
                  {cityOptions.map((option) => (
                    <CityOption
                      key={option}
                      label={option}
                      eventCount={cityEventCounts?.[option]}
                      selected={!value.nearMe && value.city === option}
                      onSelect={() => handleSelectCity(option)}
                    />
                  ))}
                </PopoverContent>
              </Popover>
            ) : null}

            {!hideCity ? (
              <div
                className={cn(
                  "mx-2.5 hidden h-7 w-px shrink-0 bg-[color:color-mix(in_srgb,var(--color-text)_12%,transparent)] sm:block",
                  previewHideUntilSm,
                  isPreviewMobile && "!hidden",
                )}
                aria-hidden
              />
            ) : null}

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
                      // Date alone is enough to enter search mode — scroll to results.
                      if (next) onSearch();
                    }}
                    disabled={(date) => {
                      if (isBefore(startOfDay(date), today)) return true;
                      if (!restrictToAvailability) return false;
                      return !availableDateSet.has(format(date, "yyyy-MM-dd"));
                    }}
                    seasonThemesByDate={seasonThemesByDate}
                    initialFocus
                  />
                )}
                {availabilityEnabled ? (
                  <p className="border-t border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] px-3 py-2 text-xs text-[var(--color-text-dimmed)]">
                    {availabilityQuery.isError
                      ? "Couldn’t load available dates — any future day is selectable."
                      : availableDateSet.size === 0 &&
                          !availabilityQuery.isFetching
                        ? "No booked-out calendar data in this range — pick any future day to search."
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
              aria-label="Search events"
              className={cn(
                "inline-flex h-11 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-full bg-[var(--color-footer)] px-4 text-sm font-semibold text-[var(--color-on-footer)] shadow-sm transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 sm:min-w-[9rem] sm:px-5",
                !hideCity && "col-span-2 sm:col-span-1",
                hideCity
                  ? previewSearchSubmitUntilSm
                  : previewSearchSubmitFullUntilSm,
                isPreviewMobile && "!h-11",
                isPreviewMobile && !hideCity && "!col-span-2",
              )}
            >
              <span
                className={cn(
                  "sm:hidden",
                  isPreviewMobile && "!inline",
                  "@max-sm/preview:!inline",
                )}
              >
                Search
              </span>
              <span
                className={cn(
                  "hidden sm:inline",
                  isPreviewMobile && "!hidden",
                  "@max-sm/preview:!hidden",
                )}
              >
                Search events
              </span>
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
  eventCount,
  selected,
  onSelect,
  icon,
  disabled = false,
}: {
  label: string;
  eventCount?: number;
  selected: boolean;
  onSelect: () => void;
  icon?: ReactNode;
  disabled?: boolean;
}) {
  const showCount =
    typeof eventCount === "number" && Number.isFinite(eventCount);
  const eventLabel = showCount
    ? `${eventCount} event${eventCount === 1 ? "" : "s"}`
    : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors disabled:opacity-60",
        selected
          ? "bg-[color:color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-text)]"
          : "text-[var(--color-text)] hover:bg-[color:color-mix(in_srgb,var(--color-text)_5%,transparent)]",
      )}
    >
      {icon ? <span className="shrink-0">{icon}</span> : null}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {eventLabel ? (
        <span className="shrink-0 rounded-full bg-[var(--color-primary)] px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[var(--color-primary-foreground)]">
          {eventLabel}
        </span>
      ) : null}
      {selected ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" />
      ) : null}
    </button>
  );
}
