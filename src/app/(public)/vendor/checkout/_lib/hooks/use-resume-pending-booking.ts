"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cartService } from "@/services/customer/cart/cart.service";
import { normalizeSlug } from "@/lib/utils";
import {
  consumePendingBooking,
  peekPendingBooking,
} from "@/lib/booking/pending-booking";

/**
 * After guest date-click → login, recreate the cart from sessionStorage
 * before checkout UI loads so the user lands on their selected booking.
 */
export function useResumePendingBooking(enabled: boolean) {
  const queryClient = useQueryClient();
  const [isResuming, setIsResuming] = useState(() =>
    enabled ? Boolean(peekPendingBooking()) : false,
  );

  useEffect(() => {
    if (!enabled) {
      setIsResuming(false);
      return;
    }

    const pending = peekPendingBooking();
    if (!pending) {
      setIsResuming(false);
      return;
    }

    let cancelled = false;
    setIsResuming(true);

    void (async () => {
      try {
        await cartService.storeEventBooking({
          slug: normalizeSlug(pending.event_slug),
          event_date: pending.event_date,
          ...(pending.room_id != null && pending.room_id > 0
            ? { room_id: pending.room_id }
            : {}),
          drink_package: [],
          tables: [],
          tickets: [],
        });
        consumePendingBooking();
        await queryClient.invalidateQueries({ queryKey: ["cart-data"] });
      } catch (error) {
        console.error("Failed to resume pending booking:", error);
        // Keep intent so a refresh can retry; still unblock checkout UI.
      } finally {
        if (!cancelled) setIsResuming(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, queryClient]);

  return { isResuming };
}
