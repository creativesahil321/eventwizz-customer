"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCartEditStore } from "@/store/cart-edit.store";
import { useCheckoutPromoStore } from "@/store/checkout-promo.store";
import {
  CHECKOUT_HANDOFF_COUPON,
  CHECKOUT_HANDOFF_PAY,
  CHECKOUT_PATH,
  clearCheckoutHandoffPending,
  consumeCheckoutHandoffPending,
  mergeCheckoutHandoffPending,
  parseCheckoutHandoffPay,
} from "@/lib/checkout-chat-handoff";

/**
 * Applies chat booking choices (`?pay=full|deposit` and `?coupon=CODE`) once
 * the cart dates are in the edit store. Pending values survive login redirects
 * and empty-cart → add-dates round trips via session storage.
 */
export function useCheckoutChatHandoff(
  eventSlug: string | null | undefined,
  dateKeys: string[],
) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const capturedQueryRef = useRef<string | null>(null);
  const updatePaymentType = useCartEditStore((s) => s.updatePaymentType);
  const getDateData = useCartEditStore((s) => s.getDateData);
  const editingData = useCartEditStore((s) => s.editingData);
  const setCouponCode = useCheckoutPromoStore((s) => s.setCouponCode);

  const payRaw = searchParams.get(CHECKOUT_HANDOFF_PAY);
  const couponRaw = searchParams.get(CHECKOUT_HANDOFF_COUPON);
  const dateKeySignature = dateKeys.join("|");

  useEffect(() => {
    const pay = parseCheckoutHandoffPay(payRaw);
    const coupon = couponRaw?.trim() || null;
    if (!pay && !coupon) return;

    const captureKey = `${pay ?? ""}|${coupon ?? ""}`;
    if (capturedQueryRef.current === captureKey) return;
    capturedQueryRef.current = captureKey;

    mergeCheckoutHandoffPending({ pay, coupon });

    const next = new URLSearchParams(searchParams.toString());
    next.delete(CHECKOUT_HANDOFF_PAY);
    next.delete(CHECKOUT_HANDOFF_COUPON);
    const query = next.toString();
    router.replace(query ? `${CHECKOUT_PATH}?${query}` : CHECKOUT_PATH, {
      scroll: false,
    });
  }, [couponRaw, payRaw, router, searchParams]);

  useEffect(() => {
    if (!eventSlug || dateKeys.length === 0) return;

    const pending = consumeCheckoutHandoffPending();
    if (!pending || (!pending.pay && !pending.coupon)) return;

    const readyKeys = dateKeys.filter((dateKey) =>
      Boolean(getDateData(eventSlug, dateKey)),
    );
    if (readyKeys.length === 0) return;

    if (pending.pay) {
      for (const dateKey of readyKeys) {
        const dateData = getDateData(eventSlug, dateKey);
        if (pending.pay === "deposit" && dateData && !dateData.isDepositEnabled) {
          continue;
        }
        updatePaymentType(eventSlug, dateKey, pending.pay);
      }
    }
    if (pending.coupon) {
      setCouponCode(pending.coupon);
    }

    if (readyKeys.length === dateKeys.length) {
      clearCheckoutHandoffPending();
    }
  }, [
    dateKeySignature,
    dateKeys,
    editingData,
    eventSlug,
    getDateData,
    setCouponCode,
    updatePaymentType,
  ]);
}
