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
  /** Pre-formatted e.g. "Table 1: 11 / 12 seats" */
  seatsLabel?: string;
  occupied?: number;
  capacity?: number;
}

export interface AddonBreakdownLine {
  id: number;
  label: string;
  amount: number;
  quantity?: number;
  seats?: number;
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
  /** Saved add-on rows (pending or paid history) */
  isSavedAddon?: boolean;
  /** Paid add-on line items moved from checkout arrays after settlement */
  isPaidAddonHistory?: boolean;
  /** Incremental add-ons merged into an original checkout line */
  addonBreakdown?: AddonBreakdownLine[];
  addonExtraTotal?: number;
  addonExtraLabel?: string;
  /** API flag — when false, never show View add-ons on this line */
  hasAddonBreakdown?: boolean;
  /** Grouped add-on rows for compact display */
  groupMembers?: CheckoutLineItem[];
  /** When true, show delete action (pending add-ons only) */
  deletable?: boolean;
  deletePayload?: {
    type: "table" | "package" | "ticket";
    keyword: string | number;
  };
  /** Menu choices shortcut for table rows */
  showMenuChoices?: boolean;
  /** Menu choice context — only on table rows with showMenuChoices */
  menuChoiceContext?: {
    bookingId: number;
    dateKey: string;
    roomId?: number;
    tableAllocations: Array<{
      id: number;
      label: string;
      people: number;
      capacity: number;
    }>;
  };
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
  previousDateLabel?: string;
  subtitle?: string;
  amount: number;
  amountFormatted: string;
  /** Pre-discount amount when an offer reduced this date total. */
  originalAmount?: number | null;
  originalAmountFormatted?: string | null;
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
  /** Pre-discount date subtotal when an offer reduced this date. */
  originalSubtotal?: number | null;
  lines: PaymentBreakdownLine[];
  addonLines?: PaymentBreakdownLine[];
  addonSubtotal?: number;
}
