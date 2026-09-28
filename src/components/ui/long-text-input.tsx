"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export type LongTextInputProps = Omit<React.ComponentProps<"textarea">, "rows">;

/**
 * Single-line value, multi-line display — for 100+ character fields
 * (subheadings, short descriptions, FAQ questions). A plain `<Input>` hides
 * most of a 160-character line while the vendor types; this grows with the
 * content (from 2 lines) and blocks Enter so the value stays one line.
 *
 * Drop-in for `<Input>`: same `data-slot="input"` styling hooks, same
 * `onChange(e.target.value)` usage.
 */
const LongTextInput = React.forwardRef<HTMLTextAreaElement, LongTextInputProps>(
  function LongTextInput({ className, onKeyDown, onChange, value, ...props }, ref) {
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null);

    const setRefs = React.useCallback(
      (node: HTMLTextAreaElement | null) => {
        innerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [ref],
    );

    const fitHeight = React.useCallback(() => {
      const el = innerRef.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }, []);

    React.useLayoutEffect(fitHeight, [fitHeight, value]);

    return (
      <textarea
        ref={setRefs}
        rows={2}
        data-slot="input"
        value={value}
        className={cn(
          "placeholder:text-muted-foreground selection:bg-[var(--color-primary)] selection:text-[var(--color-primary-foreground)] dark:bg-input/30 border-input flex w-full min-w-0 resize-none overflow-hidden rounded-md border bg-transparent px-3 py-2.5 text-black leading-snug shadow-xs transition-[color,box-shadow] outline-none break-words [overflow-wrap:anywhere] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          className,
          // Callers pass Input heights (h-11 / h-12); let the box grow instead.
          "h-auto min-h-[3.25rem]",
        )}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.preventDefault();
          onKeyDown?.(e);
        }}
        onChange={(e) => {
          // Pasted line breaks would break the single-line value.
          if (/[\r\n]/.test(e.target.value)) {
            e.target.value = e.target.value.replace(/\s*[\r\n]+\s*/g, " ");
          }
          onChange?.(e);
          fitHeight();
        }}
        {...props}
      />
    );
  },
);

LongTextInput.displayName = "LongTextInput";

export { LongTextInput };
