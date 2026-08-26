"use client";

import type { CSSProperties } from "react";

const selectedStyle: CSSProperties = {
  backgroundColor: `color-mix(in srgb, var(--color-primary, #3b82f6) 15%, transparent)`,
  borderColor: `color-mix(in srgb, var(--color-primary, #3b82f6) 40%, transparent)`,
};

type ChoiceOption<T extends string | boolean> = {
  value: T;
  label: string;
};

type AIChoicePairProps<T extends string | boolean> = {
  options: [ChoiceOption<T>, ChoiceOption<T>];
  value: T | undefined;
  onChange: (value: T) => void;
  disabled?: boolean;
};

/** Equal-weight two-up choices. Nothing looks pre-selected until the vendor taps. */
export function AIChoicePair<T extends string | boolean>({
  options,
  value,
  onChange,
  disabled,
}: AIChoicePairProps<T>) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={`rounded-xl border px-6 py-3 text-sm font-medium transition-colors disabled:opacity-50 ${
              selected
                ? "text-white"
                : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
            style={selected ? selectedStyle : undefined}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

type FlowProgressProps = {
  current: number;
  total: number;
  label: string;
};

export function AIFlowProgress({ current, total, label }: FlowProgressProps) {
  return (
    <div className="mb-6">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
        Step {current} of {total}
        <span className="normal-case tracking-normal text-slate-400">
          {" "}
          · {label}
        </span>
      </p>
      <div className="flex gap-1.5" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full ${
              i < current ? "" : "bg-white/10"
            }`}
            style={
              i < current
                ? {
                    background:
                      "linear-gradient(to right, var(--color-primary, #3b82f6), var(--color-secondary, #8b5cf6))",
                  }
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}
