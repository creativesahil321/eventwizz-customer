"use client";

import * as React from "react";
import { CheckIcon, MinusIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type CheckedState = boolean | "indeterminate";

type CheckboxProps = Omit<
  React.ComponentProps<"button">,
  "checked" | "defaultChecked" | "onChange"
> & {
  checked?: CheckedState;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

/**
 * Non-Radix checkbox — Radix Checkbox + Presence hits React 19
 * "Maximum update depth exceeded" via useComposedRefs / usePresence.
 */
function Checkbox({
  className,
  checked,
  defaultChecked = false,
  onCheckedChange,
  disabled,
  onClick,
  ...props
}: CheckboxProps) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultChecked);
  const isControlled = checked !== undefined;
  const value: CheckedState = isControlled ? checked : uncontrolled;
  const isChecked = value === true;
  const isIndeterminate = value === "indeterminate";

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={isIndeterminate ? "mixed" : isChecked}
      disabled={disabled}
      data-slot="checkbox"
      data-state={
        isIndeterminate ? "indeterminate" : isChecked ? "checked" : "unchecked"
      }
      className={cn(
        "peer flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input shadow-xs transition-shadow outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
        "data-[state=checked]:border-[var(--color-secondary)] data-[state=checked]:bg-[var(--color-primary)] data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary",
        "data-[state=indeterminate]:border-[var(--color-secondary)] data-[state=indeterminate]:bg-[var(--color-primary)] data-[state=indeterminate]:text-primary-foreground",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
      onClick={(e) => {
        onClick?.(e);
        if (disabled || e.defaultPrevented) return;
        const next = !(isChecked || isIndeterminate);
        if (!isControlled) setUncontrolled(next);
        onCheckedChange?.(next);
      }}
    >
      {isIndeterminate ? (
        <MinusIcon className="size-3.5" />
      ) : isChecked ? (
        <CheckIcon className="size-3.5" />
      ) : null}
    </button>
  );
}

export { Checkbox };
