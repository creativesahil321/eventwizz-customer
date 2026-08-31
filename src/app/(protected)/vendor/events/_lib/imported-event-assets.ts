import type { EventImportAssets } from "@/app/api/ai/import-event/types";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function proxyUrl(url: string, type: "image" | "video" = "image"): string {
  return `/api/ai/import-website/image?type=${type}&url=${encodeURIComponent(url)}`;
}

function sniffImageMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 6 &&
    ["GIF87a", "GIF89a"].includes(String.fromCharCode(...bytes.slice(0, 6)))
  ) {
    return "image/gif";
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

function extensionForMime(mime: string): string {
  return mime === "image/jpeg" ? "jpg" : mime.split("/")[1] || "jpg";
}

function sniffVideoMime(bytes: Uint8Array): string | null {
  if (
    bytes.length >= 8 &&
    String.fromCharCode(...bytes.slice(4, 8)) === "ftyp"
  ) {
    return "video/mp4";
  }
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  ) {
    return "video/webm";
  }
  if (
    bytes.length >= 4 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "OggS"
  ) {
    return "video/ogg";
  }
  return null;
}

export async function downloadImportedEventAsset(
  url: string,
  filename: string,
): Promise<File | null> {
  try {
    const response = await fetch(proxyUrl(url), { cache: "no-store" });
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_IMAGE_BYTES) {
      return null;
    }
    const bytes = new Uint8Array(buffer);
    const mime = sniffImageMime(bytes);
    if (!mime) return null;
    return new File([buffer], `${filename}.${extensionForMime(mime)}`, {
      type: mime,
    });
  } catch {
    return null;
  }
}

export async function downloadImportedEventVideo(
  url: string,
  filename: string,
): Promise<File | null> {
  try {
    const response = await fetch(proxyUrl(url, "video"), { cache: "no-store" });
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0 || buffer.byteLength > 32 * 1024 * 1024) {
      return null;
    }
    const mime = sniffVideoMime(new Uint8Array(buffer));
    if (!mime) return null;
    return new File([buffer], `${filename}.${extensionForMime(mime)}`, {
      type: mime,
    });
  } catch {
    return null;
  }
}

export async function downloadImportedEventAssets(
  assets: EventImportAssets,
): Promise<{
  bannerFile: File | null;
  bannerVideoFile: File | null;
  packageFile: File | null;
  schedulerBackgroundFile: File | null;
  menuBackgroundFile: File | null;
  galleryFiles: File[];
}> {
  const [
    bannerFile,
    bannerVideoFile,
    packageFile,
    schedulerBackgroundFile,
    menuBackgroundFile,
  ] = await Promise.all([
      assets.banner
        ? downloadImportedEventAsset(assets.banner, "imported-event-banner")
        : Promise.resolve(null),
      assets.bannerVideo
        ? downloadImportedEventVideo(
            assets.bannerVideo,
            "imported-event-banner-video",
          )
        : Promise.resolve(null),
      assets.package
        ? downloadImportedEventAsset(assets.package, "imported-package-image")
        : Promise.resolve(null),
      assets.schedulerBackground
        ? downloadImportedEventAsset(
            assets.schedulerBackground,
            "imported-schedule-background",
          )
        : Promise.resolve(null),
      assets.menuBackground
        ? downloadImportedEventAsset(
            assets.menuBackground,
            "imported-menu-background",
          )
        : Promise.resolve(null),
    ]);

  const galleryResults = await Promise.all(
    assets.gallery.map((url, index) =>
      downloadImportedEventAsset(url, `imported-gallery-${index + 1}`),
    ),
  );

  return {
    bannerFile,
    bannerVideoFile,
    packageFile,
    schedulerBackgroundFile,
    menuBackgroundFile,
    galleryFiles: galleryResults.filter((file): file is File => file !== null),
  };
}
