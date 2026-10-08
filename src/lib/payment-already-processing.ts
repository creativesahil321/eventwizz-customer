import axios from "axios";

/** Backend sentence when a bank transfer is already in flight. Show as info. */
export const PAYMENT_ALREADY_PROCESSING_MESSAGE =
  "Your payment is already being processed.";

export function isPaymentAlreadyProcessingMessage(message: unknown): boolean {
  return (
    typeof message === "string" &&
    message.trim() === PAYMENT_ALREADY_PROCESSING_MESSAGE
  );
}

export function readApiMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: unknown } | undefined;
    if (typeof data?.message === "string" && data.message.trim()) {
      return data.message;
    }
  }
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "";
}

export function isPaymentAlreadyProcessing(error: unknown): boolean {
  return isPaymentAlreadyProcessingMessage(readApiMessage(error));
}
