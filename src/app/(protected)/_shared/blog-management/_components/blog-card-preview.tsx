"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBlogDate } from "../_lib/schema";

interface BlogCardPreviewProps {
  title: string;
  excerpt: string;
  publishedAt: string;
  coverImage: string;
  className?: string;
}

export function BlogCardPreview({
  title,
  excerpt,
  publishedAt,
  coverImage,
  className,
}: BlogCardPreviewProps) {
  const hasImage = Boolean(coverImage);

  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-sm",
        className,
      )}
    >
      <div className="relative h-44 overflow-hidden bg-slate-100">
        {hasImage ? (
          <Image
            src={coverImage}
            alt={title || "Featured image"}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 360px"
            unoptimized={
              coverImage.startsWith("blob:") || coverImage.startsWith("data:")
            }
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Featured image preview
          </div>
        )}
      </div>

      <div className="space-y-2 p-5">
        <p className="text-xs font-medium text-muted-foreground">
          {publishedAt ? formatBlogDate(publishedAt) : "Publication date"}
        </p>
        <h3 className="line-clamp-2 text-base font-bold leading-snug text-foreground">
          {title || "Article title"}
        </h3>
        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {excerpt || "Short excerpt will appear here for the news card."}
        </p>
        <div className="flex items-center gap-1.5 pt-1 text-sm font-semibold text-[var(--color-primary)]">
          <span>Read Article</span>
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </article>
  );
}
