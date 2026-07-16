"use client";

import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import { addCacheBusting } from "@/lib/image-utils";

function isValidUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function isYouLabel(name: string | null | undefined): boolean {
  return !name?.trim() || name.trim().toLowerCase() === "you";
}

export type SupportMessageAvatarVariant =
  | "self"
  | "other"
  | "agent"
  | "internal";

interface SupportMessageAvatarProps {
  name: string;
  image?: string | null;
  variant?: SupportMessageAvatarVariant;
  className?: string;
}

/**
 * Chat avatar that never renders a lone "Y" for "You" — that looks like a
 * mini message bubble next to the primary-colored reply. Uses a user icon
 * instead, with a neutral self style so it stays distinct from bubbles.
 */
export default function SupportMessageAvatar({
  name,
  image,
  variant = "other",
  className,
}: SupportMessageAvatarProps) {
  if (isValidUrl(image)) {
    return (
      <img
        src={addCacheBusting(image as string)}
        alt={name || "You"}
        className={cn(
          "size-7 shrink-0 rounded-full object-cover shadow-sm ring-1 ring-white",
          className
        )}
      />
    );
  }

  const showUserIcon = isYouLabel(name);

  return (
    <div
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold shadow-sm ring-1 ring-white",
        variant === "self" &&
          "border border-slate-300 bg-white text-slate-600",
        variant === "other" && "bg-slate-200 text-slate-700",
        variant === "agent" && "bg-slate-200 text-slate-700",
        variant === "internal" && "bg-amber-200 text-amber-900",
        className
      )}
      aria-hidden
    >
      {showUserIcon ? (
        <User className="size-3.5" strokeWidth={2.25} />
      ) : (
        (name.trim().charAt(0) || "?").toUpperCase()
      )}
    </div>
  );
}
