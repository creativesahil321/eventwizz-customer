"use client";

import { useState, useEffect } from "react";
import { useDrinkSelectionStore } from "@/store/drink-selection.store";
import { useHydration } from "@/hooks/useHydration";
import { useCurrencyFormat } from "@/hooks/use-currency-format";
import { Button } from "@/components/ui/button";
import { usePreviewNarrowLayout } from "@/hooks/use-preview-narrow-layout";
import { SiteHeading } from "@/components/public/site-heading";
import { cn } from "@/lib/utils";

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
};

export default function DrinkSection({
  title,
  description,
  packages,
  eventSlug,
  roomId,
  roomIndex,
  defaultExpanded = true,
}: DrinkSectionProps) {
  const { format: formatMoney } = useCurrencyFormat();
  const [showMore] = useState(defaultExpanded);
  const isHydrated = useHydration();
  const narrowPreview = usePreviewNarrowLayout();
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

  if (
    title.trim() === "" &&
    description.trim() === "" &&
    filteredPackages.length === 0
  ) {
    return null;
  }

  const handleAdd = (drink: DrinkPackage) => {
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
    const currentQuantity = getDrinkQuantity(drink.title);
    updateDrinkQuantity(drink.title, currentQuantity + 1);
  };

  const handleDecrease = (drink: DrinkPackage) => {
    const currentQuantity = getDrinkQuantity(drink.title);
    updateDrinkQuantity(drink.title, currentQuantity - 1);
  };

  return (
    <section className="w-full overflow-hidden bg-[var(--color-background)] px-4 py-16 text-[var(--color-text)]">
      <section className="mx-auto w-full max-w-5xl text-center">
        <div className="space-y-3 px-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-primary)]">
            Drinks
          </p>
          <SiteHeading
            level={2}
            title={title || "Other Packages"}
            variant="onSurface"
            align="center"
            className="!text-3xl !font-black tracking-tight md:!text-4xl"
          />
          <p
            className={cn(
              "mx-auto max-w-full overflow-hidden whitespace-normal break-words text-sm text-[var(--color-text-dimmed)]",
              !narrowPreview && "sm:text-base",
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
          )}
        >
          {showMore &&
            filteredPackages?.length > 0 &&
            filteredPackages.map((singlePackage, idx) => {
              const quantity = isHydrated
                ? getDrinkQuantity(singlePackage.title)
                : 0;
              return (
                <section
                  key={idx}
                  className={cn(
                    "w-full min-w-0 rounded-lg border border-[var(--color-surface)]/10 bg-[var(--color-surface)] p-4 text-left text-[var(--color-text)]",
                    // Mobile / Tablet framed preview: stacked card (no viewport `sm:` leak).
                    // Desktop live + desktop preview: details | price row.
                    narrowPreview
                      ? "flex flex-col items-start justify-between gap-3"
                      : "flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center sm:gap-4 sm:p-6",
                  )}
                >
                  <article className="flex w-full min-w-0 flex-1 flex-col items-start text-left">
                    <h3
                      className={cn(
                        "mb-1 w-full break-words text-left text-base font-semibold",
                        !narrowPreview && "sm:mb-2 sm:text-lg md:text-xl",
                      )}
                    >
                      {singlePackage.title}
                    </h3>
                    <div
                      className={cn(
                        "prose prose-sm max-w-full w-full min-w-0 overflow-hidden text-left text-xs leading-relaxed break-words text-[var(--color-text-dimmed)] prose-p:my-1 prose-headings:text-left",
                        !narrowPreview && "sm:text-sm md:text-base",
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

                  {!narrowPreview ? (
                    <div className="mx-4 hidden flex-1 border-t border-dashed border-[var(--color-text)]/20 sm:block" />
                  ) : null}

                  <article
                    className={cn(
                      "flex w-full shrink-0 flex-col gap-3",
                      // Mobile (live + framed preview): left-align price with copy, full-width CTA.
                      // Desktop: price + controls sit in a right-hand row.
                      narrowPreview
                        ? "mt-2 items-stretch"
                        : "mt-2 items-stretch sm:mt-0 sm:w-auto sm:items-end sm:flex-row sm:gap-4",
                    )}
                  >
                    <p
                      className={cn(
                        "flex items-center justify-start space-x-1 text-left text-lg font-semibold whitespace-nowrap",
                        !narrowPreview && "sm:text-xl md:text-2xl",
                      )}
                    >
                      <span>{formatMoney(singlePackage.price)}</span>
                    </p>

                    {quantity === 0 ? (
                      <Button
                        variant="event-primary"
                        size="sm"
                        onClick={() => handleAdd(singlePackage)}
                        className={cn(
                          "w-full px-4 py-2 text-sm",
                          !narrowPreview && "sm:w-auto sm:px-6 sm:text-base",
                        )}
                      >
                        Add to Cart
                      </Button>
                    ) : (
                      <div
                        className={cn(
                          "flex w-full items-center justify-between overflow-hidden rounded-lg border border-[var(--color-text)]/20",
                          !narrowPreview && "sm:w-auto sm:justify-center",
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
                          )}
                          onClick={() => handleIncrease(singlePackage)}
                          aria-label="Increase quantity"
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
