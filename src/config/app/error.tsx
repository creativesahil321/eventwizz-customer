"use client";

import { Button } from "@/components/ui/button";
import { H1, Paragraph } from "@/components/ui/typography";
import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Error caught by error.tsx:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-white px-4 py-16">
      <div className="w-full max-w-[500px] text-center">
        <div className="mx-auto mb-6 flex justify-center">
          <AlertCircle className="h-16 w-16 text-red-500" aria-hidden="true" />
        </div>
        <div className="flex flex-col space-y-4 mb-8">
          <H1>We encountered an issue</H1>
          <Paragraph className="text-slate-600">
            There was a problem processing your request. Our team has been
            notified about this issue.
          </Paragraph>
          {error.digest && (
            <div className="mt-2 rounded-md bg-slate-50 p-3">
              <code className="text-xs text-slate-700">
                Error ID: {error.digest}
              </code>
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/" className="w-full sm:w-auto">
            <Button variant="event-outline" size="lg" className="w-full">
              Return to Home
            </Button>
          </Link>
          <Button
            onClick={reset}
            variant="event-outline"
            size="lg"
            className="w-full sm:w-auto"
          >
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
}
