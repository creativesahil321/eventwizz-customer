import SupportNav from "./_components/support-nav";
import SupportPageTitle from "./_components/support-page-title";
import { pageCardClassName } from "@/app/(protected)/_components/page-header-card";

export default function CustomerSupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="relative flex w-full min-w-0 max-w-full flex-col space-y-4 sm:space-y-6">
      <div className={pageCardClassName("min-w-0 max-w-full")}>
        <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <SupportPageTitle />
          <SupportNav />
        </div>
      </div>

      <div
        className={pageCardClassName(
          "min-w-0 max-w-full overflow-x-hidden"
        )}
      >
        {children}
      </div>
    </section>
  );
}
