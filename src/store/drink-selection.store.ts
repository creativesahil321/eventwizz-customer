/**
 * Drink Selection Store
 * Manages drink selections before adding to cart
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { normalizeSlug } from "@/lib/utils";

export interface SelectedDrink {
  id: number;
  title: string;
  description: string;
  price: number;
  quantity: number;
}

interface DrinkSelectionState {
  // Selected drinks for current event (before adding to cart)
  selectedDrinks: SelectedDrink[];
  // Track current event slug to auto-clear when switching events
  currentEventSlug: string | null;

  // Actions
  addDrink: (drink: SelectedDrink) => void;
  updateDrinkQuantity: (title: string, quantity: number) => void;
  updateDrinkQuantityById: (id: number, quantity: number) => void;
  removeDrink: (title: string) => void;
  clearDrinks: () => void;
  clearDrinksForNewEvent: (eventSlug: string) => void;
  setCurrentEvent: (eventSlug: string) => void;

  // Getters
  getDrinkQuantity: (title: string) => number;
  getTotalDrinks: () => number;
  getTotalDrinkAmount: () => number;
  hasDrinks: () => boolean;
}

export const useDrinkSelectionStore = create<DrinkSelectionState>()(
  persist(
    (set, get) => ({
      selectedDrinks: [],
      currentEventSlug: null,

      addDrink: (drink) => {
        set((state) => {
          const existingDrinkIndex = state.selectedDrinks.findIndex(
            (d) => d.id === drink.id || d.title === drink.title
          );

          if (existingDrinkIndex >= 0) {
            // Update quantity if drink already exists
            const updatedDrinks = [...state.selectedDrinks];
            updatedDrinks[existingDrinkIndex].quantity += drink.quantity;
            return { selectedDrinks: updatedDrinks };
          } else {
            // Add new drink
            return { selectedDrinks: [...state.selectedDrinks, drink] };
          }
        });
      },

      updateDrinkQuantity: (title, quantity) => {
        set((state) => {
          if (quantity <= 0) {
            return {
              selectedDrinks: state.selectedDrinks.filter(
                (d) => d.title !== title
              ),
            };
          }

          const updatedDrinks = state.selectedDrinks.map((drink) =>
            drink.title === title ? { ...drink, quantity } : drink
          );

          return { selectedDrinks: updatedDrinks };
        });
      },

      updateDrinkQuantityById: (id, quantity) => {
        set((state) => {
          if (quantity <= 0) {
            return {
              selectedDrinks: state.selectedDrinks.filter(
                (d) => d.id !== id
              ),
            };
          }

          const updatedDrinks = state.selectedDrinks.map((drink) =>
            drink.id === id ? { ...drink, quantity } : drink
          );

          return { selectedDrinks: updatedDrinks };
        });
      },

      removeDrink: (title) => {
        set((state) => ({
          selectedDrinks: state.selectedDrinks.filter((d) => d.title !== title),
        }));
      },

      clearDrinks: () => {
        set({ selectedDrinks: [] });
      },

      clearDrinksForNewEvent: () => {
        // Clear drinks when switching to a new event
        set({ selectedDrinks: [] });
      },

      setCurrentEvent: (eventSlug: string) => {
        const currentSlug = get().currentEventSlug;

        // Use existing utility to normalize slug (handles URL decoding)
        const normalizedEventSlug = normalizeSlug(eventSlug);

        // If switching to a different event, clear drinks automatically
        if (currentSlug && currentSlug !== normalizedEventSlug) {
          console.log(
            `🍷 Clearing drinks: switching from ${currentSlug} to ${normalizedEventSlug}`
          );
          set({
            selectedDrinks: [],
            currentEventSlug: normalizedEventSlug,
          });
        } else {
          // First time or same event, just update slug
          set({ currentEventSlug: normalizedEventSlug });
        }
      },

      getDrinkQuantity: (title) => {
        const drink = get().selectedDrinks.find((d) => d.title === title);
        return drink ? drink.quantity : 0;
      },

      getTotalDrinks: () => {
        return get().selectedDrinks.reduce(
          (total, drink) => total + drink.quantity,
          0
        );
      },

      getTotalDrinkAmount: () => {
        return get().selectedDrinks.reduce(
          (total, drink) => total + drink.price * drink.quantity,
          0
        );
      },

      hasDrinks: () => {
        return get().selectedDrinks.length > 0;
      },
    }),
    {
      name: "drink-selection-storage",
      // Persist selected drinks and current event slug for cross-event cleanup
      partialize: (state) => ({
        selectedDrinks: state.selectedDrinks,
        currentEventSlug: state.currentEventSlug,
      }),
    }
  )
);
