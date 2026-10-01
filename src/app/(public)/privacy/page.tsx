import { permanentRedirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  // Permanent: /policies is the canonical home of this content.
  permanentRedirect("/policies?section=privacy");
}
