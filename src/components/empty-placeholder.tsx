import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyPlaceholderProps {
  icon?: ReactNode;
  title: string;
  description: string;
  className?: string;
  children?: ReactNode;
}

export function EmptyPlaceholder({
  icon,
  title,
  description,
  className,
  children,
}: EmptyPlaceholderProps) {
  return (
    <div
      className={cn(
        "flex min-h-[400px] flex-col items-center justify-center rounded-md border border-dashed p-8 text-center animate-in fade-in-50",
        className
      )}
    >
      {icon && (
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          {icon}
        </div>
      )}
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 mb-4 text-sm text-muted-foreground max-w-sm mx-auto">
        {description}
      </p>
      {children}
    </div>
  );
}
