import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useDrinkSelectionStore } from "@/store/drink-selection.store";
import { useHydration } from "@/hooks/useHydration";
import { ChevronDown, ChevronUp } from "lucide-react";

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
};

export default function DrinkSection({
  title,
  description,
  packages,
  eventSlug,
}: DrinkSectionProps) {
  const [showMore, setShowMore] = useState(false);
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

  const filteredPackages = packages.filter(
    (pkg) =>
      pkg.title.trim() !== "" || pkg.description.trim() !== "" || pkg.price > 0
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
    <section className="bg-foreground dark:bg-background py-6 sm:py-10 px-4 sm:px-6 w-full overflow-hidden">
      <section className="w-full text-center max-w-5xl mx-auto">
        <h2 className="text-background dark:text-foreground text-2xl sm:text-3xl md:text-4xl font-bold px-2 break-words">
          {title || "Other Packages"}
        </h2>
        <p
          className="text-background dark:text-foreground py-4 sm:py-5 text-sm sm:text-base px-2 break-words whitespace-normal overflow-hidden max-w-full"
          style={{
            wordBreak: "break-word",
            overflowWrap: "break-word",
            hyphens: "auto",
          }}
        >
          {description || "*Prices are subject to change"}
        </p>
        {isHydrated && getTotalDrinks() > 0 && (
          <div className="mt-3 inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-xs sm:text-sm font-medium">
            <span>🍹</span>
            <span>
              {getTotalDrinks()} item{getTotalDrinks() > 1 ? "s" : ""} selected
            </span>
          </div>
        )}
        <section className="w-full flex items-center justify-center mt-4 sm:mt-6">
          <Button
            variant="event-outline"
            onClick={() => {
              setShowMore(!showMore);
            }}
            className="flex items-center gap-2 border rounded-[10px] border-2 border-[var(--color-primary)] text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-2.5 w-full sm:w-auto"
          >
            View Package List
            {showMore ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </section>
        <section className="flex w-full flex-col space-y-4 sm:space-y-6 mt-4 sm:mt-6 overflow-hidden">
          {showMore &&
            filteredPackages?.length > 0 &&
            filteredPackages.map((singlePackage, idx) => {
              const quantity = isHydrated
                ? getDrinkQuantity(singlePackage.title)
                : 0;
              return (
                <section
                  className="text-background dark:text-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-4 sm:p-6 bg-background/5 dark:bg-foreground/5 rounded-lg border border-background/10 dark:border-foreground/10 w-full"
                  key={idx}
                >
                  {/* Details */}
                  <article className="flex flex-col items-start w-full sm:min-w-0 sm:max-w-none flex-1">
                    <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-1 sm:mb-2 break-words w-full">
                      {singlePackage.title}
                    </h3>
                    <div
                      className="text-xs sm:text-sm md:text-base dark:text-foreground opacity-70 text-start leading-relaxed break-words whitespace-normal overflow-hidden prose prose-sm dark:prose-invert max-w-full w-full"
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
                  <div className="hidden sm:block flex-1 border-t border-dashed border-background dark:border-foreground/20 mx-4" />

                  {/* Price + Actions */}
                  <article className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto mt-2 sm:mt-0">
                    <p className="flex items-center space-x-1 text-lg sm:text-xl md:text-2xl font-semibold whitespace-nowrap">
                      <span>€</span>
                      <span>{singlePackage.price}</span>
                    </p>

                    {quantity === 0 ? (
                      <Button
                        variant="event-outline"
                        size="sm"
                        onClick={() => handleAdd(singlePackage)}
                        className="w-full sm:w-auto text-sm sm:text-base px-4 sm:px-6 py-2"
                      >
                        Add to Cart
                      </Button>
                    ) : (
                      <div className="flex items-center justify-center border border-background dark:border-foreground/20 rounded-lg overflow-hidden w-full sm:w-auto">
                        <button
                          className="px-4 sm:px-3 py-2 sm:py-1 dark:bg-foreground/10 hover:bg-background/80 dark:hover:bg-foreground/20 text-lg sm:text-base font-semibold min-w-[44px] sm:min-w-0 touch-manipulation"
                          onClick={() => handleDecrease(singlePackage)}
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="px-4 sm:px-4 py-2 sm:py-1 bg-background/50 dark:bg-foreground/5 text-base sm:text-sm font-medium min-w-[44px] sm:min-w-0 text-center">
                          {quantity}
                        </span>
                        <button
                          className="px-4 sm:px-3 py-2 sm:py-1 hover:bg-background/80 dark:hover:bg-foreground/20 text-lg sm:text-base font-semibold min-w-[44px] sm:min-w-0 touch-manipulation"
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
