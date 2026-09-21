import { AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MAX_VIDEO_SIZE_MB } from "@/utils/video-validator";

interface VideoFormatInfoProps {
  variant?: "default" | "compact";
}

export function VideoFormatInfo({ variant = "default" }: VideoFormatInfoProps) {
  if (variant === "compact") {
    return (
      <div className="text-sm text-muted-foreground space-y-1">
        <p className="font-medium">Recommended format: MP4 (H.264)</p>
        <p className="text-xs">
          Max size: {MAX_VIDEO_SIZE_MB}MB • Avoid HEVC/H.265 for best
          compatibility
        </p>
      </div>
    );
  }

  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Video Format Requirements</AlertTitle>
      <AlertDescription>
        <div className="mt-2 space-y-2">
          <div className="grid gap-2">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">
                  Recommended: MP4 with H.264 codec
                </p>
                <p className="text-xs text-muted-foreground">
                  Works on all browsers and devices
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">Avoid: HEVC/H.265 format</p>
                <p className="text-xs text-muted-foreground">
                  Limited browser support, may not work on Windows/Chrome
                </p>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t">
            <p className="text-xs font-medium mb-1">File Requirements:</p>
            <ul className="text-xs text-muted-foreground space-y-0.5 ml-4">
              <li>• Maximum file size: {MAX_VIDEO_SIZE_MB}MB</li>
              <li>• Format: MP4, WebM, or OGG</li>
              <li>• Codec: H.264 (AVC) recommended</li>
              <li>• Resolution: 1920x1080 or lower</li>
            </ul>
          </div>
          <div className="mt-2 pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              <strong>Tip:</strong> Use tools like{" "}
              <a
                href="https://handbrake.fr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                HandBrake
              </a>{" "}
              or{" "}
              <a
                href="https://cloudconvert.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                CloudConvert
              </a>{" "}
              to convert your videos to H.264 format.
            </p>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
