"use client";

import * as React from "react";
import { Check, ChevronsUpDown, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandInput,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface DiscountScopeOption {
  /** Number for location/event, or `${eventId}:${roomId}` for rooms */
  id: string | number;
  name: string;
  /** Section header, e.g. location city */
  group?: string;
  /** Secondary line under the name */
  hint?: string;
}

export interface DiscountScopeEmptyGroup {
  label: string;
  message?: string;
}

interface DiscountScopeMultiSelectProps {
  options: DiscountScopeOption[];
  value: Array<string | number>;
  onChange: (value: Array<string | number>) => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  unitLabel?: string;
  className?: string;
  emptyGroups?: DiscountScopeEmptyGroup[];
}

type OptionGroup = {
  label: string;
  options: DiscountScopeOption[];
  emptyMessage?: string;
};

function sameId(a: string | number, b: string | number) {
  return String(a) === String(b);
}

export function DiscountScopeMultiSelect({
  options,
  value,
  onChange,
  disabled = false,
  loading = false,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyLabel = "No options found.",
  unitLabel = "selected",
  className,
  emptyGroups = [],
}: DiscountScopeMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => {
      const haystack = `${o.name} ${o.group ?? ""} ${o.hint ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [options, search]);

  const groups = React.useMemo(() => {
    const map = new Map<string, DiscountScopeOption[]>();
    for (const opt of filtered) {
      const key = opt.group?.trim() || "";
      const list = map.get(key) ?? [];
      list.push(opt);
      map.set(key, list);
    }

    const result: OptionGroup[] = [];
    const seen = new Set<string>();

    for (const [label, opts] of map.entries()) {
      seen.add(label);
      result.push({ label, options: opts });
    }

    if (!search.trim()) {
      for (const empty of emptyGroups) {
        const label = empty.label.trim();
        if (!label || seen.has(label)) continue;
        seen.add(label);
        result.push({
          label,
          options: [],
          emptyMessage: empty.message || "No rooms for this event",
        });
      }
    }

    return result;
  }, [filtered, emptyGroups, search]);

  const hasVisibleContent =
    filtered.length > 0 || (!search.trim() && emptyGroups.length > 0);

  const triggerLabel = React.useMemo(() => {
    if (loading) return "Loading…";
    if (value.length === 0) return placeholder;
    if (value.length === 1) {
      const opt = options.find((o) => sameId(o.id, value[0]));
      if (!opt) return `1 ${unitLabel}`;
      return opt.group ? `${opt.name} · ${opt.group}` : opt.name;
    }
    return `${value.length} ${unitLabel}`;
  }, [loading, value, options, placeholder, unitLabel]);

  const toggle = (id: string | number, checked: boolean | "indeterminate") => {
    if (checked === true) {
      if (value.some((v) => sameId(v, id))) return;
      onChange([...value, id]);
      return;
    }
    onChange(value.filter((v) => !sameId(v, id)));
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className={cn(
            "h-11 w-full min-h-11 justify-between touch-manipulation font-normal sm:h-10 sm:min-h-10",
            !value.length && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate text-left">{triggerLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-1.5rem)] p-0"
        align="start"
        sideOffset={4}
        collisionPadding={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false} className="rounded-md border-0 shadow-none">
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="overflow-hidden p-0">
            {!hasVisibleContent ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                {emptyLabel}
              </p>
            ) : (
              <ScrollArea className="h-[min(280px,50vh)]">
                <div className="space-y-2 p-2">
                  {groups.map((group) => (
                    <div
                      key={group.label || "__ungrouped"}
                      className="space-y-0.5"
                    >
                      {group.label ? (
                        <p className="sticky top-0 z-[1] bg-popover px-2 py-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                          {group.label}
                        </p>
                      ) : null}
                      {group.options.length === 0 ? (
                        <p className="px-2 py-2 text-xs text-muted-foreground">
                          {group.emptyMessage || "Nothing available"}
                        </p>
                      ) : (
                        group.options.map((opt) => {
                          const checked = value.some((v) => sameId(v, opt.id));
                          return (
                            <div
                              key={String(opt.id)}
                              className="flex min-h-[44px] items-start gap-2 rounded-sm px-2 py-2 hover:bg-accent/50"
                            >
                              <Checkbox
                                id={`discount-scope-${String(opt.id)}`}
                                checked={checked}
                                className="mt-0.5"
                                onCheckedChange={(c) => toggle(opt.id, c)}
                              />
                              <label
                                htmlFor={`discount-scope-${String(opt.id)}`}
                                className="min-w-0 flex-1 cursor-pointer select-none"
                              >
                                <span className="block truncate text-sm font-medium">
                                  {opt.name}
                                </span>
                                {opt.hint ? (
                                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                    {opt.hint}
                                  </span>
                                ) : null}
                              </label>
                              {checked ? (
                                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                              ) : null}
                            </div>
                          );
                        })
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** Encode / decode event-scoped room keys */
export { toRoomKey, parseRoomKey } from "../_lib/room-key";

export { ChevronDown };
