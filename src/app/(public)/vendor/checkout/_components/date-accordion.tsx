/**
 * Professional Date Accordion Component
 * Handles date-specific cart editing with AUTO-SAVE functionality
 */

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronDown,
  ChevronUp,
  Calendar,
  Save,
  Clock,
  Wine,
  UtensilsCrossed,
  Ticket,
  MessageSquare,
  Trash2,
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
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
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

  // Get specialRequest from Zustand store
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

  // AUTO-SAVE: Automatically save changes after 2 seconds of inactivity
  useEffect(() => {
    // Clear any existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Only auto-save if there are unsaved changes and not currently saving
    if (hasChanges && !isSaving && !isAutoSaving && !isPreviewMode) {
      // Set a timer to auto-save after 2 seconds
      autoSaveTimerRef.current = setTimeout(async () => {
        try {
          setIsAutoSaving(true);
          await handleSaveDate();
        } catch (error) {
          console.error("Auto-save error:", error);
        } finally {
          setIsAutoSaving(false);
        }
      }, 2000); // 2 second delay
    }

    // Cleanup timer on unmount or dependency change
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [hasChanges, isSaving, isAutoSaving, isPreviewMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate total amount for this date using per-person pricing
  const totalAmount = [
    ...dateData.tables,
    ...dateData.tickets,
    ...dateData.drinks,
  ].reduce((sum, item) => {
    if (item.type === "table") {
      // For tables: calculate based on actual guest allocation
      const pricePerPerson = item.pricePerPerson || item.price;

      if (item.allocation && item.allocation.length > 0) {
        // Use actual guest allocation
        const totalGuests = item.allocation.reduce(
          (sum, guests) => sum + guests,
          0,
        );
        return sum + pricePerPerson * totalGuests;
      } else {
        // Fallback: use minimum capacity if no allocation
        const minGuests = (item.minPersons || 1) * item.quantity;
        return sum + pricePerPerson * minGuests;
      }
    } else {
      // For tickets/drinks: use regular pricing
      return sum + item.price * item.quantity;
    }
  }, 0);

  const handleSaveDate = async () => {
    setIsSaving(true);

    try {
      // Get cart data for API
      const cartData = getItemsForAPI(eventSlug, date);
      const hasItems =
        cartData.tables.length > 0 ||
        cartData.tickets.length > 0 ||
        cartData.drink_package.length > 0;

      // If there are items, validate requirements (table/ticket requirement)
      if (hasItems) {
        const validation = validateDateRequirements(eventSlug, date);
        if (!validation.isValid) {
          toast.error(
            validation.errorMessage ||
              "Please select at least one table or ticket",
          );
          setIsSaving(false);
          return;
        }

        // Also validate guest allocation if multiple tables are selected
        const allocationValidation = validateGuestAllocation(eventSlug, date);
        if (!allocationValidation.isValid) {
          toast.error(
            allocationValidation.errors[0] ||
              "Please complete guest allocation for your tables",
          );
          setIsSaving(false);
          return;
        }
      }

      if (!hasItems) {
        // Even if no items, we should still call the API to remove items from server
        // This handles the case where user removes all items
        toast.info(
          `Removing all items for ${format(new Date(date), "MMM dd, yyyy")}`,
        );
      }

      // Debug: Log the payload structure for development
      if (process.env.NODE_ENV === "development") {
        console.log(
          `🔍 Saving ${format(new Date(date), "MMM dd, yyyy")}:`,
          cartData,
        );
      }

      // 🔒 SECURITY: Validate prices against server data to prevent manipulation
      if (apiCartData) {
        const eventsArray = extractEventsFromApiResponse(apiCartData);
        const serverEventData = findEventBySlug(eventsArray, eventSlug);

        if (serverEventData) {
          const priceValidation = await validateCartPrices(
            cartData,
            serverEventData,
          );

          if (!priceValidation.isValid) {
            // Log security incident
            logSecurityIncident(priceValidation);

            // Show user-friendly error message
            toast.error(
              "Price data appears to be outdated. Please refresh the page and try again.",
            );
            setIsSaving(false);
            return;
          }

          // Sanitize prices to ensure server values are used
          const sanitizedCartData = sanitizeCartPrices(
            cartData,
            serverEventData,
          );

          const response = await storeEventBooking(sanitizedCartData);

          if (response?.status === true) {
            markDateAsSaved(eventSlug, date);
          } else {
            console.error("API Error Response:", response);
          }
        } else {
          // Fallback if server data not available
          const response = await storeEventBooking(cartData);

          if (response?.status === true) {
            markDateAsSaved(eventSlug, date);
          } else {
            console.error("API Error Response:", response);
          }
        }
      } else {
        // Fallback if API data not loaded
        const response = await storeEventBooking(cartData);

        if (response?.status === true) {
          markDateAsSaved(eventSlug, date);
        } else {
          console.error("API Error Response:", response);
        }
      }
    } catch (error) {
      // Enhanced error handling with detailed logging
      console.error("Error saving date cart data:", {
        error,
        eventSlug,
        date,
        timestamp: new Date().toISOString(),
      });

      if (error instanceof Error) {
        // Handle specific error types
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

  return (
    <Card key={date} className="overflow-hidden">
      <CardHeader
        className="cursor-pointer hover:bg-gray-50 transition-colors py-3"
        onClick={onToggle}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:space-x-3">
            <Calendar
              className="h-5 w-5 flex-shrink-0"
              style={{ color: "var(--color-primary)" }}
            />
            <CardTitle className="truncate text-base font-medium text-black">
              {formatDate(date)}
            </CardTitle>
          </div>
          <div
            className="flex flex-shrink-0 flex-wrap items-center gap-2 sm:gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Validation Error Badge */}
            {hasValidationError && (
              <Badge
                variant="destructive"
                className="text-xs bg-red-50 text-red-700 border-red-200"
              >
                <span>⚠️ Validation Required</span>
              </Badge>
            )}

            {/* Auto-Saving Status Badge */}
            {isAutoSaving && (
              <Badge
                variant="secondary"
                className="text-xs bg-green-50 text-green-700 border-green-200 animate-pulse"
              >
                <div className="w-3 h-3 border border-green-700/30 border-t-green-700 rounded-full animate-spin mr-1" />
                <span>Auto-saving...</span>
              </Badge>
            )}

            {/* Unsaved Badge */}
            {hasChanges && !isAutoSaving && !hasValidationError && (
              <Badge
                variant="secondary"
                className="text-xs bg-blue-50 text-blue-700 border-blue-200 whitespace-nowrap"
              >
                <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                <span>Auto-save in 2s...</span>
              </Badge>
            )}

            {/* Manual Save Button */}
            {hasChanges && !isAutoSaving && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSaveDate();
                }}
                disabled={isSaving}
                className="shrink-0 text-xs text-gray-600 hover:text-gray-900"
                title="Click to save immediately"
              >
                {isSaving ? (
                  <>
                    <div className="w-3 h-3 border border-gray-400/30 border-t-gray-600 rounded-full animate-spin mr-1" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-3 h-3 mr-1 flex-shrink-0" />
                    <span className="whitespace-nowrap">Save Now</span>
                  </>
                )}
              </Button>
            )}

            {/* Remove Date Button */}
            {onRemoveDate && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveDate(date);
                }}
                className="shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}

            {totalAmount > 0 && (
              <div className="text-right shrink-0">
                <p className="text-sm text-gray-600">Date Total</p>
                <p
                  className="font-semibold"
                  style={{ color: "var(--color-primary)" }}
                >
                  £{totalAmount.toFixed(2)}
                </p>
              </div>
            )}
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 shrink-0 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <Tabs
            defaultValue={
              dateData.tables.length > 0
                ? "tables"
                : dateData.tickets.length > 0
                  ? "tickets"
                  : "drinks"
            }
            className="w-full overflow-hidden"
          >
            <TabsList
              className={`grid w-full gap-1 ${
                [
                  dateData.tables.length > 0,
                  dateData.tickets.length > 0,
                  dateData.drinks.length > 0,
                ].filter(Boolean).length === 3
                  ? "grid-cols-3"
                  : [
                        dateData.tables.length > 0,
                        dateData.tickets.length > 0,
                        dateData.drinks.length > 0,
                      ].filter(Boolean).length === 2
                    ? "grid-cols-2"
                    : "grid-cols-1"
              }`}
            >
              {dateData.tables.length > 0 && (
                <TabsTrigger
                  value="tables"
                  className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm px-1 sm:px-2 min-w-0"
                >
                  <UtensilsCrossed className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="truncate">
                    <span>Tables </span>
                    <span className="font-semibold">
                      ({dateData.tables.length})
                    </span>
                  </span>
                </TabsTrigger>
              )}
              {dateData.tickets.length > 0 && (
                <TabsTrigger
                  value="tickets"
                  className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm px-1 sm:px-2 min-w-0"
                >
                  <Ticket className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="truncate">
                    <span>Tickets </span>
                    <span className="font-semibold">
                      ({dateData.tickets.length})
                    </span>
                  </span>
                </TabsTrigger>
              )}
              {dateData.drinks.length > 0 && (
                <TabsTrigger
                  value="drinks"
                  className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm px-1 sm:px-2 min-w-0"
                >
                  <Wine className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="truncate">
                    <span className="hidden sm:inline">{drinkTitle} </span>
                    <span className="sm:hidden">
                      {drinkTitle.length > 8
                        ? drinkTitle.substring(0, 6) + ".."
                        : drinkTitle}
                    </span>
                    <span className="font-semibold">
                      ({dateData.drinks.length})
                    </span>
                  </span>
                </TabsTrigger>
              )}
            </TabsList>

            {/* Tables Tab - Now with Professional Recommendations */}
            {dateData.tables.length > 0 && (
              <TabsContent value="tables" className="mt-4">
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
              </TabsContent>
            )}

            {/* Tickets Tab */}
            {dateData.tickets.length > 0 && (
              <TabsContent
                value="tickets"
                className="mt-4 space-y-3 sm:space-y-4"
              >
                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                  {dateData.tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm sm:text-base mb-1">
                          {ticket.title}
                        </h4>
                        <p className="text-xs sm:text-sm text-gray-600 mb-1 break-words">
                          £{ticket.price} • {ticket.description}
                        </p>
                        <p className="text-xs text-gray-500">
                          Capacity: {ticket.maxQuantity}
                        </p>
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
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            )}

            {/* Drinks Tab */}
            {dateData.drinks.length > 0 && (
              <TabsContent
                value="drinks"
                className="mt-4 space-y-3 sm:space-y-4"
              >
                <div className="grid grid-cols-1 gap-3 sm:gap-4">
                  {dateData.drinks.map((drink, index) => (
                    <div
                      key={index}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm sm:text-base mb-1">
                          {drink.title}
                        </h4>
                        <p className="text-xs sm:text-sm text-gray-600 break-words">
                          £{drink.price} • Quantity in cart: {drink.quantity}
                        </p>
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
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            )}
          </Tabs>

          {/* Special Request Section - Common for all tabs */}
          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <MessageSquare className="h-4 w-4 text-gray-600 flex-shrink-0" />
              <h3 className="text-xs sm:text-sm font-medium text-gray-900">
                Special Requests for Support Team
              </h3>
            </div>
            <Textarea
              value={specialRequest}
              onChange={(e) =>
                updateSpecialRequest(eventSlug, date, e.target.value)
              }
              placeholder="Tell us about any special requirements... (e.g., child tickets, specific table arrangements, drinks like vodka, wheelchair accessibility, etc.)"
              className="min-h-[80px] text-xs sm:text-sm"
              maxLength={500}
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-gray-500">
                This information will be sent to our support team to help
                arrange your booking
              </p>
              <span className="text-xs text-gray-400">
                {specialRequest.length}/500
              </span>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
