"use client";

import { SECTION_SUBTITLE_CLASS } from "@/lib/section-type";
import { useState, useEffect } from "react";
import { useDrinkSelectionStore } from "@/store/drink-selection.store";
import { useHydration } from "@/hooks/useHydration";
import { useCurrencyFormat } from "@/hooks/use-currency-format";
import { Button } from "@/components/ui/button";
import { usePreviewMobileLayout } from "@/hooks/use-preview-narrow-layout";
import { SiteHeading } from "@/components/public/site-heading";
import { cn } from "@/lib/utils";
import { PUBLIC_SECTION_PY_CLASS } from "@/lib/public-rhythm";
import {
  previewFullWidthUntilMd,
  previewHideUntilMd,
  previewPhoneGap3,
  previewPhoneMt4,
  previewPhoneP5,
  previewPhoneSpaceY3,
  previewPhoneSpaceY4,
  previewPhoneTextBase,
  previewPhoneTextLg,
  previewPhoneTextSm,
  previewPhoneTextXs,
  previewStackUntilMd,
} from "@/lib/preview-container-layout";
import type { HeadingEmphasis } from "@/lib/heading-emphasis";
import { clampCheckoutQuantity } from "@/app/(public)/vendor/checkout/_lib/checkout-availability";

type DrinkPackage = {
  id?: number;
  title: string;
  description: string;
  price: number;
  available_quantity?: number;
};

type DrinkSectionProps = {
  title: string;
  description: string;
  packages: DrinkPackage[];
  eventSlug?: string;
  /** Multi-room events: isolate drink selections per room. */
  roomId?: number;
  /** Fallback scope when room id is not assigned yet (onboarding preview). */
  roomIndex?: number;
  /** Show package list without an extra click (default: open on public + preview). */
  defaultExpanded?: boolean;
  headingEmphasis?: HeadingEmphasis | string | null;
};

/** Finite stock from API; `undefined` means no limit was provided. */
function parseDrinkAvailableQuantity(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.floor(n);
}

export default function DrinkSection({
  title,
  description,
  packages,
  eventSlug,
  roomId,
  roomIndex,
  defaultExpanded = true,
  headingEmphasis,
}: DrinkSectionProps) {
  const { format: formatMoney } = useCurrencyFormat();
  const [showMore] = useState(defaultExpanded);
  const isHydrated = useHydration();
  const narrowPreview = usePreviewMobileLayout();
  const { addDrink, updateDrinkQuantity, getDrinkQuantity, getTotalDrinks } =
    useDrinkSelectionStore();

  useEffect(() => {
    if (eventSlug && isHydrated) {
      useDrinkSelectionStore
        .getState()
        .setCurrentEvent(eventSlug, roomId, roomIndex);
    }
  }, [eventSlug, roomId, roomIndex, isHydrated]);

  const safePackages = Array.isArray(packages) ? packages : [];

  const filteredPackages = safePackages.filter(
    (pkg) =>
      pkg.title.trim() !== "" || pkg.description.trim() !== "" || pkg.price > 0,
  );

  const stockSignature = filteredPackages
    .map(
      (pkg) =>
        `${pkg.title}\0${pkg.available_quantity ?? ""}`,
    )
    .join("\n");

  // Drop / clamp stale localStorage qty when API stock is lower (incl. 0).
  useEffect(() => {
    if (!isHydrated || filteredPackages.length === 0) return;

    for (const pkg of filteredPackages) {
      const maxQty = parseDrinkAvailableQuantity(pkg.available_quantity);
      if (maxQty == null) continue;
      const current = getDrinkQuantity(pkg.title);
      const clamped = clampCheckoutQuantity(current, maxQty);
      if (clamped !== current) {
        updateDrinkQuantity(pkg.title, clamped);
      }
    }
    // stockSignature captures package titles + available_quantity without
    // depending on a fresh array identity every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [isHydrated, stockSignature, getDrinkQuantity, updateDrinkQuantity]);

  if (
    title.trim() === "" &&
    description.trim() === "" &&
    filteredPackages.length === 0
  ) {
    return null;
  }

  const handleAdd = (drink: DrinkPackage) => {
    const maxQty = parseDrinkAvailableQuantity(drink.available_quantity);
    if (maxQty === 0) return;

    const drinkId =
      drink.id ||
      drink.title
        .split("")
        .reduce((acc, char) => acc + (char.codePointAt(0) || 0), 0);

    addDrink({
      id: drinkId,
      title: drink.title,
      description: drink.description,
      price: drink.price,
      quantity: 1,
    });
  };

  const handleIncrease = (drink: DrinkPackage) => {
    const maxQty = parseDrinkAvailableQuantity(drink.available_quantity);
    const currentQuantity = getDrinkQuantity(drink.title);
    const next = clampCheckoutQuantity(currentQuantity + 1, maxQty);
    if (next === currentQuantity) return;
    updateDrinkQuantity(drink.title, next);
  };

  const handleDecrease = (drink: DrinkPackage) => {
    const currentQuantity = getDrinkQuantity(drink.title);
    updateDrinkQuantity(drink.title, currentQuantity - 1);
  };

  return (
    <section className={cn("w-full overflow-hidden bg-[var(--color-background)] px-4 text-[var(--color-text)]", PUBLIC_SECTION_PY_CLASS)}>
      <section className="mx-auto w-full max-w-5xl text-center">
        <div className={cn("space-y-3 px-2", previewPhoneSpaceY3)}>
          <SiteHeading
            level={2}
            title={title || "Drinks & extras"}
            emphasis={headingEmphasis as HeadingEmphasis}
            variant="onSurface"
            align="center"
          />
          <p
            className={cn(
              "mx-auto max-w-full overflow-hidden whitespace-normal break-words",
              SECTION_SUBTITLE_CLASS,
            )}
            style={{
              wordBreak: "break-word",
              overflowWrap: "break-word",
              hyphens: "auto",
            }}
          >
            {description || "*Prices are subject to change"}
          </p>
        </div>
        {isHydrated && getTotalDrinks() > 0 && (
          <div
            className={cn(
              "mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--color-text)]/15 bg-[var(--color-surface)] px-3 py-1 text-xs font-medium text-[var(--color-text)]",
              !narrowPreview && "sm:text-sm",
            )}
          >
            <span>🍹</span>
            <span>
              {getTotalDrinks()} item{getTotalDrinks() > 1 ? "s" : ""} selected
            </span>
          </div>
        )}
        <section
          className={cn(
            "mt-4 flex w-full flex-col space-y-4 text-left",
            !narrowPreview && "sm:mt-6 sm:space-y-6",
            previewPhoneMt4,
            previewPhoneSpaceY4,
          )}
        >
          {showMore &&
            filteredPackages?.length > 0 &&
            filteredPackages.map((singlePackage, idx) => {
              const quantity = isHydrated
                ? getDrinkQuantity(singlePackage.title)
                : 0;
              const maxQty = parseDrinkAvailableQuantity(
                singlePackage.available_quantity,
              );
              const isSoldOut = maxQty === 0;
              const atMax =
                maxQty != null && quantity >= maxQty && quantity > 0;

              return (
                <section
                  key={idx}
                  className={cn(
                    "flex w-full min-w-0 flex-col items-start justify-between gap-3 rounded-xl bg-[var(--color-surface)] p-5 text-left text-[var(--color-text)] shadow-[0_10px_28px_-16px_rgba(0,0,0,0.28)] ring-1 ring-[color:color-mix(in_srgb,var(--color-text)_12%,transparent)]",
                    // Live desktop: details | price. Phone + 390px frame stay stacked cards.
                    !narrowPreview &&
                      "sm:flex-row sm:items-center sm:gap-4 sm:p-6",
                    previewStackUntilMd,
                    previewPhoneP5,
                    previewPhoneGap3,
                    isSoldOut && "opacity-70",
                  )}
                >
                  <article className="flex w-full min-w-0 flex-1 flex-col items-start text-left">
                    <h3
                      className={cn(
                        "mb-1 w-full break-words text-left text-base font-semibold",
                        !narrowPreview && "sm:mb-2 sm:text-lg md:text-xl",
                        previewPhoneTextBase,
                      )}
                    >
                      {singlePackage.title}
                    </h3>
                    <div
                      className={cn(
                        "prose prose-sm max-w-full w-full min-w-0 overflow-hidden text-left text-xs leading-relaxed break-words text-[var(--color-text-dimmed)] prose-p:my-1 prose-headings:text-left",
                        !narrowPreview && "sm:text-sm md:text-base",
                        previewPhoneTextXs,
                      )}
                      style={{
                        wordBreak: "break-word",
                        overflowWrap: "break-word",
                        hyphens: "auto",
                      }}
                      dangerouslySetInnerHTML={{
                        __html: singlePackage.description || "",
                      }}
                    />
                  </article>

                  <div
                    className={cn(
                      "mx-4 hidden flex-1 border-t border-dashed border-[var(--color-text)]/20 sm:block",
                      previewHideUntilMd,
                    )}
                  />

                  <article
                    className={cn(
                      "mt-2 flex w-full shrink-0 flex-col items-stretch gap-3",
                      !narrowPreview &&
                        "sm:mt-0 sm:w-auto sm:flex-row sm:items-end sm:gap-4",
                      previewStackUntilMd,
                    )}
                  >
                    <p
                      className={cn(
                        "flex items-center justify-start space-x-1 text-left text-lg font-semibold whitespace-nowrap",
                        !narrowPreview && "sm:text-xl md:text-2xl",
                        previewPhoneTextLg,
                      )}
                    >
                      <span>{formatMoney(singlePackage.price)}</span>
                    </p>

                    {isSoldOut ? (
                      <Button
                        variant="event-primary"
                        size="sm"
                        disabled
                        className={cn(
                          "w-full px-4 py-2 text-sm",
                          !narrowPreview && "sm:w-auto sm:px-6 sm:text-base",
                          previewFullWidthUntilMd,
                          previewPhoneTextSm,
                        )}
                      >
                        Sold Out
                      </Button>
                    ) : quantity === 0 ? (
                      <Button
                        variant="event-primary"
                        size="sm"
                        onClick={() => handleAdd(singlePackage)}
                        className={cn(
                          "w-full px-4 py-2 text-sm",
                          !narrowPreview && "sm:w-auto sm:px-6 sm:text-base",
                          previewFullWidthUntilMd,
                          previewPhoneTextSm,
                        )}
                      >
                        Add to Cart
                      </Button>
                    ) : (
                      <div
                        className={cn(
                          "flex w-full items-center justify-between overflow-hidden rounded-lg border border-[var(--color-text)]/20",
                          !narrowPreview && "sm:w-auto sm:justify-center",
                          previewFullWidthUntilMd,
                        )}
                      >
                        <button
                          className={cn(
                            "min-w-[44px] px-4 py-2 text-lg font-semibold touch-manipulation hover:bg-[var(--color-background)]/80",
                            !narrowPreview &&
                              "sm:min-w-0 sm:px-3 sm:py-1 sm:text-base",
                          )}
                          onClick={() => handleDecrease(singlePackage)}
                          aria-label="Decrease quantity"
                          type="button"
                        >
                          −
                        </button>
                        <span
                          className={cn(
                            "min-w-[44px] bg-[var(--color-background)]/50 px-4 py-2 text-center text-base font-medium",
                            !narrowPreview &&
                              "sm:min-w-0 sm:px-4 sm:py-1 sm:text-sm",
                          )}
                        >
                          {quantity}
                        </span>
                        <button
                          className={cn(
                            "min-w-[44px] px-4 py-2 text-lg font-semibold touch-manipulation hover:bg-[var(--color-background)]/80",
                            !narrowPreview &&
                              "sm:min-w-0 sm:px-3 sm:py-1 sm:text-base",
                            atMax &&
                              "cursor-not-allowed opacity-40 hover:bg-transparent",
                          )}
                          onClick={() => handleIncrease(singlePackage)}
                          aria-label="Increase quantity"
                          aria-disabled={atMax}
                          disabled={atMax}
                          type="button"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </article>
                </section>
              );
            })}
        </section>
      </section>
    </section>
  );
}
