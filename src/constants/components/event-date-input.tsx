"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import type { InputProps } from "@/components/ui/input";

export type EventDateInputProps = Omit<
  InputProps,
  "type" | "value" | "defaultValue" | "onChange"
> & {
  value: string;
  /** Called when the picker closes. Return false to revert the input. */
  onValueCommit: (value: string) => boolean | void;
};

/**
 * Native `<input type="date">` can emit change events while browsing months.
 * Keep edits local until blur so parent forms are not updated mid-picker.
 */
export const EventDateInput = forwardRef<HTMLInputElement, EventDateInputProps>(
  function EventDateInput(
    { value, onValueCommit, onFocus, onBlur, ...props },
    ref,
  ) {
    const [localValue, setLocalValue] = useState(value);
    const isFocusedRef = useRef(false);
    const committedOnFocusRef = useRef(value);

    useEffect(() => {
      if (!isFocusedRef.current) {
        setLocalValue(value);
      }
    }, [value]);

    return (
      <Input
        {...props}
        ref={ref}
        type="date"
        value={localValue}
        onFocus={(e) => {
          isFocusedRef.current = true;
          committedOnFocusRef.current = value;
          onFocus?.(e);
        }}
        onChange={(e) => {
          setLocalValue(e.target.value);
        }}
        onBlur={(e) => {
          isFocusedRef.current = false;
          const nextValue = e.target.value;
          if (nextValue !== committedOnFocusRef.current) {
            const accepted = onValueCommit(nextValue);
            if (accepted === false) {
              setLocalValue(committedOnFocusRef.current);
              return;
            }
          }
          setLocalValue(nextValue);
          onBlur?.(e);
        }}
      />
    );
  },
);
