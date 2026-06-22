import type { LineItemKind } from "./item-kinds";

export type AddonItemCategory = "seating" | "package";

export function splitLineItemsByKind<T extends { kind?: LineItemKind }>(
  items: T[],
): Array<{ kind: Extract<LineItemKind, "ticket" | "table" | "package">; items: T[] }> {
  const tickets: T[] = [];
  const tables: T[] = [];
  const packages: T[] = [];

  items.forEach((item) => {
    if (item.kind === "ticket") tickets.push(item);
    else if (item.kind === "table") tables.push(item);
    else if (item.kind === "package") packages.push(item);
  });

  return [
    { kind: "ticket" as const, items: tickets },
    { kind: "table" as const, items: tables },
    { kind: "package" as const, items: packages },
  ].filter((group) => group.items.length > 0);
}

export function splitAddonsByCategory<T extends { kind?: LineItemKind }>(
  items: T[],
): { seating: T[]; packages: T[] } {
  const seating: T[] = [];
  const packages: T[] = [];

  items.forEach((item) => {
    if (item.kind === "package") {
      packages.push(item);
    } else {
      seating.push(item);
    }
  });

  return { seating, packages };
}

export function getAddonCategoryLabel(
  category: AddonItemCategory,
  items: { kind?: LineItemKind }[],
  packageTitle?: string,
): string {
  if (category === "package") {
    const title = packageTitle?.trim();
    return title || "Packages";
  }

  const hasTables = items.some((item) => item.kind === "table");
  const hasTickets = items.some((item) => item.kind === "ticket");

  if (hasTables && hasTickets) return "Tables & tickets";
  if (hasTables) return "Tables";
  if (hasTickets) return "Tickets";
  return "Tables & tickets";
}

export interface AllocationPill {
  id?: number;
  label: string;
  value: string;
}

export interface CheckoutLineItem {
  id: string;
  kind: LineItemKind;
  name: string;
  description?: string;
  meta: string;
  amount: number;
  unitPrice?: number;
  allocation?: AllocationPill[];
  quantity?: number;
  /** Saved add-on rows (vs original booking lines) */
  isSavedAddon?: boolean;
  /** Grouped add-on rows for compact display */
  groupMembers?: CheckoutLineItem[];
  /** When true, show delete action (saved add-ons only) */
  deletable?: boolean;
  deletePayload?: {
    type: "table" | "package" | "ticket";
    keyword: string | number;
  };
  /** Menu choices shortcut for table rows */
  showMenuChoices?: boolean;
}

export interface DateLineItemsSplit {
  bookingItems: CheckoutLineItem[];
  addonItems: CheckoutLineItem[];
  addonTotal: number;
  addonLineCount: number;
}

export interface CheckoutDateCard {
  id: string;
  booking_date_id: number;
  date: string;
  subtitle?: string;
  amount: number;
  amountFormatted: string;
  paidAmount: number;
  paidAmountFormatted: string;
  paymentStatus: "paid" | "pending" | "partial" | "refunded" | "cancelled";
  paymentStatusLabel?: string;
  canPayNow?: boolean;
}

export interface PaymentBreakdownLine {
  id: string;
  label: string;
  meta: string;
  amount: number;
  isAddon?: boolean;
  kind?: LineItemKind;
}

export interface PaymentBreakdownGroup {
  id: string;
  title: string;
  packageTitle?: string;
  subtotal: number;
  lines: PaymentBreakdownLine[];
  addonLines?: PaymentBreakdownLine[];
  addonSubtotal?: number;
}
