"use client";

import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useDrinkSelectionStore } from "@/store/drink-selection.store";
import { useHydration } from "@/hooks/useHydration";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useCurrencyFormat } from "@/hooks/use-currency-format";

type DrinkPackage = {
  id?: number; // Optional for backward compatibility, but should always be present from API
  title: string;
  description: string;
  price: number;
  available_quantity?: number;
};

type DrinkSectionProps = {
  title: string;
  description: string;
  packages: DrinkPackage[];
  eventSlug?: string; // Optional for backward compatibility
  /** Show package list without an extra click (default: open on public + preview). */
  defaultExpanded?: boolean;
};

export default function DrinkSection({
  title,
  description,
  packages,
  eventSlug,
  defaultExpanded = true,
}: DrinkSectionProps) {
  const { format: formatMoney } = useCurrencyFormat();
  const [showMore, setShowMore] = useState(defaultExpanded);
  const isHydrated = useHydration(); // Professional hydration handling
  const {
    addDrink,
    updateDrinkQuantity,
    getDrinkQuantity,
    getTotalDrinks,
    setCurrentEvent,
  } = useDrinkSelectionStore();

  // 🍷 DRINK CLEANUP: Initialize event slug when component mounts
  useEffect(() => {
    if (eventSlug && isHydrated) {
      console.log(`🍷 Initializing drink store for event: ${eventSlug}`);
      setCurrentEvent(eventSlug);
    }
  }, [eventSlug, isHydrated, setCurrentEvent]);

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
    // Ensure id exists - if not, generate a temporary one based on title hash
    // This handles backward compatibility for packages without id
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
    <section className="bg-[var(--color-background)] text-[var(--color-text)] py-16 px-4 w-full overflow-hidden">
      <section className="w-full text-center max-w-5xl mx-auto">
        <h2 className="text-2xl font-black tracking-tight text-[var(--color-text)] md:text-3xl px-2 break-words">
          {title || "Other Packages"}
        </h2>
        <p
          className="py-4 sm:py-5 text-sm sm:text-base px-2 break-words whitespace-normal overflow-hidden max-w-full text-[var(--color-text-dimmed)]"
          style={{
            wordBreak: "break-word",
            overflowWrap: "break-word",
            hyphens: "auto",
          }}
        >
          {description || "*Prices are subject to change"}
        </p>
        {isHydrated && getTotalDrinks() > 0 && (
          <div className="mt-3 inline-flex items-center gap-2 bg-[var(--color-surface)] text-[var(--color-text)] px-3 py-1 rounded-full text-xs sm:text-sm font-medium border border-[var(--color-text)]/15">
            <span>🍹</span>
            <span>
              {getTotalDrinks()} item{getTotalDrinks() > 1 ? "s" : ""} selected
            </span>
          </div>
        )}
        <section className="w-full flex items-center justify-center mt-4 sm:mt-6">
          <Button
            variant="event-primary"
            onClick={() => {
              setShowMore(!showMore);
            }}
            className="flex items-center gap-2 text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-2.5 w-full sm:w-auto"
          >
            View Package List
            {showMore ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </section>
        <section className="flex w-full flex-col space-y-4 sm:space-y-6 mt-4 sm:mt-6 overflow-hidden text-left">
          {showMore &&
            filteredPackages?.length > 0 &&
            filteredPackages.map((singlePackage, idx) => {
              const quantity = isHydrated
                ? getDrinkQuantity(singlePackage.title)
                : 0;
              return (
                <section
                  className="text-[var(--color-text)] bg-[var(--color-surface)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-4 sm:p-6 rounded-lg border border-[var(--color-surface)]/10 w-full text-left"
                  key={idx}
                >
                  {/* Details — explicit text-left counters inherited text-center from parent hero */}
                  <article className="flex flex-col items-start w-full sm:min-w-0 sm:max-w-none flex-1 text-left">
                    <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-1 sm:mb-2 break-words w-full text-left">
                      {singlePackage.title}
                    </h3>
                    <div
                      className="text-xs sm:text-sm md:text-base text-[var(--color-text-dimmed)] text-left leading-relaxed break-words whitespace-normal overflow-hidden prose prose-sm max-w-full w-full prose-p:my-1 prose-headings:text-left"
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

                  {/* Divider */}
                  <div className="hidden sm:block flex-1 border-t border-dashed border-[var(--color-text)]/20 mx-4" />

                  {/* Price + Actions */}
                  <article className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto mt-2 sm:mt-0">
                    <p className="flex items-center space-x-1 text-lg sm:text-xl md:text-2xl font-semibold whitespace-nowrap">
                      <span>{formatMoney(singlePackage.price)}</span>
                    </p>

                    {quantity === 0 ? (
                      <Button
                        variant="event-primary"
                        size="sm"
                        onClick={() => handleAdd(singlePackage)}
                        className="w-full sm:w-auto text-sm sm:text-base px-4 sm:px-6 py-2"
                      >
                        Add to Cart
                      </Button>
                    ) : (
                      <div className="flex items-center justify-center border border-[var(--color-text)]/20 rounded-lg overflow-hidden w-full sm:w-auto">
                        <button
                          className="px-4 sm:px-3 py-2 sm:py-1 hover:bg-[var(--color-background)]/80 text-lg sm:text-base font-semibold min-w-[44px] sm:min-w-0 touch-manipulation"
                          onClick={() => handleDecrease(singlePackage)}
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="px-4 sm:px-4 py-2 sm:py-1 bg-[var(--color-background)]/50 text-base sm:text-sm font-medium min-w-[44px] sm:min-w-0 text-center">
                          {quantity}
                        </span>
                        <button
                          className="px-4 sm:px-3 py-2 sm:py-1 hover:bg-[var(--color-background)]/80 text-lg sm:text-base font-semibold min-w-[44px] sm:min-w-0 touch-manipulation"
                          onClick={() => handleIncrease(singlePackage)}
                          aria-label="Increase quantity"
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
