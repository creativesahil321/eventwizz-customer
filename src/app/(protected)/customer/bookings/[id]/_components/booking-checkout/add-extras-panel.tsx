"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAddOnsDetails } from "@/services/customer/bookings/hooks/useAddOnsDetails";
import { useSaveAddOns } from "@/services/customer/bookings/hooks/useSaveAddOns";
import {
  isBookingDateEligibleForAddOns,
  type BookingDatePaymentStatus,
} from "@/lib/booking-addons-eligibility";
import {
  getKindStyles,
  kindAccentStyle,
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
import type { BookingDateSource } from "./build-line-items";

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

interface AddExtrasPanelProps {
  bookingId: string;
  dateId: string;
  paymentStatus?: BookingDatePaymentStatus;
  dateSource?: BookingDateSource;
  formatCurrency: (amount: number) => string;
  formatUnit: (amount: number) => string;
  onPendingTotalChange?: (total: number, itemCount: number) => void;
  onSaveSuccess?: () => void;
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
      className="booking-extras-section-header"
      style={kindAccentStyle(kind)}
    >
      <KindIconChip kind={kind} size="md" variant="section" />
      <h4
        className={cn(
          styles.sectionClassName,
          customTitle && "booking-kind-section-title--named",
        )}
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

  return (
    <div
      className={cn(
        "booking-catalog-card",
        selected && "booking-catalog-card--selected",
        soldOut && "booking-catalog-card--sold-out",
      )}
      style={kindAccentStyle(kind)}
    >
      <p className="booking-catalog-card__title">{title}</p>
      {description && (
        <p className="booking-catalog-card__desc">{description}</p>
      )}
      <p className="booking-catalog-price">{priceLabel}</p>
      {maxQuantity > 0 && maxQuantity <= 99 && (
        <p className="booking-catalog-availability">
          {maxQuantity === 1 ? "1 available" : `${maxQuantity} available`}
        </p>
      )}
      <div className="booking-catalog-card__actions">
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
              className="booking-catalog-remove-btn"
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
            className="booking-catalog-add-btn"
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

function PendingExtrasSaveBar({
  pendingCount,
  pendingTotalFormatted,
  isSaving,
  onSave,
  position = "top",
}: {
  pendingCount: number;
  pendingTotalFormatted: string;
  isSaving: boolean;
  onSave: () => void;
  position?: "top" | "bottom";
}) {
  if (pendingCount <= 0) return null;

  return (
    <div
      className={cn(
        "z-10 flex flex-col gap-2 border-amber-200/80 bg-amber-50/95 px-4 py-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:px-5",
        position === "top"
          ? "sticky top-0 border-b"
          : "border-t border-amber-200",
      )}
    >
      <div className="min-w-0">
        <p className="text-xs font-semibold text-amber-950">
          Ready to add to your booking
        </p>
        <p className="mt-0.5 text-[11px] text-amber-900/80">
          {pendingCount} item{pendingCount === 1 ? "" : "s"} ·{" "}
          {pendingTotalFormatted} · not saved until you tap below
        </p>
      </div>
      <button
        type="button"
        className="booking-table-auto-btn h-9 shrink-0 px-4 sm:w-auto"
        onClick={onSave}
        disabled={isSaving}
      >
        {isSaving ? "Adding…" : "Add to booking"}
      </button>
    </div>
  );
}

export function AddExtrasPanel({
  bookingId,
  dateId,
  paymentStatus,
  dateSource,
  formatCurrency,
  formatUnit,
  onPendingTotalChange,
  onSaveSuccess,
}: AddExtrasPanelProps) {
  const eligible = isBookingDateEligibleForAddOns(paymentStatus);
  const { data: addOnsData, isLoading } = useAddOnsDetails(
    bookingId,
    eligible ? dateId : "",
  );
  const { mutate: saveAddOns, isPending: isSavingAddOns } = useSaveAddOns();

  const [tickets, setTickets] = useState<CatalogItem[]>([]);
  const [drinks, setDrinks] = useState<CatalogItem[]>([]);
  const [tableConfig, setTableConfig] = useState<TableSeatingConfig | null>(
    null,
  );
  const [tableSeating, setTableSeating] = useState<TableSeatingSnapshot>({
    groupSize: 0,
    allocation: [],
    seatingConfirmed: false,
    tableTotal: 0,
    tableItemCount: 0,
  });
  const [tablePanelResetKey, setTablePanelResetKey] = useState(0);

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

    const firstTable = addOnsData.data.tables[0];
    if (firstTable && firstTable.available_tables > 0) {
      setTableConfig({
        id: firstTable.id,
        min: Math.max(1, firstTable.min_persons),
        max: Math.max(firstTable.min_persons, firstTable.max_persons),
        price: Math.max(0, firstTable.price),
        maxTables: Math.max(0, firstTable.available_tables),
      });
    } else {
      setTableConfig(null);
    }

    setTableSeating({
      groupSize: 0,
      allocation: [],
      seatingConfirmed: false,
      tableTotal: 0,
      tableItemCount: 0,
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
    });
    setTablePanelResetKey((key) => key + 1);
    setTickets((prev) => prev.map((ticket) => ({ ...ticket, quantity: 0 })));
    setDrinks((prev) => prev.map((drink) => ({ ...drink, quantity: 0 })));
  }, []);

  const ticketTotal = tickets.reduce((s, t) => s + t.price * t.quantity, 0);
  const drinkTotal = drinks.reduce((s, d) => s + d.price * d.quantity, 0);
  const pendingTotal = ticketTotal + drinkTotal + tableSeating.tableTotal;
  const pendingCount =
    tickets.reduce((s, t) => s + t.quantity, 0) +
    drinks.reduce((s, d) => s + d.quantity, 0) +
    tableSeating.tableItemCount;

  useEffect(() => {
    onPendingTotalChange?.(pendingTotal, pendingCount);
  }, [pendingTotal, pendingCount, onPendingTotalChange]);

  const handleSave = useCallback(() => {
    if (!eligible || pendingCount === 0 || isSavingAddOns) return;

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

    const formData = new FormData();
    formData.append("booking_id", bookingId);
    formData.append("date", dateId);
    formData.append("people_in_group", String(tableSeating.groupSize));

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

    if (
      tableSeating.seatingConfirmed &&
      tableConfig &&
      tableSeating.allocation.length > 0
    ) {
      formData.append("tables[0][id]", tableConfig.id.toString());
      formData.append("tables[0][table_size]", tableConfig.max.toString());
      formData.append(
        "tables[0][price_per_person]",
        tableConfig.price.toString(),
      );
      formData.append("tables[0][type]", "new");
      formData.append(
        "tables[0][no_tables]",
        tableSeating.allocation.length.toString(),
      );
      tableSeating.allocation.forEach((seats, allocationIndex) => {
        formData.append(
          `tables[0][allocation][${allocationIndex}][parent_id]`,
          String(allocationIndex + 1),
        );
        formData.append(
          `tables[0][allocation][${allocationIndex}][seats]`,
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
    drinks,
    eligible,
    isSavingAddOns,
    onSaveSuccess,
    pendingCount,
    resetExtrasCatalog,
    saveAddOns,
    tableConfig,
    tableSeating,
    tickets,
  ]);

  const hasCatalog =
    tickets.length > 0 || drinks.length > 0 || tableConfig !== null;

  if (!eligible) {
    return (
      <p className="booking-extras-panel px-4 py-4 text-sm text-muted-foreground">
        Add-ons cannot be modified for this date.
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className="booking-extras-panel space-y-4 px-4 py-4">
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    );
  }

  if (!hasCatalog) {
    return (
      <p className="booking-extras-panel px-4 py-4 text-sm text-muted-foreground">
        No additional extras are available for this date.
      </p>
    );
  }

  const tableAccent = kindAccentStyle("table");
  const pendingTotalFormatted = formatCurrency(pendingTotal);

  return (
    <div className="booking-extras-panel">
      <PendingExtrasSaveBar
        pendingCount={pendingCount}
        pendingTotalFormatted={pendingTotalFormatted}
        isSaving={isSavingAddOns}
        onSave={handleSave}
        position="top"
      />

      <div className="booking-extras-panel__inner">
        {tickets.length > 0 && (
          <section className="booking-extras-section">
            <ExtrasSectionHeader kind="ticket" />
            <div className="booking-catalog-grid">
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
          <section className="booking-extras-section" style={tableAccent}>
            <ExtrasSectionHeader kind="table" />
            <TableSeatingPanel
              key={`${dateId}-${tableConfig.id}-${tablePanelResetKey}`}
              tableConfig={tableConfig}
              formatCurrency={formatCurrency}
              formatUnit={formatUnit}
              onStateChange={handleTableSeatingChange}
            />
          </section>
        )}

        {drinks.length > 0 && (
          <section className="booking-extras-section">
            <ExtrasSectionHeader
              kind="package"
              title={dateSource?.package_title}
            />
            <div className="booking-catalog-grid">
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

      <PendingExtrasSaveBar
        pendingCount={pendingCount}
        pendingTotalFormatted={pendingTotalFormatted}
        isSaving={isSavingAddOns}
        onSave={handleSave}
        position="bottom"
      />
    </div>
  );
}

interface AddExtrasToggleProps {
  open: boolean;
  onToggle: () => void;
  pendingCount: number;
  pendingTotalFormatted: string;
}

export function AddExtrasToggle({
  open,
  onToggle,
  pendingCount,
  pendingTotalFormatted,
}: AddExtrasToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-2.5 border-t border-dashed border-border bg-muted/15 px-4 py-2.5 text-left transition-colors hover:bg-muted/30 sm:px-5"
    >
      <Plus
        className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
        strokeWidth={2}
      />
      <span className="flex-1 text-xs font-medium text-muted-foreground">
        Add extras for this date
      </span>
      {pendingCount > 0 && (
        <span
          className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold tabular-nums"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--color-primary) 12%, transparent)",
            color: "var(--color-primary)",
          }}
        >
          {pendingCount} pending · {pendingTotalFormatted}
        </span>
      )}
      <ChevronDown
        className={cn(
          "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
          open && "rotate-180",
        )}
        strokeWidth={2}
      />
    </button>
  );
}
