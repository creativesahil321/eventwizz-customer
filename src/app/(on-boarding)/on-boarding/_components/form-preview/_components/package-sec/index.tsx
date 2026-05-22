"use client";

import type { ReactNode } from "react";
import { Check, ImageIcon } from "lucide-react";
import { addCacheBusting } from "@/lib/image-utils";
import { useCurrencySymbol } from "@/hooks/use-currency-format";
import { cn } from "@/lib/utils";
import { SiteHeading } from "@/components/public/site-heading";
import type { HeadingEmphasis } from "@/lib/heading-emphasis";

type PackageDetail = {
  title: string;
  description?: string;
};

type PackageImage = {
  path: string;
  relativePath: string;
  preview: string;
};

function resolvePackageAccentHint(
  heading: string,
  headingAccentHint: string | null | undefined,
): string | null {
  if (headingAccentHint === null) return null;
  if (typeof headingAccentHint === "string" && headingAccentHint.trim() !== "") {
    return headingAccentHint.trim();
  }
  const h = (heading || "").trim();
  if (!h) return null;
  if (h.toLowerCase() === "packages") return null;
  return /\bpackages$/i.test(h) ? "Packages" : null;
}

type PackageSectionProps = {
  heading: string;
  subHeading: string;
  image?: PackageImage | File | null | string;
  packageDetails: PackageDetail[];
  /** Same as vendor theme `typography.headingEmphasis` (e.g. accent_tail) */
  headingEmphasis?: HeadingEmphasis | null;
  /** Optional substring of heading to style as trailing accent */
  headingAccentHint?: string | null;
};

function highlightPricesInText(
  text: string,
  currencySymbol: string,
): ReactNode {
  const sym = currencySymbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `\\b(?:${sym})?\\s*[\\d][\\d,]*(?:\\.[\\d]{2})?\\b|\\b[\\d][\\d,]*(?:\\.[\\d]{2})?\\s*(?:${sym})?\\b`,
    "g",
  );
  const nodes: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const r = new RegExp(re.source, "g");
  while ((m = r.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push(text.slice(last, m.index));
    }
    nodes.push(
      <span
        key={`${m.index}-${m[0]}`}
        className="font-black text-[color:var(--color-primary)]"
      >
        {m[0]}
      </span>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    nodes.push(text.slice(last));
  }
  return nodes.length > 0 ? nodes : text;
}

export default function PackageSection({
  heading,
  subHeading,
  image,
  packageDetails,
  headingEmphasis,
  headingAccentHint,
}: PackageSectionProps) {
  const currencySymbol = useCurrencySymbol();
  const subTrim = (subHeading || "").trim();
  const listIntroRedundant = /include\s*:?\s*$/i.test(subTrim);

  const getImageSrc = (img: PackageImage | File | null | string) => {
    if (typeof img === "string") return img;
    if (img instanceof File) return URL.createObjectURL(img);
    if (img?.preview) return img.preview;
    if (img?.path) return img.path;
    return "/assets/images/gallery-image.png";
  };

  const details = packageDetails?.length > 0 ? packageDetails : [];
  /** Keep tall lists compact next to the hero image (2 cols from md, 3 from lg). */
  const useMultiColumnList = details.length >= 6;
  const useThreeColumns = details.length >= 12;

  return (
    <section className="w-full bg-[var(--color-background)] px-4 py-20 md:py-28">
      <div className="container mx-auto max-w-7xl">
        <div
          className={cn(
            "flex flex-col gap-10 md:flex-row md:gap-12 lg:gap-16",
            useMultiColumnList ? "md:items-start" : "md:items-center",
          )}
        >
          <div className="w-full shrink-0 md:w-[46%] lg:w-[48%]">
            <div className="overflow-hidden rounded-3xl bg-[var(--color-surface)] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.22)] ring-1 ring-[color:color-mix(in_srgb,var(--color-text)_6%,transparent)]">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element -- blob / external URLs in preview
                <img
                  src={addCacheBusting(getImageSrc(image))}
                  alt=""
                  className="aspect-[4/3] w-full object-cover md:aspect-[5/4] lg:min-h-[320px]"
                />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center bg-[var(--color-surface)] md:aspect-[5/4]">
                  <ImageIcon className="h-16 w-16 text-[var(--color-text-dimmed)]" />
                </div>
              )}
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-primary)]">
              Packages
            </p>
            <SiteHeading
              level={2}
              title={heading || "Event Packages"}
              accentHint={resolvePackageAccentHint(heading, headingAccentHint)}
              emphasis={headingEmphasis ?? undefined}
              variant="onSurface"
              className="max-w-3xl min-w-0 !font-black !text-2xl !leading-[1.02] break-words [overflow-wrap:anywhere] md:!text-3xl lg:!text-4xl"
            />
            {subTrim ? (
              <p className="mt-2 max-w-full min-w-0 break-words text-base font-semibold leading-snug text-[var(--color-text)] [overflow-wrap:anywhere] md:text-lg">
                {highlightPricesInText(subTrim, currencySymbol)}
              </p>
            ) : null}

            {details.length > 0 ? (
              <>
                {!listIntroRedundant ? (
                  <p className="mb-3 mt-6 text-xs font-medium text-[var(--color-text-dimmed)]">
                    Include:
                  </p>
                ) : null}
                <ul
                  className={cn(
                    "m-0 grid list-none gap-x-8 gap-y-3 p-0",
                    listIntroRedundant && "mt-6",
                    useMultiColumnList && "sm:grid-cols-2",
                    useThreeColumns && "lg:grid-cols-3",
                  )}
                >
                  {details.map((item, i) => (
                    <li key={i} className="flex min-w-0 items-start gap-3">
                      <span
                        className={cn(
                          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                          "bg-[color:color-mix(in_srgb,var(--color-primary)_22%,var(--color-surface))]",
                        )}
                      >
                        <Check
                          className="h-3.5 w-3.5 text-[color:var(--color-primary)]"
                          strokeWidth={2.5}
                          aria-hidden
                        />
                      </span>
                      <span className="min-w-0 max-w-full break-words text-sm font-medium leading-snug text-[var(--color-text)] [overflow-wrap:anywhere] md:text-base">
                        {item.title}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-6 text-sm text-[var(--color-text-dimmed)]">
                Package inclusions will be listed here when available.
              </p>
            )}

          </div>
        </div>
      </div>
    </section>
  );
}
