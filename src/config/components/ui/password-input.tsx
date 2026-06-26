"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type PasswordInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type"
> & {
  /** Screen reader context, e.g. "confirm password" → "Show confirm password". */
  ariaPasswordField?: string;
};

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(
    { className, ariaPasswordField, disabled, ...props },
    ref,
  ) {
    const [visible, setVisible] = React.useState(false);
    const showLabel = ariaPasswordField
      ? `Show ${ariaPasswordField}`
      : "Show password";
    const hideLabel = ariaPasswordField
      ? `Hide ${ariaPasswordField}`
      : "Hide password";

    return (
      <div className="relative w-full">
        <Input
          ref={ref}
          type={visible ? "text" : "password"}
          disabled={disabled}
          className={cn("pr-10", className)}
          {...props}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800 disabled:pointer-events-none disabled:opacity-50"
          aria-label={visible ? hideLabel : showLabel}
        >
          {visible ? (
            <EyeOff className="h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <Eye
              className="h-4 w-4 shrink-0 text-[var(--color-primary)]"
              aria-hidden
            />
          )}
        </button>
      </div>
    );
  },
);

PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
