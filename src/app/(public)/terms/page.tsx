import { Metadata } from "next";
import AdminHeader from "@/app/(public)/admin/_components/header";
import AdminFooter from "@/app/(public)/admin/_components/footer";

export const metadata: Metadata = {
  title: "Terms and Conditions - EventWizz",
  description:
    "Read EventWizz's terms and conditions. Understand the terms of service for using our event management platform.",
  robots: { index: true, follow: true },
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsPage() {
  return (
    <>
      <AdminHeader />
      <main className="pt-24">
        <section className="py-20 bg-[color:var(--color-background)]">
          <div className="container mx-auto px-4 max-w-4xl prose prose-gray dark:prose-invert max-w-none">
            <h1 className="text-4xl md:text-5xl font-bold text-[color:var(--color-text)] mb-2">
              Terms and Conditions
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
                  Welcome to EventWizz. These Terms and Conditions govern your
                  use of our event management platform and services. By accessing
                  or using EventWizz, you agree to be bound by these terms.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-[color:var(--color-text)] mb-3">
                  Use of Service
                </h2>
                <p>
                  You agree to use EventWizz only for lawful purposes and in
                  accordance with these Terms and Conditions. You must not use
                  the service in any way that could damage, disable, or impair
                  the platform.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-[color:var(--color-text)] mb-3">
                  User Accounts
                </h2>
                <p>
                  When you create an account with us, you must provide accurate
                  and complete information. You are responsible for maintaining
                  the security of your account and password.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-[color:var(--color-text)] mb-3">
                  Intellectual Property
                </h2>
                <p>
                  The service and its original content, features, and
                  functionality are owned by EventWizz and are protected by
                  international copyright, trademark, and other intellectual
                  property laws.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-[color:var(--color-text)] mb-3">
                  Limitation of Liability
                </h2>
                <p>
                  EventWizz shall not be liable for any indirect, incidental,
                  special, consequential, or punitive damages resulting from your
                  use of the service.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-[color:var(--color-text)] mb-3">
                  Changes to Terms
                </h2>
                <p>
                  We reserve the right to modify these terms at any time. We will
                  notify users of any changes by posting the new Terms and
                  Conditions on this page.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-[color:var(--color-text)] mb-3">
                  Contact Us
                </h2>
                <p>
                  If you have any questions about these Terms and Conditions,
                  please contact us through our website.
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
