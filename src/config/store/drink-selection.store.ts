/**
 * Drink Selection Store
 * Manages drink selections before adding to cart.
 * Room events scope drinks per event + room so packages never mix across rooms.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { normalizeSlug } from "@/lib/utils";

const DRINK_SELECTION_STORAGE_KEY = "drink-selection-storage";

export interface SelectedDrink {
  id: number;
  title: string;
  description: string;
  price: number;
  quantity: number;
}

export function buildDrinkScopeKey(
  eventSlug: string,
  roomId?: number | null,
  roomIndex?: number | null,
): string {
  const normalized = normalizeSlug(eventSlug);
  if (roomId != null && roomId > 0) {
    return `${normalized}:${roomId}`;
  }
  if (roomIndex != null && roomIndex >= 0) {
    return `${normalized}:room-${roomIndex}`;
  }
  return normalized;
}

interface DrinkSelectionState {
  /** Drinks keyed by scope (`eventSlug` or `eventSlug:roomId`). */
  drinksByScope: Record<string, SelectedDrink[]>;
  currentScopeKey: string | null;

  addDrink: (drink: SelectedDrink) => void;
  updateDrinkQuantity: (title: string, quantity: number) => void;
  updateDrinkQuantityById: (id: number, quantity: number) => void;
  removeDrink: (title: string) => void;
  clearDrinks: (options?: {
    eventSlug?: string;
    roomId?: number | null;
    roomIndex?: number | null;
  }) => void;
  clearDrinksForNewEvent: () => void;
  setCurrentEvent: (
    eventSlug: string,
    roomId?: number | null,
    roomIndex?: number | null,
  ) => void;

  getDrinkQuantity: (title: string) => number;
  getTotalDrinks: () => number;
  getTotalDrinkAmount: () => number;
  hasDrinks: () => boolean;
  getSelectedDrinks: () => SelectedDrink[];
}

function getScopedDrinks(state: DrinkSelectionState): SelectedDrink[] {
  const key = state.currentScopeKey;
  if (!key) return [];
  return state.drinksByScope[key] ?? [];
}

function withScopedDrinks(
  state: DrinkSelectionState,
  drinks: SelectedDrink[],
): Pick<DrinkSelectionState, "drinksByScope"> {
  const key = state.currentScopeKey;
  if (!key) return { drinksByScope: state.drinksByScope };
  return {
    drinksByScope: {
      ...state.drinksByScope,
      [key]: drinks,
    },
  };
}

export const useDrinkSelectionStore = create<DrinkSelectionState>()(
  persist(
    (set, get) => ({
      drinksByScope: {},
      currentScopeKey: null,

      addDrink: (drink) => {
        set((state) => {
          const scoped = getScopedDrinks(state);
          const existingDrinkIndex = scoped.findIndex(
            (d) => d.id === drink.id || d.title === drink.title,
          );

          if (existingDrinkIndex >= 0) {
            const updatedDrinks = [...scoped];
            updatedDrinks[existingDrinkIndex] = {
              ...updatedDrinks[existingDrinkIndex],
              quantity: updatedDrinks[existingDrinkIndex].quantity + drink.quantity,
            };
            return withScopedDrinks(state, updatedDrinks);
          }

          return withScopedDrinks(state, [...scoped, drink]);
        });
      },

      updateDrinkQuantity: (title, quantity) => {
        set((state) => {
          const scoped = getScopedDrinks(state);
          if (quantity <= 0) {
            return withScopedDrinks(
              state,
              scoped.filter((d) => d.title !== title),
            );
          }

          return withScopedDrinks(
            state,
            scoped.map((drink) =>
              drink.title === title ? { ...drink, quantity } : drink,
            ),
          );
        });
      },

      updateDrinkQuantityById: (id, quantity) => {
        set((state) => {
          const scoped = getScopedDrinks(state);
          if (quantity <= 0) {
            return withScopedDrinks(
              state,
              scoped.filter((d) => d.id !== id),
            );
          }

          return withScopedDrinks(
            state,
            scoped.map((drink) =>
              drink.id === id ? { ...drink, quantity } : drink,
            ),
          );
        });
      },

      removeDrink: (title) => {
        set((state) =>
          withScopedDrinks(
            state,
            getScopedDrinks(state).filter((d) => d.title !== title),
          ),
        );
      },

      clearDrinks: (options) => {
        set((state) => {
          const key = options?.eventSlug
            ? buildDrinkScopeKey(
                options.eventSlug,
                options.roomId,
                options.roomIndex,
              )
            : state.currentScopeKey;
          if (!key) return state;

          return {
            drinksByScope: {
              ...state.drinksByScope,
              [key]: [],
            },
          };
        });
      },

      clearDrinksForNewEvent: () => {
        set({ drinksByScope: {}, currentScopeKey: null });
        // Explicitly remove the persisted key so a page reload never rehydrates
        // stale drink selections (e.g. after payment or session expiry).
        if (typeof window !== "undefined") {
          try {
            localStorage.removeItem(DRINK_SELECTION_STORAGE_KEY);
          } catch {
            // private browsing / storage quota — safe to ignore
          }
        }
      },

      setCurrentEvent: (
        eventSlug: string,
        roomId?: number | null,
        roomIndex?: number | null,
      ) => {
        const newScopeKey = buildDrinkScopeKey(eventSlug, roomId, roomIndex);
        const currentScopeKey = get().currentScopeKey;

        if (currentScopeKey === newScopeKey) return;
        set({ currentScopeKey: newScopeKey });
      },

      getSelectedDrinks: () => getScopedDrinks(get()),

      getDrinkQuantity: (title) => {
        const drink = getScopedDrinks(get()).find((d) => d.title === title);
        return drink ? drink.quantity : 0;
      },

      getTotalDrinks: () => {
        return getScopedDrinks(get()).reduce(
          (total, drink) => total + drink.quantity,
          0,
        );
      },

      getTotalDrinkAmount: () => {
        return getScopedDrinks(get()).reduce(
          (total, drink) => total + drink.price * drink.quantity,
          0,
        );
      },

      hasDrinks: () => getScopedDrinks(get()).length > 0,
    }),
    {
      name: DRINK_SELECTION_STORAGE_KEY,
      version: 2,
      migrate: (persistedState) => {
        const legacy = persistedState as {
          selectedDrinks?: SelectedDrink[];
          currentEventSlug?: string | null;
          drinksByScope?: Record<string, SelectedDrink[]>;
          currentScopeKey?: string | null;
        };

        if (legacy.drinksByScope) {
          return {
            drinksByScope: legacy.drinksByScope,
            currentScopeKey: legacy.currentScopeKey ?? null,
          };
        }

        const scopeKey = legacy.currentEventSlug
          ? normalizeSlug(legacy.currentEventSlug)
          : null;

        return {
          drinksByScope:
            scopeKey && legacy.selectedDrinks?.length
              ? { [scopeKey]: legacy.selectedDrinks }
              : {},
          currentScopeKey: scopeKey,
        };
      },
      partialize: (state) => ({
        drinksByScope: state.drinksByScope,
        currentScopeKey: state.currentScopeKey,
      }),
    },
  ),
);

/** Stable empty reference — avoids Zustand re-render loops in selectors. */
const EMPTY_SCOPED_DRINKS: SelectedDrink[] = [];

/** Reactive selector — drinks for the active event/room scope only. */
export function selectScopedDrinks(state: DrinkSelectionState): SelectedDrink[] {
  const key = state.currentScopeKey;
  if (!key) return EMPTY_SCOPED_DRINKS;
  return state.drinksByScope[key] ?? EMPTY_SCOPED_DRINKS;
}
