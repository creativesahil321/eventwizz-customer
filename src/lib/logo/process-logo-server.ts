import sharp from "sharp";
import { getAnchorColor, relativeLuminance } from "@/lib/color-contrast";
import {
  LOGO_DARK_AVG_LUMINANCE,
  LOGO_DARK_MONOCHROME_RATIO,
  LOGO_DARK_PIXEL_RATIO,
  LOGO_DEFAULT_HEADER_BACKGROUND,
  LOGO_LIGHT_AVG_LUMINANCE,
  LOGO_LIGHT_MONOCHROME_RATIO,
  LOGO_LIGHT_PIXEL_RATIO,
  LOGO_MAX_HEIGHT,
  LOGO_MAX_WIDTH,
  LOGO_WHITE_FUZZ,
  LOGO_WHITE_THRESHOLD,
} from "./constants";

export type ProcessLogoResult = {
  buffer: Buffer;
  contentType: "image/png" | "image/svg+xml";
  method: "sharp" | "remove-bg" | "passthrough";
  invertedForContrast?: boolean;
  headerIsLight?: boolean;
  /** Set when remove.bg was configured but failed (e.g. no credits). */
  backgroundRemovalFailed?: boolean;
  backgroundRemovalError?: string;
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

function removeNearWhiteBackground(
  data: Buffer,
  channels: number,
): void {
  if (channels < 4) return;

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;

    const threshold = LOGO_WHITE_THRESHOLD - LOGO_WHITE_FUZZ;
    const isBright = r >= threshold && g >= threshold && b >= threshold;
    const maxDiff = Math.max(
      Math.abs(r - g),
      Math.abs(g - b),
      Math.abs(r - b),
    );
    const isFlatBright = maxDiff < 24 && r > 210 && g > 210 && b > 210;

    if (isBright || isFlatBright) {
      data[i + 3] = 0;
    }
  }
}

function pixelLuminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
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

/** True when opaque pixels are mostly dark black/grey — invisible on a dark header. */
function isPredominantlyDarkLogo(data: Buffer, channels: number): boolean {
  if (channels < 4) return false;

  let opaque = 0;
  let dark = 0;
  let totalLum = 0;
  let darkMonochrome = 0;

  for (let i = 0; i < data.length; i += channels) {
    const alpha = data[i + 3]!;
    if (alpha < 64) continue;

    opaque++;
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    const lum = pixelLuminance(r, g, b);
    totalLum += lum;

    if (lum <= 55) dark++;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    if (lum <= 80 && sat <= 0.2) darkMonochrome++;
  }

  if (opaque < 40) return false;

  const avgLum = totalLum / opaque;
  const darkRatio = dark / opaque;
  const monoDarkRatio = darkMonochrome / opaque;

  return (
    avgLum <= LOGO_DARK_AVG_LUMINANCE &&
    darkRatio >= LOGO_DARK_PIXEL_RATIO &&
    monoDarkRatio >= LOGO_DARK_MONOCHROME_RATIO
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
  const shouldInvert = headerIsLight
    ? isPredominantlyLightLogo(data, info.channels)
    : isPredominantlyDarkLogo(data, info.channels);

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
    removeNearWhiteBackground(pixelData, info.channels);
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
  formData.append("type", "auto");

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
  let backgroundRemovalError: string | undefined;

  if (meta.format === "svg") {
    return {
      buffer: input,
      contentType: "image/svg+xml",
      method: "passthrough",
      headerIsLight,
    };
  }

  if (options?.removeBgApiKey) {
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
      backgroundRemovalError =
        error instanceof Error ? error.message : "Background removal failed";
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
    backgroundRemovalError,
  };
}
