/**
 * Chat → checkout handoff.
 * Query params (and session storage) let the assistant pre-select pay-in-full
 * vs table deposit (and optionally a coupon) so the guest lands ready to pay.
 */

type CheckoutPaymentQuickAction = {
  id: string;
  label: string;
  href?: string;
  sendText?: string;
};

export const CHECKOUT_HANDOFF_PAY = "pay";
export const CHECKOUT_HANDOFF_COUPON = "coupon";
export const CHECKOUT_HANDOFF_DATES = "dates";
export const CHECKOUT_PATH = "/vendor/checkout";
export const CHAT_EVENT_RETURN_HREF_KEY = "ew.checkout.chat-event-href";

const PENDING_STORAGE_KEY = "ew.checkout.chat-handoff";
const DATE_HANDOFF_CONSUMED_KEY = "ew.checkout.date-handoff-consumed";
const CART_CLEARED_KEY = "ew.checkout.cart-cleared";
const PENDING_TTL_MS = 30 * 60 * 1000;

export type CheckoutHandoffPay = "full" | "deposit";

export type CheckoutHandoffPending = {
  pay: CheckoutHandoffPay | null;
  coupon: string | null;
};

type StoredCheckoutHandoff = CheckoutHandoffPending & { at: number };

export function parseCheckoutHandoffPay(
  value: string | null | undefined,
): CheckoutHandoffPay | null {
  const v = value?.trim().toLowerCase();
  if (v === "full" || v === "deposit") return v;
  return null;
}

export function buildCheckoutHandoffHref(options?: {
  pay?: CheckoutHandoffPay | null;
  coupon?: string | null;
}): string {
  const params = new URLSearchParams();
  if (options?.pay === "full" || options?.pay === "deposit") {
    params.set(CHECKOUT_HANDOFF_PAY, options.pay);
  }
  const coupon = options?.coupon?.trim();
  if (coupon) {
    params.set(CHECKOUT_HANDOFF_COUPON, coupon);
  }
  const query = params.toString();
  return query ? `${CHECKOUT_PATH}?${query}` : CHECKOUT_PATH;
}

function hrefPathname(href: string): string {
  const withoutHash = href.split("#")[0] ?? href;
  try {
    if (withoutHash.startsWith("http://") || withoutHash.startsWith("https://")) {
      return new URL(withoutHash).pathname;
    }
  } catch {
    // keep relative parse
  }
  return withoutHash.split("?")[0] || "";
}

function hrefSearchParams(href: string): URLSearchParams {
  const withoutHash = href.split("#")[0] ?? href;
  try {
    if (withoutHash.startsWith("http://") || withoutHash.startsWith("https://")) {
      return new URL(withoutHash).searchParams;
    }
  } catch {
    // keep relative parse
  }
  const query = withoutHash.includes("?")
    ? withoutHash.slice(withoutHash.indexOf("?") + 1)
    : "";
  return new URLSearchParams(query);
}

export function isCheckoutHandoffHref(href: string | null | undefined): boolean {
  if (!href) return false;
  const path = hrefPathname(href);
  return path === CHECKOUT_PATH || path.startsWith(`${CHECKOUT_PATH}/`);
}

export function isPublicEventBookingHref(href: string | null | undefined): boolean {
  if (!href) return false;
  const path = hrefPathname(href);
  return /^\/(?!vendor|customer|admin|auth)[^/]+\/events\/[^/]+\/?$/.test(path);
}

export function parseCheckoutHandoffFromHref(
  href: string | null | undefined,
): CheckoutHandoffPending {
  if (!href) return { pay: null, coupon: null };
  if (!isCheckoutHandoffHref(href) && !isPublicEventBookingHref(href)) {
    return { pay: null, coupon: null };
  }
  const params = hrefSearchParams(href);
  return {
    pay: parseCheckoutHandoffPay(params.get(CHECKOUT_HANDOFF_PAY)),
    coupon: params.get(CHECKOUT_HANDOFF_COUPON)?.trim() || null,
  };
}

export function parseHandoffDatesFromHref(
  href: string | null | undefined,
): string[] {
  if (!href) return [];
  const raw = hrefSearchParams(href).get(CHECKOUT_HANDOFF_DATES) ?? "";
  return raw
    .split(",")
    .map((d) => d.trim())
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
}

export function buildEventBookingHandoffHref(options: {
  eventHref: string;
  roomId?: number | null;
  dates?: string[];
  pay?: CheckoutHandoffPay | null;
  coupon?: string | null;
}): string {
  const raw = options.eventHref.split("#")[0] || "/";
  let pathname = raw;
  let search = "";
  try {
    const dummy = raw.startsWith("http")
      ? new URL(raw)
      : new URL(raw, "http://local.invalid");
    pathname = dummy.pathname;
    search = dummy.search;
  } catch {
    const q = raw.indexOf("?");
    pathname = q >= 0 ? raw.slice(0, q) : raw;
    search = q >= 0 ? raw.slice(q) : "";
  }
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  if (options.roomId != null && options.roomId > 0) {
    params.set("roomId", String(options.roomId));
  }
  const dates = (options.dates ?? []).map((d) => d.slice(0, 10)).filter(Boolean);
  if (dates.length > 0) {
    params.set(CHECKOUT_HANDOFF_DATES, dates.join(","));
  }
  if (options.pay === "full" || options.pay === "deposit") {
    params.set(CHECKOUT_HANDOFF_PAY, options.pay);
  }
  const coupon = options.coupon?.trim();
  if (coupon) {
    params.set(CHECKOUT_HANDOFF_COUPON, coupon);
  }
  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ""}#booking`;
}

/**
 * Event-page URL for "go pick dates" — keep room, drop one-shot cart handoff
 * (`dates` / `pay` / `coupon`) so clearing the cart does not re-add a date.
 */
export function sanitizePublicEventReturnHref(href: string): string {
  if (!isPublicEventBookingHref(href)) return href;
  const raw = href.trim();
  let pathname = "";
  let search = "";
  try {
    const dummy = raw.startsWith("http")
      ? new URL(raw)
      : new URL(raw, "http://local.invalid");
    pathname = dummy.pathname;
    search = dummy.search;
  } catch {
    const withoutHash = raw.split("#")[0] ?? raw;
    const q = withoutHash.indexOf("?");
    pathname = q >= 0 ? withoutHash.slice(0, q) : withoutHash;
    search = q >= 0 ? withoutHash.slice(q) : "";
  }
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  const roomId = Number(params.get("roomId"));
  const kept = new URLSearchParams();
  if (Number.isFinite(roomId) && roomId > 0) {
    kept.set("roomId", String(roomId));
  }
  const query = kept.toString();
  return `${pathname}${query ? `?${query}` : ""}#booking`;
}

export function eventUrlWithoutDateHandoff(
  pathname: string,
  searchParams: URLSearchParams,
): string {
  const next = new URLSearchParams(searchParams.toString());
  next.delete(CHECKOUT_HANDOFF_DATES);
  next.delete(CHECKOUT_HANDOFF_PAY);
  next.delete(CHECKOUT_HANDOFF_COUPON);
  next.delete("booking");
  const query = next.toString();
  return `${pathname}${query ? `?${query}` : ""}#booking`;
}

export function replaceEventUrlWithoutDateHandoff(
  pathname: string,
  searchParams: URLSearchParams,
): void {
  if (typeof window === "undefined") return;
  const url = eventUrlWithoutDateHandoff(pathname, searchParams);
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (current === url) return;
  window.history.replaceState(window.history.state, "", url);
}

export function dateHandoffSignature(
  eventSlug: string,
  roomId: number | null | undefined,
  dates: string[],
): string {
  const room = roomId != null && roomId > 0 ? String(roomId) : "";
  return `${eventSlug}|${room}|${dates.join(",")}`;
}

export function isDateHandoffConsumed(signature: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(DATE_HANDOFF_CONSUMED_KEY) === signature;
  } catch {
    return false;
  }
}

export function markDateHandoffConsumed(signature: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(DATE_HANDOFF_CONSUMED_KEY, signature);
  } catch {
    // ignore
  }
}

export function markCartClearedByUser(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(CART_CLEARED_KEY, "1");
  } catch {
    // ignore
  }
}

export function wasCartClearedByUser(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(CART_CLEARED_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearCartClearedByUser(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(CART_CLEARED_KEY);
  } catch {
    // ignore
  }
}

export function saveChatEventReturnHref(href: string | null | undefined): void {
  if (typeof window === "undefined" || !href) return;
  const stored = isPublicEventBookingHref(href)
    ? sanitizePublicEventReturnHref(href)
    : href;
  try {
    sessionStorage.setItem(CHAT_EVENT_RETURN_HREF_KEY, stored);
  } catch {
    // ignore
  }
}

export function readChatEventReturnHref(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CHAT_EVENT_RETURN_HREF_KEY);
    if (!raw) return null;
    if (!isPublicEventBookingHref(raw)) return raw;
    const cleaned = sanitizePublicEventReturnHref(raw);
    if (cleaned !== raw) {
      sessionStorage.setItem(CHAT_EVENT_RETURN_HREF_KEY, cleaned);
    }
    return cleaned;
  } catch {
    return null;
  }
}

function readPending(): CheckoutHandoffPending | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PENDING_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredCheckoutHandoff>;
    if (typeof parsed.at === "number" && Date.now() - parsed.at > PENDING_TTL_MS) {
      sessionStorage.removeItem(PENDING_STORAGE_KEY);
      return null;
    }
    const pay = parseCheckoutHandoffPay(parsed.pay);
    const coupon =
      typeof parsed.coupon === "string" ? parsed.coupon.trim() || null : null;
    if (!pay && !coupon) return null;
    return { pay, coupon };
  } catch {
    return null;
  }
}

function writePending(pending: CheckoutHandoffPending): void {
  if (typeof window === "undefined") return;
  try {
    if (!pending.pay && !pending.coupon) {
      sessionStorage.removeItem(PENDING_STORAGE_KEY);
      return;
    }
    const stored: StoredCheckoutHandoff = { ...pending, at: Date.now() };
    sessionStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // ignore quota / private mode
  }
}

export function mergeCheckoutHandoffPending(
  partial: Partial<CheckoutHandoffPending>,
): CheckoutHandoffPending {
  const current = readPending() ?? { pay: null, coupon: null };
  const next: CheckoutHandoffPending = {
    pay: partial.pay !== undefined ? partial.pay : current.pay,
    coupon:
      partial.coupon !== undefined
        ? partial.coupon?.trim() || null
        : current.coupon,
  };
  writePending(next);
  return next;
}

export function persistCheckoutHandoffFromHref(
  href: string | null | undefined,
): CheckoutHandoffPending | null {
  const parsed = parseCheckoutHandoffFromHref(href);
  if (isPublicEventBookingHref(href)) {
    saveChatEventReturnHref(href);
  }
  if (!parsed.pay && !parsed.coupon) return null;
  return mergeCheckoutHandoffPending(parsed);
}

export function consumeCheckoutHandoffPending(): CheckoutHandoffPending | null {
  const pending = readPending();
  return pending;
}

export function clearCheckoutHandoffPending(): void {
  writePending({ pay: null, coupon: null });
}

export function checkoutHandoffNavCopy(
  href: string,
  isLoggedInCustomer: boolean,
): string | null {
  const loginBit = isLoggedInCustomer
    ? ""
    : " You’ll need to log in as a customer first.";
  const { pay } = parseCheckoutHandoffFromHref(href);
  const dates = parseHandoffDatesFromHref(href);
  const isEvent = isPublicEventBookingHref(href);

  if (isEvent) {
    if (!pay && dates.length === 0) {
      return `Opening the event page now. You can pick your room and date there, then continue to Checkout.${loginBit}`;
    }
    const dateBit =
      dates.length === 1
        ? " I’ll add that date to your cart"
        : dates.length > 1
          ? " I’ll add those dates to your cart"
          : " Tap the dates you want — that adds them to your cart";
    if (pay === "deposit") {
      return `Opening the event dates now.${dateBit}, then Checkout so you can choose tables and pay a table deposit.${loginBit}`;
    }
    if (pay === "full") {
      return `Opening the event dates now.${dateBit}, then Checkout so you can pay in full.${loginBit}`;
    }
    return `Opening the event dates now.${dateBit}, then you can pay on Checkout.${loginBit}`;
  }

  if (!isCheckoutHandoffHref(href)) return null;
  if (pay === "deposit") {
    return `Opening Checkout with a table deposit selected. Choose card, PayPal, or bank transfer on that page to pay.${loginBit}`;
  }
  if (pay === "full") {
    return `Opening Checkout to pay in full. Choose card, PayPal, or bank transfer on that page to complete payment.${loginBit}`;
  }
  return `Opening Checkout. You can remove a date there, or continue to pay.${loginBit}`;
}

const PAYMENT_INTENT_USER =
  /\b(pay|payment|deposit|checkout|how (do|can) i pay|book (it|now|this)|ready to (pay|book))\b/i;

export function shouldOfferCheckoutPaymentActions(
  userText: string,
  reply: string,
  actions: CheckoutPaymentQuickAction[],
): boolean {
  if (PAYMENT_INTENT_USER.test(userText)) return true;
  if (
    actions.some((action) => {
      const parsed = parseCheckoutHandoffFromHref(action.href);
      return Boolean(parsed.pay || parsed.coupon);
    })
  ) {
    return true;
  }
  if (reply.includes("pay=full") || reply.includes("pay=deposit")) return true;
  return false;
}

/** Replace a generic checkout link with Pay in full / table deposit buttons. */
export function withCheckoutPaymentQuickActions<
  T extends CheckoutPaymentQuickAction,
>(
  actions: T[],
  options?: {
    coupon?: string | null;
    force?: boolean;
    userText?: string;
    reply?: string;
    /** When set, payment buttons open the event dates (adds to cart) instead of empty Checkout. */
    eventHref?: string | null;
    roomId?: number | null;
    dates?: string[];
  },
): Array<T | CheckoutPaymentQuickAction> {
  const coupon = options?.coupon?.trim() || null;
  const shouldOffer =
    options?.force === true ||
    shouldOfferCheckoutPaymentActions(
      options?.userText ?? "",
      options?.reply ?? "",
      actions,
    );
  if (!shouldOffer) return actions;

  const rest = actions.filter((action) => {
    if (isCheckoutHandoffHref(action.href)) return false;
    const parsed = parseCheckoutHandoffFromHref(action.href);
    if (parsed.pay || parsed.coupon) return false;
    if (parseHandoffDatesFromHref(action.href).length > 0) return false;
    return true;
  });
  const dates = options?.dates ?? [];
  const eventHref = options?.eventHref?.trim() || null;
  const hrefFor = (pay: CheckoutHandoffPay) =>
    eventHref
      ? buildEventBookingHandoffHref({
          eventHref,
          roomId: options?.roomId,
          dates,
          pay,
          coupon,
        })
      : buildCheckoutHandoffHref({ pay, coupon });
  const payment: CheckoutPaymentQuickAction[] = [
    {
      id: "pay-full",
      label: "Pay in full",
      href: hrefFor("full"),
    },
    {
      id: "pay-deposit",
      label: "Pay a table deposit",
      href: hrefFor("deposit"),
    },
  ];
  return [...rest.slice(0, 10), ...payment];
}
