import { NextResponse } from "next/server";
import { env } from "@/env";
import { tryModelsWithFallback, type FallbackResult } from "../lib/utils";
import { assertSafeLogoUrl } from "@/lib/logo/fetch-logo-from-url";
import {
  BANNER_HEADING_MAX_WORDS,
  truncateToMaxWords,
} from "@/lib/word-count";
import { BANNER_SUB_HEADING_MAX_CHARS } from "@/app/(protected)/_shared/sites-essentials/_lib/schema";
import {
  SITE_ESSENTIALS_GOOGLE_FONT_NAMES,
  siteEssentialsGoogleFontStack,
} from "@/lib/site-typography-google-fonts";
import { extractSite, enrichFromLinkedStylesheets, type ExtractedSite } from "./extract";
import {
  buildColorThemeFromApplied,
  rankPalette,
} from "./theme-from-palette";
import type {
  WebsiteImportContent,
  WebsiteImportRequestBody,
  WebsiteImportResult,
  WebsiteImportTypography,
} from "./types";

export const runtime = "nodejs";

const MAX_HTML_BYTES = 3_000_000; // 3 MB of HTML is plenty for extraction.

function truncate(value: string | undefined, max: number): string {
  if (!value) return "";
  const trimmed = value.trim();
  return trimmed.length > max ? trimmed.slice(0, max).trim() : trimmed;
}

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent": BROWSER_UA,
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-GB,en;q=0.9",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "sec-ch-ua":
    '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
};

class ImportFetchError extends Error {
  code: "fetch_failed" | "blocked" | "timeout";
  constructor(message: string, code: ImportFetchError["code"] = "fetch_failed") {
    super(message);
    this.code = code;
  }
}

/** Cloudflare / WAF interstitial pages that look like HTML but aren't the site. */
function looksLikeBotChallenge(html: string): boolean {
  const lower = html.slice(0, 8_000).toLowerCase();
  return (
    lower.includes("just a moment") ||
    lower.includes("attention required") ||
    lower.includes("cf-browser-verification") ||
    lower.includes("cf-challenge") ||
    lower.includes("checking your browser") ||
    lower.includes("enable javascript and cookies to continue") ||
    (lower.includes("cloudflare") && lower.includes("challenge-platform"))
  );
}

async function fetchHtmlOnce(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(url, {
      headers: BROWSER_HEADERS,
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
    });

    if (response.status === 403 || response.status === 401 || response.status === 429) {
      throw new ImportFetchError(
        `Website returned status ${response.status}`,
        "blocked",
      );
    }

    if (!response.ok) {
      throw new ImportFetchError(`Website returned status ${response.status}`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (
      contentType &&
      !contentType.includes("html") &&
      !contentType.includes("text/plain") &&
      !contentType.includes("xml")
    ) {
      throw new ImportFetchError("The URL did not return an HTML page.");
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0) {
      throw new ImportFetchError("The website returned an empty page.");
    }
    const html =
      buffer.length > MAX_HTML_BYTES
        ? buffer.subarray(0, MAX_HTML_BYTES).toString("utf-8")
        : buffer.toString("utf-8");

    if (looksLikeBotChallenge(html)) {
      throw new ImportFetchError(
        "Website returned a bot-protection challenge page.",
        "blocked",
      );
    }

    return html;
  } catch (error) {
    if (error instanceof ImportFetchError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new ImportFetchError(
        "The website took too long to respond.",
        "timeout",
      );
    }
    throw new ImportFetchError(
      error instanceof Error ? error.message : "Network error",
    );
  } finally {
    clearTimeout(timeout);
  }
}

/** Try the given URL plus common variants (trailing slash, www). */
async function fetchHtml(url: string): Promise<string> {
  const candidates = new Set<string>([url]);
  try {
    const parsed = new URL(url);
    const withSlash = parsed.toString().endsWith("/")
      ? parsed.toString()
      : `${parsed.toString()}/`;
    const withoutSlash = withSlash.replace(/\/$/, "") || withSlash;
    candidates.add(withSlash);
    candidates.add(withoutSlash);

    if (parsed.hostname.startsWith("www.")) {
      const bare = new URL(parsed.toString());
      bare.hostname = parsed.hostname.slice(4);
      candidates.add(bare.toString());
    } else if (parsed.hostname.split(".").length === 2) {
      const www = new URL(parsed.toString());
      www.hostname = `www.${parsed.hostname}`;
      candidates.add(www.toString());
    }
  } catch {
    // keep original only
  }

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      return await fetchHtmlOnce(candidate);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new ImportFetchError("Could not reach this website.");
}

function importErrorResponse(
  status: number,
  error: string,
  code: NonNullable<import("./types").WebsiteImportErrorBody["code"]>,
  hint: string,
) {
  return NextResponse.json({ error, code, hint }, { status });
}

/**
 * Compact, token-friendly digest of the scraped page for the LLM. We cap the
 * amount of text so we stay well within Groq's context/TPM limits.
 */
function buildContentDigest(site: ExtractedSite): string {
  const parts: string[] = [];
  if (site.title) parts.push(`PAGE TITLE: ${site.title}`);
  if (site.ogSiteName) parts.push(`SITE NAME: ${site.ogSiteName}`);
  if (site.metaDescription)
    parts.push(`META DESCRIPTION: ${site.metaDescription}`);
  if (site.headings.length)
    parts.push(`HEADINGS:\n- ${site.headings.slice(0, 25).join("\n- ")}`);
  if (site.paragraphs.length)
    parts.push(
      `BODY CONTENT:\n${site.paragraphs.slice(0, 18).join("\n\n")}`.slice(
        0,
        6000,
      ),
    );
  if (site.emails.length) parts.push(`EMAILS: ${site.emails.join(", ")}`);
  if (site.phones.length) parts.push(`PHONES: ${site.phones.join(", ")}`);
  return parts.join("\n\n");
}

function buildSystemPrompt(rewrite: boolean): string {
  return `You are a senior website content strategist for an events/venue platform.
You are given scraped content from an existing venue/business website. Convert it into a clean, structured JSON object that pre-fills another site's "Site Essentials" fields.

${
  rewrite
    ? `CRITICAL: REWRITE and PARAPHRASE all marketing copy in your own original words. Preserve the meaning, tone, facts (names, places, amenities, numbers), but DO NOT copy sentences verbatim — produce fresh, original phrasing to avoid plagiarism.`
    : `Keep the wording close to the source, only trimming to fit length limits.`
}

Return ONLY a valid JSON object (no markdown, no commentary) with EXACTLY this shape:
{
  "name": "string (business/brand name, max 50 chars)",
  "banner_heading": "string (hero headline, max ${BANNER_HEADING_MAX_WORDS} words)",
  "banner_sub_heading": "string (hero tagline, max ${BANNER_SUB_HEADING_MAX_CHARS} chars)",
  "about_title": "string (about section title, max 40 chars)",
  "about_description": "string (plain text, no HTML, max 340 chars)",
  "event_title_1": "string (a section title e.g. 'Weddings', max 40 chars)",
  "event_title_2": "string (a second section title e.g. 'Corporate Events', max 40 chars)",
  "event_gallery_title": "string (gallery section title, max 40 chars)",
  "seo": {
    "title": "string (SEO title, max 60 chars)",
    "description": "string (SEO meta description, max 160 chars)",
    "keywords": "string (comma-separated keywords)"
  },
  "copyright": "string (a single short copyright/disclaimer line)",
  "about_page_content": "string (simple HTML: 1-3 <p> paragraphs for an About page)",
  "contact_page_content": "string (simple HTML: contact intro + <p> with contact details)",
  "company_legal_name": "string or empty",
  "company_email": "string or empty",
  "company_phone": "string or empty",
  "company_registered_office": "string (postal address) or empty",
  "faqs": [ { "question": "string", "answer": "string" } ]
}

Rules:
- Fill every field you reasonably can from the source; use "" (or [] for faqs) when there is genuinely no basis.
- about_description must be plain text (no HTML tags).
- about_page_content and contact_page_content may only use simple <p>, <strong>, <ul>, <li> tags.
- Never invent fake contact details; only use emails/phones/address present in the source.
- faqs: include up to 8 only if the source implies them; otherwise return [].`;
}

function sanitizeContent(raw: Partial<WebsiteImportContent>): WebsiteImportContent {
  const seo = raw.seo ?? { title: "", description: "", keywords: "" };
  return {
    name: truncate(raw.name, 50),
    banner_heading: truncateToMaxWords(
      raw.banner_heading ?? "",
      BANNER_HEADING_MAX_WORDS,
    ),
    banner_sub_heading: truncate(raw.banner_sub_heading, BANNER_SUB_HEADING_MAX_CHARS),
    about_title: truncate(raw.about_title, 40),
    about_description: truncate(raw.about_description, 340),
    event_title_1: truncate(raw.event_title_1, 40),
    event_title_2: truncate(raw.event_title_2, 40),
    event_gallery_title: truncate(raw.event_gallery_title, 40),
    seo: {
      title: truncate(seo.title, 60),
      description: truncate(seo.description, 160),
      keywords: truncate(seo.keywords, 255),
    },
    copyright: truncate(raw.copyright, 600),
    about_page_content: truncate(raw.about_page_content, 4000),
    contact_page_content: truncate(raw.contact_page_content, 4000),
    company_legal_name: truncate(raw.company_legal_name, 120),
    company_email: truncate(raw.company_email, 120),
    company_phone: truncate(raw.company_phone, 40),
    company_registered_office: truncate(raw.company_registered_office, 255),
    faqs: Array.isArray(raw.faqs)
      ? raw.faqs
          .slice(0, 8)
          .map((f) => ({
            question: truncate(f?.question, 160),
            answer: truncate(f?.answer, 500),
          }))
          .filter((f) => f.question && f.answer)
      : [],
  };
}

/** Deterministic fallback content when the AI call fails but scraping worked. */
function fallbackContent(site: ExtractedSite): WebsiteImportContent {
  return sanitizeContent({
    name: site.ogSiteName ?? site.title,
    banner_heading: site.headings[0] ?? site.title,
    banner_sub_heading: site.headings[1] ?? site.metaDescription,
    about_title: "About Us",
    about_description: site.paragraphs[0] ?? site.metaDescription,
    event_title_1: site.headings[2],
    event_title_2: site.headings[3],
    event_gallery_title: "Gallery",
    seo: {
      title: site.title ?? "",
      description: site.metaDescription ?? "",
      keywords: site.metaKeywords ?? "",
    },
    copyright: site.ogSiteName ? `© ${new Date().getFullYear()} ${site.ogSiteName}` : "",
    about_page_content: site.paragraphs
      .slice(0, 3)
      .map((p) => `<p>${p}</p>`)
      .join(""),
    contact_page_content: "",
    company_email: site.emails[0],
    company_phone: site.phones[0],
    faqs: [],
  });
}

const SERIF_HINT_RE =
  /(playfair|garamond|times|georgia|baskerville|cormorant|cinzel|lora|merriweather|fraunces|crimson|serif)/i;

/** Resolve a scraped family name to a CSS stack, preferring exact preset matches. */
function toFontStack(name: string | undefined): {
  stack?: string;
  isPreset: boolean;
} {
  if (!name) return { isPreset: false };
  const preset = SITE_ESSENTIALS_GOOGLE_FONT_NAMES.find(
    (n) => n.toLowerCase() === name.toLowerCase(),
  );
  if (preset) return { stack: siteEssentialsGoogleFontStack(preset), isPreset: true };
  const generic = SERIF_HINT_RE.test(name) ? "serif" : "sans-serif";
  return { stack: `'${name}', ${generic}`, isPreset: false };
}

/** Google Fonts CSS2 URL for families that aren't in our preset list. */
function googleFontsStylesheetFor(
  names: (string | undefined)[],
): string | undefined {
  const unique = Array.from(
    new Set(names.filter((n): n is string => Boolean(n))),
  );
  if (unique.length === 0) return undefined;
  const params = unique
    .map((name) => `family=${encodeURIComponent(name)}:wght@400;500;600;700`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

/**
 * Build the typography payload. Preset families load via the theme Google Fonts
 * link; non-presets get a generated Google Fonts URL (plus any source sheets).
 */
function buildTypography(fonts: ExtractedSite["fonts"]): WebsiteImportTypography {
  const heading = toFontStack(fonts.heading);
  const body = toFontStack(fonts.body);
  const nonPresetNames = [
    fonts.heading && !heading.isPreset ? fonts.heading : undefined,
    fonts.body && !body.isPreset ? fonts.body : undefined,
  ];

  const stylesheetUrls = nonPresetNames.some(Boolean)
    ? Array.from(
        new Set(
          [
            googleFontsStylesheetFor(nonPresetNames),
            ...fonts.stylesheetUrls,
          ].filter((u): u is string => Boolean(u)),
        ),
      )
        .filter((u) => u.startsWith("https://") && u.length <= 2048)
        .slice(0, 5)
    : [];

  return {
    heading: heading.stack,
    body: body.stack,
    headingName: fonts.heading,
    bodyName: fonts.body,
    stylesheetUrls,
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as WebsiteImportRequestBody;
    const rawUrl = body?.url?.trim();
    const rewrite = body?.rewrite !== false;

    if (!rawUrl) {
      return importErrorResponse(
        400,
        "Please enter a website address.",
        "invalid_url",
        "Include the full URL, for example https://yourvenue.com",
      );
    }

    // Reuse the shared SSRF guard (http/https only, blocks private/local hosts).
    let safeUrl: URL;
    try {
      safeUrl = assertSafeLogoUrl(rawUrl);
    } catch {
      return importErrorResponse(
        400,
        "That does not look like a valid public website address.",
        "invalid_url",
        "Use a public http or https URL. Local or private network addresses are not supported.",
      );
    }

    let html: string;
    try {
      html = await fetchHtml(safeUrl.toString());
    } catch (error) {
      if (error instanceof ImportFetchError) {
        if (error.code === "blocked") {
          return importErrorResponse(
            400,
            "This website blocked our request.",
            "blocked",
            "Many venues use Cloudflare bot protection that blocks cloud servers (including Vercel). The site may open fine in your browser but still refuse our import. Enter content manually, or try again later.",
          );
        }
        if (error.code === "timeout") {
          return importErrorResponse(
            408,
            "This website took too long to respond.",
            "timeout",
            "Please try again in a moment, or use a simpler page URL such as the homepage.",
          );
        }
      }
      return importErrorResponse(
        400,
        "We could not reach this website.",
        "fetch_failed",
        "Check the address is correct and publicly available, then try again.",
      );
    }

    const site = extractSite(html, safeUrl.toString());
    const enriched = await enrichFromLinkedStylesheets(
      html,
      safeUrl.toString(),
      { fonts: site.fonts, colors: site.colors },
    );
    site.fonts = enriched.fonts;
    site.colors = enriched.colors;
    site.appliedColors = enriched.appliedColors;

    const hasContent =
      Boolean(site.title) ||
      Boolean(site.metaDescription) ||
      Boolean(site.ogSiteName) ||
      site.headings.length > 0 ||
      site.paragraphs.length > 0 ||
      Boolean(site.logo) ||
      Boolean(site.ogImage) ||
      site.images.length > 0;

    if (!hasContent) {
      return importErrorResponse(
        422,
        "We could not find usable content on this page.",
        "no_content",
        "The site may load everything with JavaScript. Try the homepage, or add your content manually in Site Essentials.",
      );
    }

    let content: WebsiteImportContent;

    if (!env.GROQ_API_KEY) {
      // No AI configured — still useful: return scraped/deterministic mapping.
      content = fallbackContent(site);
    } else {
      try {
        const result: FallbackResult = await tryModelsWithFallback(
          env.GROQ_API_KEY,
          {
            messages: [
              { role: "system", content: buildSystemPrompt(rewrite) },
              { role: "user", content: buildContentDigest(site) },
            ],
            temperature: rewrite ? 0.6 : 0.3,
            max_tokens: 2200,
          },
        );

        const aiText = result.success
          ? result.data?.choices?.[0]?.message?.content?.trim()
          : undefined;
        const jsonMatch = aiText?.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
          try {
            content = sanitizeContent(
              JSON.parse(jsonMatch[0]) as Partial<WebsiteImportContent>,
            );
          } catch {
            content = fallbackContent(site);
          }
        } else {
          content = fallbackContent(site);
        }
      } catch {
        // AI failed — still return deterministic scraped content.
        content = fallbackContent(site);
      }
    }

    // Prefer real scraped contact details over anything the model produced.
    if (!content.company_email && site.emails[0]) {
      content.company_email = site.emails[0];
    }
    if (!content.company_phone && site.phones[0]) {
      content.company_phone = site.phones[0];
    }

    // Cover: prefer og:image, then first non-logo gallery candidate.
    const coverCandidates = [site.ogImage, ...site.images].filter(
      (url): url is string => Boolean(url) && url !== site.logo,
    );

    const cover = coverCandidates[0];
    const gallery = site.images
      .filter((img) => img !== site.logo)
      .slice(0, 20);

    const warnings: string[] = [];
    if (!cover && gallery.length === 0) {
      warnings.push(
        "No usable cover images were found. You can upload a banner manually after applying.",
      );
    }
    if (!site.logo) {
      warnings.push(
        "No logo was detected. You can upload one manually after applying.",
      );
    }

    const rankedColors = rankPalette(site.colors);
    const palette = rankedColors.slice(0, 24).map((c) => c.hex);
    const colorTheme =
      buildColorThemeFromApplied(
        site.appliedColors ?? { buttonBackgrounds: [], linkColors: [] },
        site.colors,
      ) ?? undefined;

    const response: WebsiteImportResult = {
      sourceUrl: safeUrl.toString(),
      content,
      images: {
        logo: site.logo,
        cover,
        favicon: site.favicon,
        gallery,
      },
      typography: buildTypography(site.fonts),
      socialLinks: site.socialLinks,
      colors: palette,
      colorTheme,
      contact: { emails: site.emails, phones: site.phones },
      rewritten: rewrite && Boolean(env.GROQ_API_KEY),
      warnings: warnings.length ? warnings : undefined,
    };

    return NextResponse.json(response);
  } catch {
    return importErrorResponse(
      500,
      "Something went wrong while analysing this website.",
      "server_error",
      "Please try again in a moment. If the problem continues, enter your content manually.",
    );
  }
}
