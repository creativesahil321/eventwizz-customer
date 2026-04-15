"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface LocationOption {
  id: number;
  city?: string | null;
  name: string;
  /** true = active, false = inactive. When undefined, treat as active for backward compatibility. */
  status?: boolean;
}

interface LocationMultiSelectProps {
  locations: LocationOption[];
  value: number[];
  onChange: (value: number[]) => void;
  disabled?: boolean;
  placeholder?: string;
  loading?: boolean;
  className?: string;
}

export function LocationMultiSelect({
  locations,
  value,
  onChange,
  disabled = false,
  placeholder = "Select locations…",
  loading = false,
  className,
}: LocationMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const displayName = (loc: LocationOption) => loc.city || loc.name;
  const isActive = (loc: LocationOption) => loc.status !== false;
  const activeLocations = React.useMemo(
    () => locations.filter(isActive),
    [locations]
  );
  const filtered =
    search.trim() === ""
      ? locations
      : locations.filter((loc) =>
          displayName(loc).toLowerCase().includes(search.trim().toLowerCase())
        );

  const isAllSelected =
    activeLocations.length > 0 &&
    value.length === activeLocations.length &&
    activeLocations.every((loc) => value.includes(loc.id));

  const triggerLabel = React.useMemo(() => {
    if (loading) return "Loading…";
    if (isAllSelected) return "All locations";
    if (value.length === 0) return placeholder;
    if (value.length === 1) {
      const loc = locations.find((l) => l.id === value[0]);
      return loc ? (loc.city || loc.name) : `${value.length} selected`;
    }
    return `${value.length} locations selected`;
  }, [loading, isAllSelected, value, locations, placeholder]);

  const handleAllChange = (checked: boolean | "indeterminate") => {
    onChange(checked ? activeLocations.map((l) => l.id) : []);
  };

  const handleLocationChange = (id: number, checked: boolean | "indeterminate") => {
    const loc = locations.find((l) => l.id === id);
    if (loc && !isActive(loc)) return;
    if (checked) {
      onChange([...value, id]);
    } else {
      onChange(value.filter((v) => v !== id));
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className={cn(
            "w-full justify-between font-normal min-h-11 h-10 touch-manipulation",
            !value.length && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-[280px] max-w-[calc(100vw-2rem)] p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false} className="rounded-md border-0 shadow-none">
          <CommandInput
            placeholder="Search locations…"
            value={search}
            onValueChange={setSearch}
          />
          {/* Avoid double-scrollbar: CommandList should not scroll; ScrollArea handles scrolling */}
          <CommandList className="p-0 overflow-hidden">
            <CommandEmpty>No locations found.</CommandEmpty>
            <ScrollArea className="h-[min(280px,60vh)]">
              <div className="p-2 space-y-0.5">
                <div className="flex items-center gap-2 rounded-sm px-2 py-2.5 min-h-[44px] touch-manipulation">
                  <Checkbox
                    id="location-multi-all"
                    checked={isAllSelected}
                    onCheckedChange={handleAllChange}
                  />
                  <label
                    htmlFor="location-multi-all"
                    className="text-sm font-medium cursor-pointer flex-1 select-none"
                  >
                    All (all location access)
                  </label>
                  {isAllSelected && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </div>
                {filtered.map((loc) => {
                  const checked = value.includes(loc.id);
                  const inactive = !isActive(loc);
                  return (
                    <div
                      key={loc.id}
                      className={cn(
                        "flex items-center gap-2 rounded-sm px-2 py-2.5 min-h-[44px] touch-manipulation",
                        inactive && "opacity-80",
                        !inactive && "hover:bg-accent/50"
                      )}
                    >
                      <Checkbox
                        id={`location-multi-${loc.id}`}
                        checked={checked}
                        disabled={inactive ? !checked : isAllSelected}
                        onCheckedChange={(c) => handleLocationChange(loc.id, c)}
                      />
                      <label
                        htmlFor={`location-multi-${loc.id}`}
                        className={cn(
                          "text-sm flex-1 truncate select-none",
                          inactive ? "cursor-not-allowed text-muted-foreground" : "cursor-pointer"
                        )}
                      >
                        {displayName(loc)}
                      </label>
                      {inactive && (
                        <span
                          className="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border border-amber-200 dark:border-amber-800"
                          aria-label="Inactive location"
                        >
                          Inactive
                        </span>
                      )}
                      {checked && !isAllSelected && (
                        <Check className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
