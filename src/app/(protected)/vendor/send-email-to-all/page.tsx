import { Shell } from "@/components/shell";
import EmailForm from "./_components/email-form";
import React from "react";
import { PageLoader } from "@/components/ui/page-loader";
import { BackButton } from "@/components/ui/back-button";
import { PermissionRoute } from "@/components/permission";

export const metadata = {
  title: "Send Email to All",
  description: "Change your email settings",
};

export default async function Page() {
  return (
    <PermissionRoute
      permissionKey="send-mail-to-all-customers"
      fallbackPath="/vendor/customers"
    >
      <section className="page">
        <Shell className="gap-2">
          <React.Suspense
            fallback={
              <section className="flex min-h-screen bg-background rounded-md w-full items-center justify-center flex-col">
                <PageLoader />
              </section>
            }
          >
            <>
              <section className="relative w-full">
                <section className="w-full space-y-6 overflow-auto">
                  <BackButton
                    href="/vendor/customers"
                    label="Back to Customers"
                  />
                  <header className="flex w-full items-center justify-between gap-2 overflow-auto bg-background p-6 border rounded-lg">
                    <nav className="items-center gap-2 relative">
                      <h2 className="text-2xl title-header font-bold">
                        Send Email to All Customers
                      </h2>
                    </nav>
                  </header>
                  <main className="w-full space-y-2.5 overflow-auto">
                    <EmailForm />
                  </main>
                </section>
              </section>
            </>
          </React.Suspense>
        </Shell>
      </section>
    </PermissionRoute>
  );
}
