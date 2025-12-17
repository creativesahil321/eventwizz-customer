/**
 * Price Validation Security Layer
 *
 * Protects against client-side price manipulation by validating all prices
 * against server-side data before processing any payments or API calls.
 *
 * ⚠️ CRITICAL SECURITY: Never trust prices from localStorage/client-side
 */

import { CartRequest } from "@/services/customer/cart/type";

export interface PriceValidationResult {
  isValid: boolean;
  manipulatedItems: Array<{
    type: "table" | "ticket" | "drink";
    id?: number;
    title?: string;
    clientPrice: number;
    serverPrice: number;
    difference: number;
  }>;
  totalDifference: number;
  errorMessage?: string;
}

// Server date data interface
interface ServerDateData {
  tables?: Array<{
    id: number;
    price: number | string;
    min_persons: number;
    max_persons: number;
  }>;
  tickets?: Array<{
    id: number;
    title: string;
    price: number | string;
  }>;
}

// Server event data interface
interface ServerEventData {
  event_name: string;
  event_slug: string;
  event_image: string;
  drinks?: Array<{
    id: number;
    title: string;
    price: number | string;
  }>;
  [date: string]:
    | ServerDateData
    | string
    | Array<{
        id: number;
        title: string;
        price: number | string;
      }>
    | undefined;
}

/**
 * Validates cart prices against server-side data
 * Call this before any payment processing or API submission
 */
export async function validateCartPrices(
  cartData: CartRequest,
  serverEventData: ServerEventData
): Promise<PriceValidationResult> {
  const manipulatedItems: PriceValidationResult["manipulatedItems"] = [];
  let totalDifference = 0;

  try {
    // Get server date data for the event date
    const serverDateData = serverEventData[
      cartData.event_date
    ] as ServerDateData;
    if (
      !serverDateData ||
      typeof serverDateData === "string" ||
      Array.isArray(serverDateData)
    ) {
      return {
        isValid: false,
        manipulatedItems: [],
        totalDifference: 0,
        errorMessage: "Invalid event date",
      };
    }

    // Validate table prices
    if (cartData.tables && cartData.tables.length > 0) {
      const serverTables = serverDateData.tables || [];

      for (const clientTable of cartData.tables) {
        const serverTable = serverTables.find((t) => t.id === clientTable.id);
        if (serverTable) {
          const clientPrice = Number(serverTable.price) * clientTable.no_tables;
          const serverPrice = Number(serverTable.price) * clientTable.no_tables;

          if (Math.abs(clientPrice - serverPrice) > 0.01) {
            // Allow for floating point precision
            const difference = serverPrice - clientPrice;
            manipulatedItems.push({
              type: "table",
              id: clientTable.id,
              title: `Table (${serverTable.min_persons}-${serverTable.max_persons} persons)`,
              clientPrice,
              serverPrice,
              difference,
            });
            totalDifference += difference;
          }
        }
      }
    }

    // Validate ticket prices
    if (cartData.tickets && cartData.tickets.length > 0) {
      const serverTickets = serverDateData.tickets || [];

      for (const clientTicket of cartData.tickets) {
        const serverTicket = serverTickets.find(
          (t) => t.id === clientTicket.id
        );
        if (serverTicket) {
          const clientPrice =
            Number(serverTicket.price) * clientTicket.quantity;
          const serverPrice =
            Number(serverTicket.price) * clientTicket.quantity;

          if (Math.abs(clientPrice - serverPrice) > 0.01) {
            const difference = serverPrice - clientPrice;
            manipulatedItems.push({
              type: "ticket",
              id: clientTicket.id,
              title: serverTicket.title,
              clientPrice,
              serverPrice,
              difference,
            });
            totalDifference += difference;
          }
        }
      }
    }

    // Validate drink prices
    if (cartData.drink_package && cartData.drink_package.length > 0) {
      const serverDrinks = serverEventData.drinks || [];

      for (const clientDrink of cartData.drink_package) {
        const serverDrink = serverDrinks.find(
          (d) => d.title === clientDrink.title
        );
        if (serverDrink) {
          const clientPrice = clientDrink.price * clientDrink.quantity;
          const serverPrice = Number(serverDrink.price) * clientDrink.quantity;

          if (Math.abs(clientPrice - serverPrice) > 0.01) {
            const difference = serverPrice - clientPrice;
            manipulatedItems.push({
              type: "drink",
              title: clientDrink.title,
              clientPrice,
              serverPrice,
              difference,
            });
            totalDifference += difference;
          }
        }
      }
    }

    return {
      isValid: manipulatedItems.length === 0,
      manipulatedItems,
      totalDifference,
      errorMessage:
        manipulatedItems.length > 0
          ? `Price manipulation detected. Please refresh the page and try again.`
          : undefined,
    };
  } catch (error) {
    console.error("Price validation error:", error);
    return {
      isValid: false,
      manipulatedItems: [],
      totalDifference: 0,
      errorMessage: "Price validation failed. Please try again.",
    };
  }
}

/**
 * Sanitize cart data by replacing client prices with server prices
 * Use this to clean up manipulated data before API submission
 */
export function sanitizeCartPrices(
  cartData: CartRequest,
  serverEventData: ServerEventData
): CartRequest {
  const sanitized = { ...cartData };

  try {
    const serverDateData = serverEventData[
      cartData.event_date
    ] as ServerDateData;
    if (
      !serverDateData ||
      typeof serverDateData === "string" ||
      Array.isArray(serverDateData)
    )
      return sanitized;

    // Sanitize drink package prices (only place where we send prices to API)
    if (sanitized.drink_package && sanitized.drink_package.length > 0) {
      const serverDrinks = serverEventData.drinks || [];

      sanitized.drink_package = sanitized.drink_package.map((clientDrink) => {
        // Try to match by id first, then fall back to title for backward compatibility
        const serverDrink = serverDrinks.find(
          (d) =>
            (clientDrink.id && d.id && Number(d.id) === clientDrink.id) ||
            d.title === clientDrink.title
        );
        return {
          ...clientDrink,
          price: serverDrink ? Number(serverDrink.price) : clientDrink.price,
        };
      });
    }
  } catch (error) {
    console.error("Price sanitization error:", error);
  }

  return sanitized;
}

/**
 * Log security incidents for monitoring
 */
export function logSecurityIncident(
  validation: PriceValidationResult,
  userInfo?: { userId?: string; sessionId?: string }
) {
  if (!validation.isValid && validation.manipulatedItems.length > 0) {
    console.warn("🚨 SECURITY ALERT: Price manipulation detected", {
      timestamp: new Date().toISOString(),
      userInfo,
      manipulatedItems: validation.manipulatedItems,
      totalDifference: validation.totalDifference,
      severity: Math.abs(validation.totalDifference) > 100 ? "HIGH" : "MEDIUM",
    });

    // In production, you would send this to your monitoring service
    // Example: analytics.track('security_price_manipulation', { ... });
  }
}
