import { redirect } from "next/navigation";
import { Metadata } from "next";
import { appConfig } from "@/config/app";

export const metadata: Metadata = {
  title: "Terms and Conditions - EventWizz",
  description:
    "Read EventWizz's terms and conditions. Understand the terms of service for using our event management platform.",
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: `${appConfig.url}/terms`,
  },
};

export default function TermsPage() {
  redirect("/policies?section=terms");
}
