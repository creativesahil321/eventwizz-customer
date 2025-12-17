import { Metadata, ResolvingMetadata } from "next";
import { env } from "@/env";
import { buildMetadata } from "@/config/seo-metadata";
import { Suspense } from "react";
import { OnboardingFormSkeleton } from "@/components/ui/onboarding-skeleton";
import OnboardingClientWrapper from "./client";

export async function generateMetadata(
  _: unknown,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const url = `${env.NEXT_PUBLIC_APP_URL}/on-boarding`;
  const keywords = ["On Boarding", "Vendor Registration", "Register Vendor"];
  return buildMetadata({
    id: "on-boarding",
    data: {
      title: "On Boarding - Vendor Registration",
      description: "On Boarding, Vendor Registration, Register Vendor",
      keywords,
    },
    parentImages: (await parent).openGraph?.images || [],
    overrides: {
      openGraph: {
        url,
        images: [
          {
            url: "",
            width: 1200,
            height: 630,
            alt: "On Boarding",
          },
        ],
      },
      twitter: {
        images: [""],
      },
    },
  });
}

// Server component that wraps the client component
export default function Page() {
  return (
    <Suspense fallback={<OnboardingFormSkeleton layout="full" />}>
      <OnboardingClientWrapper />
    </Suspense>
  );
}
