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
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useIsPreviewMode } from "@/contexts/preview-context";

import QuantityControls from "./quantity-controls";
import TableRecommendations from "./table-recommendations";
import { useCartEditStore, EditableItem } from "@/store/cart-edit.store";
import {
  useStoreEventBooking,
  useGetCartData,
} from "@/services/customer/cart/query";
import {
  validateCartPrices,
  sanitizeCartPrices,
  logSecurityIncident,
} from "@/lib/security/price-validation";
import {
  extractEventsFromApiResponse,
  findEventBySlug,
} from "../_lib/cart-calculations";
import { useCurrencyFormat } from "@/hooks/use-currency-format";

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
}

export default function DateAccordion({
  eventSlug,
  date,
  dateData,
  isExpanded,
  onToggle,
  onRemoveDate,
}: DateAccordionProps) {
  const { format: formatMoney, formatCompact: formatMoneyUnit } =
    useCurrencyFormat();
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [showSpecialRequest, setShowSpecialRequest] = useState(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);
  const isPreviewMode = useIsPreviewMode();
  const { mutateAsync: storeEventBooking } = useStoreEventBooking();
  const { data: apiCartData } = useGetCartData(!isPreviewMode);

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

  // Extract dynamic drink_title from API data
  const drinkTitle = (() => {
    if (!apiCartData) return "Drinks";
    const eventsArray = extractEventsFromApiResponse(apiCartData);
    const apiEventData = findEventBySlug(eventsArray, eventSlug);
    return apiEventData?.drink_title || "Drinks";
  })();

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
      hasChanges &&
      !isSaving &&
      !isAutoSaving &&
      !isSavingRef.current &&
      !isPreviewMode
    ) {
      autoSaveTimerRef.current = setTimeout(async () => {
        if (isSavingRef.current) return;
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
  }, [hasChanges, isSaving, isAutoSaving, isPreviewMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate total amount for this date
  const totalAmount = [
    ...dateData.tables,
    ...dateData.tickets,
    ...dateData.drinks,
  ].reduce((sum, item) => {
    if (item.type === "table") {
      const pricePerPerson = item.pricePerPerson || item.price;
      if (item.allocation && item.allocation.length > 0) {
        const totalGuests = item.allocation.reduce(
          (sum, guests) => sum + guests,
          0,
        );
        return sum + pricePerPerson * totalGuests;
      } else {
        const minGuests = (item.minPersons || 1) * item.quantity;
        return sum + pricePerPerson * minGuests;
      }
    } else {
      return sum + item.price * item.quantity;
    }
  }, 0);

  const handleSaveDate = async () => {
    if (isSavingRef.current || isSaving) return;

    isSavingRef.current = true;
    setIsSaving(true);

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
      const cartData = getItemsForAPI(eventSlug, date);
      const hasItems =
        cartData.tables.length > 0 ||
        cartData.tickets.length > 0 ||
        cartData.drink_package.length > 0;

      if (hasItems) {
        const validation = validateDateRequirements(eventSlug, date);
        if (!validation.isValid) {
          toast.error(
            validation.errorMessage ||
              "Please select at least one table or ticket",
          );
          return;
        }

        const allocationValidation = validateGuestAllocation(eventSlug, date);
        if (!allocationValidation.isValid) {
          toast.error(
            allocationValidation.errors[0] ||
              "Please complete guest allocation for your tables",
          );
          return;
        }
      }

      if (!hasItems) {
        toast.info(
          `Removing all items for ${format(new Date(date), "MMM dd, yyyy")}`,
        );
      }

      if (process.env.NODE_ENV === "development") {
        console.log(
          `🔍 Saving ${format(new Date(date), "MMM dd, yyyy")}:`,
          cartData,
        );
      }

      // Security: Validate prices against server data
      if (apiCartData) {
        const eventsArray = extractEventsFromApiResponse(apiCartData);
        const serverEventData = findEventBySlug(eventsArray, eventSlug);

        if (serverEventData) {
          const priceValidation = await validateCartPrices(
            cartData,
            serverEventData,
          );

          if (!priceValidation.isValid) {
            logSecurityIncident(priceValidation);
            toast.error(
              "Price data appears to be outdated. Please refresh the page and try again.",
            );
            setIsSaving(false);
            return;
          }

          const sanitizedCartData = sanitizeCartPrices(
            cartData,
            serverEventData,
          );

          const response = await storeEventBooking(sanitizedCartData);
          if (response?.status === true) {
            markDateAsSaved(eventSlug, date);
            await new Promise((resolve) => setTimeout(resolve, 150));
          } else {
            console.error("API Error Response:", response);
          }
        } else {
          const response = await storeEventBooking(cartData);
          if (response?.status === true) {
            markDateAsSaved(eventSlug, date);
            await new Promise((resolve) => setTimeout(resolve, 150));
          } else {
            console.error("API Error Response:", response);
          }
        }
      } else {
        const response = await storeEventBooking(cartData);
        if (response?.status === true) {
          markDateAsSaved(eventSlug, date);
          await new Promise((resolve) => setTimeout(resolve, 150));
        } else {
          console.error("API Error Response:", response);
        }
      }
    } catch (error) {
      console.error("Error saving date cart data:", {
        error,
        eventSlug,
        date,
        timestamp: new Date().toISOString(),
      });

      if (error instanceof Error) {
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
          error.message.includes("400") ||
          error.message.includes("Bad Request")
        ) {
          toast.error(
            "Invalid data. Please check your selections and try again.",
          );
        } else if (error.message.includes("500")) {
        } else {
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
    }
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

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "EEEE, MMMM dd, yyyy");
    } catch {
      return dateString;
    }
  };

  // Count active items
  const activeTablesCount = dateData.tables.filter(
    (t) => t.quantity > 0,
  ).length;
  const activeTicketsCount = dateData.tickets.filter(
    (t) => t.quantity > 0,
  ).length;
  const activeDrinksCount = dateData.drinks.filter(
    (d) => d.quantity > 0,
  ).length;
  const totalActiveItems = activeTablesCount + activeTicketsCount + activeDrinksCount;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Date Header — cleaner, more scannable */}
      <div
        className="flex items-center justify-between px-4 sm:px-5 py-3 cursor-pointer hover:bg-gray-50/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Date icon with accent */}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Calendar className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
              {formatDate(date)}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              {totalActiveItems > 0 ? (
                <span className="text-xs text-gray-500">
                  {totalActiveItems} item{totalActiveItems !== 1 ? "s" : ""} selected
                </span>
              ) : (
                <span className="text-xs text-gray-400">
                  No items selected yet
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          {/* Validation error indicator */}
          {hasValidationError && (
            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
              Action needed
            </span>
          )}

          {/* Date total */}
          {totalAmount > 0 && (
            <span className="text-sm sm:text-base font-bold text-gray-900 tabular-nums">
              {formatMoney(totalAmount)}
            </span>
          )}

          {/* Remove date */}
          {onRemoveDate && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveDate(date);
              }}
              className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Remove this date"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Expand/collapse chevron */}
          <div className="text-gray-400">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded Content — sections with distinct visual identity */}
      {isExpanded && (
        <div className="border-t border-gray-100">

          {/* ═══ TICKETS SECTION ═══ — Primary action, shown first */}
          {dateData.tickets.length > 0 && (
            <div className="px-4 sm:px-5 py-4">
              {/* Section header with accent */}
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Ticket className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-gray-900">
                    Tickets
                  </h4>
                  <span className="text-xs text-gray-400 font-medium">
                    {dateData.tickets.length} type{dateData.tickets.length > 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {dateData.tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className={`flex items-center justify-between p-3 sm:p-3.5 rounded-xl border-l-[3px] transition-all duration-200 ${
                      ticket.quantity > 0
                        ? "border-l-blue-500 bg-blue-50/50 shadow-sm border-t border-r border-b border-blue-100"
                        : "border-l-transparent bg-gray-50/50 hover:bg-gray-50 border-t border-r border-b border-gray-100"
                    }`}
                  >
                    <div className="flex-1 min-w-0 mr-3">
                      <h5 className="text-sm font-medium text-gray-900 truncate">
                        {ticket.title}
                      </h5>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm font-semibold text-blue-600">
                          {formatMoneyUnit(Number(ticket.price))}
                        </span>
                        {ticket.description && (
                          <>
                            <span className="text-gray-300">·</span>
                            <span className="text-xs text-gray-500 truncate">
                              {ticket.description}
                            </span>
                          </>
                        )}
                      </div>
                      {ticket.maxQuantity && ticket.maxQuantity <= 10 && (
                        <p className="text-xs text-amber-600 mt-0.5 font-medium">
                          Only {ticket.maxQuantity} left
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
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
                        priceLabel={formatMoneyUnit(Number(ticket.price))}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Divider between sections */}
          {dateData.tickets.length > 0 && dateData.tables.length > 0 && (
            <div className="mx-4 sm:mx-5 border-t border-gray-100" />
          )}

          {/* ═══ TABLES SECTION ═══ — with amber accent */}
          {dateData.tables.length > 0 && (
            <div className="px-4 sm:px-5 py-4">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                  <UtensilsCrossed className="h-3.5 w-3.5 text-amber-600" />
                </div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-gray-900">
                    Tables
                  </h4>
                  <span className="text-xs text-gray-400 font-medium">
                    {dateData.tables.length} available
                  </span>
                </div>
              </div>
              <TableRecommendations
                eventSlug={eventSlug}
                date={date}
                tables={dateData.tables}
                onQuantityChange={(tableId, change) =>
                  handleQuantityChange("table", tableId, change)
                }
                onUpdateQuantity={(tableId, quantity) =>
                  updateQuantity(eventSlug, date, "table", tableId, quantity)
                }
                getTotalQuantity={(tableId) =>
                  getTotalQuantity(eventSlug, date, "table", tableId)
                }
              />
            </div>
          )}

          {/* Divider between sections */}
          {(dateData.tickets.length > 0 || dateData.tables.length > 0) && dateData.drinks.length > 0 && (
            <div className="mx-4 sm:mx-5 border-t border-gray-100" />
          )}

          {/* ═══ DRINKS SECTION ═══ — optional add-on with purple accent */}
          {dateData.drinks.length > 0 && (
            <div className="px-4 sm:px-5 py-4">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Wine className="h-3.5 w-3.5 text-purple-600" />
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <h4 className="text-sm font-semibold text-gray-900">
                    {drinkTitle}
                  </h4>
                  <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full font-medium border border-purple-100">
                    Optional
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                {dateData.drinks.map((drink, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 sm:p-3.5 rounded-xl border-l-[3px] transition-all duration-200 ${
                      drink.quantity > 0
                        ? "border-l-purple-500 bg-purple-50/40 shadow-sm border-t border-r border-b border-purple-100"
                        : "border-l-transparent bg-gray-50/50 hover:bg-gray-50 border-t border-r border-b border-gray-100"
                    }`}
                  >
                    <div className="flex-1 min-w-0 mr-3">
                      <h5 className="text-sm font-medium text-gray-900 truncate">
                        {drink.title}
                      </h5>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm font-semibold text-purple-600">
                          {formatMoneyUnit(Number(drink.price))}
                        </span>
                        {drink.quantity > 0 && (
                          <>
                            <span className="text-gray-300">·</span>
                            <span className="text-xs text-purple-600 font-medium">
                              {drink.quantity} selected
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <QuantityControls
                        quantity={drink.quantity}
                        onIncrease={() =>
                          handleQuantityChange("drink", drink.id, 1)
                        }
                        onDecrease={() =>
                          handleQuantityChange("drink", drink.id, -1)
                        }
                        onRemove={() =>
                          updateQuantity(
                            eventSlug,
                            date,
                            "drink",
                            drink.id,
                            0,
                          )
                        }
                        size="sm"
                        priceLabel={formatMoneyUnit(Number(drink.price))}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ SPECIAL REQUESTS ═══ */}
          <div className="px-4 sm:px-5 pb-4">
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
                  className="min-h-[80px] text-sm bg-white border-gray-200 rounded-lg resize-none focus:ring-blue-500 focus:border-blue-500"
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
      )}
    </div>
  );
}
