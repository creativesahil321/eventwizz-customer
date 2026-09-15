"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ImageUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  decodeQrFromFile,
  decodeQrFromVideoFrame,
  isCameraApiAvailable,
  isInsecureCameraOrigin,
} from "../_lib/decode-qr";

type DoorQrScannerProps = {
  enabled: boolean;
  pausedLabel?: string;
  onToken: (token: string) => void;
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
  const [manualToken, setManualToken] = useState("");
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
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
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
          if (token) onTokenRef.current(token);
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
      onToken(token);
    } catch {
      setPhotoError(
        "Could not read that photo. Try another shot or paste the code.",
      );
    } finally {
      setIsReadingPhoto(false);
    }
  };

  const submitManual = () => {
    const token = manualToken.trim();
    if (!token) return;
    onToken(token);
  };

  return (
    <div className="space-y-4">
      <canvas ref={canvasRef} className="hidden" aria-hidden />
      <div className="relative overflow-hidden rounded-lg border border-[var(--color-border)] bg-black">
        {cameraState === "starting" ? (
          <Skeleton className="aspect-[4/3] w-full rounded-none bg-zinc-800" />
        ) : null}
        <video
          ref={videoRef}
          className={cn(
            "aspect-[4/3] w-full object-cover",
            cameraState === "live" ? "block" : "hidden",
          )}
          playsInline
          muted
          autoPlay
        />
        {cameraState === "live" ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-40 w-40 rounded-md border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
        ) : null}
        {cameraState === "denied" ? (
          <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 bg-zinc-900 px-6 text-center text-sm text-white">
            <Camera className="h-8 w-8 text-white/70" />
            <p>
              Camera access is blocked. Allow the camera, or photograph the QR
              / paste the code below.
            </p>
          </div>
        ) : null}
        {cameraState === "insecure" ? (
          <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 bg-zinc-900 px-6 text-center text-sm text-white">
            <Camera className="h-8 w-8 text-white/70" />
            <p>
              Live camera needs HTTPS (this page is HTTP). Photograph the QR or
              paste the code. For live scan, open Door Scan on HTTPS or
              localhost.
            </p>
          </div>
        ) : null}
        {cameraState === "unsupported" ? (
          <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 bg-zinc-900 px-6 text-center text-sm text-white">
            <Camera className="h-8 w-8 text-white/70" />
            <p>
              This browser cannot open a live camera. Photograph the QR or
              paste the code.
            </p>
          </div>
        ) : null}
        {cameraState === "idle" && enabled ? (
          <Skeleton className="aspect-[4/3] w-full rounded-none bg-zinc-800" />
        ) : null}
        {!enabled ? (
          <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 bg-zinc-900 px-6 text-center text-sm text-white/80">
            <p>{pausedLabel}</p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
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
          variant="outline"
          className="flex-1"
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
      </div>
      {photoError ? (
        <p className="text-sm text-destructive">{photoError}</p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="door-entry-token">Or paste the QR code</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="door-entry-token"
            value={manualToken}
            onChange={(event) => setManualToken(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submitManual();
              }
            }}
            placeholder="Scanned QR payload"
            autoComplete="off"
            spellCheck={false}
          />
          <Button
            type="button"
            variant="secondary"
            className="shrink-0"
            onClick={submitManual}
            disabled={!manualToken.trim()}
          >
            Look up
          </Button>
        </div>
      </div>
    </div>
  );
}
