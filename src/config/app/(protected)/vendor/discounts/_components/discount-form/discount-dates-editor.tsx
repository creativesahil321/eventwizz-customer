"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FieldPath, UseFormReturn } from "react-hook-form";
import {
  CalendarDays,
  Check,
  DoorOpen,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import {
  defaultDiscountDateEntry,
  formatGuideDate,
  isDiscountDateOfferReady,
  todayIsoDate,
  type DiscountFormValues,
} from "../../_lib/schema";
import type { DiscountEventWithDates } from "../../_lib/types";
import { DISCOUNT_OFFER_KIND_LABELS } from "../../_lib/types";
import {
  buildCustomerPreviewItems,
  buildEventCatalogSlots,
  listDiscountEventRooms,
  slotKey,
  type EventCatalogSlot,
} from "../../_lib/offers";
import {
  DiscountCustomerDatesPreview,
  formatDiscountPreviewBadge,
} from "./discount-customer-dates-preview";

type OfferKind = "percentage" | "flat_per_person";

function offerKindFromEntry(entry: {
  value_type: "percentage" | "flat";
  flat_mode?: "total" | "per_person" | null;
}): OfferKind {
  if (entry.value_type === "percentage") return "percentage";
  // Flat off total removed — treat legacy flat/total as per-person in the editor.
  return "flat_per_person";
}

function applyOfferKind(
  kind: OfferKind,
): Pick<
  DiscountFormValues["dates"][number],
  "value_type" | "flat_mode" | "min_people"
> {
  if (kind === "percentage") {
    return { value_type: "percentage", flat_mode: null, min_people: null };
  }
  return { value_type: "flat", flat_mode: "per_person", min_people: null };
}

function firstOfferIndex(rows: DiscountFormValues["dates"]): number {
  const incomplete = rows.findIndex(
    (d) => d.date_id > 0 && !isDiscountDateOfferReady(d),
  );
  if (incomplete >= 0) return incomplete;
  return rows.findIndex((d) => d.date_id > 0);
}

type CatalogSlot = EventCatalogSlot;

type DiscountDatesEditorProps = {
  form: UseFormReturn<DiscountFormValues>;
  selectedEvent: DiscountEventWithDates | null;
  disabled?: boolean;
};

const COMPACT_LIST_THRESHOLD = 6;

export function DiscountDatesEditor({
  form,
  selectedEvent,
  disabled,
}: DiscountDatesEditorProps) {
  const dates = form.watch("dates") ?? [];
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  /** Brief ring highlight when a date is opened from the customer preview. */
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [slotSearch, setSlotSearch] = useState("");
  const hasOffers = (dates ?? []).some((d) => d.date_id > 0);
  /** Collapse once offers exist so the value editors stay in view. */
  const [pickerOpen, setPickerOpen] = useState(!hasOffers);
  const offersSectionRef = useRef<HTMLElement | null>(null);
  const offerRowRefs = useRef<Map<number, HTMLElement | null>>(new Map());
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevHasOffersRef = useRef(hasOffers);
  /** After Done, don't auto-reopen until they pick a date in the preview. */
  const skipAutoOpenRef = useRef(false);
  const lastAutoOpenEventRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const hadOffers = prevHasOffersRef.current;
    prevHasOffersRef.current = hasOffers;
    if (hasOffers && !hadOffers) {
      setPickerOpen(false);
      return;
    }
    if (!hasOffers) setPickerOpen(true);
  }, [hasOffers]);

  const catalogSlots = useMemo(
    () => buildEventCatalogSlots(selectedEvent),
    [selectedEvent],
  );

  const eventRoomTabs = useMemo(
    () => listDiscountEventRooms(selectedEvent),
    [selectedEvent],
  );

  /** One calendar day → offer panel can stay visible; multi-day stays preview-first. */
  const isSingleDateEvent = useMemo(() => {
    const unique = new Set(catalogSlots.map((s) => s.date));
    return unique.size === 1;
  }, [catalogSlots]);

  // Drop blank rows left by older UI.
  useEffect(() => {
    const rows = form.getValues("dates") ?? [];
    const cleaned = rows.filter((row) => row.date_id > 0);
    if (cleaned.length !== rows.length) {
      form.setValue("dates", cleaned, {
        shouldValidate: false,
        shouldDirty: true,
      });
      setExpandedIndex(cleaned.length ? 0 : null);
    }
  }, [form, selectedEvent?.id]);

  /**
   * Pre-populate all event date/room slots into Your offers so vendors can
   * set values immediately (no manual “Add” first). Runs once per event when
   * the form has no offers yet.
   */
  const autoFilledEventRef = useRef<number | null>(null);
  useEffect(() => {
    if (!selectedEvent?.id || catalogSlots.length === 0) return;

    const rows = form.getValues("dates") ?? [];
    const existing = rows.filter((d) => d.date_id > 0);

    if (existing.length > 0) {
      autoFilledEventRef.current = selectedEvent.id;
      return;
    }

    if (autoFilledEventRef.current === selectedEvent.id) return;
    autoFilledEventRef.current = selectedEvent.id;

    form.setValue(
      "dates",
      catalogSlots.map((slot) => ({
        ...defaultDiscountDateEntry(),
        date_id: slot.dateId,
        event_date: slot.date,
        room_id: slot.roomId,
      })),
      { shouldValidate: false, shouldDirty: true },
    );
    form.clearErrors("dates");
    setPickerOpen(false);
  }, [selectedEvent?.id, catalogSlots, form]);

  // Always open an offer form when dates exist (first / first incomplete).
  // Skipped only after the vendor clicks Done, until they pick another card.
  useEffect(() => {
    if (!selectedEvent?.id) return;
    if (lastAutoOpenEventRef.current !== selectedEvent.id) {
      lastAutoOpenEventRef.current = selectedEvent.id;
      skipAutoOpenRef.current = false;
    }
    if (skipAutoOpenRef.current) return;
    if (expandedIndex != null) return;

    const idx = firstOfferIndex(dates);
    if (idx < 0) return;
    setExpandedIndex(idx);
    setHighlightedIndex(idx);
  }, [selectedEvent?.id, dates, expandedIndex]);

  const usedSlotKeys = useMemo(
    () =>
      new Set(
        dates
          .filter((d) => d.date_id > 0)
          .map((d) => slotKey(d.date_id, Number(d.room_id) || 0)),
      ),
    [dates],
  );

  const availableSlots = useMemo(
    () => catalogSlots.filter((s) => !usedSlotKeys.has(s.key)),
    [catalogSlots, usedSlotKeys],
  );

  const filteredAvailableSlots = useMemo(() => {
    const q = slotSearch.trim().toLowerCase();
    if (!q) return availableSlots;
    return availableSlots.filter((s) => {
      const dateLabel = formatGuideDate(s.date).toLowerCase();
      const room = (s.roomName ?? "").toLowerCase();
      return (
        dateLabel.includes(q) ||
        room.includes(q) ||
        s.date.includes(q)
      );
    });
  }, [availableSlots, slotSearch]);

  /** Group remaining slots by calendar day for a scannable list. */
  const availableByDate = useMemo(() => {
    const map = new Map<string, CatalogSlot[]>();
    for (const slot of filteredAvailableSlots) {
      const list = map.get(slot.date) ?? [];
      list.push(slot);
      map.set(slot.date, list);
    }
    return Array.from(map.entries()).map(([date, slots]) => ({
      date,
      slots,
    }));
  }, [filteredAvailableSlots]);

  const useScrollablePicker =
    availableSlots.length >= COMPACT_LIST_THRESHOLD ||
    Boolean(slotSearch.trim());

  const addedDates = useMemo(
    () =>
      dates
        .map((entry, index) => ({ entry, index }))
        .filter(({ entry }) => entry.date_id > 0),
    [dates],
  );

  const roomNameFor = (dateId: number, roomId: number) => {
    const slot = catalogSlots.find(
      (s) => s.dateId === dateId && s.roomId === roomId,
    );
    return slot?.roomName ?? (roomId > 0 ? `Room #${roomId}` : null);
  };

  const addSlots = (slots: CatalogSlot[]) => {
    const fresh = form.getValues("dates") ?? [];
    const existing = fresh.filter((d) => d.date_id > 0);
    const existingKeys = new Set(
      existing.map((d) => slotKey(d.date_id, Number(d.room_id) || 0)),
    );
    const extras = slots
      .filter((slot) => !existingKeys.has(slot.key))
      .map((slot) => ({
        ...defaultDiscountDateEntry(),
        date_id: slot.dateId,
        event_date: slot.date,
        room_id: slot.roomId,
      }));
    if (!extras.length) return;
    const next = [...existing, ...extras];
    // Don't validate yet — avoid red errors on a brand-new empty offer.
    form.setValue("dates", next, { shouldValidate: false, shouldDirty: true });
    form.clearErrors("dates");
    setExpandedIndex(existing.length);
    setPickerOpen(false);
    requestAnimationFrame(() => {
      offersSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  };

  const addSlot = (slot: CatalogSlot) => addSlots([slot]);

  const addAllAvailable = () => addSlots(availableSlots);

  const removeDate = (index: number) => {
    const next = dates.filter((_, i) => i !== index);
    form.setValue("dates", next, { shouldValidate: false, shouldDirty: true });
    form.clearErrors("dates");
    setExpandedIndex((prev) => {
      if (prev == null) return null;
      if (prev === index)
        return next.length ? Math.min(index, next.length - 1) : null;
      if (prev > index) return prev - 1;
      return prev;
    });
  };

  const updateEntry = (
    index: number,
    patch: Partial<DiscountFormValues["dates"][number]>,
  ) => {
    const current = form.getValues("dates") ?? [];
    const next = current.map((row, i) =>
      i === index ? { ...row, ...patch } : row,
    );
    // Validate on Next; keep editing quiet until then — but drop stale
    // field errors for keys the vendor just changed (e.g. after Next failed).
    form.setValue("dates", next, { shouldValidate: false, shouldDirty: true });
    for (const key of Object.keys(patch)) {
      form.clearErrors(
        `dates.${index}.${key}` as FieldPath<DiscountFormValues>,
      );
    }
  };

  if (!selectedEvent) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
        Select an event first, then choose dates for this discount.
      </div>
    );
  }

  if (catalogSlots.length === 0) {
    const roomCount = eventRoomTabs.length;
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
        {roomCount > 0
          ? "This event’s rooms have no upcoming dates yet. Add dates on the event, then come back."
          : "This event has no dates yet. Add dates on the event, then come back."}
      </div>
    );
  }

  const completeCount = addedDates.filter(({ entry }) =>
    isDiscountDateOfferReady(entry),
  ).length;

  /** Every event date/room — not only rows already in Your offers. */
  const customerPreviewItems = useMemo(
    () =>
      buildCustomerPreviewItems(
        catalogSlots,
        dates,
        formatDiscountPreviewBadge,
      ),
    [catalogSlots, dates],
  );

  const openOfferFromPreview = (item: {
    formIndex: number;
    eventDate: string;
    roomId: number;
  }) => {
    let formIndex = item.formIndex;
    if (formIndex < 0) {
      const slot = catalogSlots.find(
        (s) =>
          s.date === item.eventDate && s.roomId === item.roomId,
      );
      if (!slot) return;
      addSlots([slot]);
      const rows = form.getValues("dates") ?? [];
      formIndex = rows.findIndex(
        (d) =>
          d.date_id === slot.dateId &&
          (Number(d.room_id) || 0) === slot.roomId,
      );
      if (formIndex < 0) return;
    }

    skipAutoOpenRef.current = false;
    setExpandedIndex(formIndex);
    setHighlightedIndex(formIndex);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedIndex((current) =>
        current === formIndex ? null : current,
      );
    }, 2800);

    requestAnimationFrame(() => {
      offersSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
      const row = offerRowRefs.current.get(formIndex);
      row?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  /** Only the preview-selected offer — no duplicate date/room list. */
  const activeIndex =
    expandedIndex != null &&
    expandedIndex >= 0 &&
    expandedIndex < dates.length &&
    dates[expandedIndex]?.date_id > 0
      ? expandedIndex
      : null;
  const activeEntry = activeIndex != null ? dates[activeIndex] : null;
  const showOffersPanel = activeIndex != null && activeEntry != null;

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h3 className="text-base font-medium">Dates & offers</h3>
        <FormDescription className="mt-1 max-w-xl text-pretty">
          {isSingleDateEvent
            ? "Set how much off and when this offer expires."
            : "The first date is selected below — switch dates in the preview anytime."}
        </FormDescription>
      </div>

      {form.formState.errors.dates?.message ||
      (typeof form.formState.errors.dates?.root?.message === "string" &&
        form.formState.errors.dates.root.message) ? (
        <p className="text-sm text-destructive">
          {String(
            form.formState.errors.dates?.message ||
              form.formState.errors.dates?.root?.message,
          )}
        </p>
      ) : null}

      {/* Preview first — customer-style navigation into offer editors */}
      {customerPreviewItems.length > 0 ? (
        <DiscountCustomerDatesPreview
          items={customerPreviewItems}
          rooms={eventRoomTabs}
          selectedFormIndex={activeIndex}
          onSetOffer={openOfferFromPreview}
        />
      ) : null}

      {/* Re-add only if something was removed */}
      {availableSlots.length > 0 ? (
        <section className="min-w-0 space-y-2.5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-[#0F172A]">
                Removed dates
              </h4>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {availableSlots.length} can be added back
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!pickerOpen ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPickerOpen(true)}
                  disabled={disabled}
                >
                  Show
                </Button>
              ) : null}
              {pickerOpen && availableSlots.length > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAllAvailable}
                  disabled={disabled}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add all
                </Button>
              ) : null}
            </div>
          </div>

          {!pickerOpen ? (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="w-full rounded-lg border border-dashed px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-primary)]/5"
            >
              Add {availableSlots.length} date
              {availableSlots.length === 1 ? "" : "s"} back to offers
            </button>
          ) : (
            <div className="min-w-0 overflow-hidden rounded-xl border bg-white">
              {availableSlots.length >= COMPACT_LIST_THRESHOLD ? (
                <div className="border-b px-3 py-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={slotSearch}
                      onChange={(e) => setSlotSearch(e.target.value)}
                      placeholder="Filter date or room…"
                      className="h-8 pl-8 text-sm"
                      disabled={disabled}
                    />
                  </div>
                </div>
              ) : null}

              <div
                className={cn(
                  "divide-y",
                  useScrollablePicker &&
                    "max-h-[min(16rem,38vh)] overflow-y-auto overscroll-contain",
                )}
              >
                {availableByDate.length === 0 ? (
                  <p className="px-3 py-5 text-center text-sm text-muted-foreground">
                    No matches for “{slotSearch.trim()}”.
                  </p>
                ) : (
                  availableByDate.map(({ date, slots }) => {
                    const hasRooms = slots.some((s) => Boolean(s.roomName));
                    return (
                      <div key={date} className="min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#F7FCFC] px-3 py-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <CalendarDays
                              className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]"
                              aria-hidden
                            />
                            <div className="min-w-0 leading-tight">
                              <span className="sr-only">Date: </span>
                              <p className="truncate text-sm font-semibold text-[#0F172A]">
                                {formatGuideDate(date)}
                              </p>
                            </div>
                          </div>
                          {hasRooms && slots.length > 1 ? (
                            <button
                              type="button"
                              disabled={disabled}
                              onClick={() => addSlots(slots)}
                              className="text-xs font-medium text-[var(--color-primary)] hover:underline disabled:opacity-50"
                            >
                              Add all rooms
                            </button>
                          ) : null}
                        </div>
                        <ul className="divide-y bg-white">
                          {slots.map((slot) => (
                            <li key={slot.key}>
                              <button
                                type="button"
                                disabled={disabled}
                                onClick={() => addSlot(slot)}
                                className={cn(
                                  "flex w-full min-w-0 items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors",
                                  "hover:bg-[var(--color-primary)]/5",
                                  "disabled:pointer-events-none disabled:opacity-60",
                                )}
                              >
                                {slot.roomName ? (
                                  <>
                                    <DoorOpen
                                      className="h-3.5 w-3.5 shrink-0 text-[#0B6A75]"
                                      aria-hidden
                                    />
                                    <span className="min-w-0 flex-1 truncate">
                                      <span className="text-muted-foreground">
                                        Room:{" "}
                                      </span>
                                      <span className="font-medium text-[#0F172A]">
                                        {slot.roomName}
                                      </span>
                                    </span>
                                  </>
                                ) : (
                                  <span className="min-w-0 flex-1 font-medium text-[#0F172A]">
                                    Whole date
                                  </span>
                                )}
                                <Plus className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </section>
      ) : null}

      {/* Active offer only — selected from preview (no duplicate date list). */}
      {showOffersPanel && activeEntry && activeIndex != null ? (
        <section ref={offersSectionRef} className="min-w-0 space-y-2.5">
          {(() => {
            const index = activeIndex;
            const entry = activeEntry;
            const roomName = roomNameFor(
              entry.date_id,
              Number(entry.room_id) || 0,
            );
            const kind = offerKindFromEntry(entry);
            const minValidFrom =
              entry.original_valid_from?.trim() &&
              entry.original_valid_from < todayIsoDate()
                ? entry.original_valid_from
                : todayIsoDate();
            const dateErrors = form.formState.errors.dates?.[index];
            const isComplete = isDiscountDateOfferReady(entry);

            return (
              <article
                ref={(el) => {
                  offerRowRefs.current.set(index, el);
                }}
                className={cn(
                  "min-w-0 overflow-hidden rounded-xl border border-[#D6ECEF] bg-white",
                  dateErrors && "border-destructive/40",
                  highlightedIndex === index &&
                    "ring-2 ring-[var(--color-primary)]/40",
                )}
              >
                <header className="flex flex-wrap items-center gap-2 border-b border-[#D6ECEF] bg-[#F7FCFC] px-3 py-2.5 sm:px-4">
                  <CalendarDays
                    className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]"
                    aria-hidden
                  />
                  <div className="min-w-0 leading-tight">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Editing offer
                    </p>
                    <p className="truncate text-sm font-semibold text-[#0F172A]">
                      {entry.event_date
                        ? formatGuideDate(entry.event_date)
                        : "—"}
                      {roomName ? ` · ${roomName}` : ""}
                    </p>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {completeCount}/{addedDates.length} ready
                    </span>
                    {isComplete ? (
                      <Check
                        className="h-3.5 w-3.5 text-emerald-600"
                        aria-hidden
                      />
                    ) : null}
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      className="h-8"
                      onClick={() => {
                        skipAutoOpenRef.current = true;
                        setExpandedIndex(null);
                        setHighlightedIndex(null);
                      }}
                      disabled={disabled || !isComplete}
                      title={
                        isComplete
                          ? "Finish editing this offer"
                          : "Enter % off (or amount) and expiry first"
                      }
                    >
                      Done
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeDate(index)}
                      disabled={disabled}
                      aria-label="Remove offer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </header>

                <div className="space-y-3 px-3 py-3 sm:px-4">
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      Object.keys(DISCOUNT_OFFER_KIND_LABELS) as OfferKind[]
                    ).map((offerKey) => {
                      const selected = kind === offerKey;
                      return (
                        <button
                          key={offerKey}
                          type="button"
                          disabled={disabled}
                          onClick={() =>
                            updateEntry(index, applyOfferKind(offerKey))
                          }
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-xs transition-colors",
                            selected
                              ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 font-semibold text-[var(--color-primary)]"
                              : "hover:border-[var(--color-primary)]/40",
                          )}
                        >
                          {DISCOUNT_OFFER_KIND_LABELS[offerKey]}
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid min-w-0 gap-3 sm:grid-cols-3">
                    <FormField
                      control={form.control}
                      name={`dates.${index}.discount_value`}
                      render={() => (
                        <FormItem className="min-w-0">
                          <FormLabel className="text-xs">
                            {entry.value_type === "percentage"
                              ? "% off"
                              : "Amount £"}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              inputMode="decimal"
                              min={0}
                              max={
                                entry.value_type === "percentage"
                                  ? 100
                                  : undefined
                              }
                              step={
                                entry.value_type === "percentage" ? 1 : 0.01
                              }
                              value={
                                entry.discount_value > 0
                                  ? entry.discount_value
                                  : ""
                              }
                              onChange={(e) => {
                                const raw = e.target.value;
                                updateEntry(index, {
                                  discount_value:
                                    raw === "" ? 0 : Number(raw),
                                });
                              }}
                              disabled={disabled}
                              className="h-9"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {kind === "flat_per_person" ? (
                      <FormField
                        control={form.control}
                        name={`dates.${index}.min_people`}
                        render={() => (
                          <FormItem className="min-w-0">
                            <FormLabel className="text-xs">Min people</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                inputMode="numeric"
                                min={1}
                                max={500}
                                value={entry.min_people ?? ""}
                                onChange={(e) =>
                                  updateEntry(index, {
                                    min_people: e.target.value
                                      ? Number(e.target.value)
                                      : null,
                                  })
                                }
                                disabled={disabled}
                                className="h-9"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : (
                      <FormField
                        control={form.control}
                        name={`dates.${index}.valid_from`}
                        render={() => (
                          <FormItem className="min-w-0">
                            <FormLabel className="text-xs">
                              Valid from{" "}
                              <span className="font-normal text-muted-foreground">
                                (optional)
                              </span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                min={minValidFrom}
                                max={
                                  entry.expires_at ||
                                  entry.event_date ||
                                  undefined
                                }
                                value={entry.valid_from ?? ""}
                                onChange={(e) =>
                                  updateEntry(index, {
                                    valid_from: e.target.value,
                                  })
                                }
                                disabled={disabled}
                                className="h-9"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name={`dates.${index}.expires_at`}
                      render={() => (
                        <FormItem className="min-w-0">
                          <FormLabel className="text-xs">
                            Expiry{" "}
                            <span className="font-normal text-muted-foreground">
                              (by {formatGuideDate(entry.event_date)})
                            </span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              min={todayIsoDate()}
                              max={entry.event_date || undefined}
                              value={entry.expires_at ?? ""}
                              onChange={(e) =>
                                updateEntry(index, {
                                  expires_at: e.target.value,
                                })
                              }
                              disabled={disabled}
                              className="h-9"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <FormField
                      control={form.control}
                      name={`dates.${index}.show_on_banner`}
                      render={() => (
                        <FormItem className="flex min-w-0 flex-row items-start gap-3 rounded-lg border bg-[#F7FCFC] p-3">
                          <FormControl>
                            <Checkbox
                              checked={entry.show_on_banner !== false}
                              onCheckedChange={(v) =>
                                updateEntry(index, {
                                  show_on_banner: v === true,
                                })
                              }
                              disabled={disabled}
                              className="mt-0.5"
                            />
                          </FormControl>
                          <div className="min-w-0 space-y-0.5">
                            <FormLabel className="cursor-pointer text-xs font-medium leading-snug">
                              Show offer on event page
                            </FormLabel>
                            <FormDescription className="text-[11px] text-pretty">
                              When on, guests see the badge (e.g. 10% OFF) on
                              this date. Off = checkout only.
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`dates.${index}.is_live`}
                      render={() => (
                        <FormItem className="flex min-w-0 flex-row items-start gap-3 rounded-lg border bg-[#F7FCFC] p-3">
                          <FormControl>
                            <Checkbox
                              checked={entry.is_live !== false}
                              onCheckedChange={(v) =>
                                updateEntry(index, {
                                  is_live: v === true,
                                })
                              }
                              disabled={disabled}
                              className="mt-0.5"
                            />
                          </FormControl>
                          <div className="min-w-0 space-y-0.5">
                            <FormLabel className="cursor-pointer text-xs font-medium leading-snug">
                              Immediately live
                            </FormLabel>
                            <FormDescription className="text-[11px] text-pretty">
                              When on, this date’s offer works at checkout as
                              soon as you save. Off = paused (settings stay
                              saved).
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  {kind === "flat_per_person" ? (
                    <FormField
                      control={form.control}
                      name={`dates.${index}.valid_from`}
                      render={() => (
                        <FormItem className="min-w-0 max-w-xs">
                          <FormLabel className="text-xs">
                            Valid from{" "}
                            <span className="font-normal text-muted-foreground">
                              (optional)
                            </span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              min={minValidFrom}
                              max={
                                entry.expires_at ||
                                entry.event_date ||
                                undefined
                              }
                              value={entry.valid_from ?? ""}
                              onChange={(e) =>
                                updateEntry(index, {
                                  valid_from: e.target.value,
                                })
                              }
                              disabled={disabled}
                              className="h-9"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : null}
                </div>
              </article>
            );
          })()}
        </section>
      ) : null}
    </div>
  );
}
