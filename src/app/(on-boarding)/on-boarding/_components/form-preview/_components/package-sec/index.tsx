"use client";

import type { ReactNode } from "react";
import { Check, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addCacheBusting } from "@/lib/image-utils";
import { useCurrencySymbol } from "@/hooks/use-currency-format";
import { cn } from "@/lib/utils";

type PackageDetail = {
  title: string;
  description?: string;
};

type PackageImage = {
  path: string;
  relativePath: string;
  preview: string;
};

type PackageSectionProps = {
  heading: string;
  subHeading: string;
  image?: PackageImage | File | null | string;
  buttonName: string;
  buttonLink: string;
  packageDetails: PackageDetail[];
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
  buttonName,
  buttonLink,
  packageDetails,
}: PackageSectionProps) {
  const currencySymbol = useCurrencySymbol();

  const getImageSrc = (img: PackageImage | File | null | string) => {
    if (typeof img === "string") return img;
    if (img instanceof File) return URL.createObjectURL(img);
    if (img?.preview) return img.preview;
    if (img?.path) return img.path;
    return "/assets/images/gallery-image.png";
  };

  const details =
    packageDetails?.length > 0 ? packageDetails : [];

  const cta = (
    <>
      {buttonLink?.startsWith("#") ? (
        <Button
          type="button"
          variant="event-primary"
          size="lg"
          className="h-12 w-full rounded-full px-8 text-base font-bold sm:w-auto"
          onClick={() => {
            const id = buttonLink.slice(1);
            document
              .getElementById(id)
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        >
          {buttonName || "Book Now"}
        </Button>
      ) : (
        <Button
          asChild
          variant="event-primary"
          size="lg"
          className="h-12 w-full rounded-full px-8 text-base font-bold sm:w-auto"
        >
          <a href={buttonLink || "#"} target="_blank" rel="noopener noreferrer">
            {buttonName || "Book Now"}
          </a>
        </Button>
      )}
    </>
  );

  return (
    <section className="w-full bg-[var(--color-background)] px-4 py-14 md:py-20">
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col gap-10 md:flex-row md:items-center md:gap-12 lg:gap-16">
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
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.28em] text-[color:var(--color-primary)]">
              Packages
            </p>
            <h2 className="text-2xl font-black tracking-tight text-[var(--color-text)] md:text-3xl lg:text-4xl">
              {heading || "The Package"}
            </h2>
            <p className="mt-2 text-base font-semibold leading-snug text-[var(--color-text)] md:text-lg">
              {highlightPricesInText(
                subHeading ||
                  `Prices From ${currencySymbol}65 Plus VAT Include:`,
                currencySymbol,
              )}
            </p>

            {details.length > 0 ? (
              <>
                <p className="mb-3 mt-6 text-xs font-medium text-[var(--color-text-dimmed)]">
                  Include:
                </p>
                <ul className="space-y-3">
                  {details.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
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
                      <span className="text-sm font-medium leading-snug text-[var(--color-text)] md:text-base">
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

            <div className="relative mt-10 inline-flex w-full sm:w-auto">
              <span
                className="pointer-events-none absolute left-1/2 top-[58%] h-14 w-[min(100%,20rem)] -translate-x-1/2 -translate-y-1/2 rounded-[999px] bg-[color:var(--color-primary)] opacity-[0.2] blur-[28px]"
                aria-hidden
              />
              <span
                className="pointer-events-none absolute left-[55%] top-[70%] h-10 w-32 -translate-x-1/2 -translate-y-1/2 rounded-[999px] bg-[color:var(--color-primary)] opacity-[0.16] blur-[22px]"
                aria-hidden
              />
              <div className="relative z-[1] w-full sm:w-auto">{cta}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
