"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FormLabel } from "@/components/ui/form";
import { ColorPicker } from "@/components/ui/color-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GradientPickerProps {
  useGradient: boolean;
  onUseGradientChange: (useGradient: boolean) => void;
  solidColor: string;
  onSolidColorChange: (color: string) => void;
  gradientStartColor: string;
  onGradientStartColorChange: (color: string) => void;
  gradientEndColor: string;
  onGradientEndColorChange: (color: string) => void;
  gradientDirection: string;
  onGradientDirectionChange: (direction: string) => void;
  label?: string;
  disabled?: boolean;
}

export function GradientPicker({
  useGradient,
  onUseGradientChange,
  solidColor,
  onSolidColorChange,
  gradientStartColor,
  onGradientStartColorChange,
  gradientEndColor,
  onGradientEndColorChange,
  gradientDirection,
  onGradientDirectionChange,
  label = "Color",
  disabled = false,
}: GradientPickerProps) {
  // Ensure color values are never undefined
  const ensureColor = (color: string | undefined): string => {
    return color || "#FFFFFF";
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <FormLabel>{label}</FormLabel>
        <div className="flex items-center gap-2">
          <div
            className={`px-3 py-1 text-xs rounded-md cursor-pointer ${
              !useGradient
                ? "bg-[var(--color-primary)] text-white"
                : "bg-gray-200"
            }`}
            onClick={() => !disabled && onUseGradientChange(false)}
          >
            Solid
          </div>
          <div
            className={`px-3 py-1 text-xs rounded-md cursor-pointer ${
              useGradient
                ? "bg-[var(--color-primary)] text-white"
                : "bg-gray-200"
            }`}
            onClick={() => !disabled && onUseGradientChange(true)}
          >
            Gradient
          </div>
        </div>
      </div>

      {!useGradient && (
        <ColorPicker
          value={ensureColor(solidColor)}
          onChange={onSolidColorChange}
          disabled={disabled}
        />
      )}

      {useGradient && (
        <div className="space-y-3">
          <div
            className="h-12 rounded-md border"
            style={{
              background: `linear-gradient(${gradientDirection}, ${gradientStartColor}, ${gradientEndColor})`,
            }}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FormLabel className="text-xs">Start Color</FormLabel>
              <div className="mt-1">
                <ColorPicker
                  value={ensureColor(gradientStartColor)}
                  onChange={onGradientStartColorChange}
                  disabled={disabled}
                />
              </div>
            </div>
            <div>
              <FormLabel className="text-xs">End Color</FormLabel>
              <div className="mt-1">
                <ColorPicker
                  value={ensureColor(gradientEndColor)}
                  onChange={onGradientEndColorChange}
                  disabled={disabled}
                />
              </div>
            </div>
          </div>

          <div>
            <FormLabel className="text-xs">Direction</FormLabel>
            <div className="mt-1">
              <Select
                value={gradientDirection}
                onValueChange={onGradientDirectionChange}
                disabled={disabled}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select direction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="to right">Horizontal (→)</SelectItem>
                  <SelectItem value="to left">Horizontal (←)</SelectItem>
                  <SelectItem value="to bottom">Vertical (↓)</SelectItem>
                  <SelectItem value="to top">Vertical (↑)</SelectItem>
                  <SelectItem value="to bottom right">Diagonal (↘)</SelectItem>
                  <SelectItem value="to bottom left">Diagonal (↙)</SelectItem>
                  <SelectItem value="to top right">Diagonal (↗)</SelectItem>
                  <SelectItem value="to top left">Diagonal (↖)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper hook to manage gradient state
export function useGradient(initialValue: string) {
  const [useGradient, setUseGradient] = useState(false);
  const [gradientDirection, setGradientDirection] = useState("to right");
  const [gradientStartColor, setGradientStartColor] = useState("#000000");
  const [gradientEndColor, setGradientEndColor] = useState("#666666");
  const [solidColor, setSolidColor] = useState("#FFFFFF");
  const [value, setValue] = useState(initialValue);

  // Use ref to track if initial parsing is done
  const initialParsingDone = useRef(false);
  // Use ref to track the previous value to avoid unnecessary updates
  const prevValueRef = useRef(value);

  // Parse initial value only once
  useEffect(() => {
    if (initialParsingDone.current) return;

    if (initialValue) {
      if (initialValue.includes("linear-gradient")) {
        setUseGradient(true);

        // Try to extract gradient parameters
        try {
          const dirMatch = initialValue.match(/linear-gradient\(([^,]+),/);
          const colorsMatch = initialValue.match(
            /linear-gradient\([^,]+,\s*([^,]+),\s*([^)]+)\)/
          );

          if (dirMatch && dirMatch[1]) {
            setGradientDirection(dirMatch[1].trim());
          }

          if (colorsMatch && colorsMatch[1] && colorsMatch[2]) {
            setGradientStartColor(colorsMatch[1].trim());
            setGradientEndColor(colorsMatch[2].trim());
          }
        } catch (e) {
          console.error("Failed to parse gradient", e);
        }
      } else {
        setSolidColor(initialValue);
      }
      setValue(initialValue);
    }

    initialParsingDone.current = true;
  }, [initialValue]);

  // Create a memoized function to compute the value
  const computeValue = useCallback(() => {
    if (useGradient) {
      return `linear-gradient(${gradientDirection}, ${gradientStartColor}, ${gradientEndColor})`;
    } else {
      return solidColor;
    }
  }, [
    useGradient,
    gradientDirection,
    gradientStartColor,
    gradientEndColor,
    solidColor,
  ]);

  // Update value when components change, but only if the computed value is different
  useEffect(() => {
    const newValue = computeValue();
    if (newValue !== prevValueRef.current) {
      setValue(newValue);
      prevValueRef.current = newValue;
    }
  }, [computeValue]);

  return {
    value,
    useGradient,
    setUseGradient,
    gradientDirection,
    setGradientDirection,
    gradientStartColor,
    setGradientStartColor,
    gradientEndColor,
    setGradientEndColor,
    solidColor,
    setSolidColor,
  };
}
