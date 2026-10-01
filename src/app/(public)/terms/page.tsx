import { permanentRedirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms and Conditions",
};

export default function TermsPage() {
  // Permanent: /policies is the canonical home of this content.
  permanentRedirect("/policies?section=terms");
}
