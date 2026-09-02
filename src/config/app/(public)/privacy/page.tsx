import { redirect } from "next/navigation";
import { Metadata } from "next";
import { appConfig } from "@/config/app";

export const metadata: Metadata = {
  title: "Privacy Policy - EventWizz",
  description:
    "Read EventWizz's privacy policy. Learn how we collect, use, and protect your personal information when you use our event management platform.",
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: `${appConfig.url}/privacy`,
  },
};

export default function PrivacyPage() {
  redirect("/policies?section=privacy");
}
