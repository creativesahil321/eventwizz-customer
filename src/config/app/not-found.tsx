"use client";

import { Button } from "@/components/ui/button";
import { H1, Paragraph } from "@/components/ui/typography";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function Custom404() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-white px-4 py-16">
      <div className="w-full max-w-[500px] text-center">
        <div className="mx-auto mb-8 w-72 h-72 relative">
          <Image
            src="/404-illustration.svg"
            alt="Page not found"
            fill
            priority
            className="object-contain"
          />
        </div>
        <div className="flex flex-col space-y-4 mb-8">
          <H1>Page Not Found</H1>
          <Paragraph className="text-slate-600">
            The page you requested couldn&apos;t be found. It may have been
            moved, deleted, or the URL might have been entered incorrectly.
          </Paragraph>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            variant="event-outline"
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => router.back()}
          >
            Go Back
          </Button>
          <Link href="/" className="w-full sm:w-auto">
            <Button variant="event-primary" size="lg" className="w-full">
              Return to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
