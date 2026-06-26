"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  AlertTriangle,
  Check,
  Loader2,
  Palette,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import type { SiteEssentialsFormValues } from "@/app/(protected)/_shared/sites-essentials/_lib/schema";
import {
  SITE_THEME_PRESETS,
  TRY_THEME_COLOR_GRID_OPTIONS,
  TRY_THEME_FONT_GRID_OPTIONS,
  mergeColorPaletteIntoValues,
  mergeGoogleOnlyFontsIntoValues,
  mergePresetFontsIntoValues,
  siteEssentialsColorsMatch,
  siteEssentialsFontPairKey,
  tryThemeColorGridOptionStorageKey,
  tryThemeFontGridOptionStorageKey,
  type SiteThemePresetId,
  type TryThemeColorGridOption,
  type TryThemeFontGridOption,
} from "@/app/(protected)/_shared/sites-essentials/_lib/site-theme-presets";
import {
  normalizeBannerHeadingAlign,
  normalizeBannerHeadingValign,
  type BannerHeadingAlign,
  type BannerHeadingValign,
} from "@/lib/banner-heading-align";
import type { HeadingEmphasis } from "@/lib/heading-emphasis";
import { normalizeHeadingEmphasis } from "@/lib/heading-emphasis";
import { useSiteEssentialsPresetFontsPreload } from "@/hooks/use-site-essentials-preset-fonts-preload";
import {
  isLightUiBackground,
  paletteAccessibilityFlags,
} from "@/lib/wcag-color-contrast";
import { usePermission } from "@/hooks/usePermission";

const PREVIEW_TRY_THEME_LAST_FONT_KEY = "eventwizz:preview-try-theme:last-font";
const PREVIEW_TRY_THEME_LAST_COLOR_KEY =
  "eventwizz:preview-try-theme:last-color";

const DEFAULT_SHEET_DESCRIPTION =
  "Tap a font or color to preview. Bonus palettes and pairs live here first—publish from Site Essentials when you are ready.";

const HEADING_STYLE_OPTIONS: {
  id: HeadingEmphasis;
  label: string;
  description: string;
}[] = [
  {
    id: "uniform",
    label: "Uniform",
    description: "Whole line in display font + one color.",
  },
  {
    id: "accent_tail",
    label: "Trailing accent",
    description:
      "Last words of the title in brand color + display font (auto split).",
  },
  {
    id: "full_primary",
    label: "Full primary",
    description: "Entire heading in brand color.",
  },
];

function sortTryThemeOptionsFirst<T>(
  items: readonly T[],
  pinnedKey: string | null,
  keyOf: (item: T) => string,
): T[] {
  if (!pinnedKey) return [...items];
  const head: T[] = [];
  const tail: T[] = [];
  for (const item of items) {
    (keyOf(item) === pinnedKey ? head : tail).push(item);
  }
  return [...head, ...tail];
}

type PreviewThemeCustomizerProps = {
  values: SiteEssentialsFormValues;
  onValuesChange: (next: SiteEssentialsFormValues) => void;
  brandName?: string;
  /** e.g. event preview: clarify Site Essentials vs event editor save targets */
  sheetDescription?: string;
  /** Event preview: write Try theme → Site Essentials (API). Renders “Save theme” in this panel. */
  onSaveTheme?: () => void | Promise<void>;
  isSavingTheme?: boolean;
};

function presetById(
  id: SiteThemePresetId,
): (typeof SITE_THEME_PRESETS)[number] {
  const p = SITE_THEME_PRESETS.find((x) => x.id === id);
  if (!p) {
    throw new Error(`Unknown theme preset: ${id}`);
  }
  return p;
}

/** Preset ids prefixed `lovable-` are legacy internal keys; UI groups use neutral labels. */
function presetGroupKeyFromId(id: SiteThemePresetId) {
  return id.startsWith("lovable-") ? "modern" : "classic";
}

export function PreviewThemeCustomizer({
  values,
  onValuesChange,
  brandName = "Preview",
  sheetDescription,
  onSaveTheme,
  isSavingTheme = false,
}: PreviewThemeCustomizerProps) {
  const canPersistSiteEssentials = usePermission("update-site-essential");
  useSiteEssentialsPresetFontsPreload();
  const [open, setOpen] = useState(false);
  const [colorFilter, setColorFilter] = useState<"all" | "dark" | "light">(
    "all",
  );
  const [lastFontKey, setLastFontKey] = useState<string | null>(null);
  const [lastColorKey, setLastColorKey] = useState<string | null>(null);
  const snapshotRef = useRef<SiteEssentialsFormValues | null>(null);
  const valuesRef = useRef(values);
  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    try {
      setLastFontKey(sessionStorage.getItem(PREVIEW_TRY_THEME_LAST_FONT_KEY));
      setLastColorKey(sessionStorage.getItem(PREVIEW_TRY_THEME_LAST_COLOR_KEY));
    } catch {
      /* private mode */
    }
  }, [open]);

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

  const applyColorGridOption = useCallback(
    (opt: TryThemeColorGridOption) => {
      onValuesChange(
        mergeColorPaletteIntoValues(valuesRef.current, opt.colors),
      );
      const k = tryThemeColorGridOptionStorageKey(opt);
      setLastColorKey(k);
      try {
        sessionStorage.setItem(PREVIEW_TRY_THEME_LAST_COLOR_KEY, k);
      } catch {
        /* private mode */
      }
    },
    [onValuesChange],
  );

  const applyFonts = useCallback(
    (id: SiteThemePresetId) => {
      const preset = presetById(id);
      onValuesChange(mergePresetFontsIntoValues(valuesRef.current, preset));
    },
    [onValuesChange],
  );

  const applyFontGridOption = useCallback(
    (opt: TryThemeFontGridOption) => {
      if (opt.source === "preset") {
        applyFonts(opt.id);
      } else {
        onValuesChange(
          mergeGoogleOnlyFontsIntoValues(
            valuesRef.current,
            opt.headingStack,
            opt.bodyStack,
          ),
        );
      }
      const k = tryThemeFontGridOptionStorageKey(opt);
      setLastFontKey(k);
      try {
        sessionStorage.setItem(PREVIEW_TRY_THEME_LAST_FONT_KEY, k);
      } catch {
        /* private mode */
      }
    },
    [applyFonts, onValuesChange],
  );

  const applyHeroAlign = useCallback(
    (align: BannerHeadingAlign) => {
      onValuesChange({
        ...valuesRef.current,
        banner_heading_align: align,
      });
    },
    [onValuesChange],
  );

  const applyHeroValign = useCallback(
    (valign: BannerHeadingValign) => {
      onValuesChange({
        ...valuesRef.current,
        banner_heading_valign: valign,
      });
    },
    [onValuesChange],
  );

  const applyHeadingEmphasisStyle = useCallback(
    (emphasis: HeadingEmphasis) => {
      const cur = valuesRef.current;
      onValuesChange({
        ...cur,
        typography: {
          ...cur.typography,
          headingEmphasis: emphasis,
        },
      });
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

  const currentFontKey = siteEssentialsFontPairKey(values.typography);

  const orderedFontGridOptions = useMemo(
    () =>
      sortTryThemeOptionsFirst(
        TRY_THEME_FONT_GRID_OPTIONS,
        lastFontKey,
        tryThemeFontGridOptionStorageKey,
      ),
    [lastFontKey],
  );

  const groupedFontGridOptions = useMemo(() => {
    const groups: Record<
      string,
      { key: string; label: string; items: typeof orderedFontGridOptions }
    > = {
      modern: { key: "modern", label: "Marketing font pairs", items: [] },
      classic: { key: "classic", label: "Core font pairs", items: [] },
      extra: { key: "extra", label: "Extra font pairs", items: [] },
    };

    for (const opt of orderedFontGridOptions) {
      if (opt.source === "preset") {
        const k = presetGroupKeyFromId(opt.id);
        groups[k].items.push(opt);
      } else {
        groups.extra.items.push(opt);
      }
    }

    return Object.values(groups).filter((g) => g.items.length > 0);
  }, [orderedFontGridOptions]);

  const orderedColorGridOptions = useMemo(() => {
    let list = TRY_THEME_COLOR_GRID_OPTIONS;
    if (colorFilter === "dark") {
      list = list.filter((o) => !isLightUiBackground(o.colors.background));
    } else if (colorFilter === "light") {
      list = list.filter((o) => isLightUiBackground(o.colors.background));
    }
    return sortTryThemeOptionsFirst(
      list,
      lastColorKey,
      tryThemeColorGridOptionStorageKey,
    );
  }, [colorFilter, lastColorKey]);

  const groupedColorGridOptions = useMemo(() => {
    const groups: Record<
      string,
      {
        key: string;
        label: string;
        items: typeof orderedColorGridOptions;
      }
    > = {
      modern: { key: "modern", label: "Marketing palettes", items: [] },
      classic: { key: "classic", label: "Core palettes", items: [] },
      extra: { key: "extra", label: "Extra palettes", items: [] },
    };

    for (const opt of orderedColorGridOptions) {
      if (opt.source === "preset") {
        const k = presetGroupKeyFromId(opt.id);
        groups[k].items.push(opt);
      } else {
        groups.extra.items.push(opt);
      }
    }

    return Object.values(groups).filter((g) => g.items.length > 0);
  }, [orderedColorGridOptions]);

  const currentHeroAlign = normalizeBannerHeadingAlign(
    values.banner_heading_align,
  );
  const currentHeroValign = normalizeBannerHeadingValign(
    values.banner_heading_valign,
  );

  const currentHeadingEmphasis = normalizeHeadingEmphasis(
    values.typography?.headingEmphasis,
  );

  return (
    <>
      <button
        type="button"
        onClick={() => handleOpenChange(true)}
        aria-label="Open Try theme panel"
        aria-expanded={open}
        aria-controls="preview-theme-customizer-sheet"
        className={cn(
          "group fixed right-0 top-1/2 z-[70] flex -translate-y-1/2 flex-row-reverse items-center gap-2.5",
          "rounded-l-xl border border-r-0 border-slate-200 bg-white py-2.5 pl-4 pr-2.5",
          "text-sm font-semibold text-slate-800 shadow-md",
          "translate-x-[calc(100%-2.875rem)] transition-[transform,box-shadow,background-color] duration-300 ease-out",
          "hover:translate-x-0 hover:bg-slate-50 hover:shadow-lg",
          "focus-visible:translate-x-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2",
          "motion-reduce:translate-x-0",
          open && "pointer-events-none opacity-0",
        )}
      >
        <Palette
          className="h-5 w-5 shrink-0 text-slate-700 transition-transform duration-300 ease-out group-hover:scale-110 motion-reduce:group-hover:scale-100"
          aria-hidden
        />
        <span className="whitespace-nowrap text-right text-xs leading-none sm:text-sm">
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
            <SheetTitle className="text-lg text-slate-900">
              {brandName}
            </SheetTitle>
            <SheetDescription className="text-xs leading-relaxed text-slate-600">
              {sheetDescription ?? DEFAULT_SHEET_DESCRIPTION}
            </SheetDescription>
          </SheetHeader>

          {onSaveTheme ? (
            <div className="shrink-0 border-b border-slate-100 px-4 py-3">
              <Button
                type="button"
                className="w-full border border-slate-200 bg-white font-medium text-slate-900 shadow-sm hover:bg-slate-50"
                disabled={isSavingTheme || !canPersistSiteEssentials}
                onClick={() => void onSaveTheme()}
              >
                {isSavingTheme ? (
                  <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" />
                ) : null}
                {canPersistSiteEssentials ? "Save theme" : "View only"}
              </Button>
              <p className="mt-2 text-[10px] leading-snug text-slate-500">
                {canPersistSiteEssentials ? (
                  <>
                    Writes colors, fonts, and hero layout to Site Essentials
                    (same as Save on the Site Essentials page).
                  </>
                ) : (
                  <>
                    Saving requires the{" "}
                    <span className="font-medium text-slate-600">
                      update-site-essential
                    </span>{" "}
                    permission. You can still try fonts and colors in this
                    preview; they are not saved until someone with access saves
                    from here or Site Essentials.
                  </>
                )}
              </p>
            </div>
          ) : null}

          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-6 px-4 py-4 pb-8">
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Hero horizontal
                </h3>
                <div
                  className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1"
                  role="group"
                  aria-label="Hero text alignment"
                >
                  {(
                    [
                      { v: "left" as const, Icon: AlignLeft, label: "Left" },
                      {
                        v: "center" as const,
                        Icon: AlignCenter,
                        label: "Center",
                      },
                      { v: "right" as const, Icon: AlignRight, label: "Right" },
                    ] as const
                  ).map(({ v, Icon, label }) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => applyHeroAlign(v)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                        currentHeroAlign === v
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-600 hover:text-slate-900",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Hero vertical
                </h3>
                <div
                  className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1"
                  role="group"
                  aria-label="Hero vertical position"
                >
                  {(
                    [
                      {
                        v: "top" as const,
                        Icon: AlignVerticalJustifyStart,
                        label: "Top",
                      },
                      {
                        v: "center" as const,
                        Icon: AlignVerticalJustifyCenter,
                        label: "Middle",
                      },
                      {
                        v: "bottom" as const,
                        Icon: AlignVerticalJustifyEnd,
                        label: "Bottom",
                      },
                    ] as const
                  ).map(({ v, Icon, label }) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => applyHeroValign(v)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                        currentHeroValign === v
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-600 hover:text-slate-900",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Heading style
                </h3>
                <p className="mb-2 text-[10px] leading-snug text-slate-500">
                  Trailing accent uses the last words of your banner title
                  automatically (same idea as Site Essentials). Set a custom
                  phrase there if you need an exact match.
                </p>
                <div className="flex flex-col gap-1.5">
                  {HEADING_STYLE_OPTIONS.map(({ id, label, description }) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={currentHeadingEmphasis === id}
                      onClick={() => applyHeadingEmphasisStyle(id)}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-left text-xs transition-colors",
                        currentHeadingEmphasis === id
                          ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                      )}
                    >
                      <span className="font-semibold">{label}</span>
                      <span
                        className={cn(
                          "mt-0.5 block text-[10px] leading-snug",
                          currentHeadingEmphasis === id
                            ? "text-white/85"
                            : "text-slate-500",
                        )}
                      >
                        {description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

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
                    title="Reset to when you opened this panel"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
                <Accordion
                  type="multiple"
                  defaultValue={["modern", "classic"]}
                  className="w-full"
                >
                  {groupedFontGridOptions.map((group) => (
                    <AccordionItem
                      key={group.key}
                      value={group.key}
                      className="border-slate-200/80"
                    >
                      <AccordionTrigger className="py-2 text-xs text-slate-700 hover:no-underline">
                        <span className="flex w-full items-center justify-between gap-3">
                          <span className="font-semibold">{group.label}</span>
                          <span className="shrink-0 text-[10px] font-medium text-slate-500">
                            {group.items.length}
                          </span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="pt-0 pb-3">
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {group.items.map((opt) => {
                            const active =
                              currentFontKey ===
                              siteEssentialsFontPairKey({
                                fontFamily: {
                                  heading: opt.headingStack,
                                  body: opt.bodyStack,
                                },
                              });
                            const pinned =
                              tryThemeFontGridOptionStorageKey(opt) ===
                              lastFontKey;
                            const showRecent = pinned && !active;
                            return (
                              <button
                                key={
                                  opt.source === "preset"
                                    ? opt.id
                                    : `extra-${opt.key}`
                                }
                                type="button"
                                aria-current={active ? "true" : undefined}
                                onClick={() => applyFontGridOption(opt)}
                                className={cn(
                                  "relative flex min-h-[5.75rem] flex-col items-center justify-center rounded-xl border p-2 text-center transition-all duration-200",
                                  active ? "pt-6" : "",
                                  active
                                    ? "border-slate-300/90 bg-white shadow-[0_8px_28px_-10px_rgba(15,23,42,0.2),0_0_0_1px_rgba(15,23,42,0.05)] before:pointer-events-none before:absolute before:inset-y-3 before:left-0 before:w-[3px] before:rounded-r-full before:bg-slate-800 before:content-[''] hover:border-slate-400"
                                    : "border-slate-200/90 bg-slate-50/80 hover:border-slate-300 hover:bg-white hover:shadow-sm",
                                )}
                                title={
                                  opt.tagline
                                    ? `${opt.headingFontLabel} / ${opt.bodyFontLabel}\n\n${opt.tagline}`
                                    : `${opt.headingFontLabel} / ${opt.bodyFontLabel}`
                                }
                              >
                                {active ? (
                                  <span className="absolute left-1/2 top-1.5 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-slate-200/80 bg-white/95 px-2 py-0.5 text-[9px] font-medium text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.06)] backdrop-blur-sm">
                                    <span
                                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_0_1px_rgba(255,255,255,0.9)]"
                                      aria-hidden
                                    />
                                    In use
                                  </span>
                                ) : null}
                                {showRecent ? (
                                  <span
                                    className="absolute right-1 top-1 z-10 rounded-full border border-slate-200/90 bg-white px-1.5 py-0.5 text-[8px] font-medium text-slate-500 shadow-sm"
                                    title="Last picked this session"
                                  >
                                    Recent
                                  </span>
                                ) : null}
                                <span
                                  className="text-lg font-semibold leading-none text-slate-800"
                                  style={{ fontFamily: opt.headingStack }}
                                >
                                  Aa
                                </span>
                                <span
                                  className="mt-1 line-clamp-1 px-0.5 text-[9px] font-medium text-slate-600"
                                  style={{ fontFamily: opt.bodyStack }}
                                >
                                  {opt.bodyFontLabel}
                                </span>
                                {opt.tagline ? (
                                  <span className="mt-0.5 line-clamp-2 px-0.5 text-[7px] leading-tight text-slate-400">
                                    {opt.tagline}
                                  </span>
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>

              <div>
                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Try other colors
                  </h3>
                  <div
                    className="flex flex-wrap gap-1"
                    role="group"
                    aria-label="Filter palettes by brightness"
                  >
                    {(
                      [
                        { id: "all" as const, label: "All" },
                        { id: "dark" as const, label: "Dark" },
                        { id: "light" as const, label: "Light" },
                      ] as const
                    ).map(({ id, label }) => (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={colorFilter === id}
                        onClick={() => setColorFilter(id)}
                        className={cn(
                          "rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition-colors",
                          colorFilter === id
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="mb-3 text-[10px] leading-snug text-slate-500">
                  Three dots: page background, primary accent, and a key tone
                  (usually body text). Checkmark = body-on-background AA plus
                  primary-on-surface for cards; triangle = double-check in Site
                  Essentials.
                </p>
                <Accordion
                  type="multiple"
                  defaultValue={["modern", "classic"]}
                  className="w-full"
                >
                  {groupedColorGridOptions.map((group) => (
                    <AccordionItem
                      key={group.key}
                      value={group.key}
                      className="border-slate-200/80"
                    >
                      <AccordionTrigger className="py-2 text-xs text-slate-700 hover:no-underline">
                        <span className="flex w-full items-center justify-between gap-3">
                          <span className="font-semibold">{group.label}</span>
                          <span className="shrink-0 text-[10px] font-medium text-slate-500">
                            {group.items.length}
                          </span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="pt-0 pb-3">
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {group.items.map((opt) => {
                            const [a, b, c] = opt.swatch;
                            const active = siteEssentialsColorsMatch(
                              values.colors,
                              opt.colors,
                            );
                            const pinned =
                              tryThemeColorGridOptionStorageKey(opt) ===
                              lastColorKey;
                            const showRecent = pinned && !active;
                            const acc = paletteAccessibilityFlags(opt.colors);
                            const contrastOk =
                              acc.bodyTextAa && acc.primaryOnSurfaceUi;
                            return (
                              <button
                                key={
                                  opt.source === "preset"
                                    ? opt.id
                                    : `extra-${opt.key}`
                                }
                                type="button"
                                aria-current={active ? "true" : undefined}
                                onClick={() => applyColorGridOption(opt)}
                                className={cn(
                                  "relative flex flex-col items-center gap-1 rounded-xl border p-2 pt-2.5 transition-all duration-200",
                                  active
                                    ? "border-slate-300/90 bg-white shadow-[0_8px_28px_-10px_rgba(15,23,42,0.2),0_0_0_1px_rgba(15,23,42,0.05)] before:pointer-events-none before:absolute before:inset-y-3 before:left-0 before:w-[3px] before:rounded-r-full before:bg-slate-800 before:content-[''] hover:border-slate-400"
                                    : "border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-sm",
                                )}
                                title={`${opt.name}\n\n${opt.tagline}`}
                              >
                                {active ? (
                                  <span className="absolute right-1.5 top-1.5 z-10 flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/95 px-1.5 py-0.5 text-[8px] font-medium text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.06)] backdrop-blur-sm">
                                    <span
                                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_0_1px_rgba(255,255,255,0.9)]"
                                      aria-hidden
                                    />
                                    In use
                                  </span>
                                ) : null}
                                {showRecent ? (
                                  <span
                                    className="absolute right-1.5 top-1.5 z-10 rounded-full border border-slate-200/90 bg-white px-1.5 py-0.5 text-[8px] font-medium text-slate-500 shadow-sm"
                                    title="Last picked this session"
                                  >
                                    Recent
                                  </span>
                                ) : null}
                                <span
                                  className={cn(
                                    "absolute left-1.5 top-1.5 z-[1] flex h-4 w-4 items-center justify-center rounded-full border shadow-sm",
                                    contrastOk
                                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                      : "border-amber-200 bg-amber-50 text-amber-700",
                                  )}
                                  title={
                                    contrastOk
                                      ? "Body text and primary on surface meet common WCAG targets"
                                      : "Contrast may be tight — verify in Site Essentials"
                                  }
                                >
                                  {contrastOk ? (
                                    <Check
                                      className="h-2.5 w-2.5"
                                      strokeWidth={3}
                                    />
                                  ) : (
                                    <AlertTriangle className="h-2.5 w-2.5" />
                                  )}
                                </span>
                                <div className="mt-2 flex gap-0.5">
                                  <span
                                    className="h-5 w-5 rounded-full border border-black/10 shadow-inner"
                                    style={{ backgroundColor: a }}
                                  />
                                  <span
                                    className="h-5 w-5 rounded-full border border-black/10 shadow-inner"
                                    style={{ backgroundColor: b }}
                                  />
                                  <span
                                    className="h-5 w-5 rounded-full border border-black/10 shadow-inner"
                                    style={{ backgroundColor: c }}
                                  />
                                </div>
                                <span className="line-clamp-1 w-full text-center text-[9px] font-medium text-slate-700">
                                  {opt.name}
                                </span>
                                <span className="line-clamp-2 w-full text-center text-[8px] leading-snug text-slate-500">
                                  {opt.tagline}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
