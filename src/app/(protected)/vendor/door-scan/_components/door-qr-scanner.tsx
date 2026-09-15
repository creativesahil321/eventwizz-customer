"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Camera, ImageUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  decodeQrFromFile,
  decodeQrFromVideoFrame,
  isCameraApiAvailable,
  isInsecureCameraOrigin,
} from "../_lib/decode-qr";
import { unlockDoorScanAudio } from "../_lib/door-scan-sounds";

export type DoorScanTokenSource = "camera" | "photo";

type DoorQrScannerProps = {
  enabled: boolean;
  pausedLabel?: string;
  onToken: (token: string, source: DoorScanTokenSource) => void;
};

export function DoorQrScanner({
  enabled,
  pausedLabel = "Camera paused while you confirm this booking.",
  onToken,
}: DoorQrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onTokenRef = useRef(onToken);
  const fileInputRef = useRef<HTMLInputElement>(null);
  onTokenRef.current = onToken;
  const [cameraState, setCameraState] = useState<
    "idle" | "starting" | "live" | "denied" | "insecure" | "unsupported"
  >("idle");
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isReadingPhoto, setIsReadingPhoto] = useState(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    const video = videoRef.current;
    if (video) video.srcObject = null;
  }, []);

  useEffect(() => {
    if (!enabled) {
      stopCamera();
      setCameraState("idle");
      return;
    }

    if (isInsecureCameraOrigin()) {
      stopCamera();
      setCameraState("insecure");
      return;
    }

    if (!isCameraApiAvailable()) {
      stopCamera();
      setCameraState("unsupported");
      return;
    }

    let cancelled = false;
    const start = async () => {
      setCameraState("starting");
      try {
        // Keep constraints loose — iOS Safari often fails with exact width/height.
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.setAttribute("playsinline", "true");
          video.srcObject = stream;
          await video.play();
        }
        setCameraState("live");
      } catch {
        if (!cancelled) {
          setCameraState(
            isInsecureCameraOrigin() ? "insecure" : "denied",
          );
        }
      }
    };

    void start();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [enabled, stopCamera]);

  useEffect(() => {
    if (!enabled || cameraState !== "live") return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    let frame = 0;
    let running = true;
    let inFlight = false;

    const tick = () => {
      if (!running) return;
      frame += 1;
      if (
        !inFlight &&
        frame % 8 === 0 &&
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
      ) {
        inFlight = true;
        try {
          const token = decodeQrFromVideoFrame(video, canvas);
          if (token) onTokenRef.current(token, "camera");
        } catch {
          // Keep scanning; a single failed frame is not an error.
        } finally {
          inFlight = false;
        }
      }
      if (running) requestAnimationFrame(tick);
    };

    const id = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(id);
    };
  }, [cameraState, enabled]);

  const handlePhoto = async (file: File | undefined) => {
    setPhotoError(null);
    if (!file) return;
    setIsReadingPhoto(true);
    try {
      const token = await decodeQrFromFile(file);
      if (!token) {
        setPhotoError(
          "No QR code found in that photo. Try again closer to the code.",
        );
        return;
      }
      onToken(token, "photo");
    } catch {
      setPhotoError("Could not read that photo. Try another shot.");
    } finally {
      setIsReadingPhoto(false);
    }
  };

  const viewportClass = enabled
    ? "relative overflow-hidden rounded-2xl bg-black min-h-[min(72vw,22rem)] sm:min-h-0 aspect-[3/4] sm:aspect-[4/3]"
    : "relative overflow-hidden rounded-xl bg-zinc-900 min-h-[4.5rem]";

  return (
    <div className="space-y-4" onPointerDown={unlockDoorScanAudio}>
      <canvas ref={canvasRef} className="hidden" aria-hidden />
      <div className={viewportClass}>
        {cameraState === "starting" && enabled ? (
          <Skeleton className="absolute inset-0 rounded-none bg-zinc-800" />
        ) : null}
        <video
          ref={videoRef}
          className={cn(
            "absolute inset-0 h-full w-full object-cover",
            cameraState === "live" && enabled ? "block" : "hidden",
          )}
          playsInline
          muted
          autoPlay
        />
        {cameraState === "live" && enabled ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-44 w-44 sm:h-40 sm:w-40 rounded-2xl border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
          </div>
        ) : null}
        {enabled && cameraState === "denied" ? (
          <CameraStatusMessage>
            Camera access is blocked. Allow the camera in Settings, or
            photograph the QR below.
          </CameraStatusMessage>
        ) : null}
        {enabled && cameraState === "insecure" ? (
          <CameraStatusMessage>
            Live camera needs HTTPS. Photograph the QR below.
          </CameraStatusMessage>
        ) : null}
        {enabled && cameraState === "unsupported" ? (
          <CameraStatusMessage>
            This browser cannot open a live camera. Photograph the QR below.
          </CameraStatusMessage>
        ) : null}
        {cameraState === "idle" && enabled ? (
          <Skeleton className="absolute inset-0 rounded-none bg-zinc-800" />
        ) : null}
        {!enabled ? (
          <div className="flex min-h-[4.5rem] items-center justify-center px-4 py-3 text-center text-sm text-white/85">
            {pausedLabel}
          </div>
        ) : null}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          void handlePhoto(file);
          event.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="event-outline"
        size="lg"
        className="h-12 w-full"
        disabled={isReadingPhoto}
        onClick={() => fileInputRef.current?.click()}
      >
        {isReadingPhoto ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImageUp className="h-4 w-4" />
        )}
        {isReadingPhoto ? "Reading photo…" : "Photograph QR"}
      </Button>
      {photoError ? (
        <p className="text-sm text-destructive">{photoError}</p>
      ) : null}
    </div>
  );
}

function CameraStatusMessage({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-900 px-5 text-center text-sm leading-relaxed text-white">
      <Camera className="h-8 w-8 text-white/70" />
      <p>{children}</p>
    </div>
  );
}
