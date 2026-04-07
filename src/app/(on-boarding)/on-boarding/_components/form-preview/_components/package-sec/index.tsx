"use client";

import { ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/hooks/use-onboarding";
import { addCacheBusting } from "@/lib/image-utils";
import { useCurrencySymbol } from "@/hooks/use-currency-format";

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

export default function PackageSection({
  heading,
  subHeading,
  image,
  buttonName,
  buttonLink,
  packageDetails,
}: PackageSectionProps) {
  const { isOnboarding, textColorClass } = useOnboarding();
  const currencySymbol = useCurrencySymbol();
  /** Vendor/live pages use theme tokens; onboarding builder keeps explicit black for the preview canvas. */
  const bodyTextClass = isOnboarding
    ? textColorClass
    : "text-[var(--color-text)]";

  const getImageSrc = (image: PackageImage | File | null | string) => {
    if (typeof image === "string") return image;
    if (image instanceof File) return URL.createObjectURL(image);
    if (image?.preview) return image.preview;
    if (image?.path) return image.path;
    return "/assets/images/gallery-image.png";
  };
  return (
    <section className="mx-auto w-full max-w-6xl bg-[var(--color-background)] px-6 py-12">
      <div className="flex flex-col items-start gap-10 md:flex-row">
        {/* LEFT: Package Image Card */}
        <div className="w-full md:w-1/2">
          <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-md">
            {image ? (
              <div className="relative flex w-full items-center justify-center bg-muted p-4">
                <img
                  src={addCacheBusting(getImageSrc(image))}
                  alt="Package Image"
                  width={500}
                  height={400}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              <div className="flex h-80 items-center justify-center bg-muted">
                <ImageIcon className="h-16 w-16 text-[var(--color-text-dimmed)]" />
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Package Details */}
        <div className="w-full overflow-hidden md:w-1/2">
          <h2 className={`break-words text-2xl font-bold ${bodyTextClass}`}>
            {heading || "The Package"}
          </h2>
          <p
            className={`mt-1 max-w-full overflow-hidden whitespace-normal break-words text-sm ${bodyTextClass}`}
            style={{
              wordBreak: "break-word",
              overflowWrap: "break-word",
              hyphens: "auto",
            }}
          >
            {subHeading || `Prices From ${currencySymbol}65 Plus VAT Include:`}
          </p>

          <ul className="space-y-3 mt-6">
            {(packageDetails?.length > 0
              ? packageDetails
              : Array(10).fill({ title: "Package Info" })
            ).map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-2.5 w-2.5 text-[var(--color-primary-foreground)]"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <p className={`text-sm font-medium ${bodyTextClass}`}>
                  {item.title}
                </p>
              </li>
            ))}
          </ul>

          {/* Button: smooth scroll for in-page anchors, normal link for external URLs */}
          <div className="mt-6">
            {buttonLink?.startsWith("#") ? (
              <Button
                type="button"
                variant="event-primary"
                size="lg"
                className="rounded-lg px-6"
                onClick={() => {
                  const id = buttonLink.slice(1);
                  const el = id ? document.getElementById(id) : null;
                  el?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                {buttonName || "Book Your Event Now"}
              </Button>
            ) : (
              <Button
                asChild
                variant="event-primary"
                size="lg"
                className="rounded-lg px-6"
              >
                <a
                  href={buttonLink || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {buttonName || "Book Your Event Now"}
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
