/**
 * Cart Data Synchronization Utilities
 * Detects mismatches between Zustand cart storage and API data
 * Clears both sides when data doesn't match
 *
 * 🚦 Rule of Thumb:
 * ✅ Match on length of dates, tables, tickets, drinks
 * ✅ Match on IDs and static fields (price, capacity, deposit, etc)
 * ❌ Don't match on quantities user selected (that's meant to differ)
 */

// Types for data comparison
interface ApiEventData {
  event_name: string;
  vendor_event_id: number;
  event_slug: string;
  event_image: string;
  drinks: Array<{
    id: number;
    title: string;
    price: string;
  }>;
  [date: string]: unknown; // Date keys like "2025-09-20"
}

interface ApiDateData {
  payment: {
    type: string;
    deposit_amount: number;
    balance_due_date: string | null;
  };
  tables: Array<{
    id: number;
    min_persons: number;
    max_persons: number;
    price: number;
    no_tables: number;
    allocation: number[];
    total_tables: number;
    event_date: string;
  }>;
  tickets: Array<{
    id: number;
    title: string;
    description: string;
    price: number;
    total_capacity: number;
    quantity: number;
    event_date: string;
  }>;
  selected_drinks: Array<{
    title: string;
    quantity: number;
  }>;
}

interface ZustandEventData {
  [date: string]: {
    tables: Array<{
      id: number;
      title: string;
      price: number;
      quantity: number;
      maxQuantity: number;
      allocation: number[];
      minPersons: number;
      maxPersons: number;
      tableSize: number;
      pricePerPerson: number;
    }>;
    tickets: Array<{
      id: number;
      title: string;
      price: number;
      quantity: number;
      maxQuantity: number;
    }>;
    drinks: Array<{
      id: number;
      title: string;
      price: number;
      quantity: number;
    }>;
    hasChanges: boolean;
    peopleCount: number;
    paymentType: string;
    depositAmount: number;
    balanceDueDate: string | null;
  };
}

interface CartMismatchInfo {
  hasMismatch: boolean;
  mismatches: Array<{
    type: "structure" | "length" | "id" | "static_field";
    location: string;
    description: string;
  }>;
}

/**
 * Cart Data Synchronization Detection
 * Implements the core logic for detecting cart data mismatches
 */
export class CartSyncDetector {
  /**
   * Detects mismatches between API data and Zustand cart data
   */
  static detectMismatches(
    apiData: ApiEventData | null,
    zustandData: ZustandEventData | null,
    eventSlug: string
  ): CartMismatchInfo {
    const mismatches: CartMismatchInfo["mismatches"] = [];

    // If either is null/empty, consider it a mismatch
    if (!apiData || !zustandData) {
      mismatches.push({
        type: "structure",
        location: "root",
        description: "API data or Zustand data is missing",
      });
      return { hasMismatch: true, mismatches };
    }

    // Get date keys from both sources
    const apiDates = Object.keys(apiData).filter(
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
    const zustandDates = Object.keys(zustandData);

    // Check date count mismatch
    if (apiDates.length !== zustandDates.length) {
      mismatches.push({
        type: "length",
        location: "dates",
        description: `Date count mismatch: API has ${apiDates.length}, Zustand has ${zustandDates.length}`,
      });
    }

    // Check if all API dates exist in Zustand
    const missingDates = apiDates.filter(
      (date) => !zustandDates.includes(date)
    );
    if (missingDates.length > 0) {
      mismatches.push({
        type: "structure",
        location: "dates",
        description: `Missing dates in Zustand: ${missingDates.join(", ")}`,
      });
    }

    // Check each date for detailed mismatches
    apiDates.forEach((date) => {
      if (!zustandData[date]) return;

      const apiDateData = apiData[date] as ApiDateData;
      const zustandDateData = zustandData[date];

      // Check table count and IDs
      if (apiDateData.tables.length !== zustandDateData.tables.length) {
        mismatches.push({
          type: "length",
          location: `${date}.tables`,
          description: `Table count mismatch: API has ${apiDateData.tables.length}, Zustand has ${zustandDateData.tables.length}`,
        });
      }

      // Check table IDs and static fields
      apiDateData.tables.forEach((apiTable, index) => {
        const zustandTable = zustandDateData.tables[index];
        if (!zustandTable) return;

        if (apiTable.id !== zustandTable.id) {
          mismatches.push({
            type: "id",
            location: `${date}.tables[${index}]`,
            description: `Table ID mismatch: API ${apiTable.id} vs Zustand ${zustandTable.id}`,
          });
        }

        if (apiTable.price !== zustandTable.price) {
          mismatches.push({
            type: "static_field",
            location: `${date}.tables[${index}]`,
            description: `Table price mismatch: API ${apiTable.price} vs Zustand ${zustandTable.price}`,
          });
        }

        if (apiTable.min_persons !== zustandTable.minPersons) {
          mismatches.push({
            type: "static_field",
            location: `${date}.tables[${index}]`,
            description: `Table min persons mismatch: API ${apiTable.min_persons} vs Zustand ${zustandTable.minPersons}`,
          });
        }

        if (apiTable.max_persons !== zustandTable.maxPersons) {
          mismatches.push({
            type: "static_field",
            location: `${date}.tables[${index}]`,
            description: `Table max persons mismatch: API ${apiTable.max_persons} vs Zustand ${zustandTable.maxPersons}`,
          });
        }

        if (apiTable.total_tables !== zustandTable.maxQuantity) {
          mismatches.push({
            type: "static_field",
            location: `${date}.tables[${index}]`,
            description: `Table capacity mismatch: API ${apiTable.total_tables} vs Zustand ${zustandTable.maxQuantity}`,
          });
        }
      });

      // Check ticket count and IDs
      if (apiDateData.tickets.length !== zustandDateData.tickets.length) {
        mismatches.push({
          type: "length",
          location: `${date}.tickets`,
          description: `Ticket count mismatch: API has ${apiDateData.tickets.length}, Zustand has ${zustandDateData.tickets.length}`,
        });
      }

      // Check ticket IDs and static fields
      apiDateData.tickets.forEach((apiTicket, index) => {
        const zustandTicket = zustandDateData.tickets[index];
        if (!zustandTicket) return;

        if (apiTicket.id !== zustandTicket.id) {
          mismatches.push({
            type: "id",
            location: `${date}.tickets[${index}]`,
            description: `Ticket ID mismatch: API ${apiTicket.id} vs Zustand ${zustandTicket.id}`,
          });
        }

        if (apiTicket.price !== zustandTicket.price) {
          mismatches.push({
            type: "static_field",
            location: `${date}.tickets[${index}]`,
            description: `Ticket price mismatch: API ${apiTicket.price} vs Zustand ${zustandTicket.price}`,
          });
        }

        if (apiTicket.total_capacity !== zustandTicket.maxQuantity) {
          mismatches.push({
            type: "static_field",
            location: `${date}.tickets[${index}]`,
            description: `Ticket capacity mismatch: API ${apiTicket.total_capacity} vs Zustand ${zustandTicket.maxQuantity}`,
          });
        }
      });

      // Check drinks count and IDs
      if (apiData.drinks.length !== zustandDateData.drinks.length) {
        mismatches.push({
          type: "length",
          location: `${date}.drinks`,
          description: `Drink count mismatch: API has ${apiData.drinks.length}, Zustand has ${zustandDateData.drinks.length}`,
        });
      }

      // Check drink IDs and static fields
      apiData.drinks.forEach((apiDrink, index) => {
        const zustandDrink = zustandDateData.drinks[index];
        if (!zustandDrink) return;

        if (apiDrink.id !== zustandDrink.id) {
          mismatches.push({
            type: "id",
            location: `${date}.drinks[${index}]`,
            description: `Drink ID mismatch: API ${apiDrink.id} vs Zustand ${zustandDrink.id}`,
          });
        }

        if (parseFloat(apiDrink.price) !== zustandDrink.price) {
          mismatches.push({
            type: "static_field",
            location: `${date}.drinks[${index}]`,
            description: `Drink price mismatch: API ${apiDrink.price} vs Zustand ${zustandDrink.price}`,
          });
        }
      });

      // Check payment configuration
      if (apiDateData.payment.type !== zustandDateData.paymentType) {
        mismatches.push({
          type: "static_field",
          location: `${date}.payment`,
          description: `Payment type mismatch: API ${apiDateData.payment.type} vs Zustand ${zustandDateData.paymentType}`,
        });
      }

      if (
        apiDateData.payment.deposit_amount !== zustandDateData.depositAmount
      ) {
        mismatches.push({
          type: "static_field",
          location: `${date}.payment`,
          description: `Deposit amount mismatch: API ${apiDateData.payment.deposit_amount} vs Zustand ${zustandDateData.depositAmount}`,
        });
      }
    });

    return {
      hasMismatch: mismatches.length > 0,
      mismatches,
    };
  }

  /**
   * Logs mismatch information for debugging
   */
  static logMismatches(
    mismatchInfo: CartMismatchInfo,
    eventSlug: string
  ): void {
    if (!mismatchInfo.hasMismatch) {
      console.log("✅ Cart data sync check passed for", eventSlug);
      return;
    }

    console.warn("🚨 Cart data mismatch detected for", eventSlug);
    console.warn("Mismatches:", mismatchInfo.mismatches);

    // Log summary
    const summary = mismatchInfo.mismatches.reduce((acc, mismatch) => {
      acc[mismatch.type] = (acc[mismatch.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.warn("Mismatch summary:", summary);
  }

  /**
   * Determines if cart data should be cleared due to mismatches
   */
  static shouldClearCart(mismatchInfo: CartMismatchInfo): boolean {
    if (!mismatchInfo.hasMismatch) return false;

    // Clear if there are structural mismatches or ID mismatches
    const criticalMismatches = mismatchInfo.mismatches.filter(
      (mismatch) =>
        mismatch.type === "structure" ||
        mismatch.type === "id" ||
        mismatch.type === "length"
    );

    return criticalMismatches.length > 0;
  }
}

/**
 * Cart Synchronization Manager
 * Handles clearing both API and Zustand cart data when mismatches are detected
 */
export class CartSyncManager {
  private clearAllCartMutation: any;
  private clearZustandCart: () => void;

  constructor(clearAllCartMutation: any, clearZustandCart: () => void) {
    this.clearAllCartMutation = clearAllCartMutation;
    this.clearZustandCart = clearZustandCart;
  }

  /**
   * Checks for cart data mismatches and clears both sides if needed
   */
  async syncCartData(
    apiData: ApiEventData | null,
    zustandData: ZustandEventData | null,
    eventSlug: string
  ): Promise<boolean> {
    // Detect mismatches
    const mismatchInfo = CartSyncDetector.detectMismatches(
      apiData,
      zustandData,
      eventSlug
    );

    // Log mismatches for debugging
    CartSyncDetector.logMismatches(mismatchInfo, eventSlug);

    // Check if we should clear cart data
    if (CartSyncDetector.shouldClearCart(mismatchInfo)) {
      console.warn("🧹 Clearing cart data due to mismatches for", eventSlug);

      try {
        // Clear API cart data
        await this.clearAllCartMutation.mutateAsync();
        console.log("✅ API cart data cleared");

        // Clear Zustand cart data
        this.clearZustandCart();
        console.log("✅ Zustand cart data cleared");

        return true; // Cart was cleared
      } catch (error) {
        console.error("❌ Error clearing cart data:", error);
        return false; // Failed to clear
      }
    }

    return false; // No clearing needed
  }

  /**
   * Quick sync check - returns true if cart was cleared
   */
  static async quickSyncCheck(
    apiData: ApiEventData | null,
    zustandData: ZustandEventData | null,
    eventSlug: string,
    clearAllCartMutation: any,
    clearZustandCart: () => void
  ): Promise<boolean> {
    const manager = new CartSyncManager(clearAllCartMutation, clearZustandCart);
    return await manager.syncCartData(apiData, zustandData, eventSlug);
  }
}

// Export types for use in other files
export type { ApiEventData, ApiDateData, ZustandEventData, CartMismatchInfo };
