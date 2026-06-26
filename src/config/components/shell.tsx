"use client";

import { type VariantProps, cva } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";
import { useDomainStore } from "@/store/domain.store";

const shellVariants = cva(
  "grid items-center transition-all duration-300 w-full min-w-0 px-0 md:px-4",
  {
    variants: {
      variant: {
        default: "",
        sidebar: "",
        centered:
          "md:container flex h-dvh max-w-2xl flex-col justify-center py-16",
        markdown: "md:container md:max-w-3xl",
      },
      collapsed: {
        true: "max-w-none",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      collapsed: false,
    },
  }
);

interface ShellProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof shellVariants> {
  as?: React.ElementType;
}

function Shell({
  className,
  as: Comp = "section",
  variant,
  collapsed: propCollapsed,
  ...props
}: ShellProps) {
  const { sidebarCollapsed: collapsed } = useDomainStore();
  const isCollapsed = propCollapsed !== undefined ? propCollapsed : collapsed;

  return (
    <Comp
      className={cn(
        shellVariants({ variant, collapsed: isCollapsed }),
        className
      )}
      {...props}
    />
  );
}

export { Shell, shellVariants };
