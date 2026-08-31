export type EventAboutHighlight = {
  label: string;
  value: string;
};

type EventAboutHighlightsInput = {
  occasion?: string | null;
  dates?: string | null;
  time?: string | null;
  location?: string | null;
  fromPrice?: number | null;
  formatPrice: (price: number) => string;
};

const clean = (value: string | null | undefined): string =>
  value?.trim() ?? "";

export function buildEventAboutHighlights({
  occasion,
  dates,
  time,
  location,
  fromPrice,
  formatPrice,
}: EventAboutHighlightsInput): EventAboutHighlight[] {
  return [
    clean(occasion) ? { label: "Occasion", value: clean(occasion) } : null,
    clean(dates) ? { label: "Dates", value: clean(dates) } : null,
    clean(time) ? { label: "Time", value: clean(time) } : null,
    clean(location) ? { label: "Location", value: clean(location) } : null,
    fromPrice != null
      ? {
          label: "From",
          value: `${formatPrice(fromPrice)} per person`,
        }
      : null,
  ].filter((highlight): highlight is EventAboutHighlight =>
    Boolean(highlight),
  );
}
