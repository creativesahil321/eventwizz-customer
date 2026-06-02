import { NextRequest, NextResponse } from "next/server";
import {
  LOGO_DEFAULT_HEADER_BACKGROUND,
  LOGO_PROCESS_MAX_BYTES,
} from "@/lib/logo/constants";
import { processLogoBuffer } from "@/lib/logo/process-logo-server";
import { env } from "@/env";

export const runtime = "nodejs";

function normalizeRemoveBgApiKey(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/^["']|["']$/g, "");
}

const ACCEPTED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/tiff",
]);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const logo = formData.get("logo");

    if (!(logo instanceof File)) {
      return NextResponse.json({ error: "Logo file is required." }, { status: 400 });
    }

    if (!ACCEPTED_TYPES.has(logo.type)) {
      return NextResponse.json(
        { error: "Unsupported image type. Use PNG, JPG, or WebP." },
        { status: 400 },
      );
    }

    if (logo.size > LOGO_PROCESS_MAX_BYTES) {
      return NextResponse.json(
        { error: "Logo file is too large (max 5 MB)." },
        { status: 400 },
      );
    }

    const input = Buffer.from(await logo.arrayBuffer());
    const removeBgApiKey = normalizeRemoveBgApiKey(env.REMOVE_BG_API_KEY);
    const headerBackgroundRaw = formData.get("header_background");
    const headerBackgroundColor =
      typeof headerBackgroundRaw === "string" && headerBackgroundRaw.trim()
        ? headerBackgroundRaw.trim()
        : LOGO_DEFAULT_HEADER_BACKGROUND;

    const result = await processLogoBuffer(input, {
      removeBgApiKey: removeBgApiKey || undefined,
      headerBackgroundColor,
    });

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": 'inline; filename="logo.png"',
        "X-Logo-Process-Method": result.method,
        "X-Logo-Inverted-For-Contrast": result.invertedForContrast
          ? "true"
          : "false",
        "X-Logo-Header-Is-Light": result.headerIsLight ? "true" : "false",
        "X-Logo-Background-Removal-Failed": result.backgroundRemovalFailed
          ? "true"
          : "false",
        ...(result.backgroundRemovalError
          ? {
              "X-Logo-Background-Removal-Error": result.backgroundRemovalError.slice(
                0,
                200,
              ),
            }
          : {}),
      },
    });
  } catch (error) {
    console.error("[logo/process]", error);
    return NextResponse.json(
      { error: "Failed to process logo." },
      { status: 500 },
    );
  }
}
