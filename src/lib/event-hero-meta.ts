export type EventHeroBreadcrumb = {
  label: string;
  href?: string;
};

export type EventHeroMeta = {
  date?: string | null;
  time?: string | null;
  location?: string | null;
};

function parseEventDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const isoDay = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  const parsed = isoDay
    ? new Date(`${isoDay[1]}T12:00:00`)
    : new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** `Fri 4 - Sat 19 Dec 2026` when the range spans days; otherwise a single date. */
export function formatEventHeroDateRange(
  dates: Array<string | null | undefined>,
): string | null {
  const parsed = dates
    .map((value) => (value ? parseEventDate(value) : null))
    .filter((value): value is Date => value != null)
    .sort((a, b) => a.getTime() - b.getTime());
  if (parsed.length === 0) return null;

  const first = parsed[0];
  const last = parsed[parsed.length - 1];
  const sameDay =
    first.getFullYear() === last.getFullYear() &&
    first.getMonth() === last.getMonth() &&
    first.getDate() === last.getDate();

  if (sameDay) {
    return first.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  const lastLabel = last.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  if (
    first.getMonth() === last.getMonth() &&
    first.getFullYear() === last.getFullYear()
  ) {
    const firstLabel = first.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
    });
    return `${firstLabel} - ${lastLabel}`;
  }

  const firstLabel = first.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${firstLabel} - ${lastLabel}`;
}

function formatHeroClock(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const twentyFour = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (twentyFour) {
    const hours = Number.parseInt(twentyFour[1], 10);
    const minutes = twentyFour[2];
    const suffix = hours >= 12 ? "pm" : "am";
    const hour12 = hours % 12 || 12;
    return minutes === "00"
      ? `${hour12}:00${suffix}`
      : `${hour12}:${minutes}${suffix}`;
  }

  const ampm = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])$/);
  if (ampm) {
    const hour = Number.parseInt(ampm[1], 10);
    const minutes = ampm[2];
    const suffix = ampm[3].toLowerCase();
    return minutes === "00" ? `${hour}:00${suffix}` : `${hour}:${minutes}${suffix}`;
  }

  return trimmed;
}

/** First and last schedule times → `7:00pm - 1:00am`. */
export function formatEventHeroTimeRange(
  times: Array<string | null | undefined>,
): string | null {
  const clocks = times
    .map((value) => (value ? formatHeroClock(value) : null))
    .filter((value): value is string => Boolean(value));
  if (clocks.length === 0) return null;
  if (clocks.length === 1) return clocks[0];
  const last = clocks[clocks.length - 1];
  if (clocks[0] === last) return clocks[0];
  return `${clocks[0]} - ${last}`;
}

/** Live event page + vendor/onboarding preview share this so date/time stay in sync. */
export function labelsFromEventHeroSlices(input: {
  dates?: Array<{ event_date?: string | null } | null> | null;
  schedule?: Array<{ time?: string | null } | null> | null;
}): { date: string | null; time: string | null } {
  return {
    date: formatEventHeroDateRange(
      (input.dates ?? []).map((row) => row?.event_date),
    ),
    time: formatEventHeroTimeRange(
      (input.schedule ?? []).map((row) => row?.time),
    ),
  };
}

export function readEventCategoryLabel(source: {
  category_name?: string | null;
  event_category_name?: string | null;
  selected_category_name?: string | null;
  category?: string | { name?: string | null } | null;
} | null | undefined): string | null {
  if (!source) return null;
  const named =
    source.category_name?.trim() ||
    source.event_category_name?.trim() ||
    source.selected_category_name?.trim() ||
    "";
  if (named) return named;
  const raw = source.category;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (raw && typeof raw === "object" && raw.name?.trim()) {
    return raw.name.trim();
  }
  return null;
}
