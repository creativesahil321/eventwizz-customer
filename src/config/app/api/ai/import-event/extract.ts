import { extractSite, type ExtractedSite } from "../import-website/extract";

const MAX_STRUCTURED_ITEMS = 24;
const MAX_LIST_ITEMS = 60;
const MAX_SIGNAL_TEXT = 360;
const MAX_PROMPT_TEXT = 12_000;

type JsonRecord = Record<string, unknown>;

export interface EventStructuredSignals {
  names: string[];
  descriptions: string[];
  startDates: string[];
  endDates: string[];
  locations: string[];
  offers: Array<{
    name?: string;
    price?: string;
    currency?: string;
    description?: string;
  }>;
  faqs: Array<{ question: string; answer: string }>;
  schedules: Array<{ title: string; time: string }>;
}

export interface EventImageCandidate {
  url: string;
  role?: "banner" | "package" | "schedule" | "menu" | "gallery";
}

export interface EventVideoCandidate {
  url: string;
  role?: "banner";
}

export interface ExtractedEventPage {
  site: ExtractedSite;
  listItems: string[];
  structured: EventStructuredSignals;
  imageCandidates: EventImageCandidate[];
  videoCandidates: EventVideoCandidate[];
  digest: string;
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function text(value: unknown, max = MAX_SIGNAL_TEXT): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function unique(values: string[], max = MAX_STRUCTURED_ITEMS): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  ).slice(0, max);
}

function addIfString(
  target: string[],
  value: unknown,
  max = MAX_SIGNAL_TEXT,
): void {
  const normalized = text(value, max);
  if (normalized) target.push(normalized);
}

function toAbsoluteUrl(value: unknown, baseUrl: string): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    const url = new URL(value.trim(), baseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function normalizeDate(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const iso = trimmed.match(/^(\d{4}-\d{2}-\d{2})T/);
  return iso?.[1];
}

function collectJsonLdValues(html: string): unknown[] {
  const values: unknown[] = [];
  const scriptRe =
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while (
    values.length < MAX_STRUCTURED_ITEMS &&
    (match = scriptRe.exec(html)) !== null
  ) {
    try {
      const parsed = JSON.parse(match[1].trim()) as unknown;
      if (Array.isArray(parsed)) values.push(...parsed);
      else values.push(parsed);
    } catch {
      // Ignore malformed structured data and continue with visible content.
    }
  }

  return values.slice(0, MAX_STRUCTURED_ITEMS);
}

function collectStructuredRecords(value: unknown, depth = 0): JsonRecord[] {
  if (depth > 4) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectStructuredRecords(item, depth + 1));
  }

  const record = asRecord(value);
  if (!record) return [];

  const records = [record];
  if (Array.isArray(record["@graph"])) {
    records.push(...collectStructuredRecords(record["@graph"], depth + 1));
  }
  return records;
}

function extractAddress(value: unknown): string {
  const record = asRecord(value);
  if (!record) return text(value);
  const parts = [
    record.streetAddress,
    record.addressLocality,
    record.addressRegion,
    record.postalCode,
    record.addressCountry,
  ]
    .map((part) => text(part, 120))
    .filter(Boolean);
  return parts.join(", ");
}

function extractStructuredSignals(html: string): EventStructuredSignals {
  const signals: EventStructuredSignals = {
    names: [],
    descriptions: [],
    startDates: [],
    endDates: [],
    locations: [],
    offers: [],
    faqs: [],
    schedules: [],
  };

  for (const record of collectJsonLdValues(html).flatMap((value) =>
    collectStructuredRecords(value),
  )) {
    const type = Array.isArray(record["@type"])
      ? record["@type"].map(String).join(" ")
      : String(record["@type"] ?? "");

    if (/event/i.test(type)) {
      addIfString(signals.names, record.name);
      addIfString(signals.descriptions, record.description, MAX_SIGNAL_TEXT);
      const startDate = normalizeDate(record.startDate);
      const endDate = normalizeDate(record.endDate);
      if (startDate) signals.startDates.push(startDate);
      if (endDate) signals.endDates.push(endDate);

      const location = asRecord(record.location);
      const address = extractAddress(location?.address ?? location);
      if (address) signals.locations.push(address);

      const image = record.image;
      if (typeof image === "string") {
        // The image is carried by the deterministic candidate selector below.
        signals.descriptions.push(`EVENT IMAGE: ${text(image, 500)}`);
      }
    }

    if (/faqpage/i.test(type)) {
      const entities = asRecord(record.mainEntity);
      const entityList = Array.isArray(record.mainEntity)
        ? record.mainEntity
        : entities
          ? [entities]
          : [];
      for (const entity of entityList) {
        const question = asRecord(entity)?.name;
        const answer = asRecord(asRecord(entity)?.acceptedAnswer)?.text;
        const normalizedQuestion = text(question, 160);
        const normalizedAnswer = text(answer, 500);
        if (normalizedQuestion && normalizedAnswer) {
          signals.faqs.push({
            question: normalizedQuestion,
            answer: normalizedAnswer,
          });
        }
      }
    }

    if (/offer/i.test(type) || record.price != null) {
      const price = text(record.price, 40);
      const currency = text(record.priceCurrency, 8);
      const offerName = text(record.name, 120);
      const description = text(record.description, 240);
      if (price || offerName || description) {
        signals.offers.push({
          name: offerName || undefined,
          price: price || undefined,
          currency: currency || undefined,
          description: description || undefined,
        });
      }
    }

    if (/schedule|event/i.test(type)) {
      const title = text(record.name, 120);
      const time = text(record.startTime ?? record.time, 40);
      if (title && time) signals.schedules.push({ title, time });
    }
  }

  return {
    names: unique(signals.names),
    descriptions: unique(signals.descriptions),
    startDates: unique(signals.startDates),
    endDates: unique(signals.endDates),
    locations: unique(signals.locations),
    offers: signals.offers
      .filter(
        (offer) =>
          offer.name || offer.price || offer.description || offer.currency,
      )
      .slice(0, MAX_STRUCTURED_ITEMS),
    faqs: signals.faqs.slice(0, 8),
    schedules: signals.schedules.slice(0, 30),
  };
}

function extractListItems(html: string): string[] {
  const cleanHtml = html.replace(
    /<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi,
    " ",
  );
  const items: string[] = [];
  const itemRe = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
  let match: RegExpExecArray | null;

  while (items.length < MAX_LIST_ITEMS && (match = itemRe.exec(cleanHtml))) {
    const value = match[1]
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (value.length >= 2) items.push(value.slice(0, MAX_SIGNAL_TEXT));
  }

  return unique(items, MAX_LIST_ITEMS);
}

function extractVideoCandidates(
  html: string,
  baseUrl: string,
): EventVideoCandidate[] {
  const candidates: string[] = [];
  const add = (value: unknown) => {
    const url = toAbsoluteUrl(value, baseUrl);
    if (
      url &&
      (/\.(mp4|webm|ogg)(?:\?|#|$)/i.test(url) ||
        /(?:video|stream|media)/i.test(url))
    ) {
      candidates.push(url);
    }
  };

  const metaRe =
    /<meta\b[^>]*(?:property|name)\s*=\s*["'](?:og:video(?::url)?|twitter:player:stream)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = metaRe.exec(html))) {
    add(match[0].match(/\bcontent\s*=\s*["']([^"']+)/i)?.[1]);
  }

  const sourceRe = /<(?:video|source)\b[^>]*>/gi;
  while ((match = sourceRe.exec(html))) {
    const tag = match[0];
    add(
      tag.match(/\b(?:src|data-src|data-video-url)\s*=\s*["']([^"']+)/i)?.[1],
    );
  }

  for (const record of collectJsonLdValues(html).flatMap((value) =>
    collectStructuredRecords(value),
  )) {
    const video = asRecord(record.video);
    add(typeof record.video === "string" ? record.video : undefined);
    add(video?.contentUrl);
    add(video?.embedUrl);
    add(video?.url);
  }

  return unique(candidates, 4).map((url) => ({ url, role: "banner" }));
}

function extractImageCandidates(
  html: string,
  baseUrl: string,
  site: ExtractedSite,
): EventImageCandidate[] {
  const knownImageUrls = new Set(
    [site.ogImage, ...site.images].filter(
      (url): url is string => typeof url === "string" && Boolean(url),
    ),
  );
  const semantic: Array<{ url: string; score: number; role?: EventImageCandidate["role"] }> =
    [];
  const imgRe = /<(?:img|source)\b[^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = imgRe.exec(html))) {
    const tag = match[0];
    const source =
      tag.match(/\b(?:src|data-src|data-lazy-src|srcset)\s*=\s*["']([^"']+)/i)?.[1];
    if (!source) continue;
    const firstSource = source.split(",")[0]?.trim().split(/\s+/)[0];
    const url = toAbsoluteUrl(firstSource, baseUrl);
    if (!url || !knownImageUrls.has(url)) continue;

    const context = [
      tag.match(/\b(?:alt|class|id|data-testid)\s*=\s*["']([^"']+)/i)?.[1],
      url,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const role = /menu|food|catering|dish|drink/.test(context)
      ? "menu"
      : /package|offer|deal|ticket/.test(context)
        ? "package"
        : /schedule|timeline|program|agenda/.test(context)
          ? "schedule"
          : /hero|banner|cover|header/.test(context)
            ? "banner"
            : undefined;
    const score =
      role === "banner" ? 40 : role === "package" || role === "menu" ? 30 : 10;
    semantic.push({ url, score, role });
  }

  const seen = new Set<string>();
  return [
    ...semantic.sort((a, b) => b.score - a.score),
    ...Array.from(knownImageUrls).map((url) => ({
      url,
      score: 0,
      role: undefined,
    })),
  ]
    .filter((candidate) => {
      if (seen.has(candidate.url)) return false;
      seen.add(candidate.url);
      return true;
    })
    .slice(0, 24)
    .map(({ url, role }) => ({ url, role }));
}

function buildDigest(
  site: ExtractedSite,
  listItems: string[],
  structured: EventStructuredSignals,
  videoCandidates: EventVideoCandidate[],
): string {
  const parts = [
    site.title ? `PAGE TITLE: ${site.title}` : "",
    site.ogSiteName ? `SITE NAME: ${site.ogSiteName}` : "",
    structured.names.length
      ? `STRUCTURED EVENT NAMES:\n- ${structured.names.join("\n- ")}`
      : "",
    structured.startDates.length
      ? `STRUCTURED START DATES: ${structured.startDates.join(", ")}`
      : "",
    structured.endDates.length
      ? `STRUCTURED END DATES: ${structured.endDates.join(", ")}`
      : "",
    structured.locations.length
      ? `STRUCTURED LOCATIONS:\n- ${structured.locations.join("\n- ")}`
      : "",
    structured.offers.length
      ? `STRUCTURED OFFERS:\n${JSON.stringify(structured.offers)}`
      : "",
    structured.faqs.length
      ? `STRUCTURED FAQS:\n${JSON.stringify(structured.faqs)}`
      : "",
    structured.schedules.length
      ? `STRUCTURED SCHEDULE:\n${JSON.stringify(structured.schedules)}`
      : "",
    videoCandidates.length
      ? `VIDEO CANDIDATES:\n- ${videoCandidates.map((candidate) => candidate.url).join("\n- ")}`
      : "",
    site.headings.length
      ? `HEADINGS:\n- ${site.headings.slice(0, 32).join("\n- ")}`
      : "",
    site.paragraphs.length
      ? `BODY CONTENT:\n${site.paragraphs.slice(0, 28).join("\n\n")}`
      : "",
    listItems.length ? `LIST ITEMS:\n- ${listItems.join("\n- ")}` : "",
  ].filter(Boolean);

  return parts.join("\n\n").slice(0, MAX_PROMPT_TEXT);
}

export function extractEventPage(
  html: string,
  baseUrl: string,
): ExtractedEventPage {
  const site = extractSite(html, baseUrl);
  const listItems = extractListItems(html);
  const structured = extractStructuredSignals(html);
  const imageCandidates = extractImageCandidates(html, baseUrl, site);
  const videoCandidates = extractVideoCandidates(html, baseUrl);

  return {
    site,
    listItems,
    structured,
    imageCandidates,
    videoCandidates,
    digest: buildDigest(site, listItems, structured, videoCandidates),
  };
}
