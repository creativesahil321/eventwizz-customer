"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Palette, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { SiteEssentialsFormValues } from "@/app/(protected)/_shared/sites-essentials/_lib/schema";
import {
  SITE_THEME_PRESETS,
  PREVIEW_FONT_OPTIONS,
  mergePresetColorsIntoValues,
  mergePresetFontsIntoValues,
  type SiteThemePresetId,
} from "@/app/(protected)/_shared/sites-essentials/_lib/site-theme-presets";

type PreviewThemeCustomizerProps = {
  values: SiteEssentialsFormValues;
  onValuesChange: (next: SiteEssentialsFormValues) => void;
  brandName?: string;
};

function presetById(id: SiteThemePresetId): (typeof SITE_THEME_PRESETS)[number] {
  const p = SITE_THEME_PRESETS.find((x) => x.id === id);
  if (!p) {
    throw new Error(`Unknown theme preset: ${id}`);
  }
  return p;
}

function fontPairKey(v: SiteEssentialsFormValues) {
  const h = v.typography?.fontFamily?.heading ?? "";
  const b = v.typography?.fontFamily?.body ?? "";
  return `${h}\0${b}`;
}

export function PreviewThemeCustomizer({
  values,
  onValuesChange,
  brandName = "Preview",
}: PreviewThemeCustomizerProps) {
  const [open, setOpen] = useState(false);
  const snapshotRef = useRef<SiteEssentialsFormValues | null>(null);
  const valuesRef = useRef(values);
  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      try {
        snapshotRef.current = structuredClone(values);
      } catch {
        snapshotRef.current = JSON.parse(JSON.stringify(values));
      }
    }
    setOpen(next);
  };

  const applyColors = useCallback(
    (id: SiteThemePresetId) => {
      const preset = presetById(id);
      onValuesChange(
        mergePresetColorsIntoValues(valuesRef.current, preset),
      );
    },
    [onValuesChange],
  );

  const applyFonts = useCallback(
    (id: SiteThemePresetId) => {
      const preset = presetById(id);
      onValuesChange(
        mergePresetFontsIntoValues(valuesRef.current, preset),
      );
    },
    [onValuesChange],
  );

  const handleReset = () => {
    const snap = snapshotRef.current;
    if (snap) {
      try {
        onValuesChange(structuredClone(snap));
      } catch {
        onValuesChange(JSON.parse(JSON.stringify(snap)));
      }
    }
  };

  const currentFontKey = fontPairKey(values);

  return (
    <>
      <button
        type="button"
        onClick={() => handleOpenChange(true)}
        className={cn(
          "fixed right-0 top-1/2 z-[70] flex -translate-y-1/2 items-center gap-2 rounded-l-xl border border-r-0 border-slate-200 bg-white py-3 pl-3 pr-2 text-sm font-medium text-slate-800 shadow-lg transition hover:bg-slate-50",
          open && "pointer-events-none opacity-0",
        )}
        aria-expanded={open}
        aria-controls="preview-theme-customizer-sheet"
      >
        <Palette className="h-4 w-4 text-[var(--color-primary,#0f172a)]" />
        <span className="hidden max-w-[4.5rem] text-left text-xs leading-tight sm:inline">
          Try theme
        </span>
      </button>

      {/* modal={false}: avoid Radix RemoveScroll / body lock so the preview page stays scrollable */}
      <Sheet open={open} onOpenChange={handleOpenChange} modal={false}>
        <SheetContent
          id="preview-theme-customizer-sheet"
          side="right"
          className="z-[110] flex h-full max-h-[100dvh] w-full max-w-[380px] flex-col border-l border-slate-200 bg-white p-0 shadow-xl sm:max-w-[380px]"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <SheetHeader className="border-b border-slate-100 px-4 pb-4 pt-5 text-left">
            <SheetTitle className="text-lg text-slate-900">{brandName}</SheetTitle>
            <SheetDescription className="text-xs leading-relaxed text-slate-600">
              Use your saved Site Essentials as-is, or try fonts and color
              bundles below. Changes apply to this preview only until you save
              in Site Essentials.
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-6 px-4 py-4 pb-8">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Try other fonts
                  </h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-500"
                    onClick={handleReset}
                    title="Reset to when panel opened"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {PREVIEW_FONT_OPTIONS.map((opt) => {
                    const active =
                      currentFontKey ===
                      `${opt.headingStack}\0${opt.bodyStack}`;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => applyFonts(opt.id)}
                        className={cn(
                          "flex aspect-square flex-col items-center justify-center rounded-lg border bg-slate-50 p-1 text-center transition hover:border-[var(--color-primary)] hover:bg-white",
                          active
                            ? "border-2 border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/20"
                            : "border-slate-200",
                        )}
                        title={`${opt.headingFontLabel} / ${opt.bodyFontLabel}`}
                      >
                        <span
                          className="text-lg font-semibold leading-none text-slate-800"
                          style={{ fontFamily: opt.headingStack }}
                        >
                          Aa
                        </span>
                        <span
                          className="mt-1 line-clamp-2 px-0.5 text-[9px] text-slate-500"
                          style={{ fontFamily: opt.bodyStack }}
                        >
                          {opt.bodyFontLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Try other colors
                </h3>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-4">
                  {SITE_THEME_PRESETS.map((preset) => {
                    const [a, b] = [
                      preset.colors.primary,
                      preset.colors.secondary,
                    ];
                    const matchesPrimary =
                      (values.colors?.primary || "") === (preset.colors.primary || "");
                    const matchesSecondary =
                      (values.colors?.secondary || "") ===
                      (preset.colors.secondary || "");
                    const active = matchesPrimary && matchesSecondary;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyColors(preset.id)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 rounded-lg border p-2 transition hover:border-[var(--color-primary)]",
                          active
                            ? "border-2 border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/20"
                            : "border-slate-200 bg-white",
                        )}
                        title={preset.name}
                      >
                        <div className="flex gap-1">
                          <span
                            className="h-6 w-6 rounded-full border border-black/10 shadow-inner"
                            style={{ backgroundColor: a }}
                          />
                          <span
                            className="h-6 w-6 rounded-full border border-black/10 shadow-inner"
                            style={{ backgroundColor: b }}
                          />
                        </div>
                        <span className="line-clamp-1 w-full text-center text-[9px] font-medium text-slate-600">
                          {preset.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
