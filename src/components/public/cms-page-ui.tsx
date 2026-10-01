import type { ReactNode } from "react";

/** Shared rich-text styles for CMS HTML content */
export const CMS_PROSE_CLASS =
  "cms-prose text-[15px] leading-7 text-[color:var(--color-text-dimmed)] md:text-base md:leading-8 " +
  "[&_p]:mb-4 [&_p:last-child]:mb-0 " +
  "[&_strong]:font-semibold [&_strong]:text-[color:var(--color-text)] " +
  "[&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-[color:var(--color-text)] md:[&_h2]:text-xl [&_h2:first-child]:mt-0 " +
  "[&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-[color:var(--color-text)] md:[&_h3]:text-lg [&_h3:first-child]:mt-0 " +
  "[&_em]:italic " +
  "[&_ul]:mb-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 " +
  "[&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 " +
  "[&_li]:pl-1 " +
  "[&_a]:font-medium [&_a]:text-[color:var(--color-primary)] [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:opacity-80 " +
  "[&_table]:mt-4 [&_table]:w-full [&_table]:overflow-hidden [&_table]:rounded-lg [&_table]:border [&_table]:border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] " +
  "[&_th]:bg-[color:color-mix(in_srgb,var(--color-text)_4%,transparent)] [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:text-sm [&_th]:font-semibold [&_th]:text-[color:var(--color-text)] " +
  "[&_td]:border-t [&_td]:border-[color:color-mix(in_srgb,var(--color-text)_8%,transparent)] [&_td]:px-4 [&_td]:py-3 [&_td]:align-top [&_td]:text-sm";

export function CmsContentPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[color:color-mix(in_srgb,var(--color-text)_8%,transparent)] bg-[color:var(--color-surface)] p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] md:p-8 lg:p-10 ${className}`}
    >
      {children}
    </div>
  );
}

interface CmsPageLayoutProps {
  header: ReactNode;
  footer: ReactNode;
  brandName: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  wide?: boolean;
}

export function CmsPageLayout({
  header,
  footer,
  brandName,
  title,
  subtitle,
  children,
  wide = false,
}: CmsPageLayoutProps) {
  return (
    // Full-height column: on tall screens (TV / zoomed out) the footer stays at the bottom.
    <div className="flex min-h-screen flex-col bg-[color:var(--color-background)]">
      {header}
      <main className="min-h-[60vh] flex-1 bg-[color:var(--color-background)] pt-20 md:pt-24">
        <section className="border-b border-[color:color-mix(in_srgb,var(--color-text)_8%,transparent)] bg-[color:color-mix(in_srgb,var(--color-text)_3%,var(--color-surface))] py-8 md:py-10 lg:py-12">
          <div
            className={`mx-auto px-4 md:px-6 ${wide ? "max-w-6xl" : "max-w-4xl"}`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-primary)]">
              {brandName}
            </p>
            <h1
              className="mt-3 text-3xl font-bold tracking-tight text-[color:var(--color-text)] md:mt-4 md:text-4xl lg:text-[2.75rem] lg:leading-tight @max-md/preview:!text-3xl"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-[color:var(--color-text-dimmed)] md:text-lg @max-md/preview:!text-base">
                {subtitle}
              </p>
            ) : null}
          </div>
        </section>

        <section className="py-10 md:py-14">
          <div
            className={`mx-auto px-4 md:px-6 ${wide ? "max-w-6xl" : "max-w-4xl"}`}
          >
            {children}
          </div>
        </section>
      </main>
      {footer}
    </div>
  );
}
