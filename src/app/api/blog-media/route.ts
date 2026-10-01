import { NextResponse, type NextRequest } from "next/server";
import { BLOG_FEATURED_IMAGE_MAX_BYTES } from "@/lib/blogs";
import { assertAllowedBlogMediaUrl } from "@/lib/blogs/allowed-media-url";
import {
  readBodyWithLimit,
  ResponseTooLargeError,
  safeFetch,
} from "@/lib/security/ssrf";

export const runtime = "nodejs";

const MAX_BYTES = Math.max(BLOG_FEATURED_IMAGE_MAX_BYTES, 8 * 1024 * 1024);

/**
 * Same-origin proxy for blog featured images so the cropper can load Laravel
 * storage files that the browser cannot fetch cross-origin.
 */
export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url");
  if (!rawUrl) {
    return NextResponse.json({ error: "Missing url." }, { status: 400 });
  }

  let safeUrl: URL;
  try {
    safeUrl = assertAllowedBlogMediaUrl(rawUrl);
  } catch {
    return NextResponse.json({ error: "URL is not allowed." }, { status: 400 });
  }

  try {
    // safeFetch re-validates host + DNS on every redirect hop (SSRF-safe).
    const upstream = await safeFetch(safeUrl.toString(), {
      headers: { Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8" },
      cache: "no-store",
      timeoutMs: 20_000,
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Could not fetch image (${upstream.status}).` },
        { status: 400 },
      );
    }

    const contentType = upstream.headers.get("content-type") ?? "";
    if (contentType && !contentType.startsWith("image/")) {
      return NextResponse.json(
        { error: "URL did not return an image." },
        { status: 400 },
      );
    }

    // Stream with a byte cap so an oversized body is never fully buffered.
    let buffer: Buffer;
    try {
      buffer = await readBodyWithLimit(upstream, MAX_BYTES);
    } catch (error) {
      if (!(error instanceof ResponseTooLargeError)) throw error;
      buffer = Buffer.alloc(0);
    }
    if (buffer.length === 0 || buffer.length > MAX_BYTES) {
      return NextResponse.json(
        { error: "Image is empty or too large." },
        { status: 400 },
      );
    }

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType || "image/jpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch image." }, { status: 500 });
  }
}
