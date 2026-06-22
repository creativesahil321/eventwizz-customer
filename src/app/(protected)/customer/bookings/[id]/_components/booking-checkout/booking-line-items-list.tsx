"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getKindStyles,
  getKindAllocationPillStyle,
  kindAccentStyle,
} from "./item-kinds";
import { KindIconChip } from "./kind-icon-chip";
import { splitLineItemsByKind, type CheckoutLineItem } from "./types";

interface BookingLineItemsListProps {
  bookingItems: CheckoutLineItem[];
  addonItems: CheckoutLineItem[];
  addonTotal: number;
  addonLineCount: number;
  packageSectionTitle?: string;
  formatCurrency: (amount: number) => string;
  canModifyAddOns: boolean;
  isMenuChoice?: boolean;
  onMenuChoices?: () => void;
  onDeleteAddon: (
    type: "table" | "package" | "ticket",
    keyword: string | number,
  ) => void;
  isDeleting?: boolean;
}

function LineItemRow({
  item,
  formatCurrency,
  canModifyAddOns,
  isMenuChoice,
  onMenuChoices,
  onDeleteAddon,
  isDeleting,
  variant = "default",
  hideKindBadge = false,
  hideKindIcon = false,
}: {
  item: CheckoutLineItem;
  formatCurrency: (amount: number) => string;
  canModifyAddOns: boolean;
  isMenuChoice?: boolean;
  onMenuChoices?: () => void;
  onDeleteAddon: (
    type: "table" | "package" | "ticket",
    keyword: string | number,
  ) => void;
  isDeleting?: boolean;
  variant?: "default" | "addon" | "addon-nested";
  hideKindBadge?: boolean;
  hideKindIcon?: boolean;
}) {
  const kind = getKindStyles(item.kind);

  return (
    <div
      className={cn(
        "booking-line-item flex gap-3 sm:items-start sm:gap-4",
        hideKindIcon && "booking-line-item--no-icon",
        variant === "addon" && "booking-line-item--addon",
        variant === "addon-nested" && "booking-line-item--addon-nested",
      )}
    >
      {!hideKindIcon && <KindIconChip kind={item.kind} />}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-sm font-semibold leading-snug text-foreground">
            {item.name}
          </p>
          {item.isSavedAddon ? (
            <span className="booking-addon-badge">Add-on</span>
          ) : (
            !hideKindBadge && (
              <span className={kind.badgeClassName}>{kind.label}</span>
            )
          )}
          {item.quantity && item.quantity > 1 && (
            <span className="booking-line-qty-badge">×{item.quantity}</span>
          )}
        </div>
        {item.description && (
          <p className="mt-0.5 text-xs font-normal leading-relaxed text-muted-foreground">
            {item.description}
          </p>
        )}
        {item.allocation && item.allocation.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.allocation.map((pill, pillIndex) => (
              <span
                key={`${item.id}-alloc-${pill.id ?? pillIndex}`}
                className="rounded-md border px-2 py-0.5 text-[10px] font-semibold"
                style={getKindAllocationPillStyle()}
              >
                {pill.label}: {pill.value}
              </span>
            ))}
          </div>
        )}
        <p className="mt-1 text-[11px] font-medium text-muted-foreground">
          {item.meta}
        </p>
        {item.showMenuChoices && isMenuChoice && onMenuChoices && (
          <button
            type="button"
            className="booking-menu-link"
            onClick={onMenuChoices}
          >
            Menu choices →
          </button>
        )}
      </div>
      <div className="flex shrink-0 items-start gap-1.5">
        <p className="booking-line-amount">{formatCurrency(item.amount)}</p>
        {item.deletable && item.deletePayload && canModifyAddOns && (
          <button
            type="button"
            onClick={() =>
              onDeleteAddon(
                item.deletePayload!.type,
                item.deletePayload!.keyword,
              )
            }
            disabled={isDeleting}
            className="booking-line-delete"
            title={`Remove ${item.name}`}
            aria-label={`Remove ${item.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
}

function GroupedAddonRow({
  item,
  formatCurrency,
  canModifyAddOns,
  onDeleteAddon,
  isDeleting,
  hideKindBadge = false,
  hideKindIcon = false,
}: {
  item: CheckoutLineItem;
  formatCurrency: (amount: number) => string;
  canModifyAddOns: boolean;
  onDeleteAddon: (
    type: "table" | "package" | "ticket",
    keyword: string | number,
  ) => void;
  isDeleting?: boolean;
  hideKindBadge?: boolean;
  hideKindIcon?: boolean;
}) {
  const members = item.groupMembers ?? [item];
  const isGroup = members.length > 1;
  const [expanded, setExpanded] = useState(false);

  if (!isGroup) {
    return (
      <LineItemRow
        item={item}
        formatCurrency={formatCurrency}
        canModifyAddOns={canModifyAddOns}
        onDeleteAddon={onDeleteAddon}
        isDeleting={isDeleting}
        variant="addon"
        hideKindBadge={hideKindBadge}
        hideKindIcon={hideKindIcon}
      />
    );
  }

  return (
    <div className="booking-addon-group">
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="booking-addon-group__toggle"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={
            expanded
              ? "Hide individual add-on items"
              : "Show individual add-on items"
          }
        >
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 transition-transform",
              expanded && "rotate-180",
            )}
            strokeWidth={2}
          />
        </button>
        <div className="min-w-0 flex-1">
          <LineItemRow
            item={item}
            formatCurrency={formatCurrency}
            canModifyAddOns={false}
            onDeleteAddon={onDeleteAddon}
            variant="addon"
            hideKindBadge={hideKindBadge}
            hideKindIcon={hideKindIcon}
          />
        </div>
      </div>
      {!expanded && members.length > 1 && (
        <p className="booking-addon-group__hint">
          {members.length} separate add-ons combined · tap arrow to remove
          individually
        </p>
      )}
      {expanded && (
        <div className="booking-addon-group__members divide-y divide-border/60">
          {members.map((member) => (
            <LineItemRow
              key={member.id}
              item={member}
              formatCurrency={formatCurrency}
              canModifyAddOns={canModifyAddOns}
              onDeleteAddon={onDeleteAddon}
              isDeleting={isDeleting}
              variant="addon-nested"
              hideKindBadge={hideKindBadge}
              hideKindIcon={hideKindIcon}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LineItemKindHeader({
  kind,
  variant,
  packageSectionTitle,
}: {
  kind: "ticket" | "table" | "package";
  variant: "booking" | "addon";
  packageSectionTitle?: string;
}) {
  const styles = getKindStyles(kind);
  const customPackageTitle =
    kind === "package" && packageSectionTitle?.trim();
  const title = customPackageTitle
    ? customPackageTitle
    : styles.sectionTitle;

  return (
    <div
      className={cn(
        "booking-line-kind-group__header",
        variant === "addon" && "booking-line-kind-group__header--addon",
      )}
      style={kindAccentStyle(kind)}
    >
      <KindIconChip kind={kind} size="md" variant="section" />
      <p
        className={cn(
          styles.sectionClassName,
          customPackageTitle && "booking-kind-section-title--named",
        )}
      >
        {title}
      </p>
    </div>
  );
}

function CategoryGroupedSection({
  items,
  variant,
  packageSectionTitle,
  formatCurrency,
  canModifyAddOns,
  isMenuChoice,
  onMenuChoices,
  onDeleteAddon,
  isDeleting,
}: {
  items: CheckoutLineItem[];
  variant: "booking" | "addon";
  packageSectionTitle?: string;
  formatCurrency: (amount: number) => string;
  canModifyAddOns: boolean;
  isMenuChoice?: boolean;
  onMenuChoices?: () => void;
  onDeleteAddon: (
    type: "table" | "package" | "ticket",
    keyword: string | number,
  ) => void;
  isDeleting?: boolean;
}) {
  const kindGroups = splitLineItemsByKind(items);
  const showKindHeaders = kindGroups.length > 0;

  return (
    <div
      className={cn(
        variant === "booking" && "booking-line-section__groups",
        variant === "addon" && "booking-addons-section__groups",
      )}
    >
      {kindGroups.map((group, groupIndex) => (
        <div
          key={group.kind}
          className={cn(
            "booking-line-kind-group",
            variant === "addon" && "booking-line-kind-group--addon",
            groupIndex > 0 && "booking-line-kind-group--separated",
          )}
        >
          {showKindHeaders && (
            <LineItemKindHeader
              kind={group.kind}
              variant={variant}
              packageSectionTitle={packageSectionTitle}
            />
          )}
          <div className="divide-y divide-border/60">
            {group.items.map((item) =>
              variant === "addon" ? (
                <GroupedAddonRow
                  key={item.id}
                  item={item}
                  formatCurrency={formatCurrency}
                  canModifyAddOns={canModifyAddOns}
                  onDeleteAddon={onDeleteAddon}
                  isDeleting={isDeleting}
                  hideKindBadge={showKindHeaders}
                  hideKindIcon={showKindHeaders}
                />
              ) : (
                <LineItemRow
                  key={item.id}
                  item={item}
                  formatCurrency={formatCurrency}
                  canModifyAddOns={canModifyAddOns}
                  isMenuChoice={isMenuChoice}
                  onMenuChoices={onMenuChoices}
                  onDeleteAddon={onDeleteAddon}
                  isDeleting={isDeleting}
                  hideKindBadge={showKindHeaders}
                  hideKindIcon={showKindHeaders}
                />
              ),
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function BookingLineItemsList({
  bookingItems,
  addonItems,
  addonTotal,
  addonLineCount,
  packageSectionTitle,
  formatCurrency,
  canModifyAddOns,
  isMenuChoice,
  onMenuChoices,
  onDeleteAddon,
  isDeleting,
}: BookingLineItemsListProps) {
  const collapseAddonsByDefault = addonLineCount > 4;
  const [addonsOpen, setAddonsOpen] = useState(!collapseAddonsByDefault);

  const hasItems = bookingItems.length > 0 || addonItems.length > 0;

  const addonSummary = useMemo(() => {
    if (addonLineCount === 0) return null;
    return `${addonLineCount} item${addonLineCount === 1 ? "" : "s"} · ${formatCurrency(addonTotal)}`;
  }, [addonLineCount, addonTotal, formatCurrency]);

  if (!hasItems) {
    return (
      <p className="booking-line-item py-10 text-center text-sm font-normal text-muted-foreground">
        No items for this date yet.
      </p>
    );
  }

  return (
    <>
      {bookingItems.length > 0 && (
        <div className="booking-line-section">
          <p className="booking-line-section__label">Your booking</p>
          <CategoryGroupedSection
            items={bookingItems}
            variant="booking"
            packageSectionTitle={packageSectionTitle}
            formatCurrency={formatCurrency}
            canModifyAddOns={canModifyAddOns}
            isMenuChoice={isMenuChoice}
            onMenuChoices={onMenuChoices}
            onDeleteAddon={onDeleteAddon}
            isDeleting={isDeleting}
          />
        </div>
      )}

      {addonItems.length > 0 && (
        <div className="booking-addons-section">
          <button
            type="button"
            className="booking-addons-section__header"
            onClick={() => setAddonsOpen((v) => !v)}
            aria-expanded={addonsOpen}
          >
            <div className="min-w-0 text-left">
              <p className="booking-addons-section__title">Extra add-ons</p>
              {addonSummary && (
                <p className="booking-addons-section__summary">
                  {addonSummary}
                </p>
              )}
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                addonsOpen && "rotate-180",
              )}
              strokeWidth={2}
            />
          </button>

          {addonsOpen && (
            <div className="booking-addons-section__body">
              <CategoryGroupedSection
                items={addonItems}
                variant="addon"
                packageSectionTitle={packageSectionTitle}
                formatCurrency={formatCurrency}
                canModifyAddOns={canModifyAddOns}
                onDeleteAddon={onDeleteAddon}
                isDeleting={isDeleting}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
}
