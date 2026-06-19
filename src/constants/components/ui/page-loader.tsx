import { Loader } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageLoaderProps {
  size?: number;
  className?: string;
  fullScreen?: boolean;
  text?: string;
}

export function PageLoader({
  size = 24,
  className,
  fullScreen = true,
  text,
}: Readonly<PageLoaderProps>) {
  return (
    <section
      className={cn(
        "flex w-full h-full items-center justify-center flex-col",
        fullScreen && "min-h-screen",
        !fullScreen && "py-12"
      )}
    >
      <Loader
        className={cn(
          "animate animate-spin text-[var(--color-primary)]",
          className
        )}
        size={size}
      />
      {text && <p className="mt-4 text-muted-foreground text-sm">{text}</p>}
    </section>
  );
}
