import sharp from "sharp";
import { getAnchorColor, relativeLuminance } from "@/lib/color-contrast";
import {
  LOGO_BLACK_FUZZ,
  LOGO_BLACK_THRESHOLD,
  LOGO_BORDER_COLOR_CONFIDENCE,
  LOGO_BORDER_COLOR_DISTANCE,
  LOGO_DEFAULT_HEADER_BACKGROUND,
  LOGO_WIDE_ASPECT_RATIO,
  LOGO_LIGHT_AVG_LUMINANCE,
  LOGO_LIGHT_MONOCHROME_RATIO,
  LOGO_LIGHT_PIXEL_RATIO,
  LOGO_MAX_HEIGHT,
  LOGO_MAX_WIDTH,
  LOGO_WHITE_FUZZ,
  LOGO_WHITE_THRESHOLD,
} from "./constants";

import type { LogoProcessNotice } from "./logo-process-notices";
import { classifyBackgroundRemovalError } from "./logo-process-notices";

export type ProcessLogoResult = {
  buffer: Buffer;
  contentType: "image/png" | "image/svg+xml";
  method: "sharp" | "remove-bg" | "passthrough";
  invertedForContrast?: boolean;
  headerIsLight?: boolean;
  /** Set when remove.bg was configured but Sharp fallback was used instead. */
  backgroundRemovalFailed?: boolean;
  processNotice?: LogoProcessNotice;
};

function hasSignificantTransparency(
  data: Buffer,
  channels: number,
  width: number,
  height: number,
): boolean {
  if (channels < 4) return false;

  let transparent = 0;
  const total = width * height;

  for (let i = 3; i < data.length; i += channels) {
    if (data[i]! < 128) transparent++;
  }

  return transparent / total > 0.12;
}

function rgbDistance(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number,
): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function pixelLuminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function isNearWhitePixel(r: number, g: number, b: number): boolean {
  const threshold = LOGO_WHITE_THRESHOLD - LOGO_WHITE_FUZZ;
  const isBright = r >= threshold && g >= threshold && b >= threshold;
  const maxDiff = Math.max(
    Math.abs(r - g),
    Math.abs(g - b),
    Math.abs(r - b),
  );
  const isFlatBright = maxDiff < 24 && r > 210 && g > 210 && b > 210;

  // Cream / ivory / beige paper backgrounds (common on venue wordmarks).
  const lum = pixelLuminance(r, g, b);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  const isCreamPaper = lum >= 188 && sat <= 0.28 && min >= 155;

  return isBright || isFlatBright || isCreamPaper;
}

function isNearDarkPixel(r: number, g: number, b: number): boolean {
  const threshold = LOGO_BLACK_THRESHOLD + LOGO_BLACK_FUZZ;
  const isDark = r <= threshold && g <= threshold && b <= threshold;
  const maxDiff = Math.max(
    Math.abs(r - g),
    Math.abs(g - b),
    Math.abs(r - b),
  );
  const isFlatDark = maxDiff < 24 && r < 45 && g < 45 && b < 45;
  return isDark || isFlatDark;
}

/**
 * Sample the dominant opaque color along the image border. Solid logo plates
 * (cream, beige, grey) almost always share one border color.
 */
function sampleDominantBorderColor(
  data: Buffer,
  channels: number,
  width: number,
  height: number,
): { r: number; g: number; b: number } | null {
  if (channels < 4 || width < 2 || height < 2) return null;

  const buckets = new Map<number, { count: number; r: number; g: number; b: number }>();
  let opaqueBorder = 0;

  const visit = (x: number, y: number) => {
    const offset = (y * width + x) * channels;
    if (data[offset + 3]! < 128) return;
    opaqueBorder++;
    const r = data[offset]!;
    const g = data[offset + 1]!;
    const b = data[offset + 2]!;
    // 16-level quantization keeps cream variants in one bucket.
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const existing = buckets.get(key);
    if (existing) {
      existing.count++;
      existing.r += r;
      existing.g += g;
      existing.b += b;
    } else {
      buckets.set(key, { count: 1, r, g, b });
    }
  };

  for (let x = 0; x < width; x++) {
    visit(x, 0);
    visit(x, height - 1);
  }
  for (let y = 1; y < height - 1; y++) {
    visit(0, y);
    visit(width - 1, y);
  }

  if (opaqueBorder < 16) return null;

  let best: { count: number; r: number; g: number; b: number } | null = null;
  for (const bucket of buckets.values()) {
    if (!best || bucket.count > best.count) best = bucket;
  }
  if (!best || best.count / opaqueBorder < LOGO_BORDER_COLOR_CONFIDENCE) {
    return null;
  }

  return {
    r: Math.round(best.r / best.count),
    g: Math.round(best.g / best.count),
    b: Math.round(best.b / best.count),
  };
}

/**
 * Only removes background pixels connected to the image border.
 * Preserves interior marks that are not part of the outer background.
 */
function removeEdgeConnectedBackground(
  data: Buffer,
  channels: number,
  width: number,
  height: number,
  isBackgroundPixel: (r: number, g: number, b: number) => boolean,
): void {
  if (channels < 4 || width < 1 || height < 1) return;

  const total = width * height;
  const visited = new Uint8Array(total);
  const queue: number[] = [];

  const indexAt = (x: number, y: number) => y * width + x;
  const offsetAt = (pixelIndex: number) => pixelIndex * channels;

  const tryEnqueue = (x: number, y: number) => {
    const pixelIndex = indexAt(x, y);
    if (visited[pixelIndex]) return;

    const offset = offsetAt(pixelIndex);
    const r = data[offset]!;
    const g = data[offset + 1]!;
    const b = data[offset + 2]!;
    if (!isBackgroundPixel(r, g, b)) return;

    visited[pixelIndex] = 1;
    queue.push(pixelIndex);
  };

  for (let x = 0; x < width; x++) {
    tryEnqueue(x, 0);
    tryEnqueue(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    tryEnqueue(0, y);
    tryEnqueue(width - 1, y);
  }

  while (queue.length > 0) {
    const pixelIndex = queue.pop()!;
    const offset = offsetAt(pixelIndex);
    data[offset + 3] = 0;

    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);

    if (x > 0) tryEnqueue(x - 1, y);
    if (x < width - 1) tryEnqueue(x + 1, y);
    if (y > 0) tryEnqueue(x, y - 1);
    if (y < height - 1) tryEnqueue(x, y + 1);
  }
}

/**
 * Global color-key for a solid plate. Needed for letter counters (O, A, B…)
 * that edge-flood cannot reach; otherwise leftover plate color inverts into
 * muddy fills inside the glyphs on dark headers.
 */
function keyOutMatchingColor(
  data: Buffer,
  channels: number,
  target: { r: number; g: number; b: number },
  maxDistance: number,
): void {
  if (channels < 4) return;

  for (let i = 0; i < data.length; i += channels) {
    if (data[i + 3]! < 128) continue;
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    if (rgbDistance(r, g, b, target.r, target.g, target.b) <= maxDistance) {
      data[i + 3] = 0;
    }
  }
}

function removeSolidBackgroundsForHeader(
  data: Buffer,
  channels: number,
  width: number,
  height: number,
  headerBackgroundColor: string,
): void {
  // Prefer the actual plate color (cream/beige/grey), not only near-white.
  const border = sampleDominantBorderColor(data, channels, width, height);
  if (border) {
    const borderLum = pixelLuminance(border.r, border.g, border.b);
    const headerIsLight = isLightHeaderBackground(headerBackgroundColor);
    // Never punch out a dark border plate on a dark header (would erase the mark).
    const safeToRemoveBorder =
      borderLum >= 140 || (headerIsLight && borderLum <= 60);

    if (safeToRemoveBorder) {
      keyOutMatchingColor(
        data,
        channels,
        border,
        LOGO_BORDER_COLOR_DISTANCE,
      );
    }
  }

  if (isLightHeaderBackground(headerBackgroundColor)) {
    removeEdgeConnectedBackground(
      data,
      channels,
      width,
      height,
      isNearWhitePixel,
    );
    removeEdgeConnectedBackground(
      data,
      channels,
      width,
      height,
      isNearDarkPixel,
    );
  } else {
    removeEdgeConnectedBackground(
      data,
      channels,
      width,
      height,
      isNearWhitePixel,
    );
  }
}

/** True when opaque pixels are mostly bright white/grey — invisible on a white header. */
function isPredominantlyLightLogo(data: Buffer, channels: number): boolean {
  if (channels < 4) return false;

  let opaque = 0;
  let light = 0;
  let totalLum = 0;
  let lightMonochrome = 0;

  for (let i = 0; i < data.length; i += channels) {
    const alpha = data[i + 3]!;
    if (alpha < 64) continue;

    opaque++;
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    const lum = pixelLuminance(r, g, b);
    totalLum += lum;

    if (lum >= 200) light++;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    if (lum >= 180 && sat <= 0.2) lightMonochrome++;
  }

  if (opaque < 40) return false;

  const avgLum = totalLum / opaque;
  const lightRatio = light / opaque;
  const monoLightRatio = lightMonochrome / opaque;

  return (
    avgLum >= LOGO_LIGHT_AVG_LUMINANCE &&
    lightRatio >= LOGO_LIGHT_PIXEL_RATIO &&
    monoLightRatio >= LOGO_LIGHT_MONOCHROME_RATIO
  );
}

function isLightHeaderBackground(headerBackgroundColor: string): boolean {
  return (
    relativeLuminance(getAnchorColor(headerBackgroundColor)) >= 0.5
  );
}

async function ensureVisibleOnHeaderBackground(
  input: Buffer,
  headerBackgroundColor: string,
): Promise<{ buffer: Buffer; inverted: boolean }> {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const headerIsLight = isLightHeaderBackground(headerBackgroundColor);
  // Only darken a white/silver mark on a light header. Never flip a black
  // brand wordmark to white — that fought uploaded colours in site preview.
  const shouldInvert =
    headerIsLight && isPredominantlyLightLogo(data, info.channels);

  if (!shouldInvert) {
    return { buffer: input, inverted: false };
  }

  const inverted = await sharp(input)
    .negate({ alpha: false })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();

  return { buffer: inverted, inverted: true };
}

async function normalizeLogoBuffer(
  input: Buffer,
  headerBackgroundColor: string = LOGO_DEFAULT_HEADER_BACKGROUND,
): Promise<{ buffer: Buffer; invertedForContrast: boolean }> {
  const image = sharp(input).ensureAlpha();
  const meta = await image.metadata();

  let pipeline = image;

  if (
    meta.width &&
    meta.height &&
    (meta.width > LOGO_MAX_WIDTH || meta.height > LOGO_MAX_HEIGHT)
  ) {
    pipeline = pipeline.resize(LOGO_MAX_WIDTH, LOGO_MAX_HEIGHT, {
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  const { data, info } = await pipeline
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixelData = Buffer.from(data);

  if (
    !hasSignificantTransparency(
      pixelData,
      info.channels,
      info.width,
      info.height,
    )
  ) {
    removeSolidBackgroundsForHeader(
      pixelData,
      info.channels,
      info.width,
      info.height,
      headerBackgroundColor,
    );
  }

  const trimmed = await sharp(pixelData, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  })
    .trim({ threshold: 10 })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();

  const { buffer, inverted } = await ensureVisibleOnHeaderBackground(
    trimmed,
    headerBackgroundColor,
  );
  return { buffer, invertedForContrast: inverted };
}

async function removeBackgroundWithApi(
  input: Buffer,
  apiKey: string,
): Promise<Buffer> {
  const formData = new FormData();
  formData.append(
    "image_file",
    new Blob([new Uint8Array(input)]),
    "logo.png",
  );
  formData.append("format", "png");
  formData.append("size", "auto");
  formData.append("type", "graphic");
  formData.append("crop", "false");

  const response = await fetch("https://api.remove.bg/v1.0/removebg", {
    method: "POST",
    headers: { "X-Api-Key": apiKey },
    body: formData,
  });

  if (!response.ok) {
    const detail = await response.text();
    let message = `Background removal API failed (${response.status})`;
    try {
      const parsed = JSON.parse(detail) as {
        errors?: Array<{ title?: string; code?: string }>;
      };
      const first = parsed.errors?.[0];
      if (first?.title) message = first.title;
      else if (first?.code) message = first.code;
    } catch {
      if (detail) message = detail.slice(0, 200);
    }
    throw new Error(message);
  }

  return Buffer.from(await response.arrayBuffer());
}

export async function processLogoBuffer(
  input: Buffer,
  options?: { removeBgApiKey?: string; headerBackgroundColor?: string },
): Promise<ProcessLogoResult> {
  const meta = await sharp(input).metadata();
  const headerBackgroundColor =
    options?.headerBackgroundColor?.trim() || LOGO_DEFAULT_HEADER_BACKGROUND;
  const headerIsLight = isLightHeaderBackground(headerBackgroundColor);
  let backgroundRemovalFailed = false;
  let processNotice: LogoProcessNotice = "none";

  if (meta.format === "svg") {
    return {
      buffer: input,
      contentType: "image/svg+xml",
      method: "passthrough",
      headerIsLight,
    };
  }

  const aspectRatio =
    meta.width && meta.height ? meta.width / meta.height : 1;
  const isWideWordmarkLogo = aspectRatio >= LOGO_WIDE_ASPECT_RATIO;

  if (options?.removeBgApiKey && !isWideWordmarkLogo) {
    try {
      const removed = await removeBackgroundWithApi(input, options.removeBgApiKey);
      const { buffer, invertedForContrast } = await normalizeLogoBuffer(
        removed,
        headerBackgroundColor,
      );
      return {
        buffer,
        contentType: "image/png",
        method: "remove-bg",
        invertedForContrast,
        headerIsLight,
      };
    } catch (error) {
      backgroundRemovalFailed = true;
      const rawMessage =
        error instanceof Error ? error.message : "Background removal failed";
      processNotice = classifyBackgroundRemovalError(rawMessage);
      console.warn("[logo] remove.bg failed, falling back to Sharp:", error);
    }
  }

  const { buffer, invertedForContrast } = await normalizeLogoBuffer(
    input,
    headerBackgroundColor,
  );
  return {
    buffer,
    contentType: "image/png",
    method: "sharp",
    invertedForContrast,
    headerIsLight,
    backgroundRemovalFailed: options?.removeBgApiKey
      ? backgroundRemovalFailed
      : undefined,
    processNotice: backgroundRemovalFailed ? processNotice : "none",
  };
}
