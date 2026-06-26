import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CheckoutStripePaymentSession } from "@/services/customer/checkout/type";

const STORAGE_KEY = "eventwizz-checkout-payment";

/** Remove the persisted key from sessionStorage so Zustand can never
 *  rehydrate a stale/completed/expired session on the next page load. */
function purgePersistedSession(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // private browsing / storage quota — safe to ignore
  }
}

interface CheckoutPaymentUiState {
  /** True while a Stripe payment modal is open / awaiting payment. */
  isAwaitingStripePayment: boolean;
  /** The active Stripe payment session — persisted in sessionStorage so a
   *  page refresh doesn't lose the pending booking and force a duplicate checkout. */
  stripePaymentSession: CheckoutStripePaymentSession | null;
  /** Booking numbers the user has already paid in this session.
   *  Prevents the cross-device restore effect from re-hydrating a just-paid booking
   *  while the backend webhook is still processing. */
  completedBookingNumbers: string[];

  setAwaitingStripePayment: (value: boolean) => void;
  setStripePaymentSession: (
    session: CheckoutStripePaymentSession | null,
  ) => void;
  /** Call on payment success — clears session, flags booking as completed,
   *  and explicitly removes the sessionStorage key so stale rehydration
   *  can never restore a paid booking. */
  completePaymentSession: (bookingNumber: string) => void;
  /** Clear session without marking as completed (e.g. amount changed). */
  clearPaymentSession: () => void;
  /** Returns true if this booking was already paid in the current session. */
  isBookingCompleted: (bookingNumber: string) => boolean;
}

export const useCheckoutPaymentUiStore = create<CheckoutPaymentUiState>()(
  persist(
    (set, get) => ({
      isAwaitingStripePayment: false,
      stripePaymentSession: null,
      completedBookingNumbers: [],

      setAwaitingStripePayment: (value) =>
        set({ isAwaitingStripePayment: value }),

      setStripePaymentSession: (session) =>
        set({ stripePaymentSession: session }),

      completePaymentSession: (bookingNumber) => {
        set((state) => ({
          stripePaymentSession: null,
          isAwaitingStripePayment: false,
          // Keep last 10 completed bookings — avoids unbounded growth
          completedBookingNumbers: [
            bookingNumber,
            ...state.completedBookingNumbers,
          ].slice(0, 10),
        }));
        purgePersistedSession();
      },

      clearPaymentSession: () => {
        set({ stripePaymentSession: null, isAwaitingStripePayment: false });
        purgePersistedSession();
      },

      isBookingCompleted: (bookingNumber) =>
        get().completedBookingNumbers.includes(bookingNumber),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? sessionStorage : localStorage,
      ),
      partialize: (state) => ({
        stripePaymentSession: state.stripePaymentSession,
        isAwaitingStripePayment: state.isAwaitingStripePayment,
        completedBookingNumbers: state.completedBookingNumbers,
      }),
    },
  ),
);
