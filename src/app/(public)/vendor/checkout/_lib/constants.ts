export const CHECKOUT_CONSTANTS = {
  DEFAULT_EVENT_SLUG: "homecoming-event",
  DEFAULT_TICKET_TYPE: "PHASE 3 VIP + Q JUMP TICKETS",
  DEFAULT_QUANTITY: "1",
  DEFAULT_PRICE: 35.0,
  DEFAULT_TOTAL: 35.0,
} as const;

export const ANIMATION_VARIANTS = {
  FADE_IN_UP: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 },
  },
  FADE_IN_LEFT: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.5, delay: 0.2 },
  },
  FADE_IN_RIGHT: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.5, delay: 0.2 },
  },
} as const;

export const LOADING_MESSAGES = {
  LOADING_CHECKOUT: "Loading checkout...",
  REDIRECTING_LOGIN: "Redirecting to login...",
  REDIRECTING_UNAUTHORIZED: "Redirecting to unauthorized page...",
} as const;
