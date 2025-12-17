import * as React from "react";

import { cn } from "@/lib/utils";

function Input({
  className,
  type,
  onWheel,
  ...props
}: React.ComponentProps<"input">) {
  // Prevent scroll from changing number input values
  const handleWheel = React.useCallback(
    (e: React.WheelEvent<HTMLInputElement>) => {
      // If it's a number input and has focus, prevent scroll from changing value
      if (type === "number" && document.activeElement === e.currentTarget) {
        e.currentTarget.blur();
      }
      onWheel?.(e);
    },
    [type, onWheel]
  );

  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-[var(--color-primary)] selection:text-[var(--color-primary-foreground)] dark:bg-input/30 border-input flex h-12 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-black shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        // Hide spinner arrows for number inputs
        type === "number" &&
          "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
        className
      )}
      onWheel={handleWheel}
      {...props}
    />
  );
}

export { Input };
