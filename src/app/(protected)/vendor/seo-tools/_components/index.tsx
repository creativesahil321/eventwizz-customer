import { pageCardClassName } from "@/app/(protected)/_components/page-header-card";

export default function SeoTools() {
  const title = "SEO Checker - Optimize & Analyze Your Website";
  const description =
    "Analyze and optimize your website's SEO performance with our powerful SEO Checker. Get insights, recommendations, and improve search rankings effortlessly.";
  return (
    <>
      <header
        className={pageCardClassName(
          "mb-4 flex w-full items-center justify-between gap-2 overflow-auto text-black min-w-0",
        )}
      >
        <nav className="flex flex-col justify-start items-start gap-2 relative">
          <h1 className="text-2xl mb-0 title-header font-bold">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </nav>
      </header>
    </>
  );
}
