"use client";

import * as React from "react";
import {
  Check,
  Copy,
  Facebook,
  Linkedin,
  Share2,
  Twitter,
} from "lucide-react";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface BlogShareButtonProps {
  title: string;
  excerpt: string;
  slug: string;
  className?: string;
  align?: "left" | "center" | "right";
}

export function BlogShareButton({
  title,
  excerpt,
  slug,
  className,
  align = "right",
}: BlogShareButtonProps) {
  const [copied, setCopied] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  const getShareUrl = React.useCallback(() => {
    if (typeof window === "undefined") return `/blog/${slug}`;
    return `${window.location.origin}/blog/${slug}`;
  }, [slug]);

  const handleShareClick = async (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    // Prefer native share sheet on mobile / supporting browsers
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      event.preventDefault();
      try {
        await navigator.share({
          title,
          text: excerpt,
          url: getShareUrl(),
        });
        setOpen(false);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        // Fall through to menu
      }
    }
    setOpen((prev) => !prev);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopied(true);
      toast.success("Link copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  };

  const openWindow = (href: string) => {
    window.open(href, "_blank", "noopener,noreferrer,width=600,height=520");
    setOpen(false);
  };

  const encodedUrl =
    typeof window !== "undefined"
      ? encodeURIComponent(getShareUrl())
      : encodeURIComponent(`/blog/${slug}`);
  const encodedTitle = encodeURIComponent(title);

  return (
    <div
        className={cn(
          "flex",
          align === "left" && "justify-start",
          align === "center" && "justify-center",
          align === "right" && "justify-end",
          // On small screens, center share for easier tapping when right-aligned
          align === "right" && "max-sm:justify-center",
          className,
        )}
      >      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            onClick={(event) => void handleShareClick(event)}
            className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-[color:var(--color-text-dimmed)] transition-colors hover:text-[color:var(--color-primary)]"
            aria-label="Share this article"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-56 p-2">
          <p className="px-2 pb-2 pt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Share this
          </p>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground hover:bg-muted"
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? "Copied" : "Copy link"}
          </button>
          <button
            type="button"
            onClick={() =>
              openWindow(
                `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
              )
            }
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground hover:bg-muted"
          >
            <Twitter className="h-4 w-4" />
            X / Twitter
          </button>
          <button
            type="button"
            onClick={() =>
              openWindow(
                `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
              )
            }
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground hover:bg-muted"
          >
            <Facebook className="h-4 w-4" />
            Facebook
          </button>
          <button
            type="button"
            onClick={() =>
              openWindow(
                `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
              )
            }
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground hover:bg-muted"
          >
            <Linkedin className="h-4 w-4" />
            LinkedIn
          </button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
