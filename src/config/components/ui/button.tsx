import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-primary,var(--primary))] text-[var(--color-primary-foreground,#fff)] shadow-xs hover:bg-[var(--color-primary-hover,var(--color-primary,var(--primary)))] hover:text-[var(--color-primary-foreground,#fff)] cursor-pointer",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90 hover:text-white focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 cursor-pointer",
        outline:
          "border bg-background text-foreground shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 cursor-pointer",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80 hover:text-secondary-foreground cursor-pointer",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 cursor-pointer",
        link: "text-primary underline-offset-4 hover:underline cursor-pointer",
        "event-primary":
          "bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover,var(--color-primary))] text-[var(--color-primary-foreground,#fff)] hover:text-[var(--color-primary-foreground,#fff)] border-[var(--color-primary)] hover:scale-[1.03] transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer",
        "event-secondary":
          "bg-[var(--color-secondary)] hover:bg-[var(--color-secondary-hover,var(--color-secondary))] text-[var(--color-secondary-foreground,#fff)] hover:text-[var(--color-secondary-foreground,#fff)] border-[var(--color-secondary)] hover:scale-[1.03] transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer",
        "event-outline":
          "bg-[#f8fafa] border border-[var(--color-primary)] text-[var(--color-primary)] shadow-xs hover:bg-[var(--color-primary)] hover:text-[var(--color-primary-foreground,#fff)] hover:scale-[1.02] hover:border-[var(--color-primary-hover,var(--color-primary))] transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md ",
        "event-ghost":
          "text-[var(--color-primary)] hover:text-[var(--color-primary-hover,var(--color-primary))] hover:underline hover:bg-[#f8fafa] transition-all duration-200 cursor-pointer",
        "event-social":
          "flex items-center justify-center rounded border border-gray-200 bg-white hover:bg-gray-50 hover:scale-[1.02] transition-all duration-200 cursor-pointer",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        xl: "h-11 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant ?? "default"}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
