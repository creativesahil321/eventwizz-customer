import { NextResponse, type NextRequest } from "next/server";
import { assertSafeLogoUrl } from "@/lib/logo/fetch-logo-from-url";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB

/**
 * Same-origin proxy that streams a remote image so the browser can turn it into
 * a File (external image hosts usually block cross-origin `fetch`). Guarded by
 * the shared SSRF check (http/https, no private/local hosts) and image-only
 * content types.
 */
export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url");
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
      const upstream = await fetch(safeUrl.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: safeUrl.origin + "/",
      },
      redirect: "follow",
      cache: "no-store",
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Could not fetch image (${upstream.status}).` },
        { status: 400 },
      );
    }

    const contentType = upstream.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json(
        { error: "URL did not return an image." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "Image is empty or too large (max 8 MB)." },
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
  } catch {
    return NextResponse.json({ error: "Failed to fetch image." }, { status: 500 });
  }
}
