"use client";

import React, { useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePreviewMobileLayout } from "@/hooks/use-preview-narrow-layout";
import { cn } from "@/lib/utils";

interface MoreInfo {
  id?: number;
  title?: string;
  description?: string;
  button_text?: string;
  button_link?: string;
  background_image?: File | null;
  phone_number?: string;
  button_name?: string;
}

type MoreInfoList = {
  moreInfo: MoreInfo[];
};

export default function HotelSearch({ moreInfo }: MoreInfoList) {
  const narrowPreview = usePreviewMobileLayout();
  const filteredInfo = useMemo(() => {
    return moreInfo.filter((info) => {
      return (
        info.background_image instanceof File ||
        info.title ||
        info.description ||
        info.phone_number ||
        info.button_name ||
        info.button_link
      );
    });
  }, [moreInfo]);

  const urlRefs = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      urlRefs.current.forEach((url) => URL.revokeObjectURL(url));
      urlRefs.current = [];
    };
  }, []);

  const getBackgroundImageUrl = (image: File | null | undefined) => {
    if (!image || !(image instanceof File)) return null;
    const url = URL.createObjectURL(image);
    urlRefs.current.push(url);
    return url;
  };

  return (
    <section className="w-full bg-foreground dark:bg-background py-10">
      <div
        className={cn(
          "container grid grid-cols-1 gap-6",
          !narrowPreview && "md:grid-cols-2",
        )}
      >
        {filteredInfo.map((info, index) => {
          const bgImageUrl = getBackgroundImageUrl(info.background_image);
          return (
            <div
              key={index}
              className="h-[300px] sm:h-[350px] md:h-[400px] flex flex-col justify-center items-center text-center p-4 sm:p-6 bg-cover bg-center bg-no-repeat rounded-lg"
              style={{
                backgroundImage: bgImageUrl ? `url(${bgImageUrl})` : undefined,
                backgroundColor: !bgImageUrl ? "#000" : "transparent",
              }}
            >
              <h2
                className={`text-2xl sm:text-3xl font-bold ${
                  !bgImageUrl ? "text-background" : "text-foreground"
                }`}
              >
                {info.title || "Untitled"}
              </h2>
              <p
                className={`text-xs sm:text-sm py-2 sm:py-3 max-w-xs mx-auto ${
                  !bgImageUrl ? "text-background" : "text-foreground"
                }`}
              >
                {info.description || "No description provided"}
              </p>
              <p className="text-lg sm:text-xl text-muted-foreground">
                {info.phone_number || "N/A"}
              </p>
              {info.button_name && info.button_link ? (
                <Link
                  href={info.button_link}
                  className="mt-4 sm:mt-5 inline-block rounded-full bg-foreground text-background py-2 sm:py-3 px-5 sm:px-6 text-xs sm:text-sm hover:bg-foreground/90"
                >
                  {info.button_name}
                </Link>
              ) : (
                <Button
                  variant="outline"
                  className="mt-4 sm:mt-5 rounded-full py-2 sm:py-3 px-5 sm:px-6 text-xs sm:text-sm"
                  disabled
                >
                  Find Out More
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
