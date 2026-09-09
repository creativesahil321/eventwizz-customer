"use client";

import { FileText, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SupportAttachment } from "@/app/(protected)/customer/support/_lib/types";

function isImageAttachment(file: SupportAttachment): boolean {
  return (
    Boolean(file.mimeType?.startsWith("image/")) ||
    /\.(png|jpe?g|gif|webp|jfif)$/i.test(file.name)
  );
}

interface SupportAttachmentCardsProps {
  attachments: SupportAttachment[];
  align?: "left" | "right";
  className?: string;
}

/**
 * Message-thread attachment list.
 * Images render as clickable thumbnails; other files as download chips.
 */
export default function SupportAttachmentCards({
  attachments,
  align = "left",
  className,
}: SupportAttachmentCardsProps) {
  if (!attachments.length) return null;

  return (
    <div
      className={cn(
        "mt-1 flex max-w-full flex-wrap gap-1.5",
        align === "right" ? "justify-end" : "justify-start",
        className
      )}
    >
      {attachments.map((file) => {
        const isImage = isImageAttachment(file);
        const url = file.url?.trim() || undefined;
        const key = `${file.name}-${url ?? file.size}`;

        if (isImage && url) {
          return (
            <a
              key={key}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-colors hover:border-slate-300"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- remote storage URLs from API */}
              <img
                src={url}
                alt={file.name}
                className="h-40 w-auto max-w-[min(100%,280px)] object-cover"
              />
              <div className="border-t border-slate-100 px-2 py-1">
                <p className="max-w-[180px] truncate text-[10px] font-medium text-foreground">
                  {file.name}
                </p>
                {file.size ? (
                  <p className="text-[9px] text-muted-foreground">{file.size}</p>
                ) : null}
              </div>
            </a>
          );
        }

        const content = (
          <>
            <div
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-md",
                isImage ? "bg-blue-50" : "bg-red-50"
              )}
            >
              {isImage ? (
                <ImageIcon className="size-3.5 text-blue-600" />
              ) : (
                <FileText className="size-3.5 text-red-600" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-medium text-foreground">
                {file.name}
              </p>
              {file.size ? (
                <p className="text-[10px] text-muted-foreground">{file.size}</p>
              ) : null}
            </div>
          </>
        );

        if (url) {
          return (
            <a
              key={key}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-w-[120px] max-w-[180px] flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              {content}
            </a>
          );
        }

        return (
          <div
            key={key}
            className="flex min-w-[120px] max-w-[180px] flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm"
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}
