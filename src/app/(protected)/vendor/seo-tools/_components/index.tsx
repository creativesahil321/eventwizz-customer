import { pageCardClassName } from "@/app/(protected)/_components/page-header-card";
import { LocationScopedTitle } from "@/components/location-indicator";

export default function SeoTools() {
  return (
    <>
      <header
        className={pageCardClassName(
          "mb-4 flex w-full items-center justify-between gap-2 overflow-auto text-black min-w-0",
        )}
      >
        <nav className="relative flex flex-col items-start justify-start gap-2">
          <h1 className="title-header mb-0 text-2xl font-bold">
            <LocationScopedTitle title="SEO Tools" />
          </h1>
          <p className="text-muted-foreground">
            Check and improve search visibility for this venue&apos;s public
            site. Switch location in the header to analyse another venue.
          </p>
        </nav>
      </header>
    </>
  );
}
