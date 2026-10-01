import { NextResponse, type NextRequest } from "next/server";
import { assertSafeLogoUrl } from "@/lib/logo/fetch-logo-from-url";
import { guardPublicApi } from "@/lib/security/api-guard";
import { assertResolvesToPublic } from "@/lib/security/ssrf";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
const MAX_VIDEO_BYTES = 32 * 1024 * 1024; // 32 MB
const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 15_000;

async function readBoundedMedia(
  response: Response,
  maxBytes: number,
): Promise<Buffer> {
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > maxBytes) {
    throw new Error("Media is too large.");
  }

  if (!response.body) {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > maxBytes) {
      throw new Error("Media is too large.");
    }
    return buffer;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      total += next.value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error("Media is too large.");
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
}

function hasImageSignature(buffer: Buffer): boolean {
  if (buffer.length >= 3 && buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
    return true;
  }
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return true;
  }
  if (buffer.length >= 6 && (buffer.subarray(0, 6).toString("ascii") === "GIF87a" || buffer.subarray(0, 6).toString("ascii") === "GIF89a")) {
    return true;
  }
  return (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

function hasVideoSignature(buffer: Buffer): boolean {
  return (
    (buffer.length >= 8 &&
      buffer.subarray(4, 8).toString("ascii") === "ftyp") ||
    (buffer.length >= 4 &&
      buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) ||
    (buffer.length >= 4 && buffer.subarray(0, 4).toString("ascii") === "OggS")
  );
}

/**
 * Same-origin proxy that streams a remote image or banner video so the browser
 * can preview or turn it into a File. Guarded by the shared SSRF check
 * (http/https, no private/local hosts), media types, and magic bytes.
 */
export async function GET(request: NextRequest) {
  // Loaded via <img>/<video src>, which send Referer but no Origin, so a
  // request with neither header is tolerated; cross-site ones are rejected.
  // Generous limit: one import can preview dozens of gallery images.
  const guard = guardPublicApi(request, "ai:import-website-image", {
    limit: 180,
    windowMs: 60_000,
    allowMissingOrigin: true,
  });
  if (guard) return guard;

  const rawUrl = request.nextUrl.searchParams.get("url");
  const mediaType = request.nextUrl.searchParams.get("type") === "video"
    ? "video"
    : "image";
  if (!rawUrl) {
    return NextResponse.json({ error: "Missing url parameter." }, { status: 400 });
  }

  let safeUrl: URL;
  try {
    safeUrl = assertSafeLogoUrl(rawUrl);
  } catch {
    return NextResponse.json({ error: "URL is not allowed." }, { status: 400 });
  }

  try {
    let currentUrl = safeUrl;

    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      try {
        // SSRF: re-validate DNS on every hop (blocks public hostnames that
        // resolve to private / metadata addresses).
        try {
          await assertResolvesToPublic(currentUrl.hostname);
        } catch {
          return NextResponse.json(
            {
              error:
                redirectCount === 0
                  ? "URL is not allowed."
                  : "Image URL redirected to an unsafe address.",
            },
            { status: 400 },
          );
        }

        const upstream = await fetch(currentUrl.toString(), {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            Accept:
              mediaType === "video"
                ? "video/mp4,video/webm,video/ogg,*/*;q=0.8"
                : "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
            Referer: currentUrl.origin + "/",
          },
          redirect: "manual",
          cache: "no-store",
          signal: controller.signal,
        });
        if (upstream.status >= 300 && upstream.status < 400) {
          const location = upstream.headers.get("location");
          await upstream.body?.cancel().catch(() => undefined);
          if (!location || redirectCount === MAX_REDIRECTS) {
            return NextResponse.json(
              { error: "Image URL redirected too many times." },
              { status: 400 },
            );
          }
          try {
            currentUrl = assertSafeLogoUrl(
              new URL(location, currentUrl).toString(),
            );
          } catch {
            return NextResponse.json(
              { error: "Image URL redirected to an unsafe address." },
              { status: 400 },
            );
          }
          continue;
        }

        if (!upstream.ok) {
          return NextResponse.json(
            { error: `Could not fetch image (${upstream.status}).` },
            { status: 400 },
          );
        }

        const contentType = upstream.headers.get("content-type") ?? "";
        const isAllowedMedia =
          mediaType === "video"
            ? /^video\/(mp4|webm|ogg)(?:;|$)/i.test(contentType)
            : contentType.startsWith("image/");
        if (!isAllowedMedia) {
          return NextResponse.json(
            { error: `URL did not return a supported ${mediaType}.` },
            { status: 400 },
          );
        }

        const maxBytes = mediaType === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
        const buffer = await readBoundedMedia(upstream, maxBytes);
        if (buffer.length === 0 || buffer.length > maxBytes) {
          return NextResponse.json(
            { error: `Media is empty or too large.` },
            { status: 400 },
          );
        }
        if (
          mediaType === "image"
            ? !hasImageSignature(buffer)
            : !hasVideoSignature(buffer)
        ) {
          return NextResponse.json(
            { error: `URL did not return a supported ${mediaType}.` },
            { status: 400 },
          );
        }

        return new NextResponse(new Uint8Array(buffer), {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "no-store",
          },
        });
      } finally {
        clearTimeout(timeout);
      }
    }

    return NextResponse.json({ error: "Failed to fetch image." }, { status: 500 });
  } catch {
    return NextResponse.json({ error: "Failed to fetch image." }, { status: 500 });
  }
}
