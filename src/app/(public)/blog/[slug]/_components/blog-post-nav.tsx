import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { BlogPost } from "@/lib/blogs";

interface BlogPostNavProps {
  previous: BlogPost | null;
  next: BlogPost | null;
}

export function BlogPostNav({ previous, next }: BlogPostNavProps) {
  if (!previous && !next) return null;

  return (
    <nav className="mt-10 flex flex-col gap-4 border-t border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] pt-8 sm:mt-16 sm:flex-row sm:items-start sm:justify-between sm:gap-10 sm:pt-10">
      {previous ? (
        <Link
          href={`/blog/${previous.slug}`}
          className="group flex w-full items-start gap-2 text-left uppercase tracking-[0.12em] text-[color:var(--color-text-dimmed)] transition-colors hover:text-[color:var(--color-primary)] sm:max-w-sm"
        >
          <ChevronLeft className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="text-[11px] leading-relaxed sm:text-xs">
            {previous.title}
          </span>
        </Link>
      ) : (
        <span className="hidden sm:block" />
      )}

      {next ? (
        <Link
          href={`/blog/${next.slug}`}
          className="group flex w-full items-start gap-2 text-left uppercase tracking-[0.12em] text-[color:var(--color-text-dimmed)] transition-colors hover:text-[color:var(--color-primary)] sm:ml-auto sm:max-w-sm sm:justify-end sm:text-right"
        >
          <span className="order-2 text-[11px] leading-relaxed sm:order-1 sm:text-xs">
            {next.title}
          </span>
          <ChevronRight className="order-1 mt-0.5 h-4 w-4 shrink-0 sm:order-2" />
        </Link>
      ) : null}
    </nav>
  );
}
