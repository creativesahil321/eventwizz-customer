import { create } from "zustand";

/**
 * Checkout promo selection shared between Order Summary and CartManager.
 * Only one offer type applies: an applied coupon replaces date offers.
 */
type CheckoutPromoState = {
  couponCode: string | null;
  setCouponCode: (code: string | null) => void;
  clearCoupon: () => void;
};

export const useCheckoutPromoStore = create<CheckoutPromoState>((set) => ({
  couponCode: null,
  setCouponCode: (code) =>
    set({ couponCode: code?.trim().toUpperCase() || null }),
  clearCoupon: () => set({ couponCode: null }),
}));
