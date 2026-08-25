/**
 * Redesigned Date Section Component
 * Visual hierarchy overhaul: distinct section accents for tables/tickets/drinks
 * No more tabs — all item types shown as flat sections with clear differentiation.
 * Auto-save remains invisible to the user.
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronDown,
  ChevronUp,
  Calendar,
  Wine,
  UtensilsCrossed,
  Ticket,
  MessageSquare,
  Trash2,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useIsPreviewMode } from "@/contexts/preview-context";

import QuantityControls from "./quantity-controls";
import TableRecommendations from "./table-recommendations";
import { useCartEditStore, EditableItem } from "@/store/cart-edit.store";
import { useStoreEventBooking } from "@/services/customer/cart/query";
import {
  validateCartPrices,
  sanitizeCartPrices,
  logSecurityIncident,
} from "@/lib/security/price-validation";
import {
  buildDateSelectionSummary,
  calculateEditableDateDiscountableTotal,
  calculateEditableDateTotal,
  getDateGuestCount,
} from "../_lib/cart-calculations";
import { useCurrencyFormat } from "@/hooks/use-currency-format";
import { getCheckoutRoomTone } from "../_lib/checkout-room-tones";
import { cn } from "@/lib/utils";
import { formatCheckoutAvailabilityLabel } from "../_lib/checkout-availability";

interface DateAccordionProps {
  eventSlug: string;
  date: string;
  dateData: {
    tables: EditableItem[];
    tickets: EditableItem[];
    drinks: EditableItem[];
  };
  isExpanded: boolean;
  onToggle: () => void;
  onRemoveDate?: (date: string) => void;
  /** Shows a subtle spinner on the date delete control while the API request runs. */
  isRemoving?: boolean;
  /** Room ID for multi-room events (display/context only — store uses composite key). */
  roomId?: number;
  /** Nested inside the room checkout card (no outer card chrome). */
  embedded?: boolean;
  /** Accent index for room-colored calendar icon. */
  roomAccentIndex?: number;
  /** Shown inline under the date for single-room checkout (no room tab bar). */
  roomName?: string;
  /** Event-level drink section label from cart API. */
  drinkTitle?: string;
  /** Server cart event payload for price validation on save. */
  serverEventData?: Record<string, unknown> | null;
  /** Automatic date discount label from cart API (`discount.value_label`). */
  discountLabel?: string | null;
  /** Monetary saving when the date offer is currently eligible. */
  discountAmount?: number | null;
  /**
   * Pre-discount base shown as strikethrough.
   * Per-person table offers → table total; percentage → tables + tickets.
   */
  discountStrikeAmount?: number | null;
  /** Why the offer is locked (e.g. min guests) — shown instead of “applied”. */
  discountLockedHint?: string | null;
}

function cartSavePayloadKey(cartData: {
  event_date: string;
  room_id?: number;
  people_quantity?: number;
  tables?: unknown[];
  tickets?: unknown[];
  drink_package?: unknown[];
}): string {
  return JSON.stringify({
    event_date: cartData.event_date,
    room_id: cartData.room_id ?? null,
    people_quantity: cartData.people_quantity ?? null,
    tables: cartData.tables ?? [],
    tickets: cartData.tickets ?? [],
    drink_package: cartData.drink_package ?? [],
  });
}

function getErrorHttpStatus(error: unknown): number | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: { status?: unknown } }).response?.status ===
      "number"
  ) {
    return (error as { response: { status: number } }).response.status;
  }
  return undefined;
}

function CheckoutAvailabilityHint({
  maxQuantity,
  quantity = 0,
}: {
  maxQuantity?: number;
  quantity?: number;
}) {
  const label = formatCheckoutAvailabilityLabel(maxQuantity, quantity);
  if (!label) return null;

  return (
    <p
      className={cn(
        "mt-1 text-xs font-medium",
        label.tone === "sold-out" &&
          "text-[color:var(--checkout-muted-foreground)]",
        label.tone === "low" && "text-amber-600",
        label.tone === "default" &&
          "text-[color:var(--checkout-muted-foreground)]",
      )}
    >
      {label.text}
    </p>
  );
}

export default function DateAccordion({
  eventSlug,
  date,
  dateData,
  isExpanded,
  onToggle,
  onRemoveDate,
  isRemoving = false,
  roomId,
  embedded = false,
  roomAccentIndex = 0,
  roomName,
  drinkTitle = "Drinks",
  serverEventData = null,
  discountLabel = null,
  discountAmount = null,
  discountStrikeAmount = null,
  discountLockedHint = null,
}: DateAccordionProps) {
  const { format: formatMoney, formatCompact: formatMoneyUnit } =
    useCurrencyFormat();
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [showSpecialRequest, setShowSpecialRequest] = useState(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);
  const pendingFollowUpSaveRef = useRef(false);
  const lastFailedSaveKeyRef = useRef<string | null>(null);
  const isPreviewMode = useIsPreviewMode();
  const { mutateAsync: storeEventBooking } = useStoreEventBooking();

  const {
    updateQuantity,
    hasUnsavedChanges,
    markDateAsSaved,
    getItemsForAPI,
    getTotalQuantity,
    validateDateRequirements,
    validateGuestAllocation,
    getDateData,
    updateSpecialRequest,
  } = useCartEditStore();

  const currentDateData = getDateData(eventSlug, date);
  const specialRequest = currentDateData?.specialRequest || "";

  const hasChanges = hasUnsavedChanges(eventSlug, date);

  // Check validation status
  const validation = validateDateRequirements(eventSlug, date);
  const hasValidationError = !validation.isValid && validation.errorMessage;

  // AUTO-SAVE: Invisible to user — no badges, no status shown
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    if (
      isExpanded &&
      hasChanges &&
      !isSaving &&
      !isAutoSaving &&
      !isSavingRef.current &&
      !isPreviewMode
    ) {
      autoSaveTimerRef.current = setTimeout(async () => {
        if (isSavingRef.current) return;
        const pendingKey = cartSavePayloadKey(
          getItemsForAPI(eventSlug, date, roomId),
        );
        // Same payload already saved or failed — wait until the cart changes.
        if (lastFailedSaveKeyRef.current === pendingKey) return;
        try {
          setIsAutoSaving(true);
          await handleSaveDate();
        } catch (error) {
          console.error("Auto-save error:", error);
        } finally {
          setIsAutoSaving(false);
        }
      }, 2000);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [isExpanded, hasChanges, isSaving, isAutoSaving, isPreviewMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalAmount = calculateEditableDateTotal(dateData);
  const discountableTotal = calculateEditableDateDiscountableTotal(dateData);
  const appliedDiscount =
    typeof discountAmount === "number" && discountAmount > 0
      ? discountAmount
      : 0;
  const strikeBase =
    typeof discountStrikeAmount === "number" && discountStrikeAmount > 0
      ? discountStrikeAmount
      : discountableTotal;
  const payableAmount = Math.max(0, totalAmount - appliedDiscount);

  const handleSaveDate = async (): Promise<boolean> => {
    if (isSavingRef.current || isSaving) {
      pendingFollowUpSaveRef.current = true;
      return false;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    let succeeded = false;

    const saveTimeout = setTimeout(() => {
      if (isSavingRef.current) {
        console.error("❌ Save operation timed out after 30 seconds");
        isSavingRef.current = false;
        setIsSaving(false);
        setIsAutoSaving(false);
        toast.error("Save operation timed out. Please try again.");
      }
    }, 30000);

    try {
      const cartData = getItemsForAPI(eventSlug, date, roomId);
      const hasItems =
        cartData.tables.length > 0 ||
        cartData.tickets.length > 0 ||
        cartData.drink_package.length > 0;

      let canPersist = true;

      if (hasItems) {
        const validation = validateDateRequirements(eventSlug, date);
        if (!validation.isValid) {
          toast.error(
            validation.errorMessage ||
              "Please select at least one table or ticket",
          );
          canPersist = false;
        }

        if (canPersist) {
          const stillPendingTables = useCartEditStore
            .getState()
            .hasPendingTableConfirmation(eventSlug, date);

          if (!stillPendingTables) {
            const allocationValidation = validateGuestAllocation(
              eventSlug,
              date,
            );
            if (!allocationValidation.isValid) {
              toast.error(
                allocationValidation.errors[0] ||
                  "Please complete guest allocation for your tables",
              );
              canPersist = false;
            }
          }
        }
      }

      if (canPersist) {
        if (process.env.NODE_ENV === "development") {
          console.log(`🔍 Saving ${formatDateMobile(date)}:`, cartData);
        }

        // Security: Validate prices against server data
        if (serverEventData) {
          const priceValidation = await validateCartPrices(
            cartData,
            serverEventData as Parameters<typeof validateCartPrices>[1],
          );

          if (!priceValidation.isValid) {
            logSecurityIncident(priceValidation);
            toast.error(
              "Price data appears to be outdated. Please refresh the page and try again.",
            );
          } else {
            const sanitizedCartData = sanitizeCartPrices(
              cartData,
              serverEventData as Parameters<typeof sanitizeCartPrices>[1],
            );
            const response = await storeEventBooking({
              data: sanitizedCartData,
              skipInvalidation: true,
            });
            if (response?.status === true) {
              lastFailedSaveKeyRef.current = cartSavePayloadKey(
                sanitizedCartData,
              );
              markDateAsSaved(eventSlug, date);
              await new Promise((resolve) => setTimeout(resolve, 150));
              succeeded = true;
            } else {
              lastFailedSaveKeyRef.current = cartSavePayloadKey(
                sanitizedCartData,
              );
              console.error("API Error Response:", response);
            }
          }
        } else {
          const response = await storeEventBooking({
            data: cartData,
            skipInvalidation: true,
          });
          if (response?.status === true) {
            lastFailedSaveKeyRef.current = cartSavePayloadKey(cartData);
            markDateAsSaved(eventSlug, date);
            await new Promise((resolve) => setTimeout(resolve, 150));
            succeeded = true;
          } else {
            lastFailedSaveKeyRef.current = cartSavePayloadKey(cartData);
            console.error("API Error Response:", response);
          }
        }
      }
    } catch (error) {
      lastFailedSaveKeyRef.current = cartSavePayloadKey(
        getItemsForAPI(eventSlug, date, roomId),
      );
      console.error("Error saving date cart data:", {
        error,
        eventSlug,
        date,
        timestamp: new Date().toISOString(),
      });

      const httpStatus = getErrorHttpStatus(error);
      // 400/422 are already toasted by the API interceptor with the server message.
      if (httpStatus === 400 || httpStatus === 422) {
        // no extra toast
      } else if (error instanceof Error) {
        if (
          error.message.includes("Network Error") ||
          error.message.includes("Failed to fetch")
        ) {
          toast.error(
            "Network error. Please check your connection and try again.",
          );
        } else if (
          error.message.includes("401") ||
          error.message.includes("Unauthorized")
        ) {
          toast.error(
            "Session expired. Please refresh the page and log in again.",
          );
        } else if (
          error.message.includes("500") ||
          error.message.includes("Internal Server Error")
        ) {
          toast.error("Couldn't save your cart. Please try again.");
        } else {
          toast.error("Couldn't save your cart. Please try again.");
        }
      } else {
        toast.error(
          "An unexpected error occurred while saving. Please try again.",
        );
      }
    } finally {
      clearTimeout(saveTimeout);
      isSavingRef.current = false;
      setIsSaving(false);

      if (pendingFollowUpSaveRef.current) {
        pendingFollowUpSaveRef.current = false;
        const followUpKey = cartSavePayloadKey(
          getItemsForAPI(eventSlug, date, roomId),
        );
        if (lastFailedSaveKeyRef.current !== followUpKey) {
          const followUpSucceeded = await handleSaveDate();
          succeeded = followUpSucceeded || succeeded;
        }
      }
    }

    return succeeded;
  };

  const handleQuantityChange = (
    itemType: "table" | "ticket" | "drink",
    itemId: number,
    change: number,
  ) => {
    const currentQuantity = getTotalQuantity(eventSlug, date, itemType, itemId);
    const newQuantity = Math.max(0, currentQuantity + change);
    updateQuantity(eventSlug, date, itemType, itemId, newQuantity);
  };

  const extractActualDate = (key: string) => {
    const colon = key.indexOf(":");
    return colon > 0 && colon <= 6 ? key.slice(colon + 1) : key;
  };

  const formatDate = (dateString: string) => {
    try {
      return format(
        new Date(extractActualDate(dateString)),
        "EEEE, MMMM dd, yyyy",
      );
    } catch {
      return dateString;
    }
  };

  const formatDateMobile = (dateString: string) => {
    try {
      return format(new Date(extractActualDate(dateString)), "MMM dd, yyyy");
    } catch {
      return dateString;
    }
  };

  const selectionSummary = buildDateSelectionSummary(dateData);
  const roomTone = getCheckoutRoomTone(roomAccentIndex);
  const metaParts: string[] = [];
  const ticketQty = dateData.tickets
    .filter((t) => t.quantity > 0)
    .reduce((s, t) => s + t.quantity, 0);
  const drinkQty = dateData.drinks
    .filter((d) => d.quantity > 0)
    .reduce((s, d) => s + d.quantity, 0);
  const tableQty = dateData.tables
    .filter((t) => t.quantity > 0)
    .reduce((s, t) => s + t.quantity, 0);
  const guestQty = currentDateData
    ? getDateGuestCount(currentDateData)
    : 0;
  if (ticketQty > 0)
    metaParts.push(`${ticketQty} ticket${ticketQty !== 1 ? "s" : ""}`);
  if (drinkQty > 0)
    metaParts.push(`${drinkQty} drink${drinkQty !== 1 ? "s" : ""}`);
  if (tableQty > 0)
    metaParts.push(`${tableQty} table${tableQty !== 1 ? "s" : ""}`);
  if (guestQty > 0)
    metaParts.push(`${guestQty} guest${guestQty !== 1 ? "s" : ""}`);
  const itemsMeta = metaParts.join(" · ");
  const trimmedRoomName = roomName?.trim() || "";
  const fallbackItemsMeta =
    itemsMeta || selectionSummary || "No items selected yet";
  const metaLine = itemsMeta;

  const hasTicketsSection = dateData.tickets.length > 0;
  const hasTablesSection = dateData.tables.length > 0;
  const hasDrinksSection = dateData.drinks.length > 0;

  const ticketCartQty = dateData.tickets
    .filter((t) => t.quantity > 0)
    .reduce((sum, t) => sum + t.quantity, 0);
  const drinkCartQty = dateData.drinks
    .filter((d) => d.quantity > 0)
    .reduce((sum, d) => sum + d.quantity, 0);
  const tableCartQty = dateData.tables
    .filter((t) => t.quantity > 0)
    .reduce((sum, t) => sum + t.quantity, 0);

  const sectionCountBadge = (count: number) =>
    count > 0 ? (
      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[color:var(--checkout-muted)] px-1.5 text-[10px] font-bold tabular-nums text-[color:var(--checkout-muted-foreground)]">
        {count}
      </span>
    ) : null;

  return (
    <div
      className={cn(
        "bg-white",
        isExpanded ? "overflow-visible" : "overflow-hidden",
        embedded
          ? "overflow-hidden rounded-xl border border-[color:var(--checkout-border)] shadow-sm"
          : "rounded-2xl border border-[color:var(--checkout-border)] shadow-sm",
      )}
    >
      <div
        className={cn(
          "flex w-full items-start justify-between gap-3 px-3 py-3.5 transition-colors sm:items-center sm:gap-3 sm:px-5 sm:py-3",
          isExpanded
            ? "bg-white"
            : embedded
              ? "bg-white hover:bg-[color:var(--checkout-muted)]/35"
              : "hover:bg-[color:var(--checkout-muted)]/50",
        )}
      >
        <button
          type="button"
          className="flex min-w-0 flex-1 items-start gap-2.5 text-left sm:items-center sm:gap-3"
          onClick={onToggle}
          aria-expanded={isExpanded}
        >
          <div
            className={cn(
              "mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg sm:mt-0",
              embedded
                ? roomTone.calendarIcon
                : "bg-emerald-50 text-emerald-700",
            )}
          >
            <Calendar className="h-4 w-4" strokeWidth={2.25} />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <h3 className="text-[15px] font-bold leading-snug text-[color:var(--checkout-brand-primary)] sm:text-base">
              <span className="hidden sm:inline">{formatDate(date)}</span>
              <span className="sm:hidden">{formatDateMobile(date)}</span>
            </h3>
            <p className="mt-0.5 line-clamp-2 text-[12px] font-medium leading-relaxed text-[color:var(--checkout-muted-foreground)] sm:line-clamp-1 sm:text-xs">
              {trimmedRoomName ? (
                <>
                  <span className="font-semibold text-[color:var(--checkout-brand-accent)]">
                    {trimmedRoomName}
                  </span>
                  <span className="text-[color:var(--checkout-muted-foreground)]">
                    {" · "}
                    {fallbackItemsMeta}
                  </span>
                </>
              ) : (
                metaLine || selectionSummary || "No items selected yet"
              )}
            </p>
            {hasValidationError && (
              <span className="mt-1.5 inline-flex w-fit items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold leading-none text-amber-700 sm:hidden">
                Action needed
              </span>
            )}
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-2 pt-0.5 sm:gap-2.5 sm:pt-0">
          {hasValidationError && (
            <span className="hidden rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 sm:inline-flex">
              Action needed
            </span>
          )}

          <div className="flex max-w-[9.5rem] flex-col items-end gap-0.5 sm:max-w-none">
            {appliedDiscount > 0 && discountLabel?.trim() ? (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                {discountLabel.trim()}
              </span>
            ) : discountLockedHint?.trim() && discountLabel?.trim() ? (
              <span
                className="max-w-full truncate rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800"
                title={discountLockedHint.trim()}
              >
                Unlock: {discountLabel.trim()}
              </span>
            ) : null}
            {totalAmount > 0 && (
              <div className="flex flex-col items-end">
                {appliedDiscount > 0 && strikeBase > 0 ? (
                  <span className="text-[11px] tabular-nums text-[color:var(--checkout-muted-foreground)] line-through">
                    {formatMoney(strikeBase)}
                  </span>
                ) : null}
                <span className="text-sm font-bold tabular-nums text-[color:var(--checkout-brand-primary)] sm:text-lg">
                  {formatMoney(payableAmount)}
                </span>
                {appliedDiscount > 0 ? (
                  <span className="text-[10px] font-semibold tabular-nums text-emerald-700">
                    You saved {formatMoney(appliedDiscount)}
                  </span>
                ) : null}
              </div>
            )}
          </div>

          {onRemoveDate && (
            <button
              type="button"
              onClick={() => onRemoveDate(date)}
              disabled={isRemoving}
              className="rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:pointer-events-none disabled:opacity-60"
              title="Remove this date"
              aria-label="Remove this date"
              aria-busy={isRemoving}
            >
              {isRemoving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-red-400" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onToggle}
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-[color:var(--checkout-muted)]/50"
            aria-label={isExpanded ? "Collapse date" : "Expand date"}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="divide-y divide-[color:var(--checkout-border)] border-t border-[color:var(--checkout-border)] bg-white px-3 py-4 sm:px-5 sm:py-5">
          {/* ═══ TICKETS ═══ */}
          {hasTicketsSection && (
            <section className="space-y-2.5 pb-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Ticket
                    className="h-4 w-4 text-[color:var(--checkout-ticket)]"
                    strokeWidth={2.25}
                  />
                  <h4 className="text-xs font-bold uppercase tracking-widest text-[color:var(--checkout-ticket)]">
                    Tickets
                  </h4>
                </div>
                {sectionCountBadge(ticketCartQty)}
              </div>

              <div className="space-y-2">
                {dateData.tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className={cn(
                      "flex flex-col gap-3 rounded-lg border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between",
                      ticket.quantity > 0
                        ? "border-[color:var(--checkout-border)] bg-[color:var(--checkout-muted)]/30"
                        : "border-[color:var(--checkout-border)] bg-white",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <h5 className="text-sm font-semibold leading-snug text-[color:var(--checkout-foreground)]">
                        {ticket.title}
                      </h5>
                      {ticket.description ? (
                        <p className="mt-0.5 text-xs leading-relaxed text-[color:var(--checkout-muted-foreground)]">
                          {ticket.description}
                        </p>
                      ) : null}
                      <p className="mt-1.5 text-sm font-bold tabular-nums text-[color:var(--checkout-ticket)]">
                        {formatMoney(Number(ticket.price))}
                      </p>
                      <CheckoutAvailabilityHint
                        maxQuantity={ticket.maxQuantity}
                        quantity={ticket.quantity}
                      />
                    </div>
                    <div className="shrink-0 self-end sm:self-auto">
                      <QuantityControls
                        quantity={ticket.quantity}
                        maxQuantity={ticket.maxQuantity}
                        onIncrease={() =>
                          handleQuantityChange("ticket", ticket.id, 1)
                        }
                        onDecrease={() =>
                          handleQuantityChange("ticket", ticket.id, -1)
                        }
                        onRemove={() =>
                          updateQuantity(
                            eventSlug,
                            date,
                            "ticket",
                            ticket.id,
                            0,
                          )
                        }
                        size="sm"
                        priceLabel={formatMoney(Number(ticket.price))}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ═══ TABLES ═══ */}
          {hasTablesSection && (
            <section className="space-y-2.5 py-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <UtensilsCrossed
                    className="h-4 w-4 text-[color:var(--checkout-table)]"
                    strokeWidth={2.25}
                  />
                  <h4 className="text-xs font-bold uppercase tracking-widest text-[color:var(--checkout-table)]">
                    Table Seating
                  </h4>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {sectionCountBadge(tableCartQty)}
                  {hasTicketsSection &&
                  !currentDateData?.tableSeatingSkipped ? (
                    <button
                      type="button"
                      onClick={() =>
                        useCartEditStore
                          .getState()
                          .skipTableSeating(eventSlug, date)
                      }
                      className="rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
                      title="Remove table seating"
                      aria-label="Remove table seating"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>

              <TableRecommendations
                eventSlug={eventSlug}
                date={date}
                tables={dateData.tables}
                ticketsAvailable={hasTicketsSection}
                onQuantityChange={(tableId, change) =>
                  handleQuantityChange("table", tableId, change)
                }
                onUpdateQuantity={(tableId, quantity) =>
                  updateQuantity(eventSlug, date, "table", tableId, quantity)
                }
                getTotalQuantity={(tableId) =>
                  getTotalQuantity(eventSlug, date, "table", tableId)
                }
                onTableSeatingConfirmed={handleSaveDate}
              />
            </section>
          )}

          {/* ═══ DRINKS ═══ */}
          {hasDrinksSection && (
            <section className="space-y-2.5 pt-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Wine
                    className="h-4 w-4 text-[color:var(--checkout-package)]"
                    strokeWidth={2.25}
                  />
                  <h4 className="text-xs font-bold uppercase tracking-widest text-[color:var(--checkout-package)]">
                    Drink Packages
                  </h4>
                </div>
                {sectionCountBadge(drinkCartQty)}
              </div>

              <div className="space-y-2">
                {dateData.drinks.map((drink, index) => (
                  <div
                    key={drink.id ?? index}
                    className={cn(
                      "flex flex-col gap-3 rounded-lg border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between",
                      drink.quantity > 0
                        ? "border-[color:var(--checkout-border)] bg-[color:var(--checkout-muted)]/30"
                        : "border-[color:var(--checkout-border)] bg-white",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <h5 className="text-sm font-semibold leading-snug text-[color:var(--checkout-foreground)]">
                        {drink.title}
                      </h5>
                      <p className="mt-0.5 text-xs leading-relaxed text-[color:var(--checkout-muted-foreground)]">
                        {drink.description?.trim() || "Add to your order"}
                      </p>
                      <p className="mt-1.5 text-sm font-bold tabular-nums text-[color:var(--checkout-package)]">
                        {formatMoney(Number(drink.price) || 0)}
                      </p>
                      <CheckoutAvailabilityHint
                        maxQuantity={drink.maxQuantity}
                        quantity={drink.quantity}
                      />
                    </div>
                    <div className="shrink-0 self-end sm:self-auto">
                      <QuantityControls
                        quantity={drink.quantity}
                        maxQuantity={drink.maxQuantity}
                        onIncrease={() =>
                          handleQuantityChange("drink", drink.id, 1)
                        }
                        onDecrease={() =>
                          handleQuantityChange("drink", drink.id, -1)
                        }
                        onRemove={() =>
                          updateQuantity(eventSlug, date, "drink", drink.id, 0)
                        }
                        size="sm"
                        priceLabel={formatMoney(Number(drink.price) || 0)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ═══ SPECIAL REQUESTS ═══ */}
          <div className="pt-5">
            <div className="rounded-lg border border-[color:var(--checkout-border)] bg-white px-3 py-2.5">
              <button
                onClick={() => setShowSpecialRequest(!showSpecialRequest)}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors py-1.5 w-full"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span className="font-medium">
                  {specialRequest
                    ? "Edit special requests"
                    : "Add special requests"}
                </span>
                {specialRequest && (
                  <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">
                    Added
                  </span>
                )}
                {showSpecialRequest ? (
                  <ChevronUp className="h-3 w-3 ml-auto" />
                ) : (
                  <ChevronDown className="h-3 w-3 ml-auto" />
                )}
              </button>

              {showSpecialRequest && (
                <div className="mt-2 p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                  <Textarea
                    value={specialRequest}
                    onChange={(e) =>
                      updateSpecialRequest(eventSlug, date, e.target.value)
                    }
                    placeholder="Tell us about any special requirements... (e.g., dietary needs, accessibility, seating preferences)"
                    className="min-h-[80px] text-sm bg-white text-gray-900 caret-gray-900 placeholder:text-gray-500 border-gray-200 rounded-lg resize-none focus:ring-blue-500 focus:border-blue-500"
                    maxLength={500}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-gray-400">
                      This will be sent to the support team
                    </p>
                    <span className="text-xs text-gray-400">
                      {specialRequest.length}/500
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
