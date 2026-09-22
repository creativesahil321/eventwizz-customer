"use client";

import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

const globalErrorFontStack =
  "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Critical error caught by global-error.tsx:", error);
  }, [error]);

  return (
    <html lang="en-GB">
      <body
        className="bg-[var(--color-background,#e8f4f6)]"
        style={{ fontFamily: globalErrorFontStack }}
      >
        <div className="flex min-h-screen w-full flex-col items-center justify-center px-4 py-16">
          <div className="w-full max-w-[500px] text-center">
            <div className="mx-auto mb-6 flex justify-center">
              <AlertTriangle
                className="h-16 w-16 text-amber-500"
                aria-hidden="true"
              />
            </div>
            <div className="flex flex-col space-y-4 mb-8">
              <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text,#1e293b)]">
                Application Error
              </h1>
              <p className="text-[var(--color-text,#64748b)]">
                We&apos;ve encountered a critical issue loading the application.
                Please try refreshing the page or check back later.
              </p>
              {error.digest && (
                <div className="mt-2 rounded-md bg-white/50 p-3">
                  <code className="text-xs text-[var(--color-text,#64748b)]">
                    Error ID: {error.digest}
                  </code>
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => window.location.reload()}
                variant="event-outline"
                size="lg"
                className="w-full sm:w-auto"
              >
                Refresh Page
              </Button>
              <Button
                onClick={reset}
                variant="event-primary"
                size="lg"
                className="w-full sm:w-auto"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
