"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAddOnsDetails } from "@/services/customer/bookings/hooks/useAddOnsDetails";
import { useSaveAddOns } from "@/services/customer/bookings/hooks/useSaveAddOns";
import { useVendorAddOns } from "@/services/vendor/bookings/hooks/useVendorAddOns";
import { useSaveVendorAddOns } from "@/services/vendor/bookings/hooks/useSaveVendorAddOns";
import { mapVendorAddOnsToCustomer } from "@/app/(protected)/vendor/booking-history/[id]/_components/map-vendor-addons-to-customer";
import {
  VendorAddonsPaymentModeDialog,
  type VendorAddonsPaymentMode,
} from "@/app/(protected)/vendor/booking-history/[id]/_components/vendor-addons-payment-mode-dialog";
import {
  isBookingDateEligibleForAddOns,
  type BookingDatePaymentStatus,
} from "@/lib/booking-addons-eligibility";
import type { CSSProperties } from "react";
import {
  getKindStyles,
  kindAccentStyle,
  SECTION_TITLE_STYLE,
  type LineItemKind,
} from "./item-kinds";
import { KindIconChip } from "./kind-icon-chip";
import { QuantityStepper } from "./quantity-stepper";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  TableSeatingPanel,
  isNewTableGroupViable,
  type TableSeatingConfig,
  type TableSeatingSnapshot,
} from "./table-seating-panel";
import {
  FillExistingTablesPanel,
  buildExistingTableSlots,
  hasBookedTableAllocations,
  type ExistingTableFillSnapshot,
  type ExistingTableSlot,
} from "./fill-existing-tables-panel";
import {
  resolvePackageSectionTitle,
  type BookingDateSource,
} from "./build-line-items";
import {
  canExtendExistingTables,
  getAddOnNewTableStock,
  normalizeAddOnsCatalogData,
} from "./normalize-addons-catalog";
import type { AddOnsResponse, AddOnsTable } from "@/services/customer/bookings/type";
import type { VendorAddOnsData } from "@/services/vendor/bookings/add-ons.service";
import {
  generateTableRecommendations,
  type AvailableTableSize,
} from "../../_lib/table-recommendations";
import VenueContactNotice from "@/app/(public)/vendor/checkout/_components/venue-contact-notice";
import { resolveVenueContact } from "@/lib/resolve-venue-contact";
import { useDomain } from "@/providers/domain-provider/domain-provider";

function buildConfirmedSeatingMessage(
  existingGuestCount: number,
  newTableGuestCount: number,
): string {
  const hasExisting = existingGuestCount > 0;
  const hasNew = newTableGuestCount > 0;

  if (hasExisting && hasNew) {
    return `${existingGuestCount} guest${existingGuestCount === 1 ? "" : "s"} added to your existing tables and ${newTableGuestCount} ${newTableGuestCount === 1 ? "is" : "are"} added in new table`;
  }
  if (hasExisting) {
    return `${existingGuestCount} guest${existingGuestCount === 1 ? "" : "s"} added to your existing tables`;
  }
  return `${newTableGuestCount} guest${newTableGuestCount === 1 ? "" : "s"} added in new table`;
}

function ConfirmedSeatingSummary({
  existingGuestCount,
  newTableGuestCount,
  onEdit,
}: {
  existingGuestCount: number;
  newTableGuestCount: number;
  onEdit: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
      style={{
        borderColor:
          "color-mix(in srgb, var(--booking-kind-table) 22%, var(--border))",
        background:
          "color-mix(in srgb, var(--booking-kind-table) 5%, var(--card))",
      }}
    >
      <p className="m-0 text-[12px] font-medium leading-[1.45] text-foreground">
        {buildConfirmedSeatingMessage(existingGuestCount, newTableGuestCount)}
      </p>
      <button
        type="button"
        className="shrink-0 text-[11px] font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        onClick={onEdit}
      >
        Edit
      </button>
    </div>
  );
}

interface CatalogItem {
  id: number;
  title: string;
  description?: string;
  price: number;
  quantity: number;
  maxQuantity: number;
}

interface AddExtrasSectionProps {
  open: boolean;
  onToggle: () => void;
  bookingId: string;
  /** Unique UI key (may be room-scoped composite id) */
  dateId: string;
  /** Event date for API calls (YYYY-MM-DD) */
  dateKey: string;
  roomId?: number;
  paymentStatus?: BookingDatePaymentStatus;
  dateSource?: BookingDateSource;
  /** Booking-level drink/package section title when date omits `package_title`. */
  packageTitleFallback?: string;
  formatCurrency: (amount: number) => string;
  formatUnit: (amount: number) => string;
  onPendingTotalChange?: (total: number, itemCount: number) => void;
  onSaveSuccess?: () => void;
  /** When `vendor`, uses vendor add-ons API (vendor booking dashboard). */
  addonApi?: "customer" | "vendor";
  /** Vendor only — when true, prompt for online/offline before saving add-ons. */
  showPaymentModeOption?: boolean;
  /** Vendor only — applied when `showPaymentModeOption` is false. */
  defaultAddonPaymentMode?: VendorAddonsPaymentMode;
}

function getNewTableStock(table: AddOnsTable): number {
  return getAddOnNewTableStock(table);
}

function canBookNewTable(table: AddOnsTable): boolean {
  if (table.can_add_new_table === false) return false;
  return getNewTableStock(table) > 0;
}

function toAvailableTableSize(table: AddOnsTable): AvailableTableSize {
  return {
    id: table.id,
    size: table.max_persons,
    min_persons: table.min_persons,
    max_persons: table.max_persons,
    price: table.price,
    available: getNewTableStock(table),
  };
}

function toTableSeatingConfig(table: AddOnsTable): TableSeatingConfig {
  const stock = getNewTableStock(table);
  return {
    id: table.id,
    min: Math.max(1, table.min_persons),
    max: Math.max(table.min_persons, table.max_persons),
    price: Math.max(0, table.price),
    maxTables: stock,
  };
}

/** Max guests: free seats on booked tables + all new-table capacity across tiers. */
function computeMaxAddableGuests(
  catalogTables: AddOnsTable[],
  existingFreeSeats: number,
): number {
  const newCapacity = catalogTables.reduce((sum, table) => {
    if (!canBookNewTable(table)) return sum;
    const maxPersons = Math.max(table.min_persons, table.max_persons);
    return sum + getNewTableStock(table) * maxPersons;
  }, 0);

  return existingFreeSeats + newCapacity;
}

function resolveActiveTableConfig(
  catalogTables: AddOnsTable[],
  guestsNeedingNewTable: number,
): TableSeatingConfig | null {
  const eligible = catalogTables.filter(canBookNewTable);
  if (eligible.length === 0) return null;

  if (guestsNeedingNewTable <= 0) {
    return toTableSeatingConfig(eligible[0]);
  }

  const sizes = eligible.map(toAvailableTableSize);
  const { recommended } = generateTableRecommendations(
    sizes,
    guestsNeedingNewTable,
  );
  const picked = recommended[0]?.table;
  if (picked) {
    const match = eligible.find((table) => table.id === picked.id);
    if (match) return toTableSeatingConfig(match);
  }

  return toTableSeatingConfig(eligible[0]);
}

type NewTablePanelScope = "all" | "remaining";

const EMPTY_EXISTING_FILL: ExistingTableFillSnapshot = {
  additionsBySlot: {},
  totalAdded: 0,
  totalCost: 0,
  saveGroups: [],
};

const EMPTY_TABLE_SEATING: TableSeatingSnapshot = {
  groupSize: 0,
  allocation: [],
  seatingConfirmed: false,
  tableTotal: 0,
  tableItemCount: 0,
  draftGuestTotal: 0,
};

interface GuestPlacementIssue {
  existingOnlySize: number;
  mixedGroupSize: number;
}

/**
 * When guest count cannot be fully seated (existing capacity + new-table rules).
 * E.g. 5 guests, 2 existing seats, new tables min 4 → 2+3 is invalid (3 < min).
 */
function resolveGuestPlacementIssue(
  guestsToAdd: number,
  totalFreeExistingSeats: number,
  tableConfig: TableSeatingConfig | null,
  hasExistingTables: boolean,
): GuestPlacementIssue | null {
  if (guestsToAdd <= 0 || !tableConfig) return null;

  if (isNewTableGroupViable(guestsToAdd, tableConfig)) return null;
  if (hasExistingTables && guestsToAdd <= totalFreeExistingSeats) return null;

  const existingCap = Math.max(0, totalFreeExistingSeats);
  const remainderAfterMaxExisting = Math.max(0, guestsToAdd - existingCap);
  const mixedGroupSize = existingCap + tableConfig.min;

  const stuckInMixedGap =
    hasExistingTables &&
    guestsToAdd > existingCap &&
    remainderAfterMaxExisting > 0 &&
    remainderAfterMaxExisting < tableConfig.min;

  const cannotSeatAtAll =
    !hasExistingTables ||
    (guestsToAdd > existingCap &&
      remainderAfterMaxExisting > 0 &&
      !isNewTableGroupViable(remainderAfterMaxExisting, tableConfig));

  if (!stuckInMixedGap && !cannotSeatAtAll) return null;

  return {
    existingOnlySize: hasExistingTables
      ? Math.min(guestsToAdd, existingCap)
      : 0,
    mixedGroupSize,
  };
}

function formatGuestPlacementIssueMessage(
  guestsToAdd: number,
  totalFreeExistingSeats: number,
  newTableMinGuests: number,
  showExistingTableContext: boolean,
): string {
  const guestLabel = `${guestsToAdd} guest${guestsToAdd === 1 ? "" : "s"}`;

  if (showExistingTableContext && totalFreeExistingSeats === 0) {
    return `${guestLabel} cannot all be seated. Your existing tables are full, and new tables require at least ${newTableMinGuests} guests. Contact the venue for assistance.`;
  }

  if (showExistingTableContext && totalFreeExistingSeats > 0) {
    const existingCapacity =
      totalFreeExistingSeats === 1
        ? "Only 1 guest can be seated at your existing tables"
        : `Only ${totalFreeExistingSeats} guests can be seated at your existing tables`;
    return `${guestLabel} cannot all be seated. ${existingCapacity}, and new tables require at least ${newTableMinGuests} guests. Contact the venue for assistance.`;
  }

  return `New tables require at least ${newTableMinGuests} guests. Increase your group size, or contact the venue for assistance.`;
}

function resolveNewTablePanelGuestCount(options: {
  guestsToAdd: number;
  guestsRemainingUnplaced: number;
  existingFillTotal: number;
  panelOpen: boolean;
  scope: NewTablePanelScope;
}): number {
  const {
    guestsToAdd,
    guestsRemainingUnplaced,
    existingFillTotal,
    panelOpen,
    scope,
  } = options;

  if (!panelOpen || guestsToAdd <= 0) return 0;
  if (existingFillTotal > 0) return guestsRemainingUnplaced;
  return scope === "all" ? guestsToAdd : guestsRemainingUnplaced;
}

function formatGuestAddPriceHintLabel(
  hint: { single: number | null; min: number | null; max: number | null },
  formatUnit: (amount: number) => string,
  showExistingTableContext: boolean,
): string | null {
  if (hint.single != null) {
    return showExistingTableContext
      ? `${formatUnit(hint.single)} per person on existing tables`
      : `${formatUnit(hint.single)} per person`;
  }

  if (hint.min != null && hint.max != null) {
    return showExistingTableContext
      ? `${formatUnit(hint.min)}–${formatUnit(hint.max)} per person on existing tables`
      : `${formatUnit(hint.min)}–${formatUnit(hint.max)} per person`;
  }

  return null;
}

function formatNewTablePanelMessage(
  scope: NewTablePanelScope,
  showExistingTableContext: boolean,
): string | null {
  if (!showExistingTableContext) return null;

  if (scope === "all") {
    return "Booking a new table for all guests — any placements on existing tables will be cleared.";
  }

  return "Booking a new table for guests not yet placed on existing tables.";
}

function NewTableSetupPrompt({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description?: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div
      className="flex flex-col gap-3 rounded-lg border border-dashed p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
      style={{
        borderColor:
          "color-mix(in srgb, var(--booking-kind-table) 28%, var(--border))",
        background:
          "color-mix(in srgb, var(--booking-kind-table) 5%, var(--card))",
      }}
    >
      <div className="min-w-0">
        <p className="text-[0.8125rem] font-semibold leading-snug text-foreground">
          {title}
        </p>
        {description ? (
          <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        className="inline-flex h-8 shrink-0 items-center justify-center self-stretch rounded-md px-4 text-xs font-bold leading-none transition-opacity hover:opacity-90 sm:self-auto"
        style={{
          background:
            "color-mix(in srgb, var(--booking-kind-table) 14%, var(--card))",
          border:
            "1px solid color-mix(in srgb, var(--booking-kind-table) 35%, var(--border))",
          color:
            "color-mix(in srgb, var(--booking-kind-table) 90%, var(--foreground))",
        }}
        onClick={onAction}
      >
        {actionLabel}
      </button>
    </div>
  );
}

/** Booked table rate for add-guests flow — not the first catalog table tier. */
function resolveGuestAddPriceHint(
  useAddGuestsFlow: boolean,
  existingSlots: ExistingTableSlot[],
  dateSource: BookingDateSource | undefined,
  fallbackCatalogPrice: number | null,
): { single: number | null; min: number | null; max: number | null } {
  if (!useAddGuestsFlow) {
    const price = fallbackCatalogPrice;
    return { single: price, min: price, max: price };
  }

  const prices: number[] = [];
  existingSlots.forEach((slot) => {
    if (slot.pricePerPerson > 0) prices.push(slot.pricePerPerson);
  });
  dateSource?.tables?.forEach((table) => {
    if (table.unit_price > 0) prices.push(table.unit_price);
  });

  if (prices.length === 0) {
    const price = fallbackCatalogPrice;
    return { single: price, min: price, max: price };
  }

  const unique = [...new Set(prices.map((p) => Math.round(p * 100) / 100))];
  const min = Math.min(...unique);
  const max = Math.max(...unique);
  return {
    single: unique.length === 1 ? unique[0] : null,
    min,
    max,
  };
}

function buildDateSourceSyncKey(
  dateId: string,
  date?: BookingDateSource,
): string {
  if (!date) return dateId;

  return JSON.stringify({
    dateId,
    id: date.id,
    date_key: date.date_key,
    tickets: (date.tickets ?? []).map((ticket) => [ticket.id, ticket.quantity]),
    packages: (date.packages ?? []).map((pkg) => [pkg.id, pkg.quantity]),
    addonTickets: (date.addons?.tickets ?? []).map((ticket) => [
      ticket.id,
      ticket.quantity ?? 1,
    ]),
    addonPackages: (date.addons?.packages ?? []).map((pkg) => [
      pkg.id,
      pkg.quantity,
    ]),
    tableIds: (date.tables ?? []).map((table) => table.id),
  });
}

function ExtrasSectionHeader({
  kind,
  title,
}: {
  kind: LineItemKind;
  title?: string;
}) {
  const styles = getKindStyles(kind);
  const customTitle = title?.trim();
  return (
    <div
      className="flex items-center gap-2 mb-[0.625rem] pb-2"
      style={{
        ...kindAccentStyle(kind),
        borderBottom: "1px solid color-mix(in srgb, var(--kind-accent, var(--border)) 22%, var(--border))",
      }}
    >
      <KindIconChip kind={kind} size="md" variant="section" />
      <h4
        className={cn(
          styles.sectionClassName,
          customTitle && "normal-case tracking-[0.01em] font-bold",
        )}
        style={SECTION_TITLE_STYLE}
      >
        {customTitle ?? styles.sectionTitle}
      </h4>
    </div>
  );
}

interface CatalogCardProps {
  kind: LineItemKind;
  title: string;
  description?: string;
  priceLabel: string;
  quantity: number;
  maxQuantity: number;
  onAdd: () => void;
  onQuantityChange: (qty: number) => void;
}

function CatalogCard({
  kind,
  title,
  description,
  priceLabel,
  quantity,
  maxQuantity,
  onAdd,
  onQuantityChange,
}: CatalogCardProps) {
  const selected = quantity > 0;
  const soldOut = maxQuantity <= 0;

  const accentStyle = kindAccentStyle(kind);
  const cardStyle: CSSProperties = {
    ...accentStyle,
    transition: "border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease",
    ...(selected ? {
      borderColor: "var(--kind-accent, var(--color-primary))",
      backgroundColor: "color-mix(in srgb, var(--kind-accent, var(--color-primary)) 4%, var(--card))",
      boxShadow: "0 0 0 1px color-mix(in srgb, var(--kind-accent, var(--color-primary)) 16%, transparent)",
    } : {}),
  };

  return (
    <div
      className={cn(
        "flex flex-col w-full min-h-0 rounded-lg border border-border bg-card p-[0.625rem_0.75rem] sm:max-w-[10.5rem]",
        soldOut && "opacity-55",
      )}
      style={cardStyle}
    >
      <p className="text-[13px] font-semibold leading-[1.35] text-foreground">{title}</p>
      {description && (
        <p className="mt-0.5 text-[10px] leading-[1.4] text-muted-foreground line-clamp-2">
          {description}
        </p>
      )}
      <p
        className="mt-1.5 text-[13px] font-bold tabular-nums leading-none"
        style={{ color: "var(--kind-accent, var(--foreground))" }}
      >
        {priceLabel}
      </p>
      {maxQuantity > 0 && (
        <p className="mt-0.5 text-[10px] font-semibold text-muted-foreground">
          {maxQuantity === 1 ? "1 available" : `${maxQuantity} available`}
        </p>
      )}
      <div className="mt-2">
        {selected ? (
          <div className="flex w-full items-center justify-between gap-1.5">
            <QuantityStepper
              value={quantity}
              max={maxQuantity}
              onChange={onQuantityChange}
              size="sm"
              useKindAccent
            />
            <button
              type="button"
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-[color-mix(in_srgb,var(--destructive,#dc2626)_10%,transparent)]"
              style={{ color: "var(--destructive, #dc2626)" }}
              onClick={() => onQuantityChange(0)}
              aria-label={`Remove ${title}`}
              title="Remove"
            >
              <Trash2 className="h-3 w-3" strokeWidth={2} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="inline-flex h-[1.875rem] w-full items-center justify-center gap-1 rounded-md bg-card text-[11px] font-semibold leading-none transition-colors"
            style={{
              border: "1px solid color-mix(in srgb, var(--kind-accent, var(--color-primary)) 32%, var(--border))",
              color: "var(--kind-accent, var(--color-primary))",
            }}
            onClick={onAdd}
            disabled={soldOut}
          >
            <Plus className="h-3 w-3" strokeWidth={2} />
            {soldOut ? "Sold out" : `Add ${priceLabel}`}
          </button>
        )}
      </div>
    </div>
  );
}

function formatPendingExtrasSummary(
  tableGuestCount: number,
  catalogItemCount: number,
): string | null {
  const parts: string[] = [];
  if (tableGuestCount > 0) {
    parts.push(`${tableGuestCount} guest${tableGuestCount === 1 ? "" : "s"}`);
  }
  if (catalogItemCount > 0) {
    parts.push(`${catalogItemCount} item${catalogItemCount === 1 ? "" : "s"}`);
  }
  return parts.length > 0 ? parts.join(", ") : null;
}

function AddExtrasHeader({
  open,
  onToggle,
  pendingSummaryLabel,
  pendingTotalFormatted,
  isSaving,
  onSave,
}: {
  open: boolean;
  onToggle: () => void;
  pendingSummaryLabel: string | null;
  pendingTotalFormatted: string;
  isSaving: boolean;
  onSave: () => void;
}) {
  return (
    <div
      className="space-y-2 px-4 py-3 sm:px-5"
      style={{ background: "color-mix(in srgb, var(--muted) 12%, var(--card))" }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full min-w-0 items-center gap-2 text-left transition-opacity hover:opacity-85"
        aria-expanded={open}
      >
        <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={2} />
        <span className="min-w-0 flex-1 text-[0.8125rem] font-semibold leading-snug text-foreground">
          Add extras for this date
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
          strokeWidth={2}
        />
      </button>
      {pendingSummaryLabel && (
        <div className="flex flex-col gap-2 border-t border-border/50 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <span
            className="self-start rounded-full px-3 py-1 text-[0.6875rem] font-semibold tabular-nums whitespace-nowrap"
            style={{
              background: "color-mix(in srgb, var(--color-primary) 14%, transparent)",
              color: "var(--color-primary)",
            }}
          >
            {pendingSummaryLabel} · {pendingTotalFormatted}
          </span>
          <button
            type="button"
            className="h-9 w-full shrink-0 rounded-full px-4 text-xs font-semibold transition-opacity hover:enabled:opacity-[0.92] disabled:cursor-not-allowed disabled:opacity-65 sm:w-auto"
            style={{
              background: "var(--color-primary)",
              color: "var(--color-primary-foreground, #fff)",
            }}
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? "Adding…" : "Add to booking"}
          </button>
        </div>
      )}
    </div>
  );
}

export function AddExtrasSection({
  open,
  onToggle,
  bookingId,
  dateId,
  dateKey,
  roomId,
  paymentStatus,
  dateSource,
  packageTitleFallback,
  formatCurrency,
  formatUnit,
  onPendingTotalChange,
  onSaveSuccess,
  addonApi = "customer",
  showPaymentModeOption = false,
  defaultAddonPaymentMode,
}: AddExtrasSectionProps) {
  const eligible = isBookingDateEligibleForAddOns(paymentStatus);
  const packageSectionTitle = useMemo(
    () => resolvePackageSectionTitle(dateSource, packageTitleFallback),
    [dateSource, packageTitleFallback],
  );
  const useVendorApi = addonApi === "vendor";
  const { settings } = useDomain();
  const { phone: venuePhone, email: venueEmail, address: venueAddress } =
    resolveVenueContact(settings);

  const customerAddonsQuery = useAddOnsDetails(
    bookingId,
    eligible && !useVendorApi ? dateKey : "",
    roomId,
  );
  const vendorAddonsQuery = useVendorAddOns(
    bookingId,
    dateKey,
    eligible && useVendorApi,
    roomId,
  );

  const addonsCatalogSource = useVendorApi
    ? vendorAddonsQuery.data
    : customerAddonsQuery.data;

  const addOnsData = useMemo((): AddOnsResponse | undefined => {
    if (!addonsCatalogSource?.data) return undefined;

    const rawData = useVendorApi
      ? mapVendorAddOnsToCustomer(addonsCatalogSource.data as VendorAddOnsData)
      : (addonsCatalogSource.data as AddOnsResponse["data"]);

    return {
      ...addonsCatalogSource,
      data: normalizeAddOnsCatalogData(rawData),
    };
  }, [addonsCatalogSource, useVendorApi]);

  const dateSourceSyncKey = useMemo(
    () => buildDateSourceSyncKey(dateId, dateSource),
    [dateId, dateSource],
  );

  const isLoading = useVendorApi
    ? vendorAddonsQuery.isLoading
    : customerAddonsQuery.isLoading;

  const { mutate: saveCustomerAddOns, isPending: isSavingCustomerAddOns } =
    useSaveAddOns();
  const { mutate: saveVendorAddOns, isPending: isSavingVendorAddOns } =
    useSaveVendorAddOns(bookingId);

  const saveAddOns = useVendorApi ? saveVendorAddOns : saveCustomerAddOns;
  const isSavingAddOns = useVendorApi
    ? isSavingVendorAddOns
    : isSavingCustomerAddOns;

  const [tickets, setTickets] = useState<CatalogItem[]>([]);
  const [drinks, setDrinks] = useState<CatalogItem[]>([]);
  const [tableSeating, setTableSeating] = useState<TableSeatingSnapshot>({
    groupSize: 0,
    allocation: [],
    seatingConfirmed: false,
    tableTotal: 0,
    tableItemCount: 0,
    draftGuestTotal: 0,
  });
  const [tablePanelResetKey, setTablePanelResetKey] = useState(0);
  const [guestsToAdd, setGuestsToAdd] = useState(0);
  const [paymentModeDialogOpen, setPaymentModeDialogOpen] = useState(false);
  const [newTablePanelOpen, setNewTablePanelOpen] = useState(false);
  const [newTablePanelScope, setNewTablePanelScope] =
    useState<NewTablePanelScope>("all");
  const [existingFillPanelKey, setExistingFillPanelKey] = useState(0);
  const [existingAutoFillSignal, setExistingAutoFillSignal] = useState(0);
  const [existingSeatingConfirmed, setExistingSeatingConfirmed] = useState(false);
  const [isEditingSeating, setIsEditingSeating] = useState(true);
  const awaitingMixedAutoFillSignalRef = useRef<number | null>(null);
  const wasSeatingFullyConfirmedRef = useRef(false);
  const prevExistingPlacedRef = useRef(0);
  const seatingDraftRef = useRef({
    guestsToAdd: 0,
    existingFill: EMPTY_EXISTING_FILL,
    existingSeatingConfirmed: false,
    newTablePanelOpen: false,
    newTablePanelScope: "all" as NewTablePanelScope,
    tableSeating: EMPTY_TABLE_SEATING,
  });
  const [existingFill, setExistingFill] = useState<ExistingTableFillSnapshot>(
    EMPTY_EXISTING_FILL,
  );

  const availableExistingTableSlots = useMemo(
    () =>
      buildExistingTableSlots(
        dateSource,
        addOnsData?.data?.selected_tables ?? [],
        {
          allowSeatExtension: canExtendExistingTables(
            addOnsData?.data?.tables ?? [],
          ),
        },
      ),
    [addOnsData?.data?.selected_tables, addOnsData?.data?.tables, dateSource],
  );

  const selectedTables = addOnsData?.data?.selected_tables ?? [];
  const useAddGuestsFlow = hasBookedTableAllocations(
    dateSource,
    selectedTables,
  );
  const hasAvailableExistingTables = availableExistingTableSlots.length > 0;

  const totalFreeExistingSeats = useMemo(
    () =>
      availableExistingTableSlots.reduce(
        (sum, slot) => sum + Math.max(0, slot.capacity - slot.occupied),
        0,
      ),
    [availableExistingTableSlots],
  );

  const catalogTables = addOnsData?.data?.tables ?? [];
  const hasNewTablesAvailable = catalogTables.some(canBookNewTable);
  const canExtendExisting = canExtendExistingTables(catalogTables);
  const canUseExistingTables =
    hasAvailableExistingTables && canExtendExisting;

  /** Guests still unplaced after optional existing-table fill. */
  const guestsRemainingUnplaced = useMemo(() => {
    if (!useAddGuestsFlow || guestsToAdd <= 0) return 0;
    return Math.max(0, guestsToAdd - existingFill.totalAdded);
  }, [useAddGuestsFlow, guestsToAdd, existingFill.totalAdded]);

  const freeExistingSeatsLeft = useMemo(
    () => Math.max(0, totalFreeExistingSeats - existingFill.totalAdded),
    [existingFill.totalAdded, totalFreeExistingSeats],
  );

  const guestsForNewTablePanel = useMemo(
    () =>
      resolveNewTablePanelGuestCount({
        guestsToAdd,
        guestsRemainingUnplaced,
        existingFillTotal: existingFill.totalAdded,
        panelOpen: newTablePanelOpen,
        scope: newTablePanelScope,
      }),
    [
      existingFill.totalAdded,
      guestsRemainingUnplaced,
      guestsToAdd,
      newTablePanelOpen,
      newTablePanelScope,
    ],
  );

  const tableConfig = useMemo(
    () =>
      resolveActiveTableConfig(
        catalogTables,
        useAddGuestsFlow
          ? guestsForNewTablePanel ||
              guestsRemainingUnplaced ||
              guestsToAdd
          : tableSeating.groupSize,
      ),
    [
      catalogTables,
      guestsForNewTablePanel,
      guestsRemainingUnplaced,
      guestsToAdd,
      tableSeating.groupSize,
      useAddGuestsFlow,
    ],
  );

  const maxAddableGuests = useMemo(
    () => computeMaxAddableGuests(catalogTables, totalFreeExistingSeats),
    [catalogTables, totalFreeExistingSeats],
  );

  const guestAddPriceHint = useMemo(() => {
    if (!canUseExistingTables && tableConfig?.price != null) {
      return { single: tableConfig.price, min: null, max: null };
    }

    return resolveGuestAddPriceHint(
      useAddGuestsFlow,
      availableExistingTableSlots,
      dateSource,
      tableConfig?.price ?? null,
    );
  }, [
    availableExistingTableSlots,
    canUseExistingTables,
    dateSource,
    tableConfig?.price,
    useAddGuestsFlow,
  ]);

  const existingOnlyGroupSize = totalFreeExistingSeats;
  const guestAddPriceHintLabel = useMemo(
    () =>
      formatGuestAddPriceHintLabel(
        guestAddPriceHint,
        formatUnit,
        canUseExistingTables,
      ),
    [canUseExistingTables, formatUnit, guestAddPriceHint],
  );
  const newTablePanelMessage = useMemo(
    () => formatNewTablePanelMessage(newTablePanelScope, canUseExistingTables),
    [canUseExistingTables, newTablePanelScope],
  );
  const newTableBelowMinimum =
    guestsForNewTablePanel > 0 &&
    tableConfig != null &&
    guestsForNewTablePanel < tableConfig.min;
  const suggestedIncreasedGroupSize =
    guestsToAdd +
    (tableConfig != null ? tableConfig.min - guestsForNewTablePanel : 0);
  const canBookAllGuestsOnNewTable = useMemo(
    () =>
      hasNewTablesAvailable &&
      tableConfig != null &&
      guestsToAdd > 0 &&
      isNewTableGroupViable(guestsToAdd, tableConfig),
    [guestsToAdd, hasNewTablesAvailable, tableConfig],
  );
  const canBookRemainingOnNewTable = useMemo(
    () =>
      hasNewTablesAvailable &&
      tableConfig != null &&
      guestsRemainingUnplaced > 0 &&
      isNewTableGroupViable(guestsRemainingUnplaced, tableConfig),
    [guestsRemainingUnplaced, hasNewTablesAvailable, tableConfig],
  );
  const canBookSuggestedGroupOnNewTable = useMemo(
    () =>
      hasNewTablesAvailable &&
      tableConfig != null &&
      suggestedIncreasedGroupSize > guestsToAdd &&
      isNewTableGroupViable(suggestedIncreasedGroupSize, tableConfig),
    [guestsToAdd, hasNewTablesAvailable, suggestedIncreasedGroupSize, tableConfig],
  );
  const guestPlacementIssue = useMemo(
    () =>
      resolveGuestPlacementIssue(
        guestsToAdd,
        totalFreeExistingSeats,
        tableConfig,
        canUseExistingTables,
      ),
    [canUseExistingTables, guestsToAdd, tableConfig, totalFreeExistingSeats],
  );
  const showNewTableMinimumHint =
    guestsToAdd > 0 &&
    newTableBelowMinimum &&
    existingFill.totalAdded > 0;

  useEffect(() => {
    seatingDraftRef.current = {
      guestsToAdd,
      existingFill,
      existingSeatingConfirmed,
      newTablePanelOpen,
      newTablePanelScope,
      tableSeating,
    };
  }, [
    existingFill,
    existingSeatingConfirmed,
    guestsToAdd,
    newTablePanelOpen,
    newTablePanelScope,
    tableSeating,
  ]);

  useEffect(() => {
    if (!addOnsData?.data) return;

    const draft = seatingDraftRef.current;
    const shouldPreserveSeating =
      draft.guestsToAdd > 0 &&
      (draft.existingFill.totalAdded > 0 ||
        draft.tableSeating.draftGuestTotal > 0 ||
        draft.tableSeating.seatingConfirmed);

    setTickets((prev) =>
      addOnsData.data.tickets.map((t) => {
        const maxQuantity = Math.max(0, t.available_tickets);
        const previous = prev.find((item) => item.id === t.id);
        const quantity = Math.max(
          0,
          Math.min(previous?.quantity ?? 0, maxQuantity),
        );

        return {
          id: t.id,
          title: t.title,
          description: t.description,
          price: Math.max(0, t.price),
          quantity,
          maxQuantity,
        };
      }),
    );

    setDrinks((prev) =>
      addOnsData.data.drinks
        .filter((d) => d.status === 1)
        .map((d) => {
          const maxQuantity = Math.max(0, d.available_drinks);
          const previous = prev.find((item) => item.id === d.id);
          const quantity = Math.max(
            0,
            Math.min(previous?.quantity ?? 0, maxQuantity),
          );

          return {
            id: d.id,
            title: d.title,
            description: d.description,
            price: parseFloat(d.price) || 0,
            quantity,
            maxQuantity,
          };
        }),
    );

    if (shouldPreserveSeating) {
      setGuestsToAdd(draft.guestsToAdd);
      setExistingFill(draft.existingFill);
      setExistingSeatingConfirmed(draft.existingSeatingConfirmed);
      setNewTablePanelOpen(draft.newTablePanelOpen);
      setNewTablePanelScope(draft.newTablePanelScope);
      setTableSeating(draft.tableSeating);
      prevExistingPlacedRef.current = draft.existingFill.totalAdded;
      return;
    }

    setTableSeating({
      groupSize: 0,
      allocation: [],
      seatingConfirmed: false,
      tableTotal: 0,
      tableItemCount: 0,
      draftGuestTotal: 0,
    });
    setGuestsToAdd(0);
    setExistingFill(EMPTY_EXISTING_FILL);
    setExistingSeatingConfirmed(false);
    prevExistingPlacedRef.current = 0;
    setNewTablePanelOpen(false);
    setNewTablePanelScope("all");
    setExistingFillPanelKey((key) => key + 1);
    setTablePanelResetKey((key) => key + 1);
  }, [addOnsData?.data, dateId, dateSourceSyncKey]);

  const clampCatalogQuantity = useCallback(
    (qty: number, maxQuantity: number) =>
      Math.max(0, Math.min(qty, maxQuantity)),
    [],
  );

  const handleTableSeatingChange = useCallback(
    (snapshot: TableSeatingSnapshot) => {
      setTableSeating(snapshot);
    },
    [],
  );

  const handleExistingFillChange = useCallback(
    (snapshot: ExistingTableFillSnapshot) => {
      setExistingFill((prev) => {
        if (prev.totalAdded !== snapshot.totalAdded) {
          setExistingSeatingConfirmed(false);
        }
        return snapshot;
      });
    },
    [],
  );

  const resetNewTableSeating = useCallback(() => {
    setTableSeating(EMPTY_TABLE_SEATING);
    setTablePanelResetKey((key) => key + 1);
  }, []);

  const handleConfirmExistingSeating = useCallback(() => {
    if (existingFill.totalAdded <= 0) return;
    setExistingSeatingConfirmed(true);

    const remaining = Math.max(0, guestsToAdd - existingFill.totalAdded);
    if (
      remaining > 0 &&
      hasNewTablesAvailable &&
      tableConfig &&
      isNewTableGroupViable(remaining, tableConfig)
    ) {
      setNewTablePanelScope("remaining");
      setNewTablePanelOpen(true);
      resetNewTableSeating();
    }
  }, [
    existingFill.totalAdded,
    guestsToAdd,
    hasNewTablesAvailable,
    resetNewTableSeating,
    tableConfig,
  ]);

  const clearExistingFill = useCallback(() => {
    setExistingFill(EMPTY_EXISTING_FILL);
    setExistingSeatingConfirmed(false);
    setExistingFillPanelKey((key) => key + 1);
  }, []);

  const openNewTableForAllGuests = useCallback(() => {
    if (existingFill.totalAdded > 0) {
      toast.error(
        "Confirm or clear your existing-table guests before booking a new table for everyone.",
      );
      return;
    }
    clearExistingFill();
    setNewTablePanelScope("all");
    setNewTablePanelOpen(true);
    resetNewTableSeating();
  }, [clearExistingFill, existingFill.totalAdded, resetNewTableSeating]);

  const openNewTableForRemainingGuests = useCallback(() => {
    setNewTablePanelScope("remaining");
    setNewTablePanelOpen(true);
    resetNewTableSeating();
  }, [resetNewTableSeating]);

  const closeNewTablePanel = useCallback(() => {
    setNewTablePanelOpen(false);
    resetNewTableSeating();
  }, [resetNewTableSeating]);

  const handleEditSeatingPlacement = useCallback(() => {
    setIsEditingSeating(true);
    if (existingFill.totalAdded > 0) {
      setExistingSeatingConfirmed(false);
    }
    const confirmedNewGuests =
      tableSeating.seatingConfirmed && tableSeating.allocation.length > 0
        ? tableSeating.allocation.reduce((sum, seats) => sum + seats, 0)
        : 0;
    if (confirmedNewGuests > 0) {
      setTableSeating((prev) => ({
        ...prev,
        seatingConfirmed: false,
        draftGuestTotal: prev.allocation.reduce((sum, seats) => sum + seats, 0),
      }));
      setNewTablePanelScope(
        existingFill.totalAdded > 0 ? "remaining" : "all",
      );
      setNewTablePanelOpen(true);
    }
  }, [
    existingFill.totalAdded,
    tableSeating.allocation,
    tableSeating.seatingConfirmed,
  ]);

  const applyExistingOnlyGuestCount = useCallback(
    (count: number) => {
      setNewTablePanelOpen(false);
      resetNewTableSeating();
      setExistingSeatingConfirmed(false);
      awaitingMixedAutoFillSignalRef.current = null;
      setGuestsToAdd(count);
      setExistingFillPanelKey((key) => key + 1);
      setExistingAutoFillSignal((signal) => signal + 1);
    },
    [resetNewTableSeating],
  );

  const applyMixedGroupSize = useCallback(
    (total: number) => {
      setNewTablePanelOpen(false);
      resetNewTableSeating();
      setExistingSeatingConfirmed(false);
      setGuestsToAdd(total);
      setExistingFillPanelKey((key) => key + 1);
      setExistingAutoFillSignal((signal) => {
        const next = signal + 1;
        awaitingMixedAutoFillSignalRef.current = next;
        return next;
      });
    },
    [resetNewTableSeating],
  );

  const resetExtrasCatalog = useCallback(() => {
    setTableSeating({
      groupSize: 0,
      allocation: [],
      seatingConfirmed: false,
      tableTotal: 0,
      tableItemCount: 0,
      draftGuestTotal: 0,
    });
    setGuestsToAdd(0);
    setExistingFill(EMPTY_EXISTING_FILL);
    setExistingSeatingConfirmed(false);
    setIsEditingSeating(true);
    setNewTablePanelOpen(false);
    setNewTablePanelScope("all");
    setExistingFillPanelKey((key) => key + 1);
    setTablePanelResetKey((key) => key + 1);
    setTickets((prev) => prev.map((ticket) => ({ ...ticket, quantity: 0 })));
    setDrinks((prev) => prev.map((drink) => ({ ...drink, quantity: 0 })));
  }, []);

  const ticketTotal = tickets.reduce((s, t) => s + t.price * t.quantity, 0);
  const drinkTotal = drinks.reduce((s, d) => s + d.price * d.quantity, 0);
  const newTableGuestCount =
    tableSeating.seatingConfirmed && tableSeating.allocation.length > 0
      ? tableSeating.allocation.reduce((sum, seats) => sum + seats, 0)
      : 0;
  const newTablePlacedCount = tableSeating.seatingConfirmed
    ? newTableGuestCount
    : tableSeating.draftGuestTotal;
  const newTableSeatingConfirmed = newTableGuestCount > 0;
  const allGuestsPlacedOnExisting =
    guestsToAdd > 0 && existingFill.totalAdded === guestsToAdd;
  const hideExistingFillPanel =
    existingSeatingConfirmed && existingFill.totalAdded > 0;
  const confirmedExistingGuestCount = existingSeatingConfirmed
    ? existingFill.totalAdded
    : 0;
  const confirmedNewTableGuestCount = newTableSeatingConfirmed
    ? newTableGuestCount
    : 0;
  const isSeatingFullyConfirmed =
    guestsToAdd > 0 &&
    confirmedExistingGuestCount + confirmedNewTableGuestCount === guestsToAdd &&
    (existingFill.totalAdded === 0 || existingSeatingConfirmed) &&
    (newTableGuestCount === 0 || newTableSeatingConfirmed);
  const showCompactSeatingSummary =
    isSeatingFullyConfirmed && !isEditingSeating;
  const remainingBelowNewTableMinimum =
    guestsRemainingUnplaced > 0 &&
    tableConfig != null &&
    guestsRemainingUnplaced < tableConfig.min;
  const showStuckPlacementHelp =
    guestPlacementIssue != null &&
    guestsRemainingUnplaced > 0 &&
    !canBookRemainingOnNewTable &&
    !newTableSeatingConfirmed;
  const reduceGuestCountTo =
    existingFill.totalAdded > 0
      ? existingFill.totalAdded
      : (guestPlacementIssue?.existingOnlySize ?? 0);
  const canBookMixedGroupSize = useMemo(
    () =>
      guestPlacementIssue != null &&
      tableConfig != null &&
      guestPlacementIssue.mixedGroupSize > guestsToAdd &&
      guestPlacementIssue.mixedGroupSize <= maxAddableGuests &&
      isNewTableGroupViable(tableConfig.min, tableConfig),
    [
      guestPlacementIssue,
      guestsToAdd,
      maxAddableGuests,
      tableConfig,
    ],
  );
  const catalogItemCount =
    tickets.reduce((s, t) => s + t.quantity, 0) +
    drinks.reduce((s, d) => s + d.quantity, 0);
  const tableGuestCount = existingFill.totalAdded + newTablePlacedCount;
  const newTablePendingCost = tableSeating.seatingConfirmed
    ? tableSeating.tableTotal
    : tableSeating.draftGuestTotal > 0 && tableConfig
      ? tableSeating.draftGuestTotal * tableConfig.price
      : 0;
  const pendingTableGuestCount = useAddGuestsFlow ? guestsToAdd : tableGuestCount;
  const pendingTableCharges =
    useAddGuestsFlow && guestsToAdd <= 0
      ? 0
      : existingFill.totalCost + newTablePendingCost;
  const pendingSummaryLabel = formatPendingExtrasSummary(
    pendingTableGuestCount,
    catalogItemCount,
  );
  const pendingTotal = ticketTotal + drinkTotal + pendingTableCharges;

  useEffect(() => {
    onPendingTotalChange?.(
      pendingTotal,
      catalogItemCount + pendingTableGuestCount,
    );
  }, [
    pendingTotal,
    catalogItemCount,
    pendingTableGuestCount,
    onPendingTotalChange,
  ]);

  useEffect(() => {
    if (!isSeatingFullyConfirmed) {
      setIsEditingSeating(true);
    }
  }, [guestsToAdd, isSeatingFullyConfirmed]);

  useEffect(() => {
    if (isSeatingFullyConfirmed && !wasSeatingFullyConfirmedRef.current) {
      setIsEditingSeating(false);
    }
    wasSeatingFullyConfirmedRef.current = isSeatingFullyConfirmed;
  }, [isSeatingFullyConfirmed]);

  useEffect(() => {
    if (newTableSeatingConfirmed && newTablePanelOpen) {
      setNewTablePanelOpen(false);
    }
  }, [newTableSeatingConfirmed, newTablePanelOpen]);

  /** When every existing table is full, open new-table seating as soon as guest count is set. */
  useEffect(() => {
    if (!useAddGuestsFlow || guestsToAdd <= 0) return;
    if (totalFreeExistingSeats > 0) return;
    if (existingFill.totalAdded > 0 || existingSeatingConfirmed) return;
    if (newTablePanelOpen || newTableSeatingConfirmed) return;
    if (!hasNewTablesAvailable || !tableConfig || !canBookAllGuestsOnNewTable) {
      return;
    }

    setNewTablePanelScope("all");
    setNewTablePanelOpen(true);
    resetNewTableSeating();
  }, [
    canBookAllGuestsOnNewTable,
    existingFill.totalAdded,
    existingSeatingConfirmed,
    guestsToAdd,
    hasNewTablesAvailable,
    newTablePanelOpen,
    newTableSeatingConfirmed,
    resetNewTableSeating,
    tableConfig,
    totalFreeExistingSeats,
    useAddGuestsFlow,
  ]);

  useEffect(() => {
    if (awaitingMixedAutoFillSignalRef.current === null) return;
    if (existingAutoFillSignal < awaitingMixedAutoFillSignalRef.current) {
      return;
    }

    const hasExistingCapacity =
      hasAvailableExistingTables && totalFreeExistingSeats > 0;
    if (hasExistingCapacity && existingFill.totalAdded === 0) {
      return;
    }

    const placedOnExisting = existingFill.totalAdded;
    if (placedOnExisting > 0) {
      setExistingSeatingConfirmed(true);
    }

    const remaining = Math.max(0, guestsToAdd - placedOnExisting);
    if (
      remaining > 0 &&
      hasNewTablesAvailable &&
      tableConfig &&
      isNewTableGroupViable(remaining, tableConfig)
    ) {
      setNewTablePanelScope("remaining");
      setNewTablePanelOpen(true);
      resetNewTableSeating();
    }

    awaitingMixedAutoFillSignalRef.current = null;
  }, [
    existingAutoFillSignal,
    existingFill.totalAdded,
    guestsToAdd,
    hasAvailableExistingTables,
    hasNewTablesAvailable,
    resetNewTableSeating,
    tableConfig,
    totalFreeExistingSeats,
  ]);

  useEffect(() => {
    if (hasNewTablesAvailable) return;
    setNewTablePanelOpen(false);
    setTableSeating(EMPTY_TABLE_SEATING);
    setTablePanelResetKey((key) => key + 1);
  }, [hasNewTablesAvailable]);

  useEffect(() => {
    if (!useAddGuestsFlow || guestsToAdd > 0) return;

    setExistingFill(EMPTY_EXISTING_FILL);
    setTableSeating(EMPTY_TABLE_SEATING);
    setNewTablePanelOpen(false);
    setNewTablePanelScope("all");
    setTablePanelResetKey((key) => key + 1);
  }, [useAddGuestsFlow, guestsToAdd]);

  useEffect(() => {
    if (!useAddGuestsFlow || guestsToAdd <= 0) return;

    resetNewTableSeating();

    if (!hasAvailableExistingTables && hasNewTablesAvailable) {
      setNewTablePanelScope("all");
      setNewTablePanelOpen(canBookAllGuestsOnNewTable);
      return;
    }

    setNewTablePanelScope("remaining");
    setNewTablePanelOpen(false);
  }, [
    canBookAllGuestsOnNewTable,
    guestsToAdd,
    hasAvailableExistingTables,
    hasNewTablesAvailable,
    resetNewTableSeating,
    useAddGuestsFlow,
  ]);

  useEffect(() => {
    if (!useAddGuestsFlow || guestsToAdd <= 0) return;

    const placed = existingFill.totalAdded;
    const prev = prevExistingPlacedRef.current;
    if (placed === prev) return;
    prevExistingPlacedRef.current = placed;

    if (placed <= 0) return;

    setNewTablePanelScope("remaining");

    const remaining = Math.max(0, guestsToAdd - placed);
    if (remaining <= 0) {
      closeNewTablePanel();
      return;
    }

    const hasNewTableDraft =
      newTablePanelOpen ||
      newTableSeatingConfirmed ||
      tableSeating.draftGuestTotal > 0;

    if (!hasNewTableDraft) return;

    resetNewTableSeating();
    if (
      hasNewTablesAvailable &&
      tableConfig &&
      isNewTableGroupViable(remaining, tableConfig)
    ) {
      setNewTablePanelOpen(true);
    } else {
      setNewTablePanelOpen(false);
    }
  }, [
    closeNewTablePanel,
    existingFill.totalAdded,
    guestsToAdd,
    hasNewTablesAvailable,
    newTablePanelOpen,
    newTableSeatingConfirmed,
    resetNewTableSeating,
    tableConfig,
    tableSeating.draftGuestTotal,
    useAddGuestsFlow,
  ]);

  useEffect(() => {
    if (
      guestsToAdd > 0 &&
      existingFill.totalAdded >= guestsToAdd &&
      newTablePanelOpen
    ) {
      closeNewTablePanel();
    }
  }, [
    closeNewTablePanel,
    existingFill.totalAdded,
    guestsToAdd,
    newTablePanelOpen,
  ]);

  useEffect(() => {
    if (
      newTablePanelOpen &&
      newTablePanelScope === "remaining" &&
      guestsRemainingUnplaced <= 0
    ) {
      closeNewTablePanel();
    }
  }, [
    closeNewTablePanel,
    guestsRemainingUnplaced,
    newTablePanelOpen,
    newTablePanelScope,
  ]);

  useEffect(() => {
    if (!newTablePanelOpen || !tableConfig) return;

    const panelGuestCount = resolveNewTablePanelGuestCount({
      guestsToAdd,
      guestsRemainingUnplaced,
      existingFillTotal: existingFill.totalAdded,
      panelOpen: newTablePanelOpen,
      scope: newTablePanelScope,
    });

    if (!isNewTableGroupViable(panelGuestCount, tableConfig)) {
      closeNewTablePanel();
    }
  }, [
    closeNewTablePanel,
    existingFill.totalAdded,
    guestsRemainingUnplaced,
    guestsToAdd,
    newTablePanelOpen,
    newTablePanelScope,
    tableConfig,
  ]);

  const submitSave = useCallback(
    (paymentMode?: VendorAddonsPaymentMode) => {
      if (!eligible || pendingTotal <= 0 || isSavingAddOns) return;

      const confirmedNewTableGuests =
        tableSeating.seatingConfirmed && tableSeating.allocation.length > 0
          ? tableSeating.allocation.reduce((sum, seats) => sum + seats, 0)
          : 0;

      const formData = new FormData();
      formData.append("booking_id", bookingId);
      formData.append("date", dateKey);
      if (roomId != null && roomId > 0) {
        formData.append("room_id", roomId.toString());
      }
      if (paymentMode) {
        formData.append("payment_mode", paymentMode);
      }
      formData.append(
        "people_in_group",
        String(
          useAddGuestsFlow && guestsToAdd > 0
            ? guestsToAdd
            : existingFill.totalAdded + confirmedNewTableGuests ||
                tableSeating.groupSize ||
                0,
        ),
      );

      drinks
        .filter((d) => d.quantity > 0)
        .forEach((drink, index) => {
          formData.append(`drink_package[${index}][id]`, drink.id.toString());
          formData.append(`drink_package[${index}][title]`, drink.title);
          formData.append(
            `drink_package[${index}][price]`,
            drink.price.toString(),
          );
          formData.append(
            `drink_package[${index}][quantity]`,
            drink.quantity.toString(),
          );
        });

      tickets
        .filter((t) => t.quantity > 0)
        .forEach((ticket, index) => {
          formData.append(`tickets[${index}][id]`, ticket.id.toString());
          formData.append(`tickets[${index}][title]`, ticket.title);
          formData.append(
            `tickets[${index}][description]`,
            ticket.description || "",
          );
          formData.append(
            `tickets[${index}][price_per_ticket]`,
            ticket.price.toString(),
          );
          formData.append(
            `tickets[${index}][quantity]`,
            ticket.quantity.toString(),
          );
        });

      let tableIndex = 0;

      existingFill.saveGroups.forEach((group) => {
        formData.append(`tables[${tableIndex}][id]`, group.tableConfigId.toString());
        formData.append(
          `tables[${tableIndex}][table_size]`,
          group.tableSize.toString(),
        );
        formData.append(
          `tables[${tableIndex}][price_per_person]`,
          group.pricePerPerson.toString(),
        );
        formData.append(`tables[${tableIndex}][type]`, "existing");
        formData.append(
          `tables[${tableIndex}][no_tables]`,
          group.allocations.length.toString(),
        );
        group.allocations.forEach((alloc, allocationIndex) => {
          formData.append(
            `tables[${tableIndex}][allocation][${allocationIndex}][parent_id]`,
            alloc.parentId.toString(),
          );
          formData.append(
            `tables[${tableIndex}][allocation][${allocationIndex}][seats]`,
            alloc.seats.toString(),
          );
        });
        tableIndex += 1;
      });

      if (
        tableSeating.seatingConfirmed &&
        tableConfig &&
        hasNewTablesAvailable &&
        tableSeating.allocation.length > 0
      ) {
        formData.append(`tables[${tableIndex}][id]`, tableConfig.id.toString());
        formData.append(
          `tables[${tableIndex}][table_size]`,
          tableConfig.max.toString(),
        );
        formData.append(
          `tables[${tableIndex}][price_per_person]`,
          tableConfig.price.toString(),
        );
        formData.append(`tables[${tableIndex}][type]`, "new");
        formData.append(
          `tables[${tableIndex}][no_tables]`,
          tableSeating.allocation.length.toString(),
        );
        tableSeating.allocation.forEach((seats, allocationIndex) => {
          formData.append(
            `tables[${tableIndex}][allocation][${allocationIndex}][parent_id]`,
            "",
          );
          formData.append(
            `tables[${tableIndex}][allocation][${allocationIndex}][seats]`,
            seats.toString(),
          );
        });
      }

      saveAddOns(formData, {
        onSuccess: () => {
          setPaymentModeDialogOpen(false);
          resetExtrasCatalog();
          onSaveSuccess?.();
        },
        onError: () => {
          // Toast is shown by the API client interceptor.
        },
      });
    },
    [
      bookingId,
      dateKey,
      drinks,
      eligible,
      existingFill,
      guestsToAdd,
      isSavingAddOns,
      hasNewTablesAvailable,
      onSaveSuccess,
      pendingTotal,
      resetExtrasCatalog,
      roomId,
      saveAddOns,
      tableConfig,
      tableSeating,
      tickets,
      useAddGuestsFlow,
    ],
  );

  const handleSave = useCallback(() => {
    if (!eligible || pendingTotal <= 0 || isSavingAddOns) return;

    const overTicket = tickets.find((t) => t.quantity > t.maxQuantity);
    if (overTicket) {
      toast.error(
        `Only ${overTicket.maxQuantity} ticket(s) available for '${overTicket.title}'. You requested ${overTicket.quantity}.`,
      );
      return;
    }

    const overDrink = drinks.find((d) => d.quantity > d.maxQuantity);
    if (overDrink) {
      toast.error(
        `Only ${overDrink.maxQuantity} package(s) available for '${overDrink.title}'. You requested ${overDrink.quantity}.`,
      );
      return;
    }

    if (
      existingFill.totalAdded > 0 &&
      !existingSeatingConfirmed
    ) {
      toast.error("Confirm seating on your existing tables before saving.");
      return;
    }

    if (
      tableConfig &&
      !tableSeating.seatingConfirmed &&
      tableSeating.draftGuestTotal > 0
    ) {
      toast.error("Confirm seating on your new table before saving.");
      return;
    }

    if (!hasNewTablesAvailable && tableSeating.seatingConfirmed) {
      toast.error(
        canUseExistingTables
          ? "No new tables are available for this date. Add guests to your existing tables instead."
          : "No new tables are available for this date.",
      );
      return;
    }

    if (!hasNewTablesAvailable && tableSeating.draftGuestTotal > 0) {
      toast.error(
        canUseExistingTables
          ? "No new tables are available for this date. Add guests to your existing tables instead."
          : "No new tables are available for this date.",
      );
      return;
    }

    if (useAddGuestsFlow && guestsToAdd > 0) {
      const newTableGuests = tableSeating.seatingConfirmed
        ? tableSeating.allocation.reduce((sum, seats) => sum + seats, 0)
        : 0;
      const confirmedExistingGuests = existingSeatingConfirmed
        ? existingFill.totalAdded
        : 0;
      const totalPlaced = confirmedExistingGuests + newTableGuests;

      if (totalPlaced < guestsToAdd) {
        const shortfall = guestsToAdd - totalPlaced;
        if (!hasNewTablesAvailable) {
          toast.error(
            canUseExistingTables
              ? `${shortfall} guest${shortfall === 1 ? "" : "s"} still unplaced — no new tables are available. You can add up to ${totalFreeExistingSeats} guest${totalFreeExistingSeats === 1 ? "" : "s"} on your existing tables.`
              : `${shortfall} guest${shortfall === 1 ? "" : "s"} still unplaced — no new tables are available for this date.`,
          );
          return;
        }
        if (
          guestsForNewTablePanel > 0 &&
          tableConfig &&
          guestsForNewTablePanel < tableConfig.min &&
          !tableSeating.seatingConfirmed
        ) {
          toast.error(
            `${shortfall} guest${shortfall === 1 ? "" : "s"} still unplaced. New tables require at least ${tableConfig.min} guests — contact the venue or reduce your count.`,
          );
          return;
        }
        toast.error(
          `Please place all ${guestsToAdd} guest${guestsToAdd === 1 ? "" : "s"} before saving.`,
        );
        return;
      }
    }

    if (useVendorApi) {
      if (showPaymentModeOption) {
        setPaymentModeDialogOpen(true);
        return;
      }
      submitSave(defaultAddonPaymentMode);
      return;
    }

    submitSave();
  }, [
    defaultAddonPaymentMode,
    drinks,
    eligible,
    existingFill.totalAdded,
    existingSeatingConfirmed,
    guestsForNewTablePanel,
    guestsToAdd,
    hasNewTablesAvailable,
    isSavingAddOns,
    pendingTotal,
    submitSave,
    tableConfig,
    tableSeating,
    tickets,
    totalFreeExistingSeats,
    useAddGuestsFlow,
    useVendorApi,
    showPaymentModeOption,
  ]);

  const hasCatalog =
    tickets.length > 0 || drinks.length > 0 || tableConfig !== null;

  if (!eligible) {
    return null;
  }

  const pendingTotalFormatted = formatCurrency(pendingTotal);
  const tableAccent = kindAccentStyle("table");

  return (
    <div className="border-t border-dashed border-border">
      <AddExtrasHeader
        open={open}
        onToggle={onToggle}
        pendingSummaryLabel={pendingSummaryLabel}
        pendingTotalFormatted={pendingTotalFormatted}
        isSaving={isSavingAddOns}
        onSave={handleSave}
      />

      {open && isLoading && (
        <div
          className="space-y-4 px-4 py-4 border-t border-border"
          style={{ background: "color-mix(in srgb, var(--muted) 22%, var(--card))" }}
        >
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      )}

      {open && !isLoading && !hasCatalog && (
        <p
          className="px-4 py-4 text-sm text-muted-foreground border-t border-border"
          style={{ background: "color-mix(in srgb, var(--muted) 22%, var(--card))" }}
        >
          No additional extras are available for this date.
        </p>
      )}

      {open && !isLoading && hasCatalog && (
        <div
          className="border-t border-border"
          style={{ background: "color-mix(in srgb, var(--muted) 22%, var(--card))" }}
        >
          <div className="p-3 px-4 pb-4 sm:px-5">
        {tickets.length > 0 && (
          <section className="flex flex-col gap-2 pb-1">
            <ExtrasSectionHeader kind="ticket" />
            <div className="grid grid-cols-1 items-stretch gap-2 min-[380px]:grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(8.5rem,10.5rem))] sm:justify-start">
              {tickets.map((ticket) => (
                <CatalogCard
                  key={ticket.id}
                  kind="ticket"
                  title={ticket.title}
                  description={ticket.description}
                  priceLabel={formatCurrency(ticket.price)}
                  quantity={ticket.quantity}
                  maxQuantity={ticket.maxQuantity}
                  onAdd={() =>
                    setTickets((prev) =>
                      prev.map((t) =>
                        t.id === ticket.id ? { ...t, quantity: 1 } : t,
                      ),
                    )
                  }
                  onQuantityChange={(qty) =>
                    setTickets((prev) =>
                      prev.map((t) =>
                        t.id === ticket.id
                          ? {
                              ...t,
                              quantity: clampCatalogQuantity(
                                qty,
                                t.maxQuantity,
                              ),
                            }
                          : t,
                      ),
                    )
                  }
                />
              ))}
            </div>
          </section>
        )}

        {tableConfig && (
          <section className="flex flex-col gap-2 pb-1 mt-0 pt-4 border-t border-border" style={tableAccent}>
            <ExtrasSectionHeader
              kind="table"
              title={useAddGuestsFlow ? "Add guests / tables" : undefined}
            />

            {useAddGuestsFlow ? (
              <div className="flex flex-col gap-3.5">
                {showCompactSeatingSummary ? (
                  <ConfirmedSeatingSummary
                    existingGuestCount={confirmedExistingGuestCount}
                    newTableGuestCount={confirmedNewTableGuestCount}
                    onEdit={handleEditSeatingPlacement}
                  />
                ) : (
                  <>
                <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 px-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div>
                    <p className="text-[0.8125rem] font-semibold text-foreground">
                      How many guests are you adding?
                    </p>
                    {guestAddPriceHintLabel ? (
                      <p className="mt-[0.15rem] text-[10px] text-muted-foreground">
                        {guestAddPriceHintLabel}
                      </p>
                    ) : null}
                  </div>
                  <QuantityStepper
                    value={guestsToAdd}
                    max={maxAddableGuests}
                    onChange={setGuestsToAdd}
                    size="sm"
                    useKindAccent
                  />
                </div>

                {guestPlacementIssue &&
                  existingFill.totalAdded === 0 &&
                  tableConfig &&
                  (!canUseExistingTables ? (
                    <VenueContactNotice
                      title={`New tables require at least ${tableConfig.min} guests.`}
                      message={`Increase your group size to at least ${tableConfig.min} guests, or contact the venue using the details below for assistance with smaller groups.`}
                      phone={venuePhone}
                      email={venueEmail}
                      address={venueAddress}
                    />
                  ) : (
                  <div
                    className="rounded-lg p-[0.625rem_0.75rem] text-[0.6875rem] leading-[1.45] text-foreground"
                    style={{
                      border:
                        "1px solid color-mix(in srgb, #d97706 28%, var(--border))",
                      background:
                        "color-mix(in srgb, #d97706 8%, var(--card))",
                    }}
                  >
                    <p>
                      {formatGuestPlacementIssueMessage(
                        guestsToAdd,
                        totalFreeExistingSeats,
                        tableConfig.min,
                        canUseExistingTables,
                      )}
                    </p>
                  </div>
                  ))}

                {showNewTableMinimumHint && canUseExistingTables && (
                    <div
                      className="rounded-lg p-[0.625rem_0.75rem] text-[0.6875rem] leading-[1.45] text-foreground"
                      style={{
                        border: "1px solid color-mix(in srgb, var(--booking-kind-table) 25%, var(--border))",
                        background: "color-mix(in srgb, var(--booking-kind-table) 8%, var(--card))",
                      }}
                    >
                      <p>
                        {guestsForNewTablePanel} guest
                        {guestsForNewTablePanel === 1 ? "" : "s"} still need a
                        table — new tables require at least {tableConfig.min}.
                        Increase group size to {suggestedIncreasedGroupSize},
                        or adjust guests on your existing tables.
                      </p>
                    </div>
                  )}

                {guestsToAdd > 0 &&
                  canUseExistingTables &&
                  !hideExistingFillPanel && (
                  <FillExistingTablesPanel
                    key={`existing-${existingFillPanelKey}`}
                    slots={availableExistingTableSlots}
                    guestsToAdd={guestsToAdd}
                    guestsPlacedOnNewTable={newTablePlacedCount}
                    formatCurrency={formatCurrency}
                    onStateChange={handleExistingFillChange}
                    autoFillSignal={existingAutoFillSignal}
                    canPlaceRemainingOnNewTable={canBookRemainingOnNewTable}
                    newTableMinGuests={tableConfig?.min}
                    remainingBelowNewTableMin={remainingBelowNewTableMinimum}
                    seatingConfirmed={existingSeatingConfirmed}
                    onConfirmSeating={handleConfirmExistingSeating}
                    allowSeatExtension={canExtendExisting}
                    optional
                  />
                )}

                {guestsToAdd > 0 &&
                  hasNewTablesAvailable &&
                  !newTablePanelOpen &&
                  !newTableSeatingConfirmed &&
                  canUseExistingTables &&
                  existingFill.totalAdded === 0 &&
                  canBookAllGuestsOnNewTable && (
                  <NewTableSetupPrompt
                    title={`Book a new table for ${guestsToAdd} guest${guestsToAdd === 1 ? "" : "s"}`}
                    description={
                      tableConfig
                        ? `${formatUnit(tableConfig.price)} per person for the new table`
                        : guestAddPriceHintLabel ?? undefined
                    }
                    actionLabel="Set up new table"
                    onAction={openNewTableForAllGuests}
                  />
                )}

                {guestsToAdd > 0 &&
                  hasAvailableExistingTables &&
                  hasNewTablesAvailable &&
                  existingSeatingConfirmed &&
                  !newTableSeatingConfirmed &&
                  guestsRemainingUnplaced > 0 &&
                  !newTablePanelOpen &&
                  canBookRemainingOnNewTable && (
                  <NewTableSetupPrompt
                    title={`Add a new table for ${guestsRemainingUnplaced} remaining guest${guestsRemainingUnplaced === 1 ? "" : "s"}`}
                    description="Configure seating for guests not placed on existing tables."
                    actionLabel="Set up new table"
                    onAction={openNewTableForRemainingGuests}
                  />
                )}

                {canUseExistingTables &&
                  (showStuckPlacementHelp ||
                  (newTableBelowMinimum &&
                    existingFill.totalAdded === 0 &&
                    existingOnlyGroupSize > 0)) &&
                  !newTableSeatingConfirmed &&
                  tableConfig && (
                  <div
                    className="flex flex-col gap-2 rounded-lg p-[0.625rem_0.75rem]"
                    style={{
                      border: "1px dashed color-mix(in srgb, var(--booking-kind-table) 30%, var(--border))",
                      background: "color-mix(in srgb, var(--booking-kind-table) 5%, var(--card))",
                    }}
                  >
                    <p className="m-0 text-[10px] font-bold tracking-[0.08em] uppercase text-muted-foreground">
                      {showStuckPlacementHelp ? "Can't seat all guests" : "Quick options"}
                    </p>
                    {showStuckPlacementHelp && (
                      <p className="m-0 text-[11px] leading-[1.45] text-muted-foreground">
                        {guestsRemainingUnplaced} guest
                        {guestsRemainingUnplaced === 1 ? "" : "s"} remaining —
                        new tables require at least {tableConfig.min}. Choose an
                        option:
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {reduceGuestCountTo > 0 && (
                        <button
                          type="button"
                          className="rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-foreground transition-colors"
                          onClick={() =>
                            applyExistingOnlyGuestCount(reduceGuestCountTo)
                          }
                        >
                          {showStuckPlacementHelp
                            ? `Seat ${reduceGuestCountTo} on existing only`
                            : `Use ${existingOnlyGroupSize} (existing tables only)`}
                        </button>
                      )}
                      {(showStuckPlacementHelp
                        ? canBookMixedGroupSize
                        : canBookSuggestedGroupOnNewTable) && (
                        <button
                          type="button"
                          className="rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors"
                          style={{
                            border: "1px solid color-mix(in srgb, var(--booking-kind-table) 45%, var(--border))",
                            background: "color-mix(in srgb, var(--booking-kind-table) 12%, var(--card))",
                            color: "color-mix(in srgb, var(--booking-kind-table) 85%, var(--foreground))",
                          }}
                          onClick={() => {
                            if (showStuckPlacementHelp && guestPlacementIssue) {
                              applyMixedGroupSize(
                                guestPlacementIssue.mixedGroupSize,
                              );
                              return;
                            }
                            applyMixedGroupSize(suggestedIncreasedGroupSize);
                          }}
                        >
                          Increase to{" "}
                          {showStuckPlacementHelp && guestPlacementIssue
                            ? guestPlacementIssue.mixedGroupSize
                            : suggestedIncreasedGroupSize}{" "}
                          (existing + new table)
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {newTablePanelOpen &&
                  !newTableSeatingConfirmed &&
                  guestsForNewTablePanel > 0 &&
                  tableConfig && (
                  <div className="flex flex-col gap-2">
                    {newTablePanelMessage ? (
                      <p className="text-[10px] font-medium leading-snug text-muted-foreground">
                        {newTablePanelMessage}
                      </p>
                    ) : null}
                    <TableSeatingPanel
                      key={`${dateId}-${tableConfig.id}-${tablePanelResetKey}-new-${newTablePanelScope}`}
                      tableConfig={tableConfig}
                      formatCurrency={formatCurrency}
                      formatUnit={formatUnit}
                      onStateChange={handleTableSeatingChange}
                      externalGroupSize={guestsForNewTablePanel}
                      existingTableCapacity={
                        canUseExistingTables ? freeExistingSeatsLeft : undefined
                      }
                      minimumTotalGroupSize={guestsToAdd}
                      sectionTitle={`New table · ${guestsForNewTablePanel} guest${guestsForNewTablePanel === 1 ? "" : "s"}`}
                      onClose={closeNewTablePanel}
                    />
                  </div>
                )}

                {guestsToAdd > 0 &&
                  hasNewTablesAvailable &&
                  !hasAvailableExistingTables &&
                  !newTablePanelOpen &&
                  canBookAllGuestsOnNewTable && (
                  <NewTableSetupPrompt
                    title={`Set up your new table`}
                    description={`${guestsToAdd} guest${guestsToAdd === 1 ? "" : "s"}${guestAddPriceHintLabel ? ` · ${guestAddPriceHintLabel}` : ""}`}
                    actionLabel="Configure new table"
                    onAction={openNewTableForAllGuests}
                  />
                )}

                  </>
                )}

              </div>
            ) : (
              <TableSeatingPanel
                key={`${dateId}-${tableConfig.id}-${tablePanelResetKey}`}
                tableConfig={tableConfig}
                formatCurrency={formatCurrency}
                formatUnit={formatUnit}
                onStateChange={handleTableSeatingChange}
              />
            )}
          </section>
        )}

        {drinks.length > 0 && (
          <section className="flex flex-col gap-2 pb-1 mt-0 pt-4 border-t border-border">
            <ExtrasSectionHeader
              kind="package"
              title={packageSectionTitle}
            />
            <div className="grid grid-cols-1 items-stretch gap-2 min-[380px]:grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(8.5rem,10.5rem))] sm:justify-start">
              {drinks.map((drink) => (
                <CatalogCard
                  key={drink.id}
                  kind="package"
                  title={drink.title}
                  description={drink.description}
                  priceLabel={formatCurrency(drink.price)}
                  quantity={drink.quantity}
                  maxQuantity={drink.maxQuantity}
                  onAdd={() =>
                    setDrinks((prev) =>
                      prev.map((d) =>
                        d.id === drink.id ? { ...d, quantity: 1 } : d,
                      ),
                    )
                  }
                  onQuantityChange={(qty) =>
                    setDrinks((prev) =>
                      prev.map((d) =>
                        d.id === drink.id
                          ? {
                              ...d,
                              quantity: clampCatalogQuantity(
                                qty,
                                d.maxQuantity,
                              ),
                            }
                          : d,
                      ),
                    )
                  }
                />
              ))}
            </div>
          </section>
        )}
          </div>
        </div>
      )}

      {useVendorApi && showPaymentModeOption ? (
        <VendorAddonsPaymentModeDialog
          open={paymentModeDialogOpen}
          onOpenChange={setPaymentModeDialogOpen}
          pendingTotalFormatted={pendingTotalFormatted}
          pendingSummaryLabel={pendingSummaryLabel}
          isSaving={isSavingAddOns}
          onConfirm={submitSave}
        />
      ) : null}
    </div>
  );
}
