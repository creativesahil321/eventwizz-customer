export type EventAboutHighlightKey =
  | "occasion"
  | "dates"
  | "time"
  | "location"
  | "fromPrice";

export type EventAboutHighlight = {
  key: EventAboutHighlightKey;
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
    clean(occasion)
      ? { key: "occasion", label: "Occasion", value: clean(occasion) }
      : null,
    clean(dates) ? { key: "dates", label: "Dates", value: clean(dates) } : null,
    clean(time) ? { key: "time", label: "Time", value: clean(time) } : null,
    clean(location)
      ? { key: "location", label: "Location", value: clean(location) }
      : null,
    fromPrice != null
      ? {
          key: "fromPrice" as const,
          label: "From",
          value: `${formatPrice(fromPrice)} per person`,
        }
      : null,
  ].filter((highlight): highlight is EventAboutHighlight =>
    Boolean(highlight),
  );
}
