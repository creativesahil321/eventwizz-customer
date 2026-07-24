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
    <nav className="mt-16 flex flex-col gap-6 border-t border-[color:color-mix(in_srgb,var(--color-text)_10%,transparent)] pt-10 sm:flex-row sm:items-start sm:justify-between sm:gap-10">
      {previous ? (
        <Link
          href={`/blog/${previous.slug}`}
          className="group flex max-w-sm items-start gap-2 text-left uppercase tracking-[0.12em] text-[color:var(--color-text-dimmed)] transition-colors hover:text-[color:var(--color-primary)]"
        >
          <ChevronLeft className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="text-xs leading-relaxed">{previous.title}</span>
        </Link>
      ) : (
        <span />
      )}

      {next ? (
        <Link
          href={`/blog/${next.slug}`}
          className="group flex max-w-sm items-start justify-end gap-2 text-right uppercase tracking-[0.12em] text-[color:var(--color-text-dimmed)] transition-colors hover:text-[color:var(--color-primary)] sm:ml-auto"
        >
          <span className="text-xs leading-relaxed">{next.title}</span>
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0" />
        </Link>
      ) : null}
    </nav>
  );
}
