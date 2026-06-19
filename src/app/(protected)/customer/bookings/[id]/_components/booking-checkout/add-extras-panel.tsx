"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  TableSeatingPanel,
  type TableSeatingConfig,
  type TableSeatingSnapshot,
} from "./table-seating-panel";

interface CatalogItem {
  id: number;
  title: string;
  description?: string;
  price: number;
  quantity: number;
  maxQuantity: number;
}

interface AddExtrasPanelProps {
  bookingId: string;
  dateId: string;
  paymentStatus?: BookingDatePaymentStatus;
  formatCurrency: (amount: number) => string;
  formatUnit: (amount: number) => string;
  onPendingTotalChange?: (total: number, itemCount: number) => void;
  onSaveSuccess?: () => void;
}

function ExtrasSectionHeader({
  kind,
  title,
}: {
  kind: LineItemKind;
  title?: string;
}) {
  const styles = getKindStyles(kind);
  return (
    <div
      className="booking-extras-section-header"
      style={kindAccentStyle(kind)}
    >
      <KindIconChip kind={kind} size="sm" />
      <h4 className={styles.sectionClassName}>
        {title ?? styles.sectionTitle}
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

  return (
    <div
      className={cn(
        "booking-catalog-card",
        selected && "booking-catalog-card--selected",
      )}
      style={kindAccentStyle(kind)}
    >
      <p className="booking-catalog-card__title">{title}</p>
      {description && (
        <p className="booking-catalog-card__desc">{description}</p>
      )}
      <p className="booking-catalog-price">{priceLabel}</p>
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
          <button type="button" className="booking-catalog-add-btn" onClick={onAdd}>
            <Plus className="h-3 w-3" strokeWidth={2} />
            Add {priceLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export function AddExtrasPanel({
  bookingId,
  dateId,
  paymentStatus,
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
  const saveMutation = useSaveAddOns();

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

  useEffect(() => {
    if (!addOnsData?.data) return;

    setTickets(
      addOnsData.data.tickets.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        price: Math.max(0, t.price),
        quantity: 0,
        maxQuantity: Math.max(0, t.available_tickets),
      })),
    );

    setDrinks(
      addOnsData.data.drinks
        .filter((d) => d.status === 1)
        .map((d) => ({
          id: d.id,
          title: d.title,
          description: d.description,
          price: parseFloat(d.price) || 0,
          quantity: 0,
          maxQuantity: Math.max(0, d.available_drinks),
        })),
    );

    const firstTable = addOnsData.data.tables[0];
    if (firstTable) {
      setTableConfig({
        id: firstTable.id,
        min: Math.max(1, firstTable.min_persons),
        max: Math.max(firstTable.min_persons, firstTable.max_persons),
        price: Math.max(0, firstTable.price),
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
  }, [addOnsData, dateId]);

  const handleTableSeatingChange = useCallback((snapshot: TableSeatingSnapshot) => {
    setTableSeating(snapshot);
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

  const hasCatalog =
    tickets.length > 0 || drinks.length > 0 || tableConfig !== null;

  const handleSave = () => {
    if (!eligible || pendingCount === 0) return;

    const formData = new FormData();
    formData.append("booking_id", bookingId);
    formData.append("date", dateId);
    formData.append("people_in_group", String(tableSeating.groupSize));

    drinks
      .filter((d) => d.quantity > 0)
      .forEach((drink, index) => {
        formData.append(`drink_package[${index}][id]`, drink.id.toString());
        formData.append(`drink_package[${index}][title]`, drink.title);
        formData.append(`drink_package[${index}][price]`, drink.price.toString());
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

    saveMutation.mutate(formData, {
      onSuccess: () => {
        onSaveSuccess?.();
      },
    });
  };

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

  return (
    <div className="booking-extras-panel">
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
                        t.id === ticket.id ? { ...t, quantity: qty } : t,
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
              key={`${dateId}-${tableConfig.id}`}
              tableConfig={tableConfig}
              formatCurrency={formatCurrency}
              formatUnit={formatUnit}
              onStateChange={handleTableSeatingChange}
            />
          </section>
        )}

        {drinks.length > 0 && (
          <section className="booking-extras-section">
            <ExtrasSectionHeader kind="package" />
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
                        d.id === drink.id ? { ...d, quantity: qty } : d,
                      ),
                    )
                  }
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {pendingCount > 0 && (
        <div className="booking-extras-save-bar flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            {pendingCount} item{pendingCount === 1 ? "" : "s"} ·{" "}
            {formatCurrency(pendingTotal)}
          </p>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="h-7 rounded-md px-3 text-[11px] font-semibold shadow-none"
            style={{
              backgroundColor: "var(--color-primary)",
              color: "var(--color-primary-foreground, var(--primary-foreground))",
            }}
          >
            {saveMutation.isPending ? "Saving…" : "Save extras"}
          </Button>
        </div>
      )}
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
          {pendingCount} added · {pendingTotalFormatted}
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
