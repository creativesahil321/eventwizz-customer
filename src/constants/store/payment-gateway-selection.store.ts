/**
 * Payment Gateway Selection Store
 * Manages the selected payment gateway across checkout components
 */

import { create } from "zustand";

interface PaymentGatewaySelectionState {
  selectedGateway: string | null;
  setSelectedGateway: (gateway: string | null) => void;
  clearSelection: () => void;
}

export const usePaymentGatewaySelection = create<PaymentGatewaySelectionState>(
  (set) => ({
    selectedGateway: null,
    setSelectedGateway: (gateway) => set({ selectedGateway: gateway }),
    clearSelection: () => set({ selectedGateway: null }),
  })
);
