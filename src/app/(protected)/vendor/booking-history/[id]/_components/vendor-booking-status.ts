/** Vendor booking payment status helpers (API codes 0–5). */

export function getPaymentStatusNumber(status: string): number {
  const statusLower = status.toLowerCase();
  if (statusLower.includes("paid") || statusLower.includes("full")) return 1;
  if (statusLower.includes("failed")) return 2;
  if (statusLower.includes("cancel")) return 3;
  if (statusLower.includes("refund")) return 4;
  if (statusLower.includes("partial")) return 5;
  return 0;
}

export function getPaymentStatusLabel(statusNumber: number): string {
  switch (statusNumber) {
    case 0:
      return "Pending";
    case 1:
      return "Paid";
    case 2:
      return "Failed";
    case 3:
      return "Cancelled";
    case 4:
      return "Refunded";
    case 5:
      return "Partial Payment";
    default:
      return "Unknown";
  }
}

export function getAllowedStatusOptions(currentStatusNum: number): number[] {
  let options: number[];
  switch (currentStatusNum) {
    case 1:
      options = [3, 4];
      break;
    case 5:
      options = [1, 3, 4];
      break;
    case 0:
    case 2:
      options = [0, 1, 2, 3, 4];
      break;
    case 3:
      options = [4];
      break;
    case 4:
      options = [];
      break;
    default:
      options = [0, 1, 2, 3, 4];
  }
  return options.filter((num) => num !== currentStatusNum);
}

export function normalizeVendorPaymentStatus(
  status: string,
): "paid" | "pending" | "partial" | "refunded" | "cancelled" {
  const s = status?.toLowerCase().trim() ?? "";
  if (s.includes("paid") && !s.includes("partial")) return "paid";
  if (s.includes("refund")) return "refunded";
  if (s.includes("cancel")) return "cancelled";
  if (s.includes("partial")) return "partial";
  return "pending";
}
