/**
 * Cart and Checkout Constants
 * Centralized constants to avoid magic numbers and improve maintainability
 */

export const CART_CONSTANTS = {
  // UI Constants
  ITEMS_PER_ROW: 5,
  MAX_ITEMS_DISPLAY: 10,

  // Fee Constants (removed - no fees)

  // Animation Constants
  ANIMATION_DURATION: 300,
  STAGGER_DELAY: 0.02,

  // Validation Constants
  MIN_QUANTITY: 1,
  MAX_QUANTITY: 999,

  // Storage Keys
  CART_STORAGE_KEY: "cart-storage",

  // Error Messages
  ERRORS: {
    CART_EMPTY: "Please add at least one item to your cart",
    NO_ITEMS_FOUND: "No items found for the selected date",
    CART_LOAD_FAILED: "Failed to load cart data",
    CART_SAVE_FAILED: "Failed to save cart data",
  },

  // Success Messages
  SUCCESS: {
    ITEM_ADDED: "Item added to cart",
    ITEM_REMOVED: "Item removed from cart",
    CART_CLEARED: "Cart cleared successfully",
  },

  // Loading Messages
  LOADING: {
    CART_DATA: "Loading cart data...",
    SAVING_CART: "Saving cart...",
    PROCESSING: "Processing...",
  },
} as const;

export const CART_ANIMATION_VARIANTS = {
  FADE_IN_UP: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: CART_CONSTANTS.ANIMATION_DURATION / 1000 },
  },
  FADE_IN_RIGHT: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
    transition: { duration: CART_CONSTANTS.ANIMATION_DURATION / 1000 },
  },
  SCALE_IN: {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.9, opacity: 0 },
    transition: { duration: CART_CONSTANTS.ANIMATION_DURATION / 1000 },
  },
} as const;
