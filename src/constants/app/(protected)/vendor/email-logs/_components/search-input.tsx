import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useDebouncedCallback } from "use-debounce";

interface DebouncedInputProps
  extends Omit<React.ComponentProps<typeof Input>, "onChange"> {
  value: string;
  onChange: (value: string) => void;
  delay?: number;
}

export const DebouncedInput = React.memo(
  ({ value, onChange, delay = 300, ...props }: DebouncedInputProps) => {
    const [localValue, setLocalValue] = useState(value);
    useEffect(() => {
      setLocalValue(value);
    }, [value]);

    const debouncedOnChange = useDebouncedCallback((newValue: string) => {
      onChange(newValue);
    }, delay);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalValue(e.target.value);
      debouncedOnChange(e.target.value);
    };
    return <Input {...props} value={localValue} onChange={handleChange} />;
  }
);
