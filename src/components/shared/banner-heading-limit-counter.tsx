import { BANNER_HEADING_MAX_CHARS } from "@/lib/hero-copy-limits";
import { BANNER_HEADING_MAX_WORDS, countWords } from "@/lib/word-count";
import { cn } from "@/lib/utils";

/**
 * Hero heading counter. The input enforces both caps, so both are shown —
 * otherwise typing stops at 80 characters while the word count still looks open.
 */
export function BannerHeadingLimitCounter({
  value,
  className,
}: {
  value: string | null | undefined;
  className?: string;
}) {
  const text = value ?? "";
  const words = countWords(text);
  const chars = text.length;
  const atCharLimit = chars >= BANNER_HEADING_MAX_CHARS;
  const atWordLimit = words >= BANNER_HEADING_MAX_WORDS;

  return (
    <p className={cn("mt-1 text-xs text-muted-foreground", className)}>
      <span className={cn(atWordLimit && "font-medium")}>
        {words}/{BANNER_HEADING_MAX_WORDS} words
      </span>
      <span aria-hidden> · </span>
      <span className={cn(atCharLimit && "font-medium")}>
        {chars}/{BANNER_HEADING_MAX_CHARS} characters
      </span>
      {atCharLimit ? (
        <span className="block font-medium">
          Character limit reached. Shorten a word to add more.
        </span>
      ) : null}
    </p>
  );
}
