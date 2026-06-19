"use client";

import { useState, useEffect, useRef } from "react";
import { HexColorPicker } from "react-colorful";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ColorPicker({ value, onChange, disabled }: ColorPickerProps) {
  const [color, setColor] = useState(value || "#FFFFFF");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isInternalChange = useRef(false);

  // Update color when value changes from external source
  useEffect(() => {
    if (!isInternalChange.current && value && value !== color) {
      setColor(value);
    }
    isInternalChange.current = false;
  }, [value, color]);

  // Update form value when color changes from picker
  const handleColorChange = (newColor: string) => {
    isInternalChange.current = true;
    setColor(newColor);
    onChange(newColor);
  };

  // Handle input change directly - allow typing freely
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Allow empty input
    if (inputValue === "") {
      setColor("");
      return;
    }

    // If user types just "#", allow it
    if (inputValue === "#") {
      setColor("#");
      return;
    }

    // Remove all invalid characters (keep only #, 0-9, A-F, a-f)
    let sanitized = inputValue.replace(/[^#0-9A-Fa-f]/g, "");

    // Limit to 7 characters max (#RRGGBB)
    sanitized = sanitized.slice(0, 7);

    // Handle the # character
    let newColor: string;
    if (sanitized.startsWith("#")) {
      // If it already has #, use it as is (but uppercase the hex part)
      newColor = "#" + sanitized.slice(1).toUpperCase();
    } else {
      // If no #, add it and uppercase
      newColor = "#" + sanitized.toUpperCase();
      // Limit to 6 hex digits after #
      if (newColor.length > 7) {
        newColor = newColor.slice(0, 7);
      }
    }

    // Update local state immediately for responsive typing
    isInternalChange.current = true;
    setColor(newColor);

    // Only update form value if it's a valid complete hex color (3 or 6 digits)
    // Allow partial typing, but only commit valid colors
    if (/^#[0-9A-F]{3}$/i.test(newColor) || /^#[0-9A-F]{6}$/i.test(newColor)) {
      onChange(newColor);
    }
  };

  // When input loses focus, validate and fix the color
  const handleBlur = () => {
    const trimmedColor = color.trim();

    // If empty, restore previous valid value
    if (!trimmedColor) {
      setColor(value || "#FFFFFF");
      return;
    }

    // If invalid format, try to fix it or restore previous value
    if (
      !/^#[0-9A-F]{3}$/i.test(trimmedColor) &&
      !/^#[0-9A-F]{6}$/i.test(trimmedColor)
    ) {
      // Try to pad with zeros if it's a partial 3-digit color
      if (/^#[0-9A-F]{1,2}$/i.test(trimmedColor)) {
        // Pad to 3 digits (e.g., #F -> #F00, #F0 -> #F00)
        const hexPart = trimmedColor.slice(1);
        const padded = "#" + hexPart.padEnd(3, "0").toUpperCase();
        isInternalChange.current = true;
        setColor(padded);
        onChange(padded);
        return;
      }
      // If it's 4-5 digits, try to complete to 6 digits
      if (/^#[0-9A-F]{4,5}$/i.test(trimmedColor)) {
        const hexPart = trimmedColor.slice(1);
        const padded = "#" + hexPart.padEnd(6, "0").toUpperCase();
        isInternalChange.current = true;
        setColor(padded);
        onChange(padded);
        return;
      }
      // If completely invalid, restore previous valid value
      isInternalChange.current = true;
      setColor(value || "#FFFFFF");
      return;
    }

    // Ensure it's uppercase and valid
    const validColor = trimmedColor.toUpperCase();
    if (validColor !== color) {
      isInternalChange.current = true;
      setColor(validColor);
    }

    // Update form with the valid color
    onChange(validColor);
  };

  // Handle Enter key to validate immediately
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur(); // Trigger blur validation
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Popover open={isOpen && !disabled} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={`w-9 h-9 rounded-md border border-input shadow-sm ring-1 ring-inset ring-black/[0.08] flex items-center justify-center dark:ring-white/15 ${
              disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
            }`}
            style={{ backgroundColor: color || "#FFFFFF" }}
            onClick={() => setIsOpen(true)}
          />
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 border-none shadow-md"
          align="start"
        >
          <HexColorPicker color={color} onChange={handleColorChange} />
        </PopoverContent>
      </Popover>

      <Input
        ref={inputRef}
        type="text"
        value={color}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className="w-24 uppercase font-mono cursor-text focus:ring-2 focus:ring-primary focus:border-primary"
        maxLength={7}
        placeholder="#FFFFFF"
        readOnly={false}
      />

      <div className="flex-1">
        <div
          className="w-full h-9 rounded-md border border-input ring-1 ring-inset ring-black/[0.08] dark:ring-white/15"
          style={{ backgroundColor: color || "#FFFFFF" }}
        />
      </div>
    </div>
  );
}
