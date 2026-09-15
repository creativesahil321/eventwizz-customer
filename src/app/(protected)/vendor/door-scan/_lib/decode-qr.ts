import jsQR from "jsqr";

const PHOTO_MAX_EDGE = 1400;
const LIVE_MAX_EDGE = 720;

function decodeQrFromImageData(imageData: ImageData): string | null {
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: "attemptBoth",
  });
  const value = code?.data?.trim();
  return value || null;
}

function decodeQrFromCanvas(canvas: HTMLCanvasElement): string | null {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx || canvas.width < 1 || canvas.height < 1) return null;
  return decodeQrFromImageData(
    ctx.getImageData(0, 0, canvas.width, canvas.height),
  );
}

function drawSourceToCanvas(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  canvas: HTMLCanvasElement,
  maxEdge: number,
): boolean {
  if (sourceWidth < 1 || sourceHeight < 1) return false;
  const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight));
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return false;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return true;
}

export function decodeQrFromVideoFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
): string | null {
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return null;
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!drawSourceToCanvas(video, width, height, canvas, LIVE_MAX_EDGE)) {
    return null;
  }
  return decodeQrFromCanvas(canvas);
}

export async function decodeQrFromFile(file: File): Promise<string | null> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    if (
      !drawSourceToCanvas(
        bitmap,
        bitmap.width,
        bitmap.height,
        canvas,
        PHOTO_MAX_EDGE,
      )
    ) {
      return null;
    }
    return decodeQrFromCanvas(canvas);
  } finally {
    bitmap.close();
  }
}

export function isCameraApiAvailable(): boolean {
  return (
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

export function isInsecureCameraOrigin(): boolean {
  return typeof window !== "undefined" && window.isSecureContext === false;
}
