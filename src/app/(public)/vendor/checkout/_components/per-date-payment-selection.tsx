/**
 * Per-Date Payment Selection Component
 *
 * Professional UI for selecting payment type for each date individually
 * Shows which dates support partial payment with badges
 */

"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, CheckCircle, Clock, Info } from "lucide-react";
import { ApiEventCartData, ApiDateData } from "@/lib/types/cart.types";
import { format } from "date-fns";
import { useCurrencyFormat } from "@/hooks/use-currency-format";

interface PerDatePaymentSelectionProps {
  eventData: ApiEventCartData | null;
  selectedPaymentTypes: Record<string, "full" | "deposit">;
  onPaymentTypeChange: (date: string, type: "full" | "deposit") => void;
  disabled?: boolean;
  getDateData?: (eventSlug: string, date: string) => unknown; // Edit store function
  eventSlug?: string; // Event slug for edit store
}

export default function PerDatePaymentSelection({
  eventData,
  selectedPaymentTypes,
  onPaymentTypeChange,
  disabled = false,
  getDateData,
  eventSlug,
}: PerDatePaymentSelectionProps) {
  const { format: formatCurrency } = useCurrencyFormat();

  if (!eventData) return null;

  const dateKeys = Object.keys(eventData).filter(
    (key) =>
      ![
        "event_name",
        "event_slug",
        "event_image",
        "drinks",
        "vendor_event_id",
        "payment_gateways",
      ].includes(key)
  );

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "EEEE, MMMM dd, yyyy");
    } catch {
      return dateString;
    }
  };

  const formatShortDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd");
    } catch {
      return dateString;
    }
  };

  const calculateDateAmount = (dateData: ApiDateData, dateKey: string) => {
    let amount = 0;

    // Try to get actual selected items from edit store first
    if (getDateData && eventSlug) {
      const editStoreData = getDateData(eventSlug, dateKey) as {
        drinks?: Array<{ price: number; quantity: number }>;
        tables?: Array<{ price: number; quantity: number }>;
        tickets?: Array<{ price: number; quantity: number }>;
      };

      if (editStoreData) {
        // Calculate amount from selected drinks
        if (editStoreData.drinks && Array.isArray(editStoreData.drinks)) {
          editStoreData.drinks.forEach((drink) => {
            const quantity = drink.quantity || 0;
            const price = drink.price || 0;
            amount += price * quantity;
          });
        }

        // Calculate amount from selected tables
        if (editStoreData.tables && Array.isArray(editStoreData.tables)) {
          editStoreData.tables.forEach((table) => {
            const quantity = table.quantity || 0;
            const price = table.price || 0;
            amount += price * quantity;
          });
        }

        // Calculate amount from selected tickets
        if (editStoreData.tickets && Array.isArray(editStoreData.tickets)) {
          editStoreData.tickets.forEach((ticket) => {
            const quantity = ticket.quantity || 0;
            const price = ticket.price || 0;
            amount += price * quantity;
          });
        }
      }
    }

    // Only use API data fallback if edit store data is completely unavailable
    // If edit store data exists but is empty (nothing selected), amount should remain 0
    if (amount === 0 && (!getDateData || !eventSlug)) {
      // Calculate amount from selected drinks
      if (
        dateData?.selected_drinks &&
        Array.isArray(dateData.selected_drinks)
      ) {
        dateData.selected_drinks.forEach((drink) => {
          const quantity = drink.quantity || 1;
          const price = parseFloat(drink.price || "0");
          amount += price * quantity;
        });
      }

      // Calculate amount from tables (per-person pricing)
      if (dateData?.tables && Array.isArray(dateData.tables)) {
        dateData.tables.forEach((table) => {
          // API already provides price per person
          const pricePerPerson = parseFloat(String(table.price || 0));
          const peopleCount = table.min_persons || 1; // Use minimum capacity as fallback
          amount += pricePerPerson * peopleCount;
        });
      }

      // Calculate amount from tickets (only if they're actually selected)
      if (dateData?.tickets && Array.isArray(dateData.tickets)) {
        dateData.tickets.forEach((ticket) => {
          const quantity =
            (ticket as unknown as { quantity: number }).quantity || 1; // Default to 1 if no quantity specified
          amount += parseFloat(String(ticket.price || 0)) * quantity;
        });
      }
    }

    return amount;
  };

  const calculateTotalDeposit = (
    dateData: ApiDateData,
    depositPerPerson: number,
    dateKey: string
  ) => {
    let totalPeople = 0;

    // Try to get actual group size from edit store first
    if (getDateData && eventSlug) {
      const editStoreData = getDateData(eventSlug, dateKey) as {
        peopleCount?: number; // Group size from "People in group" field
      };

      if (editStoreData?.peopleCount && editStoreData.peopleCount > 0) {
        totalPeople = editStoreData.peopleCount;
      }
    }

    // Fallback: Count from API data if edit store data not available
    if (totalPeople === 0) {
      // Count people from tables
      if (dateData?.tables && Array.isArray(dateData.tables)) {
        dateData.tables.forEach((table) => {
          // Use min_persons as the base count for each table
          totalPeople += table.min_persons || 0;
        });
      }

      // If no tables, count from tickets (assuming 1 person per ticket)
      if (
        totalPeople === 0 &&
        dateData?.tickets &&
        Array.isArray(dateData.tickets)
      ) {
        totalPeople = dateData.tickets.length; // 1 person per ticket
      }
    }

    return depositPerPerson * totalPeople;
  };

  return (
    <div className="w-full">
      <div className="space-y-3">
        {dateKeys.map((dateKey, index) => {
          const dateData = eventData[dateKey] as ApiDateData;
          const paymentInfo = dateData?.payment || {
            type: "full",
            deposit_amount: 0,
            balance_due_date: null,
          };
          const selectedPaymentType = selectedPaymentTypes[dateKey] || "full";
          const dateAmount = calculateDateAmount(dateData, dateKey);
          const depositPerPerson = paymentInfo.deposit_amount;
          const totalDepositAmount = calculateTotalDeposit(
            dateData,
            depositPerPerson,
            dateKey
          );
          const balanceAmount = dateAmount - totalDepositAmount;

          return (
            <div key={dateKey}>
              {/* Date Header - Compact */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">
                    {formatDate(dateKey)}
                  </span>
                  {paymentInfo.type === "deposit" && (
                    <Badge
                      variant="outline"
                      className="text-xs border-blue-200 text-blue-700 bg-blue-50"
                    >
                      Flexible
                    </Badge>
                  )}
                </div>
                <div className="text-right">
                  {dateAmount > 0 && (
                    <div className="text-sm font-semibold text-gray-900">
                      {formatCurrency(dateAmount)}
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Options for this Date */}
              {dateAmount > 0 ? (
                <div className="space-y-2">
                  {/* Full Payment Option */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPaymentTypeChange(dateKey, "full")}
                    disabled={disabled}
                    className={`w-full justify-start h-auto p-2 ${
                      selectedPaymentType === "full"
                        ? "border-2 border-green-500 bg-green-50 text-green-900 hover:bg-green-100"
                        : "border-gray-200 bg-white text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <CheckCircle
                          className={`h-4 w-4 ${
                            selectedPaymentType === "full"
                              ? "text-green-600"
                              : "text-gray-600"
                          }`}
                        />
                        <span className="font-medium">Pay in Full</span>
                        {paymentInfo.type === "full" && (
                          <Badge
                            variant="secondary"
                            className="text-xs bg-green-100 text-green-800"
                          >
                            Only Option
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {formatCurrency(dateAmount)}
                        </div>
                        <div
                          className={`text-xs ${
                            selectedPaymentType === "full"
                              ? "text-green-600"
                              : "text-gray-500"
                          }`}
                        >
                          Due today
                        </div>
                      </div>
                    </div>
                  </Button>

                  {/* Deposit Payment Option */}
                  {paymentInfo.type === "deposit" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPaymentTypeChange(dateKey, "deposit")}
                      disabled={disabled}
                      className={`w-full justify-start h-auto p-2 ${
                        selectedPaymentType === "deposit"
                          ? "border-2 border-blue-500 bg-blue-50 text-blue-900 hover:bg-blue-100"
                          : "border-gray-200 bg-white text-gray-900 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <Clock
                            className={`h-4 w-4 ${
                              selectedPaymentType === "deposit"
                                ? "text-blue-600"
                                : "text-gray-600"
                            }`}
                          />
                          <span className="font-medium">Pay Deposit</span>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              selectedPaymentType === "deposit"
                                ? "border-blue-300 text-blue-800"
                                : "border-blue-200 text-blue-700"
                            }`}
                          >
                            Flexible
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            {formatCurrency(totalDepositAmount)}
                          </div>
                          <div
                            className={`text-xs ${
                              selectedPaymentType === "deposit"
                                ? "text-blue-600"
                                : "text-gray-500"
                            }`}
                          >
                            Balance: {formatCurrency(balanceAmount)}
                          </div>
                        </div>
                      </div>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>No items selected for this date</span>
                  </div>
                </div>
              )}

              {/* Deposit Info */}
              {paymentInfo.type === "deposit" && dateAmount > 0 && (
                <div
                  className={`border rounded-lg p-2 mt-2 ${
                    selectedPaymentType === "deposit"
                      ? "bg-blue-100 border-blue-300"
                      : "bg-blue-50 border-blue-200"
                  }`}
                >
                  <div
                    className={`flex items-center gap-2 text-xs ${
                      selectedPaymentType === "deposit"
                        ? "text-blue-800"
                        : "text-blue-700"
                    }`}
                  >
                    <Info className="h-3 w-3" />
                    <span>
                      Deposit: {formatCurrency(depositPerPerson)} per person
                      {selectedPaymentType === "deposit" &&
                        paymentInfo.balance_due_date && (
                          <span>
                            {" "}
                            • Balance of {formatCurrency(balanceAmount)} due by{" "}
                            <strong className="text-blue-900">
                              {formatShortDate(paymentInfo.balance_due_date)}
                            </strong>
                          </span>
                        )}
                    </span>
                  </div>
                </div>
              )}

              {/* Separator between dates */}
              {index < dateKeys.length - 1 && <Separator className="my-2" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
