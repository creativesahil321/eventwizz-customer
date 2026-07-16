"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getKindStyles,
  kindAccentStyle,
  BADGE_STYLE,
  SECTION_TITLE_STYLE,
} from "./item-kinds";
import { KindIconChip } from "./kind-icon-chip";
import { splitLineItemsByKind, type CheckoutLineItem } from "./types";
import MenuChoicesInline from "./menu-choices/menu-choices-inline";

const SCROLLABLE_KIND_ITEM_THRESHOLD = 6;

const scrollableStyle: CSSProperties = {
  maxHeight: "min(50vh, 22rem)",
  overscrollBehavior: "contain",
  scrollbarGutter: "stable" as const,
  scrollbarWidth: "thin" as const,
  scrollbarColor: "color-mix(in srgb, var(--muted-foreground) 32%, var(--border)) transparent",
};

const addonSectionStyle: CSSProperties = {
  borderTop: "1px dashed color-mix(in srgb, var(--color-warning) 35%, var(--border))",
  background: "color-mix(in srgb, var(--color-warning) 6%, var(--card))",
};

const addonSectionHeaderHoverStyle: CSSProperties = {
  transition: "background-color 0.15s ease",
};

const addonSectionBodyStyle: CSSProperties = {
  borderTop: "1px solid color-mix(in srgb, var(--color-warning) 18%, var(--border))",
  background: "color-mix(in srgb, var(--color-warning) 4%, var(--card))",
};

const addonSectionBodyScrollStyle: CSSProperties = {
  ...addonSectionBodyStyle,
  ...scrollableStyle,
  scrollbarColor: "color-mix(in srgb, var(--color-warning) 45%, var(--border)) transparent",
};

const addonHeaderBorderStyle: CSSProperties = {
  borderBottom: "1px solid color-mix(in srgb, var(--kind-accent, var(--color-warning)) 22%, var(--border))",
};

/** Divider color for line items inside kind-group lists. */
const lineItemDividerClass = "divide-border/65";

const viewAddonsPanelStyle: CSSProperties = {
  border: "1px solid color-mix(in srgb, var(--border) 85%, transparent)",
  background: "color-mix(in srgb, var(--muted) 22%, var(--card))",
};

const viewAddonsDividerStyle: CSSProperties = {
  borderTop: "1px solid color-mix(in srgb, var(--border) 80%, transparent)",
};

const addonBadgeStyle: CSSProperties = {
  background: "color-mix(in srgb, var(--color-warning) 18%, transparent)",
  color: "var(--color-warning)",
};

const addonBadgePaidStyle: CSSProperties = {
  background: "color-mix(in srgb, var(--color-success) 14%, transparent)",
  color: "var(--color-success)",
};

const qtyBadgeStyle: CSSProperties = {
  background: "color-mix(in srgb, var(--color-primary) 10%, transparent)",
  color: "color-mix(in srgb, var(--color-primary) 80%, var(--foreground))",
};

const tableAllocationStyle: CSSProperties = {
  border: "1px solid color-mix(in srgb, var(--muted-foreground) 18%, var(--border))",
  background: "color-mix(in srgb, var(--muted) 30%, var(--card))",
};

const lineDeleteStyle: CSSProperties = {
  color: "var(--destructive, #dc2626)",
  transition: "background-color 0.15s ease, color 0.15s ease",
};

const addonGroupMembersStyle: CSSProperties = {
  borderLeft: "2px solid color-mix(in srgb, var(--color-warning) 25%, var(--border))",
};

function resolveLineAmount(amount: unknown): number {
  if (typeof amount === "number" && Number.isFinite(amount)) return amount;
  if (typeof amount === "string" && amount.trim() !== "") {
    const parsed = parseFloat(amount.replace(/[£$€₹¥,]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

interface BookingLineItemsListProps {
  bookingItems: CheckoutLineItem[];
  addonItems: CheckoutLineItem[];
  addonTotal: number;
  addonLineCount: number;
  packageSectionTitle?: string;
  formatCurrency: (amount: number) => string;
  canModifyAddOns: boolean;
  isMenuChoice?: boolean;
  menuApi?: "customer" | "vendor";
  onMenuChoices?: () => void;
  onDeleteAddon: (
    type: "table" | "package" | "ticket",
    keyword: string | number,
  ) => void;
  isDeleting?: boolean;
}

function MenuChoicesSlot({
  item,
  isMenuChoice,
  menuApi = "customer",
}: {
  item: CheckoutLineItem;
  isMenuChoice?: boolean;
  menuApi?: "customer" | "vendor";
}) {
  if (
    item.kind !== "table" ||
    !isMenuChoice ||
    item.showMenuChoices === false ||
    item.isSavedAddon ||
    !item.menuChoiceContext
  ) {
    return null;
  }

  return (
    <MenuChoicesInline
      bookingId={item.menuChoiceContext.bookingId}
      dateKey={item.menuChoiceContext.dateKey}
      roomId={item.menuChoiceContext.roomId}
      tableAllocations={item.menuChoiceContext.tableAllocations}
      menuApi={menuApi}
    />
  );
}

function LineItemRow({
  item,
  formatCurrency,
  canModifyAddOns,
  isMenuChoice,
  menuApi = "customer",
  onMenuChoices,
  onDeleteAddon,
  isDeleting,
  variant = "default",
  hideKindBadge = false,
  hideKindIcon = false,
  nested = false,
  hideMenuChoices = false,
}: {
  item: CheckoutLineItem;
  formatCurrency: (amount: number) => string;
  canModifyAddOns: boolean;
  isMenuChoice?: boolean;
  menuApi?: "customer" | "vendor";
  onMenuChoices?: () => void;
  onDeleteAddon: (
    type: "table" | "package" | "ticket",
    keyword: string | number,
  ) => void;
  isDeleting?: boolean;
  variant?: "default" | "addon" | "addon-nested" | "breakdown";
  hideKindBadge?: boolean;
  hideKindIcon?: boolean;
  /** When true, padding lives on the parent wrap — row stays flush inside. */
  nested?: boolean;
  /** Render menu choices outside bordered addon accent wrappers. */
  hideMenuChoices?: boolean;
}) {
  const kind = getKindStyles(item.kind);

  const priceActions = (
    <div className="flex shrink-0 items-start gap-1.5">
      <p className="shrink-0 self-start min-w-[4.25rem] text-right text-sm font-bold tabular-nums text-foreground">
        {formatCurrency(resolveLineAmount(item.amount))}
      </p>
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
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md disabled:opacity-50 hover:enabled:bg-[color-mix(in_srgb,var(--destructive,#dc2626)_10%,transparent)]"
          style={lineDeleteStyle}
          title={`Remove ${item.name}`}
          aria-label={`Remove ${item.name}`}
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      )}
    </div>
  );

  return (
    <div
      className={cn(
        "flex items-start gap-3 sm:gap-4",
        !nested &&
          variant !== "breakdown" &&
          (hideKindIcon ? "py-3" : "py-3.5 sm:py-4"),
        hideKindIcon && "gap-0",
        variant === "addon-nested" && "pl-3",
        variant === "breakdown" && "py-2",
      )}
    >
      {!hideKindIcon && variant !== "breakdown" && (
        <KindIconChip kind={item.kind} />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p
                className={cn(
                  "font-bold leading-snug text-foreground tracking-[-0.01em]",
                  variant === "breakdown" ? "text-xs" : "text-[0.9375rem]",
                )}
              >
                {item.name}
              </p>
              {item.isSavedAddon || item.isPaidAddonHistory ? (
                <span
                  className="rounded text-[9px] font-bold tracking-[0.04em] uppercase px-1.5 py-0.5"
                  style={item.isPaidAddonHistory ? addonBadgePaidStyle : addonBadgeStyle}
                >
                  Add-on
                </span>
              ) : (
                !hideKindBadge && (
                  <span className={kind.badgeClassName} style={BADGE_STYLE}>{kind.label}</span>
                )
              )}
              {item.quantity && item.quantity > 1 && variant !== "breakdown" && (
                <span
                  className="rounded text-[9px] font-bold uppercase px-1.5 py-0.5"
                  style={qtyBadgeStyle}
                >
                  ×{item.quantity}
                </span>
              )}
            </div>
          </div>
          {priceActions}
        </div>
        {item.description && variant !== "breakdown" && (
          <p className="mt-0.5 text-xs font-normal leading-relaxed text-muted-foreground">
            {item.description}
          </p>
        )}
        {item.allocation && item.allocation.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.allocation.map((pill, pillIndex) => (
              <span
                key={`${item.id}-alloc-${pill.id ?? pillIndex}`}
                className="rounded-md px-2 py-[0.2rem] text-[10px] font-semibold text-muted-foreground"
                style={tableAllocationStyle}
              >
                {pill.seatsLabel ?? `${pill.label}: ${pill.value}`}
              </span>
            ))}
          </div>
        )}
        {variant !== "breakdown" && (
          <p className="mt-1 text-[11px] font-medium text-muted-foreground">
            {item.meta}
          </p>
        )}
        {!hideMenuChoices && (
          <MenuChoicesSlot
            item={item}
            isMenuChoice={isMenuChoice}
            menuApi={menuApi}
          />
        )}
      </div>
    </div>
  );
}

function BookingItemWithBreakdown({
  item,
  formatCurrency,
  canModifyAddOns,
  isMenuChoice,
  menuApi = "customer",
  onMenuChoices,
  onDeleteAddon,
  isDeleting,
  hideKindBadge = false,
  hideKindIcon = false,
}: {
  item: CheckoutLineItem;
  formatCurrency: (amount: number) => string;
  canModifyAddOns: boolean;
  isMenuChoice?: boolean;
  menuApi?: "customer" | "vendor";
  onMenuChoices?: () => void;
  onDeleteAddon: (
    type: "table" | "package" | "ticket",
    keyword: string | number,
  ) => void;
  isDeleting?: boolean;
  hideKindBadge?: boolean;
  hideKindIcon?: boolean;
}) {
  const breakdown = item.addonBreakdown ?? [];
  const isStandaloneAddon = item.isPaidAddonHistory === true;
  const showViewAddons =
    !isStandaloneAddon &&
    item.hasAddonBreakdown !== false &&
    (breakdown.length > 0 ||
      (item.addonExtraTotal != null && item.addonExtraTotal > 0));
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="py-4">
      <div
        className={cn(
          showViewAddons && "border-l-2 border-l-[var(--color-success)] pl-3.5",
        )}
      >
        <LineItemRow
          item={item}
          formatCurrency={formatCurrency}
          canModifyAddOns={canModifyAddOns}
          isMenuChoice={isMenuChoice}
          menuApi={menuApi}
          onMenuChoices={onMenuChoices}
          onDeleteAddon={onDeleteAddon}
          isDeleting={isDeleting}
          hideKindBadge={hideKindBadge || isStandaloneAddon}
          hideKindIcon={hideKindIcon}
          nested
          hideMenuChoices
        />
        {showViewAddons && (
        <>
          <button
            type="button"
            className="inline-flex items-center gap-1 mt-[0.625rem] text-[11px] font-semibold hover:underline"
            style={{ color: "var(--color-success)" }}
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            <ChevronDown
              className={cn(
                "h-3 w-3 shrink-0 transition-transform",
                expanded && "rotate-180",
              )}
              strokeWidth={2}
            />
            {expanded ? "Hide add-ons" : "View add-ons"}
          </button>
          {expanded && (
            <div
              className="mt-[0.625rem] rounded-lg p-3 px-3.5"
              style={viewAddonsPanelStyle}
            >
              {breakdown.length > 0 ? (
                <ul className="m-0 p-0 list-none text-[11px] leading-[1.6] text-muted-foreground">
                  {breakdown.map((entry) => (
                    <li key={`${item.id}-breakdown-${entry.id}`}>
                      {entry.label}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="m-0 text-[11px] font-semibold text-muted-foreground">
                  +{breakdown.length || 1} added
                </p>
              )}
              {item.addonExtraTotal != null && item.addonExtraTotal > 0 && (
                <>
                  {breakdown.length > 0 && (
                    <div className="my-2" style={viewAddonsDividerStyle} />
                  )}
                  <p className="m-0 text-[11px] font-semibold text-foreground">
                    Extra cost:{" "}
                    <span className="font-bold">+{formatCurrency(item.addonExtraTotal)}</span>
                  </p>
                </>
              )}
            </div>
          )}
        </>
      )}
      </div>
      <MenuChoicesSlot
        item={item}
        isMenuChoice={isMenuChoice}
        menuApi={menuApi}
      />
    </div>
  );
}

function GroupedAddonRow({
  item,
  formatCurrency,
  canModifyAddOns,
  isMenuChoice,
  menuApi = "customer",
  onMenuChoices,
  onDeleteAddon,
  isDeleting,
  hideKindBadge = false,
  hideKindIcon = false,
  rowVariant = "addon",
}: {
  item: CheckoutLineItem;
  formatCurrency: (amount: number) => string;
  canModifyAddOns: boolean;
  isMenuChoice?: boolean;
  menuApi?: "customer" | "vendor";
  onMenuChoices?: () => void;
  onDeleteAddon: (
    type: "table" | "package" | "ticket",
    keyword: string | number,
  ) => void;
  isDeleting?: boolean;
  hideKindBadge?: boolean;
  hideKindIcon?: boolean;
  rowVariant?: "default" | "addon" | "addon-nested";
}) {
  const members = item.groupMembers ?? [item];
  const isGroup = members.length > 1;
  const [expanded, setExpanded] = useState(false);
  const isStandaloneAddon =
    item.isPaidAddonHistory === true ||
    members.every((member) => member.isPaidAddonHistory);
  const flatBookingGroup = isGroup && rowVariant === "default";

  if (!isGroup || flatBookingGroup) {
    const row = (
      <LineItemRow
        item={item}
        formatCurrency={formatCurrency}
        canModifyAddOns={canModifyAddOns}
        isMenuChoice={isMenuChoice}
        menuApi={menuApi}
        onMenuChoices={onMenuChoices}
        onDeleteAddon={onDeleteAddon}
        isDeleting={isDeleting}
        variant={rowVariant}
        hideKindBadge={
          hideKindBadge || (isStandaloneAddon && rowVariant === "default")
        }
        hideKindIcon={hideKindIcon}
      />
    );

    if (flatBookingGroup) {
      return (
        <div className="py-4">
          <LineItemRow
            item={item}
            formatCurrency={formatCurrency}
            canModifyAddOns={canModifyAddOns}
            isMenuChoice={isMenuChoice}
            menuApi={menuApi}
            onMenuChoices={onMenuChoices}
            onDeleteAddon={onDeleteAddon}
            isDeleting={isDeleting}
            variant={rowVariant}
            hideKindBadge={hideKindBadge}
            hideKindIcon={hideKindIcon}
            nested
          />
        </div>
      );
    }

    if (isStandaloneAddon && rowVariant === "default") {
      return (
        <div className="py-4">
          <LineItemRow
            item={item}
            formatCurrency={formatCurrency}
            canModifyAddOns={canModifyAddOns}
            isMenuChoice={isMenuChoice}
            menuApi={menuApi}
            onMenuChoices={onMenuChoices}
            onDeleteAddon={onDeleteAddon}
            isDeleting={isDeleting}
            variant={rowVariant}
            hideKindBadge={hideKindBadge}
            hideKindIcon={hideKindIcon}
            nested
          />
        </div>
      );
    }

    return row;
  }

  return (
    <div>
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-3.5 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-[color-mix(in_srgb,var(--muted)_50%,transparent)]"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={
            expanded
              ? "Hide individual items"
              : "Show individual items"
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
            isMenuChoice={isMenuChoice}
            menuApi={menuApi}
            onMenuChoices={onMenuChoices}
            onDeleteAddon={onDeleteAddon}
            variant={rowVariant}
            hideKindBadge={hideKindBadge || isStandaloneAddon}
            hideKindIcon={hideKindIcon}
          />
        </div>
      </div>
      {!expanded && members.length > 1 && (
        <p className="mt-[-0.25rem] mb-2 ml-7 text-[10px] text-muted-foreground">
          {members.length} items combined · select the arrow to view details
        </p>
      )}
      {expanded && (
        <div
          className="ml-7 mb-1 pl-2 divide-y divide-border/60"
          style={addonGroupMembersStyle}
        >
          {members.map((member) => (
            <LineItemRow
              key={member.id}
              item={member}
              formatCurrency={formatCurrency}
              canModifyAddOns={canModifyAddOns}
              isMenuChoice={isMenuChoice}
              menuApi={menuApi}
              onMenuChoices={onMenuChoices}
              onDeleteAddon={onDeleteAddon}
              isDeleting={isDeleting}
              variant={rowVariant === "default" ? "default" : "addon-nested"}
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
        "flex items-center gap-2",
        variant === "addon" ? "mb-2.5 pb-2" : "mb-2.5 pb-1.5",
      )}
      style={{
        ...kindAccentStyle(kind),
        ...(variant === "addon" ? addonHeaderBorderStyle : {}),
      }}
    >
      <KindIconChip kind={kind} size="md" variant="section" />
      <p
        className={cn(
          styles.sectionClassName,
          customPackageTitle && "normal-case tracking-[0.01em] font-bold",
        )}
        style={SECTION_TITLE_STYLE}
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
  menuApi = "customer",
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
  menuApi?: "customer" | "vendor";
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
        variant === "booking" && "flex flex-col gap-0 pt-3",
        variant === "addon" && "flex flex-col gap-0 py-3 pb-2",
      )}
    >
      {kindGroups.map((group, groupIndex) => (
        <div
          key={group.kind}
          className={cn(
            groupIndex > 0 &&
              (variant === "addon"
                ? "mt-2.5 border-t border-border/60 pt-2.5"
                : "mt-4 border-t border-border pt-4"),
          )}
        >
          {showKindHeaders && (
            <LineItemKindHeader
              kind={group.kind}
              variant={variant}
              packageSectionTitle={packageSectionTitle}
            />
          )}
          <div
            className={cn(
              "flex flex-col divide-y",
              lineItemDividerClass,
            )}
            style={
              variant === "booking" &&
              group.items.length > SCROLLABLE_KIND_ITEM_THRESHOLD
                ? {
                    ...scrollableStyle,
                    marginInline: "-1.25rem",
                    paddingInline: "1.25rem",
                    overflowX: "hidden",
                    overflowY: "auto",
                  }
                : undefined
            }
          >
            {group.items.map((item) =>
              variant === "booking" ? (
                item.isPaidAddonHistory ||
                (item.groupMembers?.length ?? 0) > 1 ? (
                  <GroupedAddonRow
                    key={item.id}
                    item={item}
                    formatCurrency={formatCurrency}
                    canModifyAddOns={canModifyAddOns}
                    isMenuChoice={isMenuChoice}
                    menuApi={menuApi}
                    onMenuChoices={onMenuChoices}
                    onDeleteAddon={onDeleteAddon}
                    isDeleting={isDeleting}
                    rowVariant="default"
                    hideKindBadge={showKindHeaders}
                    hideKindIcon={showKindHeaders}
                  />
                ) : (
                  <BookingItemWithBreakdown
                    key={item.id}
                    item={item}
                    formatCurrency={formatCurrency}
                    canModifyAddOns={canModifyAddOns}
                    isMenuChoice={isMenuChoice}
                    menuApi={menuApi}
                    onMenuChoices={onMenuChoices}
                    onDeleteAddon={onDeleteAddon}
                    isDeleting={isDeleting}
                    hideKindBadge={showKindHeaders}
                    hideKindIcon={showKindHeaders}
                  />
                )
              ) : (
                <GroupedAddonRow
                  key={item.id}
                  item={item}
                  formatCurrency={formatCurrency}
                  canModifyAddOns={canModifyAddOns}
                  isMenuChoice={isMenuChoice}
                  menuApi={menuApi}
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
  menuApi = "customer",
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
      <p className="py-10 text-center text-sm font-normal text-muted-foreground">
        No items for this date yet.
      </p>
    );
  }

  return (
    <>
      {bookingItems.length > 0 && (
        <div className="pb-3 pt-2">
          <CategoryGroupedSection
            items={bookingItems}
            variant="booking"
            packageSectionTitle={packageSectionTitle}
            formatCurrency={formatCurrency}
            canModifyAddOns={canModifyAddOns}            isMenuChoice={isMenuChoice}
            menuApi={menuApi}
            onMenuChoices={onMenuChoices}            onDeleteAddon={onDeleteAddon}
            isDeleting={isDeleting}
          />
        </div>
      )}

      {addonItems.length > 0 && (
        <div className="-mx-5" style={addonSectionStyle}>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left"
            style={addonSectionHeaderHoverStyle}
            onClick={() => setAddonsOpen((v) => !v)}
            aria-expanded={addonsOpen}
          >
            <div className="min-w-0 text-left">
              <p
                className="text-[11px] font-bold tracking-[0.18em] uppercase"
                style={{ color: "var(--color-warning)" }}
              >
                Extra add-ons
              </p>
              {addonSummary && (
                <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
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
            <div
              className="overflow-x-hidden px-5"
              style={
                addonLineCount > SCROLLABLE_KIND_ITEM_THRESHOLD
                  ? addonSectionBodyScrollStyle
                  : addonSectionBodyStyle
              }
            >
              <CategoryGroupedSection
                items={addonItems}
                variant="addon"
                packageSectionTitle={packageSectionTitle}
                formatCurrency={formatCurrency}
                canModifyAddOns={canModifyAddOns}
                isMenuChoice={isMenuChoice}
                menuApi={menuApi}
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
