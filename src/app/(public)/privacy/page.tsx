import { Metadata } from "next";
import AdminHeader from "@/app/(public)/admin/_components/header";
import AdminFooter from "@/app/(public)/admin/_components/footer";
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
  return (
    <>
      <AdminHeader />
      <main className="pt-24">
        <section className="py-20 bg-[color:var(--color-background)]">
          <div className="container mx-auto px-4 max-w-4xl">
            <h1 className="text-4xl md:text-5xl font-bold text-[color:var(--color-text)] mb-2">
              Privacy Policy
            </h1>
            <p className="text-sm text-[color:var(--color-text-dimmed)] mb-10">
              Last updated: {new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })}
            </p>

            <div className="space-y-8 text-[color:var(--color-text-dimmed)] leading-relaxed">
              <div>
                <h2 className="text-2xl font-bold text-[color:var(--color-text)] mb-3">
                  Introduction
                </h2>
                <p>
                  At EventWizz, we are committed to protecting your privacy.
                  This Privacy Policy explains how we collect, use, disclose, and
                  safeguard your information when you use our event management
                  platform.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-[color:var(--color-text)] mb-3">
                  Information We Collect
                </h2>
                <p className="mb-3">
                  We collect information that you provide directly to us,
                  including:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Name and contact information</li>
                  <li>Email address and phone number</li>
                  <li>Event details and preferences</li>
                  <li>Payment information (processed securely)</li>
                  <li>Account credentials</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-[color:var(--color-text)] mb-3">
                  How We Use Your Information
                </h2>
                <p>
                  We use the information we collect to provide, maintain, and
                  improve our services, process transactions, send you updates,
                  and respond to your inquiries.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-[color:var(--color-text)] mb-3">
                  Data Security
                </h2>
                <p>
                  We implement appropriate technical and organizational security
                  measures to protect your personal information against
                  unauthorized access, alteration, disclosure, or destruction.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-[color:var(--color-text)] mb-3">
                  Your Rights
                </h2>
                <p>
                  You have the right to access, update, or delete your personal
                  information at any time. You can also opt-out of certain
                  communications from us.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-[color:var(--color-text)] mb-3">
                  Cookies and Tracking
                </h2>
                <p>
                  We use cookies and similar tracking technologies to track
                  activity on our platform and hold certain information. You can
                  instruct your browser to refuse all cookies or to indicate when
                  a cookie is being sent.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-[color:var(--color-text)] mb-3">
                  Contact Us
                </h2>
                <p>
                  If you have any questions about this Privacy Policy, please
                  contact us through our website.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <AdminFooter />
    </>
  );
}
