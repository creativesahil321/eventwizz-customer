"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LocationNotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col bg-[color:var(--color-background)] text-[color:var(--color-text)]">
      <main className="flex-1 flex items-center justify-center">
        <div className="container max-w-lg mx-auto px-4 py-16 text-center">
          <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-[color:color-mix(in_srgb,var(--color-text)_12%,transparent)] flex items-center justify-center">
            <span className="text-4xl text-[color:var(--color-text-dimmed)]">
              404
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-[color:var(--color-text)] mb-4">
            Location Not Found
          </h1>

          <p className="text-[color:var(--color-text-dimmed)] mb-8">
            The location you&apos;re looking for doesn&apos;t exist or may have
            been moved. Please select a valid location from our directory.
          </p>

          <div className="space-y-4">
            <Button
              onClick={() => router.push("/")}
              variant="event-primary"
              className="w-full flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to Locations Directory
            </Button>

            <Link
              href="/"
              className="text-sm text-[color:var(--color-text-dimmed)] hover:text-[color:var(--color-text)] block transition-colors"
            >
              Or go back to the home page
            </Link>
          </div>
        </div>
      </main>

      <footer className="bg-[color:var(--color-footer,#0F172A)] text-[color:var(--color-on-footer,#FFFFFF)] py-6 text-center">
        <div className="container mx-auto">
          <p>© {new Date().getFullYear()} EventWizz. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
