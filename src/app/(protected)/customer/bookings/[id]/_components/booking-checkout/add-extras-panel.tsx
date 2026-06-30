"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAddOnsDetails } from "@/services/customer/bookings/hooks/useAddOnsDetails";
import { useSaveAddOns } from "@/services/customer/bookings/hooks/useSaveAddOns";
import { useVendorAddOns } from "@/services/vendor/bookings/hooks/useVendorAddOns";
import { useSaveVendorAddOns } from "@/services/vendor/bookings/hooks/useSaveVendorAddOns";
import { mapVendorAddOnsToCustomer } from "@/app/(protected)/vendor/booking-history/[id]/_components/map-vendor-addons-to-customer";
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
  type TableSeatingConfig,
  type TableSeatingSnapshot,
} from "./table-seating-panel";
import {
  ExistingTablesPlacedSummary,
  FillExistingTablesPanel,
  buildExistingTableSlots,
  hasBookedTableAllocations,
  type ExistingTableFillSnapshot,
  type ExistingTableSlot,
} from "./fill-existing-tables-panel";
import type { BookingDateSource } from "./build-line-items";
import type { AddOnsTable } from "@/services/customer/bookings/type";
import {
  generateTableRecommendations,
  type AvailableTableSize,
} from "../../_lib/table-recommendations";

interface CatalogItem {
  id: number;
  title: string;
  description?: string;
  price: number;
  quantity: number;
  maxQuantity: number;
}

/** Already-booked quantities on this date (base booking + saved add-ons). */
export interface BookedCatalogQuantities {
  tickets: Record<number, number>;
  packages: Record<number, number>;
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
  formatCurrency: (amount: number) => string;
  formatUnit: (amount: number) => string;
  onPendingTotalChange?: (total: number, itemCount: number) => void;
  onSaveSuccess?: () => void;
  /** When `vendor`, uses vendor add-ons API (vendor booking dashboard). */
  addonApi?: "customer" | "vendor";
}

function getNewTableStock(table: AddOnsTable): number {
  const stock = table.available_new_tables ?? table.available_tables;
  return Math.max(0, stock ?? 0);
}

function canBookNewTable(table: AddOnsTable): boolean {
  return table.can_add_new_table !== false && getNewTableStock(table) > 0;
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

function normalizeCatalogLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function resolveCatalogTicketId(
  catalogTickets: Array<{ id: number; title: string }>,
  item: { id?: number; name: string },
): number | undefined {
  if (
    item.id != null &&
    catalogTickets.some((ticket) => ticket.id === item.id)
  ) {
    return item.id;
  }

  const label = normalizeCatalogLabel(item.name);
  return catalogTickets.find(
    (ticket) => normalizeCatalogLabel(ticket.title) === label,
  )?.id;
}

function resolveCatalogPackageId(
  catalogPackages: Array<{ id: number; title: string }>,
  item: { id?: number; name: string },
): number | undefined {
  if (item.id != null && catalogPackages.some((pkg) => pkg.id === item.id)) {
    return item.id;
  }

  const label = normalizeCatalogLabel(item.name);
  return catalogPackages.find(
    (pkg) => normalizeCatalogLabel(pkg.title) === label,
  )?.id;
}

function resolveBookedCatalogQuantities(
  date: BookingDateSource | undefined,
  catalogTickets: Array<{ id: number; title: string }>,
  catalogPackages: Array<{ id: number; title: string }>,
): BookedCatalogQuantities {
  const tickets: Record<number, number> = {};
  const packages: Record<number, number> = {};

  if (!date) {
    return { tickets, packages };
  }

  const addTicketQty = (catalogId: number, qty: number) => {
    if (qty <= 0) return;
    tickets[catalogId] = (tickets[catalogId] ?? 0) + qty;
  };

  const addPackageQty = (catalogId: number, qty: number) => {
    if (qty <= 0) return;
    packages[catalogId] = (packages[catalogId] ?? 0) + qty;
  };

  date.tickets?.forEach((ticket) => {
    const catalogId = resolveCatalogTicketId(catalogTickets, {
      id: ticket.id,
      name: ticket.name,
    });
    if (catalogId != null) addTicketQty(catalogId, ticket.quantity);
  });

  date.addons?.tickets?.forEach((ticket) => {
    const catalogId = resolveCatalogTicketId(catalogTickets, {
      id: ticket.id,
      name: ticket.name,
    });
    if (catalogId != null) addTicketQty(catalogId, ticket.quantity ?? 1);
  });

  date.packages?.forEach((pkg) => {
    const catalogId = resolveCatalogPackageId(catalogPackages, {
      id: pkg.id,
      name: pkg.name,
    });
    if (catalogId != null) addPackageQty(catalogId, pkg.quantity);
  });

  const addonPackages = [
    ...(date.addons?.packages ?? []),
    ...((
      date.addons as
        | { drinks?: Array<{ id?: number; name: string; quantity?: number }> }
        | undefined
    )?.drinks ?? []),
  ];

  addonPackages.forEach((pkg) => {
    const catalogId = resolveCatalogPackageId(catalogPackages, {
      id: pkg.id,
      name: pkg.name,
    });
    if (catalogId != null) addPackageQty(catalogId, pkg.quantity ?? 1);
  });

  return { tickets, packages };
}

function getAdditionalMax(
  availableFromApi: number,
  catalogId: number,
  bookedMap: Record<number, number>,
): number {
  const alreadyBooked = bookedMap[catalogId] ?? 0;
  return Math.max(0, availableFromApi - alreadyBooked);
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
  formatCurrency,
  formatUnit,
  onPendingTotalChange,
  onSaveSuccess,
  addonApi = "customer",
}: AddExtrasSectionProps) {
  const eligible = isBookingDateEligibleForAddOns(paymentStatus);
  const useVendorApi = addonApi === "vendor";

  const customerAddonsQuery = useAddOnsDetails(
    bookingId,
    eligible && !useVendorApi ? dateKey : "",
    roomId,
  );
  const vendorAddonsQuery = useVendorAddOns(
    bookingId,
    dateKey,
    eligible && useVendorApi && open,
  );

  const addOnsData = useVendorApi
    ? vendorAddonsQuery.data?.data
      ? {
          ...vendorAddonsQuery.data,
          data: mapVendorAddOnsToCustomer(vendorAddonsQuery.data.data),
        }
      : undefined
    : customerAddonsQuery.data;

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
  const [existingFill, setExistingFill] = useState<ExistingTableFillSnapshot>({
    additionsBySlot: {},
    totalAdded: 0,
    totalCost: 0,
    saveGroups: [],
  });

  const availableExistingTableSlots = useMemo(
    () =>
      buildExistingTableSlots(
        dateSource,
        addOnsData?.data?.selected_tables ?? [],
      ),
    [addOnsData?.data?.selected_tables, dateSource],
  );

  const useAddGuestsFlow = hasBookedTableAllocations(dateSource);
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

  /** Guests to place on a new table (total minus any optional existing-table fill). */
  const guestsNeedingNewTable = useMemo(() => {
    if (!useAddGuestsFlow || guestsToAdd <= 0) return 0;
    return Math.max(0, guestsToAdd - existingFill.totalAdded);
  }, [useAddGuestsFlow, guestsToAdd, existingFill.totalAdded]);

  const tableConfig = useMemo(
    () =>
      resolveActiveTableConfig(
        catalogTables,
        useAddGuestsFlow ? guestsNeedingNewTable : tableSeating.groupSize,
      ),
    [
      catalogTables,
      useAddGuestsFlow,
      guestsNeedingNewTable,
      tableSeating.groupSize,
    ],
  );

  const maxAddableGuests = useMemo(
    () => computeMaxAddableGuests(catalogTables, totalFreeExistingSeats),
    [catalogTables, totalFreeExistingSeats],
  );

  const guestAddPriceHint = useMemo(
    () =>
      resolveGuestAddPriceHint(
        useAddGuestsFlow,
        availableExistingTableSlots,
        dateSource,
        tableConfig?.price ?? null,
      ),
    [
      useAddGuestsFlow,
      availableExistingTableSlots,
      dateSource,
      tableConfig?.price,
    ],
  );

  const existingOnlyGroupSize = totalFreeExistingSeats;
  const newTableBelowMinimum =
    guestsNeedingNewTable > 0 &&
    tableConfig != null &&
    guestsNeedingNewTable < tableConfig.min;
  const suggestedIncreasedGroupSize =
    guestsToAdd + (tableConfig != null ? tableConfig.min - guestsNeedingNewTable : 0);
  const showNewTableMinimumHint =
    guestsToAdd > 0 &&
    newTableBelowMinimum &&
    existingFill.totalAdded > 0;

  useEffect(() => {
    if (!addOnsData?.data) return;

    const catalogTickets = addOnsData.data.tickets.map((ticket) => ({
      id: ticket.id,
      title: ticket.title,
    }));
    const catalogPackages = addOnsData.data.drinks
      .filter((drink) => drink.status === 1)
      .map((drink) => ({
        id: drink.id,
        title: drink.title,
      }));
    const booked = resolveBookedCatalogQuantities(
      dateSource,
      catalogTickets,
      catalogPackages,
    );

    setTickets((prev) =>
      addOnsData.data.tickets.map((t) => {
        const maxQuantity = getAdditionalMax(
          t.available_tickets,
          t.id,
          booked.tickets,
        );
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
          const maxQuantity = getAdditionalMax(
            d.available_drinks,
            d.id,
            booked.packages,
          );
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

    setTableSeating({
      groupSize: 0,
      allocation: [],
      seatingConfirmed: false,
      tableTotal: 0,
      tableItemCount: 0,
      draftGuestTotal: 0,
    });
    setGuestsToAdd(0);
    setExistingFill({
      additionsBySlot: {},
      totalAdded: 0,
      totalCost: 0,
      saveGroups: [],
    });
    setTablePanelResetKey((key) => key + 1);
  }, [addOnsData, dateId, dateSource]);

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
    setExistingFill({
      additionsBySlot: {},
      totalAdded: 0,
      totalCost: 0,
      saveGroups: [],
    });
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
  const catalogItemCount =
    tickets.reduce((s, t) => s + t.quantity, 0) +
    drinks.reduce((s, d) => s + d.quantity, 0);
  const tableGuestCount = existingFill.totalAdded + newTablePlacedCount;
  const pendingTableGuestCount =
    useAddGuestsFlow && guestsToAdd > 0 ? guestsToAdd : tableGuestCount;
  const pendingSummaryLabel = formatPendingExtrasSummary(
    pendingTableGuestCount,
    catalogItemCount,
  );
  const pendingTotal =
    ticketTotal + drinkTotal + existingFill.totalCost + tableSeating.tableTotal;
  const tableGuestTotal = existingFill.totalCost + tableSeating.tableTotal;

  useEffect(() => {
    onPendingTotalChange?.(
      pendingTotal,
      catalogItemCount + tableGuestCount,
    );
  }, [pendingTotal, catalogItemCount, tableGuestCount, onPendingTotalChange]);

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

    if (useAddGuestsFlow && guestsToAdd > 0) {
      const newTableGuests = tableSeating.seatingConfirmed
        ? tableSeating.allocation.reduce((sum, seats) => sum + seats, 0)
        : 0;
      const totalPlaced = existingFill.totalAdded + newTableGuests;

      if (totalPlaced < guestsToAdd) {
        const shortfall = guestsToAdd - totalPlaced;
        if (
          guestsNeedingNewTable > 0 &&
          tableConfig &&
          guestsNeedingNewTable < tableConfig.min &&
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

    const formData = new FormData();
    formData.append("booking_id", bookingId);
    formData.append("date", dateKey);
    if (roomId != null && roomId > 0) {
      formData.append("room_id", roomId.toString());
    }
    formData.append("people_in_group", String(guestsToAdd || tableSeating.groupSize));

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
        group.tableCount.toString(),
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
      tableSeating.allocation.length > 0
    ) {
      formData.append(`tables[${tableIndex}][id]`, tableConfig.id.toString());
      formData.append(`tables[${tableIndex}][table_size]`, tableConfig.max.toString());
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
        resetExtrasCatalog();
        onSaveSuccess?.();
      },
    });
  }, [
    bookingId,
    dateId,
    dateKey,
    roomId,
    drinks,
    eligible,
    isSavingAddOns,
    existingFill,
    guestsToAdd,
    onSaveSuccess,
    pendingTotal,
    resetExtrasCatalog,
    saveAddOns,
    tableConfig,
    tableSeating,
    tickets,
    useAddGuestsFlow,
    guestsNeedingNewTable,
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
                <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 px-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div>
                    <p className="text-[0.8125rem] font-semibold text-foreground">
                      How many guests are you adding?
                    </p>
                    {guestAddPriceHint.single != null ? (
                      <p className="mt-[0.15rem] text-[10px] text-muted-foreground">
                        {formatUnit(guestAddPriceHint.single)} per person on
                        existing tables
                      </p>
                    ) : guestAddPriceHint.min != null &&
                      guestAddPriceHint.max != null ? (
                      <p className="mt-[0.15rem] text-[10px] text-muted-foreground">
                        {formatUnit(guestAddPriceHint.min)}–
                        {formatUnit(guestAddPriceHint.max)} per person on
                        existing tables
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

                {showNewTableMinimumHint && (
                    <div
                      className="rounded-lg p-[0.625rem_0.75rem] text-[0.6875rem] leading-[1.45] text-foreground"
                      style={{
                        border: "1px solid color-mix(in srgb, var(--booking-kind-table) 25%, var(--border))",
                        background: "color-mix(in srgb, var(--booking-kind-table) 8%, var(--card))",
                      }}
                    >
                      <p>
                        {guestsNeedingNewTable} guest
                        {guestsNeedingNewTable === 1 ? "" : "s"} still need a
                        table — new tables require at least {tableConfig.min}.
                        Increase group size to {suggestedIncreasedGroupSize},
                        or adjust existing-table guests.
                      </p>
                    </div>
                  )}

                {guestsToAdd > 0 &&
                  hasAvailableExistingTables &&
                  !newTableSeatingConfirmed && (
                  <FillExistingTablesPanel
                    slots={availableExistingTableSlots}
                    guestsToAdd={guestsToAdd}
                    guestsPlacedOnNewTable={newTablePlacedCount}
                    formatCurrency={formatCurrency}
                    onStateChange={setExistingFill}
                    optional
                  />
                )}

                {newTableSeatingConfirmed && existingFill.totalAdded > 0 && (
                  <ExistingTablesPlacedSummary
                    slots={availableExistingTableSlots}
                    snapshot={existingFill}
                    formatCurrency={formatCurrency}
                  />
                )}

                {newTableBelowMinimum &&
                  existingFill.totalAdded === 0 &&
                  existingOnlyGroupSize > 0 &&
                  !newTableSeatingConfirmed && (
                  <div
                    className="flex flex-col gap-2 rounded-lg p-[0.625rem_0.75rem]"
                    style={{
                      border: "1px dashed color-mix(in srgb, var(--booking-kind-table) 30%, var(--border))",
                      background: "color-mix(in srgb, var(--booking-kind-table) 5%, var(--card))",
                    }}
                  >
                    <p className="m-0 text-[10px] font-bold tracking-[0.08em] uppercase text-muted-foreground">
                      Quick options
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-foreground transition-colors"
                        onClick={() => setGuestsToAdd(existingOnlyGroupSize)}
                      >
                        Use {existingOnlyGroupSize} (existing tables only)
                      </button>
                      <button
                        type="button"
                        className="rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors"
                        style={{
                          border: "1px solid color-mix(in srgb, var(--booking-kind-table) 45%, var(--border))",
                          background: "color-mix(in srgb, var(--booking-kind-table) 12%, var(--card))",
                          color: "color-mix(in srgb, var(--booking-kind-table) 85%, var(--foreground))",
                        }}
                        onClick={() =>
                          setGuestsToAdd(suggestedIncreasedGroupSize)
                        }
                      >
                        Increase to {suggestedIncreasedGroupSize} (existing +
                        new table)
                      </button>
                    </div>
                  </div>
                )}

                {guestsNeedingNewTable > 0 && (
                  <TableSeatingPanel
                    key={`${dateId}-${tableConfig.id}-${tablePanelResetKey}-new`}
                    tableConfig={tableConfig}
                    formatCurrency={formatCurrency}
                    formatUnit={formatUnit}
                    onStateChange={handleTableSeatingChange}
                    externalGroupSize={guestsNeedingNewTable}
                    sectionTitle={`New table · ${guestsNeedingNewTable} guest${guestsNeedingNewTable === 1 ? "" : "s"}`}
                  />
                )}

                {guestsToAdd > 0 && (
                  <div
                    className="flex items-start justify-between gap-3 rounded-lg border border-border p-3 px-3.5"
                    style={{ background: "color-mix(in srgb, var(--booking-kind-table) 6%, var(--card))" }}
                  >
                    <div>
                      <p className="m-0 text-[10px] font-bold tracking-[0.08em] uppercase text-muted-foreground">
                        Overall progress
                      </p>
                      <p className="mt-[0.2rem] text-[0.8125rem] font-bold text-foreground">
                        {tableGuestCount} / {guestsToAdd} guests placed
                      </p>
                      {tableGuestCount < guestsToAdd && !newTableSeatingConfirmed && (
                        <p className="mt-1 text-[10px] leading-[1.4] text-muted-foreground">
                          {newTablePlacedCount > 0 && existingFill.totalAdded > 0
                            ? "Confirm seating on the new table to finish."
                            : existingFill.totalAdded > 0
                              ? "Assign remaining guests on the new table below, then confirm seating."
                              : "Add guests to existing tables, or confirm a new table below."}
                        </p>
                      )}
                      {tableGuestCount >= guestsToAdd && !newTableSeatingConfirmed && (
                        <p className="mt-1 text-[10px] leading-[1.4] text-muted-foreground">
                          Confirm seating on the new table to finish.
                        </p>
                      )}
                      {newTableSeatingConfirmed && (
                        <p className="mt-1 text-[10px] leading-[1.4] text-muted-foreground">
                          Tap Add to booking to save your changes.
                        </p>
                      )}
                    </div>
                    {tableGuestTotal > 0 && (
                      <span className="text-sm font-bold text-foreground whitespace-nowrap">
                        {formatCurrency(tableGuestTotal)}
                      </span>
                    )}
                  </div>
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
              title={dateSource?.package_title}
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
    </div>
  );
}
