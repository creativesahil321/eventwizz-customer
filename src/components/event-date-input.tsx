"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import type { InputProps } from "@/components/ui/input";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type EventDateInputProps = Omit<
  InputProps,
  "type" | "value" | "defaultValue" | "onChange"
> & {
  value: string;
  /** Called when a full date is chosen. Return false to revert the input. */
  onValueCommit: (value: string) => boolean | void;
};

/**
 * Native date input that commits as soon as a full YYYY-MM-DD is selected,
 * so live previews update immediately (not only on blur).
 */
export const EventDateInput = forwardRef<HTMLInputElement, EventDateInputProps>(
  function EventDateInput(
    { value, onValueCommit, onFocus, onBlur, ...props },
    ref,
  ) {
    const [localValue, setLocalValue] = useState(value);
    const isFocusedRef = useRef(false);
    const lastCommittedRef = useRef(value);

    useEffect(() => {
      lastCommittedRef.current = value;
      if (!isFocusedRef.current) {
        setLocalValue(value);
      }
    }, [value]);

    const commitIfChanged = (nextValue: string): boolean => {
      if (!ISO_DATE_RE.test(nextValue)) return true;
      if (nextValue === lastCommittedRef.current) return true;

      const accepted = onValueCommit(nextValue);
      if (accepted === false) {
        setLocalValue(lastCommittedRef.current);
        return false;
      }

      lastCommittedRef.current = nextValue;
      return true;
    };

    return (
      <Input
        {...props}
        ref={ref}
        type="date"
        value={localValue}
        onFocus={(e) => {
          isFocusedRef.current = true;
          onFocus?.(e);
        }}
        onChange={(e) => {
          const nextValue = e.target.value;
          setLocalValue(nextValue);
          // Commit on select (picker) so accordion header + preview update live.
          commitIfChanged(nextValue);
        }}
        onBlur={(e) => {
          isFocusedRef.current = false;
          const nextValue = e.target.value;
          commitIfChanged(nextValue);
          setLocalValue(lastCommittedRef.current || nextValue);
          onBlur?.(e);
        }}
      />
    );
  },
);
