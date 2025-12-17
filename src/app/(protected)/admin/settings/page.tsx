import { PageLoader } from "@/components/ui/page-loader";
import { Suspense } from "react";
import { SettingsTab } from "./_components/settings-tabs";

interface PageProps {
  searchParams: Record<string, string | string[] | undefined>;
}
export default async function Page(props: PageProps) {
  return (
    <Suspense fallback={<PageLoader />}>
      <section className="w-full relative flex flex-col space-y-8">
        <header className="bg-background p-6 rounded-md">
          <nav className="w-full">
            <h2 className="text-2xl title font-bold">Settings</h2>
          </nav>
        </header>
      </section>
      <section className="w-full relative flex flex-col space-y-8">
        <SettingsTab />
      </section>
    </Suspense>
  );
}
