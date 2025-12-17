"use client";

import { ImageIcon } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/hooks/use-onboarding";

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
  const { textColorClass } = useOnboarding();

  const getImageSrc = (image: PackageImage | File | null | string) => {
    if (typeof image === "string") return image;
    if (image instanceof File) return URL.createObjectURL(image);
    if (image?.preview) return image.preview;
    if (image?.path) return image.path;
    return "/assets/images/gallery-image.png";
  };
  return (
    <section className="w-full max-w-6xl mx-auto px-6 py-12">
      <div className="flex flex-col md:flex-row gap-10 items-start">
        {/* LEFT: Package Image Card */}
        <div className="w-full md:w-1/2">
          <div className="bg-white rounded-lg shadow-md overflow-hidden border">
            {image ? (
              <div className="relative p-4 w-full bg-gray-50 flex items-center justify-center">
                <Image
                  src={getImageSrc(image)}
                  alt="Package Image"
                  width={500}
                  height={400}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              <div className="bg-gray-50 flex items-center justify-center h-80">
                <ImageIcon className="w-16 h-16 text-gray-400" />
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Package Details */}
        <div className="w-full md:w-1/2 overflow-hidden">
          <h2 className={`text-2xl font-bold break-words ${textColorClass}`}>
            {heading || "The Package"}
          </h2>
          <p
            className={`text-sm mt-1 break-words whitespace-normal overflow-hidden max-w-full ${textColorClass}`}
            style={{
              wordBreak: "break-word",
              overflowWrap: "break-word",
              hyphens: "auto",
            }}
          >
            {subHeading || "Prices From £65 Plus VAT Include:"}
          </p>

          <ul className="space-y-3 mt-6">
            {(packageDetails?.length > 0
              ? packageDetails
              : Array(10).fill({ title: "Package Info" })
            ).map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="bg-black w-5 h-5 rounded-full flex items-center justify-center mt-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-2.5 h-2.5 text-white"
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
                <p className={`text-sm font-medium ${textColorClass}`}>
                  {item.title}
                </p>
              </li>
            ))}
          </ul>

          {/* Button */}
          <div className="mt-6">
            <Button
              asChild
              className="px-6 py-2 bg-black hover:bg-gray-800 transition rounded-lg "
            >
              <a
                href={buttonLink || "#"}
                target="_blank"
                rel="noopener noreferrer"
              >
                {buttonName || "Book Your Event Now"}
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
