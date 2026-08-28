"use client";

import { useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { format, isValid, parseISO } from "date-fns";
import { CalendarDays, Loader2, MapPin, SearchX } from "lucide-react";
import { SiteHeading } from "@/components/public/site-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { ServerContext } from "@/lib/server-context";
import { resolveCurrencySymbol } from "@/lib/currency-format";
import { cn } from "@/lib/utils";
import { savePendingBooking } from "@/lib/booking/pending-booking";
import { saveAuthCallbackUrl } from "@/lib/auth/safe-callback-url";
import { CUSTOMER_CHECKOUT_PATH } from "@/lib/customer-checkout-path";
import { useStoreEventBooking } from "@/services/customer/cart/query";
import type { CartRequest } from "@/services/customer/cart/type";
import type { ThemeSchema } from "@/types/theme.types";
import type {
  PublicSearchData,
  PublicSearchMeta,
  SearchDateSlotResult,
  SearchEventResult,
} from "@/services/common/public-search";
import type { LocationSearchFilters } from "./_lib/search-filters";
import { LocationEventCard } from "../EventListPage/location-event-card";
import {
  formatEventListingPrice,
  getEventCardDateLabel,
  getEventCardTimeLabel,
} from "../EventListPage/event-card-utils";
import { LOCATION_EVENTS_ANCHOR_ID } from "./location-page-hero-search";

const FALLBACK_IMAGE =
  "/assets/images/events/dummyEvents/concert-event.jpg";

function formatSlotDate(raw: string): string {
  const parsed = parseISO(raw);
  if (!isValid(parsed)) return raw;
  return format(parsed, "EEE d MMM yyyy");
}

function resultsHeading(meta: PublicSearchMeta | undefined): string {
  if (!meta) return "Search results";
  if (meta.near_me) return "Events near you";
  if (meta.match_type === "category" && meta.matched_category?.name) {
    return `Category: ${meta.matched_category.name}`;
  }
  if (meta.match_type === "event") return "Events";
  if (meta.result_type === "dates") return "Available dates";
  return "Search results";
}

function filtersSummary(filters: LocationSearchFilters): string {
  const parts: string[] = [];
  const q = filters.query.trim();
  if (q) parts.push(`“${q}”`);
  if (filters.nearMe) parts.push("Near Me");
  else if (filters.city) parts.push(filters.city);
  if (filters.date) parts.push(format(filters.date, "d MMM yyyy"));
  if (parts.length === 0) return "Matching results";
  return `Results for ${parts.join(" · ")}`;
}

export function isPublicSearchEmpty(
  data: PublicSearchData | undefined,
  options: { isLoading?: boolean; isError?: boolean } = {},
): boolean {
  if (options.isError) return false;
  // Settled empty payload wins over a transient loading flag.
  if (data != null) {
    const total = data.meta?.total ?? data.results?.length ?? 0;
    if (total === 0) return true;
  }
  if (options.isLoading) return false;
  const total = data?.meta?.total ?? data?.results?.length ?? 0;
  return total === 0;
}

type PublicSearchResultsProps = {
  filters: LocationSearchFilters;
  data?: PublicSearchData;
  isLoading?: boolean;
  isError?: boolean;
  onClear: () => void;
  /** Anchor id for scroll-into-view from the search bar. */
  sectionId?: string;
  className?: string;
  /** Extra empty-state copy (e.g. browse cities below). */
  emptyHint?: string;
};

export function PublicSearchResults({
  filters,
  data,
  isLoading = false,
  isError = false,
  onClear,
  sectionId = LOCATION_EVENTS_ANCHOR_ID,
  className,
  emptyHint,
}: PublicSearchResultsProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { mutateAsync: storeEventBooking, isPending: isStoringBooking } =
    useStoreEventBooking();
  const { theme } = useContext(ServerContext);
  const currencySym = resolveCurrencySymbol(
    (theme as ThemeSchema | null)?.currency_symbol,
  );
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const meta = data?.meta;
  const results = data?.results ?? [];
  const eventResults = useMemo(
    () => results.filter((r): r is SearchEventResult => r.type === "event"),
    [results],
  );
  const dateResults = useMemo(
    () =>
      results.filter((r): r is SearchDateSlotResult => r.type === "date_slot"),
    [results],
  );

  /**
   * Date slots go straight to checkout via the existing cart API —
   * same path as the event-detail Dates section (not event detail).
   */
  const handleDateSlotClick = useCallback(
    async (slot: SearchDateSlotResult, key: string) => {
      if (slot.sold_out || pendingKey || isStoringBooking) return;

      const roomId = slot.bookable.room_id ?? slot.room?.room_id ?? undefined;
      const booking = {
        event_slug: slot.bookable.slug,
        event_name: slot.event.name,
        event_image: FALLBACK_IMAGE,
        event_date: slot.bookable.event_date,
        ...(roomId != null && roomId > 0 ? { room_id: roomId } : {}),
      };

      setPendingKey(key);

      const user = session?.user as
        | {
            account_type?: string;
            active_role?: string;
            token?: string;
          }
        | undefined;
      const isCustomer =
        status === "authenticated" &&
        user?.account_type === "customer" &&
        user?.active_role === "customer" &&
        Boolean(user?.token);

      if (!isCustomer) {
        savePendingBooking(booking);
        saveAuthCallbackUrl(CUSTOMER_CHECKOUT_PATH);
        router.push(
          `/auth/login?callbackUrl=${encodeURIComponent(CUSTOMER_CHECKOUT_PATH)}`,
        );
        return;
      }

      const cartData: CartRequest = {
        slug: booking.event_slug,
        event_date: booking.event_date,
        ...(booking.room_id != null ? { room_id: booking.room_id } : {}),
        drink_package: [],
        tables: [],
        tickets: [],
      };

      try {
        const response = await storeEventBooking({ data: cartData });
        if (response?.status === true) {
          router.push(CUSTOMER_CHECKOUT_PATH);
          return;
        }
        setPendingKey(null);
      } catch {
        setPendingKey(null);
      }
    },
    [
      isStoringBooking,
      pendingKey,
      router,
      session?.user,
      status,
      storeEventBooking,
    ],
  );

  const resultType = meta?.result_type ?? (dateResults.length ? "dates" : "events");
  const total = meta?.total ?? results.length;
  // Prefer settled API payload over transient isFetching so total=0 never hangs.
  const settledEmpty =
    data != null && !isError && (meta?.total ?? results.length) === 0;
  const empty = settledEmpty || (!isLoading && !isError && total === 0);
  const showSkeleton = isLoading && results.length === 0 && !settledEmpty;

  return (
    <section
      id={sectionId}
      className={cn(
        "scroll-mt-28 bg-[var(--color-background)] pb-[max(3.5rem,env(safe-area-inset-bottom))] pt-4 sm:pt-6 md:pb-20 md:pt-8",
        className,
      )}
      aria-live="polite"
    >
      <div className="mx-auto w-full max-w-7xl px-3 sm:px-6">
        <div className="mb-3 flex items-start justify-between gap-3 sm:mb-6">
          <div className="min-w-0 flex-1">
            <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--color-primary)] sm:mb-1 sm:text-[11px]">
              Search results
            </span>
            <SiteHeading
              level={2}
              title={resultsHeading(meta)}
              variant="onSurface"
              align="left"
              className="!text-[1.25rem] !font-black !leading-tight break-words sm:!text-3xl"
            />
            {isLoading && !settledEmpty ? (
              <Skeleton className="mt-1 h-4 w-48 sm:w-64" />
            ) : (
              <p className="mt-0.5 text-xs text-[var(--color-text-dimmed)] sm:mt-1 sm:text-sm">
                {empty
                  ? "No matches"
                  : `${total} result${total === 1 ? "" : "s"} · ${filtersSummary(filters)}`}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClear}
            className="mt-0.5 inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-[color:color-mix(in_srgb,var(--color-text)_14%,transparent)] bg-[var(--color-surface)] px-3 text-xs font-semibold text-[var(--color-text)] transition-colors hover:border-[color:var(--color-primary)] hover:text-[color:var(--color-primary)] sm:mt-1 sm:h-10 sm:px-4 sm:text-sm"
          >
            Clear
          </button>
        </div>

        {isError ? (
          <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-[20px] border border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] bg-[var(--color-surface)] px-5 py-10 text-center">
            <SearchX
              className="h-8 w-8 text-[var(--color-text-dimmed)]"
              aria-hidden
            />
            <p className="text-base font-semibold text-[var(--color-text)]">
              Search unavailable
            </p>
            <p className="text-sm text-[var(--color-text-dimmed)]">
              Please try again in a moment.
            </p>
          </div>
        ) : showSkeleton ? (
          <SearchResultsSkeleton variant={resultType} />
        ) : empty ? (
          <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-[20px] border border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] bg-[var(--color-surface)] px-5 py-10 text-center sm:px-6 sm:py-12">
            <SearchX
              className="h-8 w-8 text-[var(--color-text-dimmed)]"
              aria-hidden
            />
            <p className="text-base font-semibold text-[var(--color-text)]">
              {filters.nearMe
                ? "No events near you yet"
                : "No results match your search"}
            </p>
            <p className="text-sm text-[var(--color-text-dimmed)]">
              {filters.nearMe
                ? "No bookable events with a map pin were found within range. Try another date, or browse by city."
                : emptyHint ?? "Try another keyword, city, or date."}
            </p>
            <button
              type="button"
              onClick={onClear}
              className="mt-1 inline-flex h-11 w-full items-center justify-center rounded-full bg-[var(--color-primary)] px-5 text-sm font-semibold text-[var(--color-primary-foreground)] transition-opacity hover:opacity-95 sm:h-10 sm:w-auto"
            >
              Clear search
            </button>
          </div>
        ) : resultType === "dates" ? (
          <ul className="mx-auto flex max-w-3xl flex-col gap-2.5 sm:gap-3">
            {dateResults.map((slot) => {
              const key = [
                slot.location.slug,
                slot.event.slug,
                slot.date,
                slot.room?.room_id ?? "na",
              ].join(":");
              const price = formatEventListingPrice(slot.price, currencySym);
              const isBusy = pendingKey === key;

              return (
                <li key={key}>
                  <button
                    type="button"
                    disabled={slot.sold_out || Boolean(pendingKey)}
                    aria-busy={isBusy}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-2xl border border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] bg-[var(--color-surface)] px-3.5 py-3 text-left transition-colors sm:gap-4 sm:px-4 sm:py-3.5",
                      slot.sold_out
                        ? "cursor-not-allowed opacity-60"
                        : "hover:border-[color:var(--color-primary)]",
                      isBusy && "opacity-80",
                    )}
                    onClick={() => void handleDateSlotClick(slot, key)}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color:color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]">
                      {isBusy ? (
                        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                      ) : (
                        <CalendarDays className="h-5 w-5" aria-hidden />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[var(--color-text)] sm:text-base">
                        {formatSlotDate(slot.date)}
                        {slot.sold_out ? (
                          <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-red-600">
                            Sold out
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-[var(--color-text)]">
                        {slot.event.name}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--color-text-dimmed)]">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                          {slot.location.city}
                        </span>
                        {slot.room?.room_name ? (
                          <span>· {slot.room.room_name}</span>
                        ) : null}
                      </p>
                    </div>
                    {price ? (
                      <span className="shrink-0 text-sm font-bold tabular-nums text-[var(--color-primary)]">
                        {price}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 md:gap-5 xl:grid-cols-4">
            {eventResults.map((item) => {
              const event = item.event;
              const price = formatEventListingPrice(
                event.lowest_price,
                currencySym,
              );
              const dateLabel = getEventCardDateLabel(event);
              const cardKey = `${item.location.slug}:${event.slug}`;

              return (
                <div key={cardKey} className="min-w-0">
                  <LocationEventCard
                    event={{
                      title: event.name || "",
                      price,
                      dateLabel,
                      timeLabel: getEventCardTimeLabel(event),
                      category: event.category?.name ?? null,
                      image: event.banner_image || FALLBACK_IMAGE,
                      slug: event.slug || "",
                      distanceKm: item.distance_km,
                    }}
                    locationSlug={item.location.slug.replace(/^\/+/, "")}
                    locationLabel={item.location.city}
                    eventAddress={item.location.event_address}
                    showLocationChip
                    isPending={pendingKey === cardKey}
                    onNavigateStart={() => setPendingKey(cardKey)}
                    imageFallback={FALLBACK_IMAGE}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function SearchResultsSkeleton({
  variant,
}: {
  variant: "events" | "dates";
}) {
  if (variant === "dates") {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[4.5rem] w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 md:gap-5 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="min-w-0 space-y-2">
          <Skeleton className="aspect-[4/3] w-full rounded-xl" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}
