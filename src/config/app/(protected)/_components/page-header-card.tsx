import { cn } from "@/lib/utils";

export const PAGE_CARD_CLASS =
  "bg-white rounded-lg border border-[var(--color-border)] shadow-md";

export const PAGE_CARD_PADDING_CLASS = "p-4 sm:p-6";

export function pageCardClassName(className?: string) {
  return cn(PAGE_CARD_CLASS, PAGE_CARD_PADDING_CLASS, className);
}

interface ProtectedPageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function ProtectedPageHeader({
  title,
  description,
  actions,
  className,
}: ProtectedPageHeaderProps) {
  return (
    <div className={pageCardClassName(className)}>
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-black title-header sm:text-2xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground sm:mt-2 sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </div>
  );
}
