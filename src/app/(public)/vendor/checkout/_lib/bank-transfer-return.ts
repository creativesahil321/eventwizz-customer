import { checkoutService } from "@/services/customer/checkout/checkout.service";
import type { CheckoutResponse } from "@/services/customer/checkout/type";
import { confirmBankTransferPayment } from "@/services/customer/payment/payment-success";
import { useCheckoutPaymentUiStore } from "@/store/checkout-payment-ui.store";

export const BANK_TRANSFER_PROCESSING_MESSAGE =
  "Your bank transfer is being processed. We'll confirm your booking as soon as your bank completes the payment.";

export const BANK_TRANSFER_INCOMPLETE_MESSAGE =
  "Your bank transfer wasn't completed. You can try again or choose another way to pay.";

const POLL_INTERVAL_MS = 3000;
const POLL_WINDOW_MS = 60_000;

export type BankReturnPhase =
  | "checking"
  | "processing"
  | "incomplete"
  | "paid"
  | "resume_error";

export interface BankReturnSnapshot {
  intent: string;
  bookingNumber: string;
  phase: BankReturnPhase;
  response?: CheckoutResponse;
  error?: unknown;
}

interface BankReturnQuery {
  paymentIntent: string;
  bookingNumber: string;
  bookingId: number;
}

type RouterReplace = {
  replace: (href: string, options?: { scroll?: boolean }) => void;
};

let snapshot: BankReturnSnapshot | null = null;
let startedIntent: string | null = null;
let paidHandoffDone = false;
const listeners = new Set<(state: BankReturnSnapshot) => void>();

function publish(next: BankReturnSnapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener(next));
}

export function subscribeBankTransferReturn(
  listener: (state: BankReturnSnapshot) => void,
): () => void {
  listeners.add(listener);
  if (snapshot) listener(snapshot);
  return () => {
    listeners.delete(listener);
  };
}

export function consumeBankTransferPaidHandoff(): boolean {
  if (paidHandoffDone) return false;
  paidHandoffDone = true;
  return true;
}

function delay(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function readBankReturnQuery(): BankReturnQuery | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  if (params.get("bank_return") !== "1") return null;

  const paymentIntent = params.get("payment_intent")?.trim() ?? "";
  const bookingNumber = params.get("booking_number")?.trim() ?? "";
  if (!paymentIntent || !bookingNumber) return null;

  const bookingIdRaw = Number(params.get("booking_id"));
  const stored = useCheckoutPaymentUiStore.getState().stripePaymentSession;
  const storedBookingId =
    stored?.bookingNumber === bookingNumber ? stored.bookingId : 0;
  const bookingId =
    Number.isFinite(bookingIdRaw) && bookingIdRaw > 0
      ? bookingIdRaw
      : storedBookingId;

  return { paymentIntent, bookingNumber, bookingId };
}

function stripBankReturnParams(router: RouterReplace) {
  const params = new URLSearchParams(window.location.search);
  params.delete("payment_intent");
  params.delete("payment_intent_client_secret");
  params.delete("redirect_status");
  params.delete("bank_return");
  params.delete("booking_id");
  const query = params.toString();
  const href = query
    ? `${window.location.pathname}?${query}`
    : window.location.pathname;
  router.replace(href, { scroll: false });
}

/**
 * Confirms a Bank Transfer return once per payment intent.
 * Later subscribers receive the same in-memory result, so a strict-mode
 * remount does not send a second confirm or resume.
 */
export function beginBankTransferReturn(
  query: BankReturnQuery,
  router: RouterReplace,
) {
  if (startedIntent === query.paymentIntent) return;
  startedIntent = query.paymentIntent;

  publish({
    intent: query.paymentIntent,
    bookingNumber: query.bookingNumber,
    phase: "checking",
  });
  stripBankReturnParams(router);

  void runBankTransferReturn(query);
}

async function runBankTransferReturn(query: BankReturnQuery) {
  const base = {
    intent: query.paymentIntent,
    bookingNumber: query.bookingNumber,
  };

  if (query.bookingId > 0) {
    let outcome = await confirmBankTransferPayment({
      bookingId: query.bookingId,
      paymentIntentId: query.paymentIntent,
    });

    if (outcome.kind === "paid") {
      publish({ ...base, phase: "paid" });
      return;
    }

    if (outcome.kind === "processing") {
      publish({ ...base, phase: "processing" });
      const deadline = Date.now() + POLL_WINDOW_MS;
      while (Date.now() < deadline) {
        await delay(POLL_INTERVAL_MS);
        const next = await confirmBankTransferPayment({
          bookingId: query.bookingId,
          paymentIntentId: query.paymentIntent,
        });
        if (next.kind === "paid") {
          publish({ ...base, phase: "paid" });
          return;
        }
        outcome = next;
        if (next.kind !== "processing") break;
      }

      if (outcome.kind === "processing") return;
    }
  }

  try {
    const response = await checkoutService.resumeCheckout({
      booking_number: query.bookingNumber,
    });
    if (!response.status || !response.data) {
      throw new Error(response.message || "Could not resume payment");
    }
    publish({ ...base, phase: "incomplete", response });
  } catch (error) {
    publish({ ...base, phase: "resume_error", error });
  }
}
