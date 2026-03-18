/**
 * Dummy images for AI-generated onboarding.
 * These are royalty-free Unsplash images that fit common event types.
 * The AI flow uses these as placeholders so vendors can replace them later.
 */

const EVENT_IMAGES = {
  wedding: {
    cover: "https://images.unsplash.com/photo-1519741497674-611481863552?w=1920&h=1080&fit=crop&q=80",
    banner: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=1920&h=1080&fit=crop&q=80",
    package: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&h=600&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&h=600&fit=crop&q=80",
    ],
  },
  corporate: {
    cover: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1920&h=1080&fit=crop&q=80",
    banner: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1920&h=1080&fit=crop&q=80",
    package: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&h=600&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop&q=80&sat=-20",
    ],
  },
  party: {
    cover: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1920&h=1080&fit=crop&q=80",
    banner: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1920&h=1080&fit=crop&q=80",
    package: "https://images.unsplash.com/photo-1496843916299-590492c751f4?w=800&h=600&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1496843916299-590492c751f4?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=600&fit=crop&q=80",
    ],
  },
  conference: {
    cover: "https://images.unsplash.com/photo-1587825140708-dfaf18c4c362?w=1920&h=1080&fit=crop&q=80",
    banner: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=1920&h=1080&fit=crop&q=80",
    package: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&h=600&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1587825140708-dfaf18c4c362?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop&q=80",
    ],
  },
  concert: {
    cover: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1920&h=1080&fit=crop&q=80",
    banner: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1920&h=1080&fit=crop&q=80",
    package: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&h=600&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&h=600&fit=crop&q=80",
    ],
  },
  default: {
    cover: "https://images.unsplash.com/photo-1478146059778-26028b07395a?w=1920&h=1080&fit=crop&q=80",
    banner: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1920&h=1080&fit=crop&q=80",
    package: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1478146059778-26028b07395a?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop&q=80",
      "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&h=600&fit=crop&q=80",
    ],
  },
} as const;

export type VenueType = keyof typeof EVENT_IMAGES;

export function getDummyImages(venueType: string) {
  const normalizedType = venueType.toLowerCase().trim();

  if (normalizedType in EVENT_IMAGES) {
    return EVENT_IMAGES[normalizedType as VenueType];
  }

  if (normalizedType.includes("wedding") || normalizedType.includes("bridal")) {
    return EVENT_IMAGES.wedding;
  }
  if (normalizedType.includes("corporate") || normalizedType.includes("business")) {
    return EVENT_IMAGES.corporate;
  }
  if (normalizedType.includes("party") || normalizedType.includes("birthday") || normalizedType.includes("celebration")) {
    return EVENT_IMAGES.party;
  }
  if (normalizedType.includes("conference") || normalizedType.includes("seminar") || normalizedType.includes("workshop")) {
    return EVENT_IMAGES.conference;
  }
  if (normalizedType.includes("concert") || normalizedType.includes("music") || normalizedType.includes("festival")) {
    return EVENT_IMAGES.concert;
  }

  return EVENT_IMAGES.default;
}

/**
 * Fetches a remote image URL as a File object for form submission.
 */
export async function urlToFile(url: string, filename: string): Promise<File> {
  const response = await fetch(url);
  const blob = await response.blob();
  const extension = blob.type.split("/")[1] || "jpg";
  return new File([blob], `${filename}.${extension}`, { type: blob.type });
}

/**
 * Creates a placeholder PNG logo with the venue's initial letter.
 * Renders via Canvas so the backend receives a real image/png file.
 */
export function createPlaceholderLogo(venueName: string): Promise<File> {
  return new Promise((resolve, reject) => {
    const initial = (venueName || "E").charAt(0).toUpperCase();
    const size = 200;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Canvas not supported"));
      return;
    }

    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, "#0F172A");
    gradient.addColorStop(1, "#334155");

    const r = 24;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(size - r, 0);
    ctx.quadraticCurveTo(size, 0, size, r);
    ctx.lineTo(size, size - r);
    ctx.quadraticCurveTo(size, size, size - r, size);
    ctx.lineTo(r, size);
    ctx.quadraticCurveTo(0, size, 0, size - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.font = "bold 96px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initial, size / 2, size / 2 + 4);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to create PNG blob"));
          return;
        }
        const safeName = venueName.toLowerCase().replace(/\s+/g, "-") || "venue";
        resolve(new File([blob], `${safeName}-logo.png`, { type: "image/png" }));
      },
      "image/png"
    );
  });
}

/**
 * Fetches multiple gallery images as File objects in parallel.
 * Silently skips any that fail to fetch.
 */
export async function fetchGalleryFiles(
  urls: readonly string[]
): Promise<File[]> {
  const results = await Promise.allSettled(
    urls.map((url, i) => urlToFile(url, `gallery-image-${i + 1}`))
  );
  return results
    .filter((r): r is PromiseFulfilledResult<File> => r.status === "fulfilled")
    .map((r) => r.value);
}
