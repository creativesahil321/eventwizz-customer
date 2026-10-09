import { create } from "zustand";

/**
 * Tables whose seating is being adjusted on checkout but not yet confirmed
 * (open adjust controls, unconfirmed edits, or guests not fully allocated).
 * In-memory only: entries belong to mounted allocation panels.
 */
interface CheckoutSeatingDraftState {
  pendingKeys: string[];
  setSeatingDraftPending: (key: string, pending: boolean) => void;
}

export const useCheckoutSeatingDraftStore = create<CheckoutSeatingDraftState>()(
  (set) => ({
    pendingKeys: [],
    setSeatingDraftPending: (key, pending) =>
      set((state) => {
        const has = state.pendingKeys.includes(key);
        if (pending === has) return state;
        return {
          pendingKeys: pending
            ? [...state.pendingKeys, key]
            : state.pendingKeys.filter((k) => k !== key),
        };
      }),
  }),
);

export const selectHasPendingSeatingDraft = (state: CheckoutSeatingDraftState) =>
  state.pendingKeys.length > 0;
