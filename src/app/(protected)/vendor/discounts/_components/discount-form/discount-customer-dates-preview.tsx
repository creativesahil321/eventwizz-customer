"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { parseLocalDate } from "../../_lib/schema";
import { FloatingRoomBar } from "@/components/rooms/floating-room-bar";
import {
  DISCOUNT_WIZARD_PREVIEW_BASE_PRICE,
  formatDateCardOfferBadge,
  type DateCardOffer,
} from "@/components/public/date-card-offer";
import { DateCardPriceFooter } from "@/components/public/date-card-price-footer";
import { unnamedRoomLabel } from "@/lib/room-name-examples";

export type DiscountDatePreviewItem = {
  key: string;
  /** Index in form `dates[]` — `-1` when the slot has no offer yet. */
  formIndex: number;
  eventDate: string;
  roomId: number;
  roomName: string | null;
  /** Compact badge, e.g. `10% OFF` — empty when value not set or badge hidden. */
  badge: string;
  ready: boolean;
  /** When false, offer is set but badge is hidden on the public page. */
  showOnPage?: boolean;
  /** Offer used for the top-of-card badge (wizard uses a demo list price). */
  offer?: DateCardOffer | null;
  /** Override demo list price when known. */
  listPrice?: number;
};

type DiscountCustomerDatesPreviewProps = {
  items: DiscountDatePreviewItem[];
  className?: string;
  /** Form index currently open below — highlights that card + room tab. */
  selectedFormIndex?: number | null;
  /** Open / create the offer for this date/room (Dates step). */
  onSetOffer?: (item: DiscountDatePreviewItem) => void;
  /**
   * Event-level room order (matches the live event page). When omitted, tabs
   * fall back to unique rooms sorted by id — never earliest-date-first.
   */
  rooms?: Array<{ roomId: number; label: string }>;
};

function dateParts(iso: string): {
  weekday: string;
  day: string;
  month: string;
} | null {
  const d = parseLocalDate(iso);
  if (!d) return null;
  return {
    weekday: d.toLocaleDateString("en-GB", { weekday: "long" }),
    day: String(d.getDate()),
    month: d.toLocaleDateString("en-GB", { month: "long" }),
  };
}

/**
 * Customer-side style preview: room tabs + dark “Select a Date” cards.
 * Clicking Set offer opens that date’s editor in the form above.
 */
export function DiscountCustomerDatesPreview({
  items,
  className,
  selectedFormIndex = null,
  onSetOffer,
  rooms,
}: DiscountCustomerDatesPreviewProps) {
  const roomTabs = useMemo(() => {
    const present = new Map<number, string>();
    for (const item of items) {
      if (item.roomId > 0 && item.roomName) {
        present.set(item.roomId, item.roomName);
      }
    }

    // Prefer event room order from the catalog — keep rooms with no upcoming
    // dates so the UI does not look like the room was removed from the event.
    if (rooms && rooms.length > 0) {
      const seen = new Set<number>();
      const ordered: Array<{ roomId: number; label: string }> = [];
      for (const room of rooms) {
        if (!(room.roomId > 0) || seen.has(room.roomId)) continue;
        seen.add(room.roomId);
        ordered.push({
          roomId: room.roomId,
          label: room.label || present.get(room.roomId) || unnamedRoomLabel(),
        });
      }
      for (const [roomId, label] of present) {
        if (seen.has(roomId)) continue;
        ordered.push({ roomId, label });
      }
      return ordered;
    }

    if (present.size === 0) return [];

    return Array.from(present.entries())
      .sort(([a], [b]) => a - b)
      .map(([roomId, label]) => ({ roomId, label }));
  }, [items, rooms]);

  const hasRoomTabs = roomTabs.length >= 2;
  const [activeRoomIndex, setActiveRoomIndex] = useState(0);

  useEffect(() => {
    if (activeRoomIndex >= roomTabs.length) {
      setActiveRoomIndex(0);
    }
  }, [activeRoomIndex, roomTabs.length]);

  // Keep room tab in sync with the offer open below.
  useEffect(() => {
    if (!hasRoomTabs || selectedFormIndex == null || selectedFormIndex < 0) {
      return;
    }
    const selected = items.find((item) => item.formIndex === selectedFormIndex);
    if (!selected || !(selected.roomId > 0)) return;
    const tabIndex = roomTabs.findIndex((r) => r.roomId === selected.roomId);
    if (tabIndex >= 0) setActiveRoomIndex(tabIndex);
  }, [hasRoomTabs, selectedFormIndex, items, roomTabs]);

  const activeRoomId = hasRoomTabs
    ? roomTabs[Math.min(activeRoomIndex, roomTabs.length - 1)]?.roomId
    : null;

  const visibleItems = useMemo(() => {
    if (!hasRoomTabs || activeRoomId == null) return items;
    return items.filter((item) => item.roomId === activeRoomId);
  }, [items, hasRoomTabs, activeRoomId]);

  if (!items.length) return null;

  return (
    <div className={cn("min-w-0 space-y-3", className)}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-[#0F172A]">
            Customer preview
          </h4>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {onSetOffer
              ? "First date is selected for you — tap another card to switch."
              : "How guests will see these offers on the event page."}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#1a1b2e]/20 shadow-sm">
        {hasRoomTabs ? (
          <div className="border-b border-gray-100 bg-white px-3 py-2.5">
            <FloatingRoomBar
              rooms={roomTabs.map((r) => ({
                key: String(r.roomId),
                label: r.label,
              }))}
              activeIndex={activeRoomIndex}
              onSelect={setActiveRoomIndex}
              layout="static"
              minRooms={2}
              label="Choose Room"
              size="sm"
              className="!px-0"
            />
          </div>
        ) : null}

        <div
          className={cn(
            "relative px-4 py-8 sm:px-6 sm:py-10",
            "bg-[#12121f] text-white",
          )}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background:
                "radial-gradient(ellipse 70% 55% at 50% 40%, color-mix(in srgb, var(--color-primary) 45%, transparent), transparent 70%)",
            }}
            aria-hidden
          />

          <div className="relative z-[1] text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--color-primary)]">
              Book your places now
            </p>
            <h5
              className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Select a Date
            </h5>
            {hasRoomTabs && activeRoomId != null ? (
              <p className="mt-1.5 text-xs text-white/60">
                {roomTabs.find((r) => r.roomId === activeRoomId)?.label}
              </p>
            ) : null}
          </div>

          {visibleItems.length === 0 ? (
            <p className="relative z-[1] mt-8 text-center text-sm text-white/50">
              No dates for this room.
            </p>
          ) : (
            <ul
              className={cn(
                "relative z-[1] mt-8 flex flex-wrap justify-center gap-3 sm:gap-4",
              )}
            >
              {visibleItems.map((item) => {
                const parts = dateParts(item.eventDate);
                const interactive = Boolean(onSetOffer);
                const listPrice =
                  item.listPrice ?? DISCOUNT_WIZARD_PREVIEW_BASE_PRICE;
                const showBadgeOnPage = Boolean(item.badge?.trim());
                const isSelected =
                  selectedFormIndex != null &&
                  selectedFormIndex >= 0 &&
                  item.formIndex === selectedFormIndex;
                /** Dates step: incomplete / missing offer → prompt. Review: plain list price. */
                const needsOfferPrompt = !item.ready && interactive;

                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      disabled={!interactive}
                      onClick={() => onSetOffer?.(item)}
                      className={cn(
                        "flex w-[5.75rem] flex-col overflow-hidden rounded-2xl border text-center transition-all sm:w-[6.5rem]",
                        "border-[color:color-mix(in_srgb,var(--color-primary)_55%,transparent)]",
                        "bg-transparent text-white",
                        "shadow-[0_0_15px_rgba(60,70,147,0.25)]",
                        interactive &&
                          "hover:border-[var(--color-primary)] hover:bg-[color:color-mix(in_srgb,var(--color-primary)_12%,transparent)] hover:shadow-[0_0_25px_rgba(60,70,147,0.45)]",
                        interactive && "cursor-pointer active:scale-[0.98]",
                        !interactive && "cursor-default",
                        isSelected
                          ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/70 shadow-[0_0_22px_rgba(60,70,147,0.45)]"
                          : showBadgeOnPage &&
                              "ring-1 ring-[var(--color-primary)]/50",
                      )}
                      aria-label={
                        item.badge
                          ? `${parts?.weekday ?? "Date"} ${parts?.day ?? ""} — ${item.badge}. Edit offer`
                          : needsOfferPrompt
                            ? `${parts?.weekday ?? "Date"} ${parts?.day ?? ""} — set offer`
                            : `${parts?.weekday ?? "Date"} ${parts?.day ?? ""} — ${listPrice}`
                      }
                    >
                      <div className="px-2 py-3 sm:py-3.5">
                        {parts ? (
                          <>
                            <p className="text-[10px] font-medium text-white/80 sm:text-xs">
                              {parts.weekday}
                            </p>
                            <p className="py-1 text-3xl font-bold tabular-nums leading-none sm:text-4xl">
                              {parts.day}
                            </p>
                            <p className="text-[10px] text-white/75 sm:text-xs">
                              {parts.month}
                            </p>
                          </>
                        ) : (
                          <p className="text-xs font-medium">Date</p>
                        )}
                      </div>
                      <div className="bg-gradient-to-b from-[var(--color-primary)] to-[#232a61]">
                        {needsOfferPrompt ? (
                          <DateCardPriceFooter
                            currencySymbol="£"
                            listPrice={listPrice}
                            fallbackLabel="Set offer"
                            compact
                          />
                        ) : (
                          <DateCardPriceFooter
                            currencySymbol="£"
                            listPrice={listPrice}
                            offerLabel={
                              showBadgeOnPage ? item.badge : undefined
                            }
                            offer={showBadgeOnPage ? item.offer : null}
                            compact
                          />
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/** Compact badge for a date-row offer (preview / public). */
export function formatDiscountPreviewBadge(entry: {
  value_type: "percentage" | "flat";
  discount_value: number;
  flat_mode?: "total" | "per_person" | null;
}): string {
  return formatDateCardOfferBadge(entry);
}
