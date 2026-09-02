/**
 * Dependency-free HTML content extraction for the website importer.
 *
 * We intentionally avoid adding a DOM/parser dependency (cheerio, jsdom) and use
 * targeted regexes — this mirrors the existing `ai/color-theme` route and keeps
 * the serverless bundle small. It handles the common case of server-rendered
 * marketing sites (WordPress, static site generators, etc.), including hero
 * images declared as CSS `background-image`, lazy-load data attributes and
 * `srcset` (not just `<img src>`).
 */

import {
  cssColorToHex,
  extractAppliedColorsFromCss,
  mergeAppliedColors,
  type AppliedSiteColors,
} from "./theme-from-palette";

const MAX_HEADINGS = 40;
const MAX_PARAGRAPHS = 40;
const MAX_IMAGES = 30;

export interface ExtractedSite {
  title?: string;
  metaDescription?: string;
  metaKeywords?: string;
  ogImage?: string;
  ogSiteName?: string;
  favicon?: string;
  headings: string[];
  paragraphs: string[];
  images: string[];
  logo?: string;
  socialLinks: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
  };
  emails: string[];
  phones: string[];
  colors: string[];
  /**
   * Colors taken from applied theme CSS (body/header/footer/buttons).
   * Populated after `enrichFromLinkedStylesheets`.
   */
  appliedColors?: AppliedSiteColors;
  fonts: {
    /** Primary font family name used for headings (e.g. "Playfair Display"). */
    heading?: string;
    /** Primary font family name used for body text (e.g. "Lato"). */
    body?: string;
    /** Google Fonts / font-CDN stylesheet URLs discovered on the page. */
    stylesheetUrls: string[];
    /** All font family names discovered (for reference/debug). */
    families: string[];
  };
}

const GENERIC_FONT_FAMILIES = new Set([
  "sans-serif",
  "serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-sans-serif",
  "ui-serif",
  "ui-monospace",
  "inherit",
  "initial",
  "unset",
]);

const FONT_STYLESHEET_HOSTS = [
  "fonts.googleapis.com",
  "fonts.cdnfonts.com",
  "use.typekit.net",
  "fonts.gstatic.com",
  "cdnfonts.com",
];

/** Cap raw hex matches kept for frequency ranking (theme builder). */
const MAX_COLOR_MATCHES = 400;
/** Max same-origin theme CSS files to fetch when HTML has no inline fonts. */
const MAX_LINKED_CSS_FETCHES = 5;
const MAX_LINKED_CSS_BYTES = 250_000;
const LINKED_CSS_TIMEOUT_MS = 8_000;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  copy: "©",
  reg: "®",
  trade: "™",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  eacute: "é",
  egrave: "è",
  agrave: "à",
  pound: "£",
  euro: "€",
};

function decodeEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-zA-Z]+);/g, (match, name) => NAMED_ENTITIES[name] ?? match);
}

function stripTags(html: string): string {
  return decodeEntities(
    html
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

/** Removes <script> and <style> blocks so their contents don't pollute text. */
function removeScriptsAndStyles(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ");
}

function matchAttr(tag: string, attr: string): string | undefined {
  const re = new RegExp(`${attr}\\s*=\\s*["']([^"']*)["']`, "i");
  return tag.match(re)?.[1]?.trim();
}

function toAbsoluteUrl(src: string, base: string): string | undefined {
  try {
    return new URL(src.trim(), base).toString();
  } catch {
    return undefined;
  }
}

/**
 * Skip data URIs, fonts, sprites, icons and decorative assets that should never
 * be used as a hero/cover/gallery image.
 *
 * Important: `.woff2` is 5 chars, so a naive "extensionless = OK" check used to
 * treat font files as images. We require a real image signal instead.
 */
function isUsableImage(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  // SVG paint/clip fragment ids resolve to `https://host/#paint0_...` — not images.
  if (parsed.hash && (!parsed.pathname || parsed.pathname === "/")) {
    return false;
  }

  const lower = url.toLowerCase();
  const path = parsed.pathname.toLowerCase();

  if (lower.startsWith("data:")) return false;
  if (/\.(svg|woff2?|ttf|otf|eot|css|js|mjs|map|json)(\?|#|$)/i.test(path)) {
    return false;
  }
  if (
    /(sprite|pixel|spacer|blank|1x1|tracking|line-img|divider|separator|placeholder|loader|loading|bullet|arrow|icon-|-icon|favicon|pattern|cf-fonts|\/fonts\/|typekit|fontawesome|glyph)/.test(
      lower,
    )
  ) {
    return false;
  }

  const hasKnownExt = /\.(jpe?g|png|webp|gif|avif)(\?|#|$)/i.test(path);
  if (hasKnownExt) return true;

  // Extensionless CDN / media paths (Cloudinary, ImageKit, WP resized URLs, etc.)
  const looksLikeMediaPath =
    /(\/uploads\/|\/media\/|\/images\/|\/img\/|\/photos?\/|\/gallery\/|\/wp-content\/|\/cdn-cgi\/image\/|cloudinary|imagekit|imgix)/.test(
      lower,
    );
  return looksLikeMediaPath;
}

function extractTagTexts(html: string, tag: string, limit: number): string[] {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "gi");
  const out: string[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null && out.length < limit) {
    const text = stripTags(m[1]);
    if (text.length >= 2 && !seen.has(text.toLowerCase())) {
      seen.add(text.toLowerCase());
      out.push(text);
    }
  }
  return out;
}

/** Collect `<img>` sources incl. common lazy-load attributes. */
function extractImgSources(html: string, base: string): string[] {
  const out: string[] = [];
  const imgRe = /<img\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(html)) !== null) {
    const tag = m[0];
    const src =
      matchAttr(tag, "src") ??
      matchAttr(tag, "data-src") ??
      matchAttr(tag, "data-lazy-src") ??
      matchAttr(tag, "data-original");
    if (src) out.push(src);
    // Prefer the largest srcset candidate when present.
    const srcset = matchAttr(tag, "srcset") ?? matchAttr(tag, "data-srcset");
    if (srcset) {
      const candidates = srcset
        .split(",")
        .map((s) => s.trim().split(/\s+/)[0])
        .filter(Boolean);
      if (candidates.length) out.push(candidates[candidates.length - 1]);
    }
  }
  return out
    .map((s) => toAbsoluteUrl(s, base))
    .filter((u): u is string => Boolean(u));
}

/**
 * Collect background/hero images from CSS `url(...)` (inline styles + <style>
 * blocks), lazy-load data attributes and standalone srcset/source tags — this
 * is where most WordPress/slider themes put their banners.
 */
function extractBackgroundSources(html: string, base: string): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;

  // Drop @font-face blocks so we never pull .woff/.ttf from CSS url().
  const cssWithoutFonts = html.replace(/@font-face\s*\{[\s\S]*?\}/gi, " ");

  const urlRe = /url\(\s*(['"]?)([^)'"]+)\1\s*\)/gi;
  while ((m = urlRe.exec(cssWithoutFonts)) !== null) out.push(m[2]);

  const dataRe =
    /data-(?:bg|background|background-image|bg-url|lazy|lazyload|thumb|large_image|full|hero|image)\s*=\s*["']([^"']+)["']/gi;
  while ((m = dataRe.exec(html)) !== null) out.push(m[1]);

  const sourceRe = /<source\b[^>]*srcset\s*=\s*["']([^"']+)["'][^>]*>/gi;
  while ((m = sourceRe.exec(html)) !== null) {
    const candidates = m[1]
      .split(",")
      .map((s) => s.trim().split(/\s+/)[0])
      .filter(Boolean);
    if (candidates.length) out.push(candidates[candidates.length - 1]);
  }

  // Preloaded hero images: <link rel="preload" as="image" href="...">
  const preloadRe =
    /<link\b[^>]*rel\s*=\s*["']preload["'][^>]*as\s*=\s*["']image["'][^>]*>/gi;
  while ((m = preloadRe.exec(html)) !== null) {
    const href = matchAttr(m[0], "href") ?? matchAttr(m[0], "imagesrcset");
    if (href) out.push(href.split(",")[0].trim().split(/\s+/)[0]);
  }

  return out
    .map((s) => toAbsoluteUrl(s, base))
    .filter((u): u is string => Boolean(u));
}

function extractSocialLinks(html: string): ExtractedSite["socialLinks"] {
  const links: ExtractedSite["socialLinks"] = {};
  const anchorRe = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = anchorRe.exec(html)) !== null) {
    const href = m[1];
    const lower = href.toLowerCase();
    if (!/^https?:\/\//.test(lower)) continue;
    if (!links.facebook && lower.includes("facebook.com")) links.facebook = href;
    else if (
      !links.twitter &&
      (lower.includes("twitter.com") ||
        lower.includes("//x.com") ||
        lower.includes(".x.com"))
    )
      links.twitter = href;
    else if (!links.instagram && lower.includes("instagram.com"))
      links.instagram = href;
    else if (!links.linkedin && lower.includes("linkedin.com"))
      links.linkedin = href;
    else if (
      !links.youtube &&
      (lower.includes("youtube.com") || lower.includes("youtu.be"))
    )
      links.youtube = href;
  }
  return links;
}

function extractContacts(
  cleanHtml: string,
  text: string,
): { emails: string[]; phones: string[] } {
  const emails = new Set<string>();
  const phones = new Set<string>();

  for (const m of cleanHtml.matchAll(/mailto:([^"'?>\s]+)/gi)) emails.add(m[1]);
  for (const m of text.matchAll(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  ))
    emails.add(m[0]);

  // tel: links are trustworthy.
  for (const m of cleanHtml.matchAll(/tel:([+0-9()\-\s]{6,})/gi))
    phones.add(m[1].trim());

  // Visible-text phones: must contain a separator or leading "+" so we don't
  // pick up raw digit blobs (IDs, timestamps) that survive in page text.
  for (const m of text.matchAll(/[+(]?\d[\d\s().-]{7,}\d/g)) {
    const raw = m[0].trim();
    const digits = raw.replace(/\D/g, "");
    if (digits.length < 9 || digits.length > 13) continue;
    if (!/[+()\s-]/.test(raw)) continue;
    phones.add(raw);
  }

  return {
    emails: Array.from(emails).slice(0, 10),
    phones: Array.from(phones).slice(0, 10),
  };
}

function pickLogo(html: string, base: string, ogImage?: string): string | undefined {
  const imgRe = /<img\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(html)) !== null) {
    const tag = m[0];
    const haystack = `${matchAttr(tag, "class") ?? ""} ${
      matchAttr(tag, "id") ?? ""
    } ${matchAttr(tag, "alt") ?? ""} ${matchAttr(tag, "src") ?? ""}`.toLowerCase();
    if (haystack.includes("logo")) {
      const src =
        matchAttr(tag, "src") ??
        matchAttr(tag, "data-src") ??
        matchAttr(tag, "data-lazy-src");
      if (src) {
        const abs = toAbsoluteUrl(src, base);
        if (abs) return abs;
      }
    }
  }
  return ogImage;
}

/** First real font family from a CSS `font-family` value (skips generics). */
function primaryFontFamily(value: string): string | undefined {
  const first = value
    .split(",")[0]
    ?.trim()
    .replace(/^["']|["']$/g, "")
    .trim();
  if (!first) return undefined;
  if (GENERIC_FONT_FAMILIES.has(first.toLowerCase())) return undefined;
  if (/^var\(|^\$/.test(first)) return undefined;
  return first;
}

/** Parse family names from a Google Fonts CSS URL (both v1 `css` and v2 `css2`). */
function parseGoogleFontFamilies(href: string): string[] {
  const families: string[] = [];
  try {
    const u = new URL(decodeEntities(href));
    for (const param of u.searchParams.getAll("family")) {
      // v1 packs multiple families with "|"; each may carry ":weights".
      for (const segment of param.split("|")) {
        const name = segment.split(":")[0].trim();
        if (name && !GENERIC_FONT_FAMILIES.has(name.toLowerCase())) {
          families.push(name);
        }
      }
    }
  } catch {
    /* ignore malformed URL */
  }
  return families;
}

/** Collect font stylesheet URLs (Google Fonts, CDNFonts, Typekit) from the page. */
function collectFontStylesheetUrls(html: string, base: string): string[] {
  const urls = new Set<string>();
  const linkRe = /<link\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(html)) !== null) {
    const href = decodeEntities(m[1]);
    if (FONT_STYLESHEET_HOSTS.some((h) => href.includes(h))) {
      const abs = toAbsoluteUrl(href, base);
      if (abs && abs.startsWith("https://")) urls.add(abs);
    }
  }
  // @import url(...) inside <style> blocks
  const importRe = /@import\s+url\(\s*(['"]?)([^)'"]+)\1\s*\)/gi;
  while ((m = importRe.exec(html)) !== null) {
    const href = decodeEntities(m[2]);
    if (FONT_STYLESHEET_HOSTS.some((h) => href.includes(h))) {
      const abs = toAbsoluteUrl(href, base);
      if (abs && abs.startsWith("https://")) urls.add(abs);
    }
  }
  return [...urls];
}

/** Map heading/body font families from CSS text (inline `<style>` or linked sheets). */
function extractFontsFromCssText(css: string): {
  heading?: string;
  body?: string;
  faceFamilies: string[];
} {
  if (!css) return { faceFamilies: [] };

  const faceFamilies = extractFontFaceFamilies(css);

  const familyFromBlock = (block: string): string | undefined => {
    const ff = block.match(/font-family\s*:\s*([^;}!]+)/i)?.[1];
    return ff ? primaryFontFamily(ff) : undefined;
  };

  // Direct patterns survive minification and @media wrapping better than a naive
  // brace walker (which breaks on nested `{` inside media queries).
  let body: string | undefined;
  const bodyRe =
    /(^|[{},;\s])(html|body)\b[^{]*\{([^{}]{0,500})\}/gi;
  let m: RegExpExecArray | null;
  while ((m = bodyRe.exec(css)) !== null) {
    const family = familyFromBlock(m[3]);
    if (family) {
      body = family;
      break;
    }
  }

  let heading: string | undefined;
  let headingRank = 0;
  const headingRe =
    /(^|[{},;\s])(h[1-6]|heading|entry-title|post-title|page-title|site-title)\b[^{]*\{([^{}]{0,500})\}/gi;
  while ((m = headingRe.exec(css)) !== null) {
    const sel = m[2].toLowerCase();
    const family = familyFromBlock(m[3]);
    if (!family) continue;
    let rank = 1;
    if (sel === "h1") rank = 4;
    else if (sel === "h2") rank = 3;
    else if (
      sel === "heading" ||
      sel === "entry-title" ||
      sel === "post-title" ||
      sel === "page-title" ||
      sel === "site-title"
    ) {
      rank = 2;
    }
    if (rank >= headingRank) {
      heading = family;
      headingRank = rank;
    }
  }

  return { heading, body, faceFamilies };
}

/**
 * Families declared via `@font-face` (Cloudflare Fonts, self-hosted, etc.).
 * Many modern sites never put `font-family` on `body` in inline CSS — only in
 * linked stylesheets — so this is often the only signal we get from HTML.
 */
function extractFontFaceFamilies(cssOrHtml: string): string[] {
  const families: string[] = [];
  const faceRe = /@font-face\s*\{([\s\S]*?)\}/gi;
  let m: RegExpExecArray | null;
  while ((m = faceRe.exec(cssOrHtml)) !== null) {
    const ff = m[1].match(/font-family\s*:\s*([^;}!]+)/i)?.[1];
    if (!ff) continue;
    const family = primaryFontFamily(ff);
    if (family) families.push(family);
  }
  return Array.from(new Set(families));
}

/**
 * Score linked CSS URLs so we fetch theme styles (where brand fonts live) and
 * skip framework/plugin sheets (Bootstrap, Font Awesome, contact forms, etc.).
 */
function scoreThemeStylesheetUrl(url: string): number {
  const lower = url.toLowerCase();
  if (
    /font-awesome|fontawesome|bootstrap|mdbootstrap|mdb\.|slick|animsition|contact-form|wpcf7|pum-site|wplogoshowcase|print\.css|googleapis\.com|gstatic\.com|typekit\.net|cdnfonts\.com|instagram-feed|simple-banner|carousel-slider|js_composer\.min/i.test(
      lower,
    )
  ) {
    return -100;
  }
  // Skip most plugins, but keep uploaded Visual Composer custom.css (often brand).
  if (/\/plugins\//.test(lower) && !/\/uploads\//.test(lower)) return -40;

  let score = 0;
  if (/\/themes\//.test(lower)) score += 50;
  if (/child/.test(lower)) score += 25;
  if (/[/.-]style\.css(\?|$)/.test(lower)) score += 35;
  if (/\/uploads\/.*custom\.css/i.test(lower)) score += 40;
  if (/assets\/css|\/css\//.test(lower)) score += 10;
  if (/custom|main|theme|brand/.test(lower)) score += 8;
  return score;
}

/** Same-origin CSS `<link>` candidates worth fetching for font discovery. */
function collectThemeStylesheetUrls(html: string, base: string): string[] {
  let baseHost: string;
  try {
    baseHost = new URL(base).hostname.toLowerCase();
  } catch {
    return [];
  }

  const scored: Array<{ url: string; score: number }> = [];
  const seen = new Set<string>();
  const linkRe = /<link\b[^>]*>/gi;
  let tagMatch: RegExpExecArray | null;
  while ((tagMatch = linkRe.exec(html)) !== null) {
    const tag = tagMatch[0];
    const href = matchAttr(tag, "href");
    if (!href) continue;
    const rel = (matchAttr(tag, "rel") || "").toLowerCase();
    const asAttr = (matchAttr(tag, "as") || "").toLowerCase();
    const isStylesheet =
      rel.includes("stylesheet") ||
      (rel.includes("preload") && asAttr === "style") ||
      /\.css(\?|#|$)/i.test(href);
    if (!isStylesheet) continue;

    const abs = toAbsoluteUrl(decodeEntities(href), base);
    if (!abs) continue;
    // Protocol-relative //cdn… and http → prefer https for fetch.
    const httpsUrl = abs.startsWith("http://")
      ? `https://${abs.slice("http://".length)}`
      : abs;
    if (!httpsUrl.startsWith("https://")) continue;
    let host: string;
    try {
      host = new URL(httpsUrl).hostname.toLowerCase();
    } catch {
      continue;
    }
    // Only same-site CSS (SSRF-safe; brand fonts/colors are almost always local).
    if (host !== baseHost && !host.endsWith(`.${baseHost}`)) continue;
    if (seen.has(httpsUrl)) continue;
    seen.add(httpsUrl);

    const score = scoreThemeStylesheetUrl(httpsUrl);
    if (score <= 0) continue;
    scored.push({ url: httpsUrl, score });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_LINKED_CSS_FETCHES)
    .map((s) => s.url);
}

async function fetchCssText(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LINKED_CSS_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; EventWizzImportBot/1.0; +https://eventwizz.com)",
        Accept: "text/css,*/*;q=0.1",
      },
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0) return null;
    const slice =
      buffer.length > MAX_LINKED_CSS_BYTES
        ? buffer.subarray(0, MAX_LINKED_CSS_BYTES)
        : buffer;
    return slice.toString("utf-8");
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetch same-origin theme CSS to fill fonts + real applied brand colors.
 * Always runs (even when fonts were found inline) so color theme uses child
 * `style.css` button/link colors instead of WordPress preset noise.
 */
export async function enrichFromLinkedStylesheets(
  html: string,
  base: string,
  site: Pick<ExtractedSite, "fonts" | "colors">,
): Promise<{
  fonts: ExtractedSite["fonts"];
  colors: string[];
  appliedColors: AppliedSiteColors;
}> {
  const urls = collectThemeStylesheetUrls(html, base);
  const inlineStyles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((m) => m[1])
    .join("\n");

  const sheets: string[] = [];
  if (inlineStyles.trim()) sheets.push(inlineStyles);
  if (urls.length > 0) {
    const fetched = await Promise.all(urls.map((u) => fetchCssText(u)));
    for (const css of fetched) {
      if (css) sheets.push(css);
    }
  }

  let heading = site.fonts.heading;
  let body = site.fonts.body;
  const faceFamilies = new Set(site.fonts.families);
  const themeColors: string[] = [];
  const appliedParts: AppliedSiteColors[] = [];

  const metaTheme = html.match(
    /<meta[^>]+name=["']theme-color["'][^>]*content=["']([^"']+)["']/i,
  )?.[1];
  const metaHex = metaTheme ? cssColorToHex(metaTheme) : null;

  for (const css of sheets) {
    const parsedFonts = extractFontsFromCssText(css);
    for (const f of parsedFonts.faceFamilies) faceFamilies.add(f);
    if (!heading && parsedFonts.heading) heading = parsedFonts.heading;
    if (!body && parsedFonts.body) body = parsedFonts.body;
    if (!heading && parsedFonts.body) heading = parsedFonts.body;

    appliedParts.push(extractAppliedColorsFromCss(css));

    const hexes = css.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/g) ?? [];
    for (const raw of hexes) {
      const hex =
        raw.length === 4
          ? `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`.toUpperCase()
          : raw.toUpperCase();
      if (!isWordPressNoiseColor(hex)) themeColors.push(hex);
      if (themeColors.length >= MAX_COLOR_MATCHES) break;
    }
  }

  const faces = Array.from(faceFamilies);
  heading = heading ?? faces[0] ?? site.fonts.heading;
  body = body ?? faces[1] ?? faces[0] ?? site.fonts.body;

  const appliedColors = mergeAppliedColors(appliedParts);
  if (metaHex && !appliedColors.primary) {
    appliedColors.primary = metaHex;
    appliedColors.buttonBackgrounds.unshift(metaHex);
  }

  const colors = [...themeColors, ...site.colors].slice(0, MAX_COLOR_MATCHES);

  return {
    fonts: {
      heading,
      body,
      stylesheetUrls: site.fonts.stylesheetUrls,
      families: Array.from(
        new Set(
          [heading, body, ...faces, ...site.fonts.families].filter(
            (f): f is string => Boolean(f),
          ),
        ),
      ),
    },
    colors,
    appliedColors,
  };
}

/** @deprecated Use enrichFromLinkedStylesheets */
export async function enrichFontsFromLinkedStylesheets(
  html: string,
  base: string,
  fonts: ExtractedSite["fonts"],
): Promise<ExtractedSite["fonts"]> {
  const enriched = await enrichFromLinkedStylesheets(html, base, {
    fonts,
    colors: [],
  });
  return enriched.fonts;
}

/**
 * Collect hex colors with duplicates preserved so frequency ranking can detect
 * real brand surfaces (e.g. #112337 × 50) vs one-off editor swatches.
 *
 * WordPress injects a large default Gutenberg palette + admin theme blues into
 * every page — those must be stripped or gold/cream brands become dark purple.
 */
function extractColorMatches(html: string): string[] {
  // Drop WP global-styles / block / admin CSS blobs before scanning.
  const cleaned = html
    .replace(/--wp--preset--[\s\S]*?(?=<\/style>|$)/gi, " ")
    .replace(/--wp-admin-[^;:]+:[^;]+;/gi, " ")
    .replace(/--wp-block-synced-color[^;]*;?/gi, " ")
    .replace(/--wp-editor-[^;:]+:[^;]+;/gi, " ")
    .replace(/has-(?:vivid|luminous|pale|purple-crush|hazy|subdued|atomic|nightshade|midnight)[^{]*\{[^}]*\}/gi, " ");

  const out: string[] = [];
  const pushHex = (hex: string) => {
    if (out.length >= MAX_COLOR_MATCHES) return;
    if (isWordPressNoiseColor(hex)) return;
    out.push(hex);
  };

  const hexMatches = cleaned.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/g) ?? [];
  for (const raw of hexMatches) {
    const hex =
      raw.length === 4
        ? `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`.toUpperCase()
        : raw.toUpperCase();
    pushHex(hex);
    if (out.length >= MAX_COLOR_MATCHES) break;
  }

  // Brand colors often appear as rgb()/rgba() (e.g. carousel nav gold).
  if (out.length < MAX_COLOR_MATCHES) {
    const rgbRe =
      /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*[\d.]+)?\s*\)/gi;
    let m: RegExpExecArray | null;
    while ((m = rgbRe.exec(cleaned)) !== null) {
      const r = Number(m[1]);
      const g = Number(m[2]);
      const b = Number(m[3]);
      if ([r, g, b].some((v) => v > 255)) continue;
      const hex = `#${[r, g, b]
        .map((v) => v.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase()}`;
      pushHex(hex);
      if (out.length >= MAX_COLOR_MATCHES) break;
    }
  }

  return out;
}

/** Gutenberg / WP admin swatches that pollute every WordPress site HTML. */
function isWordPressNoiseColor(hex: string): boolean {
  return WORDPRESS_NOISE_HEX.has(hex.toUpperCase());
}

const WORDPRESS_NOISE_HEX = new Set([
  // Classic Gutenberg palette
  "#ABB8C3",
  "#F78DA7",
  "#CF2E2E",
  "#FF6900",
  "#FCB900",
  "#7BDCB5",
  "#00D084",
  "#8ED1FC",
  "#0693E3",
  "#9B51E0",
  // WP admin / synced block
  "#7A00DF",
  "#007CBA",
  "#006BA1",
  "#005A87",
  "#32373C",
  // Common gradient stops from block-library
  "#34E2E4",
  "#4721FB",
  "#AB1DFE",
  "#330968",
  "#020381",
  "#2874FC",
  "#FDD79A",
  "#FAACA8",
  "#DAD0EC",
  "#004A59",
  "#31CDCF",
  // Default "blue" editor swatches that dominate some themes' CSS dumps
  "#003388",
  "#003399",
  "#001AB3",
  "#204CE5",
  "#527EFF",
]);

function extractFonts(html: string, base: string): ExtractedSite["fonts"] {
  const stylesheetUrls = collectFontStylesheetUrls(html, base);
  const googleFamilies = Array.from(
    new Set(
      stylesheetUrls
        .filter((u) => u.includes("fonts.googleapis.com"))
        .flatMap(parseGoogleFontFamilies),
    ),
  );
  const inlineStyles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((m) => m[1])
    .join("\n");
  const css = extractFontsFromCssText(inlineStyles);
  const faceFamilies = css.faceFamilies;

  // Prefer applied CSS rules, then @font-face declarations, then Google CSS URLs.
  const heading = css.heading ?? faceFamilies[0] ?? googleFamilies[0];
  const body =
    css.body ??
    faceFamilies[1] ??
    faceFamilies[0] ??
    googleFamilies[1] ??
    googleFamilies[0];

  return {
    heading,
    body,
    stylesheetUrls,
    families: Array.from(
      new Set(
        [heading, body, ...faceFamilies, ...googleFamilies].filter(
          (f): f is string => Boolean(f),
        ),
      ),
    ),
  };
}

export function extractSite(html: string, baseUrl: string): ExtractedSite {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];

  const metaContent = (nameOrProp: string): string | undefined => {
    const re = new RegExp(
      `<meta\\b[^>]*(?:name|property)\\s*=\\s*["']${nameOrProp}["'][^>]*>`,
      "i",
    );
    const tag = html.match(re)?.[0];
    return tag ? matchAttr(tag, "content") : undefined;
  };

  const faviconTag = html.match(
    /<link\b[^>]*rel\s*=\s*["'][^"']*icon[^"']*["'][^>]*>/i,
  )?.[0];
  const faviconHref = faviconTag ? matchAttr(faviconTag, "href") : undefined;

  const cleanHtml = removeScriptsAndStyles(html);

  const headings = [
    ...extractTagTexts(cleanHtml, "h1", 6),
    ...extractTagTexts(cleanHtml, "h2", MAX_HEADINGS),
    ...extractTagTexts(cleanHtml, "h3", MAX_HEADINGS),
  ].slice(0, MAX_HEADINGS);

  const paragraphs = extractTagTexts(cleanHtml, "p", MAX_PARAGRAPHS).filter(
    (p) => p.length >= 25,
  );

  const ogImageRaw = metaContent("og:image");
  const ogImage = ogImageRaw ? toAbsoluteUrl(ogImageRaw, baseUrl) : undefined;
  const logo = pickLogo(html, baseUrl, undefined);

  // Order matters for cover selection: og:image and CSS/background heroes are
  // the strongest banner candidates, then <img> content, with the logo last.
  const ordered = [
    ...(ogImage ? [ogImage] : []),
    ...extractBackgroundSources(html, baseUrl),
    ...extractImgSources(html, baseUrl),
  ];

  const images: string[] = [];
  const seenImages = new Set<string>();
  for (const url of ordered) {
    if (seenImages.has(url) || !isUsableImage(url)) continue;
    seenImages.add(url);
    images.push(url);
    if (images.length >= MAX_IMAGES) break;
  }

  const bodyText = stripTags(cleanHtml);

  // Keep duplicates for frequency — theme builder ranks brand colors correctly.
  const colors = extractColorMatches(html);

  return {
    title: title ? stripTags(title) : undefined,
    metaDescription: metaContent("description"),
    metaKeywords: metaContent("keywords"),
    ogImage,
    ogSiteName: metaContent("og:site_name"),
    favicon: faviconHref ? toAbsoluteUrl(faviconHref, baseUrl) : undefined,
    headings,
    paragraphs,
    images,
    logo,
    socialLinks: extractSocialLinks(html),
    ...extractContacts(cleanHtml, bodyText),
    colors,
    fonts: extractFonts(html, baseUrl),
  };
}
