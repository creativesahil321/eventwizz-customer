/**
 * PDFs for the header downloads control (brochure / flyer / FAQ).
 * Body brochure section no longer renders a DOWNLOADS tile — header is the only download UI.
 */
export type HeaderDownloadLink = { title: string; href: string };

function pickPdfUrl(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  if (value instanceof File) {
    return URL.createObjectURL(value);
  }
  return null;
}

export type DownloadRowInput = {
  title: string;
  download_link?: readonly unknown[] | null;
};

/**
 * Maps brochure / onboarding download rows to header links (first usable URL per row).
 * Skips placeholders and "#"; supports `File` for previews (object URLs).
 */
export function headerLinksFromDownloadItems(
  items: DownloadRowInput[],
): HeaderDownloadLink[] {
  const out: HeaderDownloadLink[] = [];
  for (const item of items) {
    const title = item.title?.trim();
    if (!title) continue;
    const raw = item.download_link?.[0];
    let href: string | null = null;
    if (typeof raw === "string") {
      const t = raw.trim();
      if (t.length > 0 && t !== "#") href = t;
    } else if (raw instanceof File) {
      href = URL.createObjectURL(raw);
    }
    if (href) out.push({ title, href });
  }
  return out;
}

export function buildEventHeaderDownloadLinks(source: {
  brochure_pdf?: unknown;
  faq_pdf?: unknown;
  brochure_pdf_2?: unknown;
}): HeaderDownloadLink[] {
  const out: HeaderDownloadLink[] = [];
  const brochure = pickPdfUrl(source.brochure_pdf);
  if (brochure) out.push({ title: "Event brochure", href: brochure });
  const faq = pickPdfUrl(source.faq_pdf);
  if (faq) out.push({ title: "FAQ Details", href: faq });
  const brochure2 = pickPdfUrl(source.brochure_pdf_2);
  if (brochure2) out.push({ title: "Event Flayer", href: brochure2 });
  return out;
}
