"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  AlertTriangle,
  Loader2,
  Palette,
  RotateCcw,
  type LucideIcon,
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
  mergeFullPresetIntoValues,
  siteEssentialsColorsMatch,
  siteEssentialsFontPairKey,
  tryThemeColorGridOptionStorageKey,
  tryThemeFontGridOptionStorageKey,
  isVenueThemePresetId,
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

const HERO_ALIGN_OPTIONS: {
  v: BannerHeadingAlign;
  Icon: LucideIcon;
  label: string;
}[] = [
  { v: "left", Icon: AlignLeft, label: "Left" },
  { v: "center", Icon: AlignCenter, label: "Center" },
  { v: "right", Icon: AlignRight, label: "Right" },
];

const HERO_VALIGN_OPTIONS: {
  v: BannerHeadingValign;
  Icon: LucideIcon;
  label: string;
}[] = [
  { v: "top", Icon: AlignVerticalJustifyStart, label: "Top" },
  { v: "center", Icon: AlignVerticalJustifyCenter, label: "Middle" },
  { v: "bottom", Icon: AlignVerticalJustifyEnd, label: "Bottom" },
];

const COLOR_FILTERS = [
  { id: "all", label: "All" },
  { id: "dark", label: "Dark" },
  { id: "light", label: "Light" },
] as const;

/** Consistent section label used across every panel group. */
const SECTION_LABEL_CLASS =
  "text-[11px] font-semibold uppercase tracking-wide text-slate-500";
/** Consistent one-line helper text used under section labels. */
const SECTION_HINT_CLASS = "text-[11px] leading-snug text-slate-400";

function ColorPresetCard({
  opt,
  active,
  showRecent,
  layout,
  fontLabel,
  onSelect,
}: {
  opt: TryThemeColorGridOption;
  active: boolean;
  showRecent: boolean;
  layout: "recipe" | "compact";
  fontLabel?: string;
  onSelect: () => void;
}) {
  const [a, b, c] = opt.swatch;
  const acc = paletteAccessibilityFlags(opt.colors);
  const contrastWarn = !(acc.bodyTextAa && acc.primaryOnSurfaceUi);

  const statusChip =
    active ? (
      <span className="shrink-0 rounded-full bg-slate-900 px-1.5 py-0.5 text-[9px] font-medium text-white">
        In use
      </span>
    ) : showRecent ? (
      <span className="shrink-0 rounded-full border border-slate-200 px-1.5 py-0.5 text-[9px] font-medium text-slate-500">
        Recent
      </span>
    ) : null;

  const swatches = (
    <div className="flex shrink-0 gap-0.5" aria-hidden>
      {[a, b, c].map((hex) => (
        <span
          key={hex}
          className="h-5 w-5 rounded-full border border-black/10 shadow-inner"
          style={{ backgroundColor: hex }}
        />
      ))}
    </div>
  );

  return (
    <button
      type="button"
      aria-current={active ? "true" : undefined}
      onClick={onSelect}
      title={`${opt.name}${fontLabel ? ` · ${fontLabel}` : ""}\n${opt.tagline}`}
      className={cn(
        "relative rounded-xl border text-left transition-all duration-200",
        layout === "recipe"
          ? "flex items-start gap-3 p-3"
          : "flex flex-col items-center gap-1 p-2 pt-2.5",
        active
          ? "border-slate-900/20 bg-white shadow-[0_8px_28px_-10px_rgba(15,23,42,0.2)] ring-1 ring-slate-900/10"
          : "border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-sm",
      )}
    >
      {layout === "recipe" ? (
        <>
          {swatches}
          <span className="min-w-0 flex-1">
            <span className="flex items-start justify-between gap-2">
              <span className="text-[13px] font-semibold leading-snug text-slate-800">
                {opt.name}
              </span>
              {statusChip}
            </span>
            {fontLabel ? (
              <span className="mt-0.5 block text-[10px] text-slate-500">
                {fontLabel}
              </span>
            ) : null}
            <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
              {opt.tagline}
            </span>
          </span>
          {contrastWarn ? (
            <AlertTriangle
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600"
              aria-label="Contrast may be tight"
            />
          ) : null}
        </>
      ) : (
        <>
          {statusChip ? (
            <span className="absolute right-1.5 top-1.5 z-10">{statusChip}</span>
          ) : null}
          {contrastWarn ? (
            <AlertTriangle
              className="absolute left-1.5 top-1.5 h-3 w-3 text-amber-600"
              aria-label="Contrast may be tight"
            />
          ) : null}
          <div className={cn("flex gap-0.5", statusChip || contrastWarn ? "mt-4" : "mt-1")}>
            {[a, b, c].map((hex) => (
              <span
                key={hex}
                className="h-5 w-5 rounded-full border border-black/10 shadow-inner"
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
          <span className="line-clamp-1 w-full text-center text-[11px] font-medium text-slate-700">
            {opt.name}
          </span>
          <span className="line-clamp-2 w-full text-center text-[10px] leading-snug text-slate-500">
            {opt.tagline}
          </span>
        </>
      )}
    </button>
  );
}

function SegmentGroup<T extends string>({
  ariaLabel,
  value,
  options,
  onChange,
}: {
  ariaLabel: string;
  value: T;
  options: { v: T; Icon: LucideIcon; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div
      className="grid grid-cols-3 gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1"
      role="group"
      aria-label={ariaLabel}
    >
      {options.map(({ v, Icon, label }) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
            value === v
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900",
          )}
        >
          <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}

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
  /**
   * Location-page hero align/valign only — hide on multi-location main Home.
   * Default true so single-location / event previews keep the controls.
   */
  showHeroLayoutControls?: boolean;
  /** Rendered at the bottom of the panel — e.g. the editor injects Restore default theme here. */
  footerSlot?: ReactNode;
  /**
   * Optional action rendered near the top of the panel (under Save theme) — e.g.
   * the site preview injects an "Import from website" control here. Kept as a
   * slot so this component stays free of react-hook-form / import dependencies.
   */
  importSlot?: ReactNode;
  /**
   * When set, shows a clear “Discard changes” control so vendors can undo an
   * import / theme try and return the live preview to the session baseline.
   */
  onDiscardChanges?: () => void;
  /** Gates the Discard control (typically `previewRequiresSave`). */
  showDiscardChanges?: boolean;
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
  if (isVenueThemePresetId(id)) return "venue";
  return id.startsWith("lovable-") ? "modern" : "classic";
}

export function PreviewThemeCustomizer({
  values,
  onValuesChange,
  brandName = "Preview",
  sheetDescription,
  onSaveTheme,
  isSavingTheme = false,
  showHeroLayoutControls = true,
  footerSlot,
  importSlot,
  onDiscardChanges,
  showDiscardChanges = false,
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
      const cur = valuesRef.current;
      if (opt.source === "preset" && isVenueThemePresetId(opt.id)) {
        const preset = presetById(opt.id);
        const next = mergeFullPresetIntoValues(cur, preset);
        const sameColors = siteEssentialsColorsMatch(cur.colors, next.colors);
        const sameFonts =
          siteEssentialsFontPairKey(cur.typography) ===
          siteEssentialsFontPairKey(next.typography);
        const sameEmphasis =
          (cur.typography?.headingEmphasis ?? "") ===
          (next.typography?.headingEmphasis ?? "");
        if (sameColors && sameFonts && sameEmphasis) return;
        onValuesChange(next);
      } else {
        if (siteEssentialsColorsMatch(cur.colors, opt.colors)) {
          return;
        }
        onValuesChange(mergeColorPaletteIntoValues(cur, opt.colors));
      }
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
      const cur = valuesRef.current;
      const next = mergePresetFontsIntoValues(cur, preset);
      if (
        siteEssentialsFontPairKey(cur.typography) ===
        siteEssentialsFontPairKey(next.typography)
      ) {
        return;
      }
      onValuesChange(next);
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
      const cur = valuesRef.current;
      if (normalizeBannerHeadingAlign(cur.banner_heading_align) === align) {
        return;
      }
      onValuesChange({
        ...cur,
        banner_heading_align: align,
      });
    },
    [onValuesChange],
  );

  const applyHeroValign = useCallback(
    (valign: BannerHeadingValign) => {
      const cur = valuesRef.current;
      if (normalizeBannerHeadingValign(cur.banner_heading_valign) === valign) {
        return;
      }
      onValuesChange({
        ...cur,
        banner_heading_valign: valign,
      });
    },
    [onValuesChange],
  );

  const applyHeadingEmphasisStyle = useCallback(
    (emphasis: HeadingEmphasis) => {
      const cur = valuesRef.current;
      if (
        normalizeHeadingEmphasis(cur.typography?.headingEmphasis) === emphasis
      ) {
        return;
      }
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
      venue: { key: "venue", label: "Venue font pairs", items: [] },
      modern: { key: "modern", label: "Marketing font pairs", items: [] },
      classic: { key: "classic", label: "More font pairs", items: [] },
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
      venue: { key: "venue", label: "Venue recipes", items: [] },
      modern: { key: "modern", label: "Marketing palettes", items: [] },
      classic: { key: "classic", label: "More palettes", items: [] },
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
          "group fixed right-0 top-1/2 z-[70] flex -translate-y-1/2 items-center gap-0",
          "rounded-l-xl border border-r-0 border-slate-200 bg-white py-2.5 pl-3 pr-2.5",
          "text-sm font-semibold text-slate-800 shadow-md",
          // Collapsed: icon-only peek. Expanded on hover/focus: slide in + show label.
          "translate-x-[calc(100%-2.75rem)] transition-[transform,box-shadow,background-color,padding] duration-300 ease-out",
          "hover:translate-x-0 hover:bg-slate-50 hover:pl-4 hover:shadow-lg",
          "focus-visible:translate-x-0 focus-visible:pl-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2",
          "motion-reduce:translate-x-0 motion-reduce:pl-4",
          open && "pointer-events-none opacity-0",
        )}
      >
        <span
          className={cn(
            "max-w-0 overflow-hidden whitespace-nowrap text-xs leading-none opacity-0 transition-[max-width,opacity,margin] duration-300 ease-out sm:text-sm",
            "group-hover:mr-2.5 group-hover:max-w-[6.5rem] group-hover:opacity-100",
            "group-focus-visible:mr-2.5 group-focus-visible:max-w-[6.5rem] group-focus-visible:opacity-100",
            "motion-reduce:mr-2.5 motion-reduce:max-w-[6.5rem] motion-reduce:opacity-100",
          )}
        >
          Try theme
        </span>
        <Palette
          className="h-5 w-5 shrink-0 text-slate-700 transition-transform duration-300 ease-out group-hover:scale-110 motion-reduce:group-hover:scale-100"
          aria-hidden
        />
      </button>

      {/* modal={false}: avoid Radix RemoveScroll / body lock so the preview page stays scrollable */}
      <Sheet open={open} onOpenChange={handleOpenChange} modal={false}>
        <SheetContent
          id="preview-theme-customizer-sheet"
          side="right"
          // Sit above the preview review chrome (2-row fixed bar ≈ 9rem) so the
          // pinned Restore footer is never covered. Inline zIndex beats any
          // competing utility / stacking-context quirks from the portal.
          style={{ zIndex: 200 }}
          className="!inset-y-auto !top-0 !bottom-36 !h-auto !max-h-none z-[200] flex w-full max-w-[380px] flex-col gap-0 overflow-hidden border-l border-slate-200 bg-white p-0 shadow-xl sm:max-w-[380px]"
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

          {onSaveTheme || importSlot || (showDiscardChanges && onDiscardChanges) ? (
            <div className="shrink-0 space-y-3 border-b border-slate-100 px-4 py-3">
              {onSaveTheme ? (
                <div className="space-y-1.5">
                  {/*
                    Must not use the default/event-primary variants — those bind to
                    preview CSS vars (--color-primary*). On some themes hover sets
                    white text on a light/white fill and the label vanishes.
                  */}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-slate-300 !bg-white !font-medium !text-slate-900 shadow-sm hover:!bg-slate-100 hover:!text-slate-900"
                    disabled={isSavingTheme || !canPersistSiteEssentials}
                    onClick={() => void onSaveTheme()}
                  >
                    {isSavingTheme ? (
                      <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" />
                    ) : null}
                    {canPersistSiteEssentials ? "Save theme" : "View only"}
                  </Button>
                  <p className={SECTION_HINT_CLASS}>
                    {canPersistSiteEssentials
                      ? "Publishes colors, fonts & hero layout to Site Essentials."
                      : "Read-only — needs the update-site-essential permission to save."}
                  </p>
                </div>
              ) : null}
              {importSlot}
              {showDiscardChanges && onDiscardChanges ? (
                <div className="space-y-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-slate-300 !bg-white !font-medium !text-slate-700 shadow-sm hover:!bg-slate-100 hover:!text-slate-900"
                    disabled={isSavingTheme}
                    onClick={onDiscardChanges}
                  >
                    <RotateCcw className="mr-2 h-4 w-4 shrink-0" />
                    Discard changes
                  </Button>
                  <p className={SECTION_HINT_CLASS}>
                    Undo import and theme tries — restores this preview to how
                    it looked when you opened it.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-5 px-4 py-4 pb-8">
              {showHeroLayoutControls ? (
                <section className="space-y-2.5">
                  <h3 className={SECTION_LABEL_CLASS}>Hero position</h3>
                  <div className="space-y-2">
                    <span className="block text-[11px] font-medium text-slate-500">
                      Horizontal
                    </span>
                    <SegmentGroup
                      ariaLabel="Hero text alignment"
                      value={currentHeroAlign}
                      options={HERO_ALIGN_OPTIONS}
                      onChange={applyHeroAlign}
                    />
                    <span className="block pt-1 text-[11px] font-medium text-slate-500">
                      Vertical
                    </span>
                    <SegmentGroup
                      ariaLabel="Hero vertical position"
                      value={currentHeroValign}
                      options={HERO_VALIGN_OPTIONS}
                      onChange={applyHeroValign}
                    />
                  </div>
                </section>
              ) : null}

              <div className="space-y-2.5">
                <h3 className={SECTION_LABEL_CLASS}>Heading style</h3>
                <p className={SECTION_HINT_CLASS}>
                  Trailing accent styles the last words of your banner title
                  automatically.
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
                          "mt-0.5 block text-[11px] leading-snug",
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

              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className={SECTION_LABEL_CLASS}>Colors</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="-mr-1 h-7 w-7 shrink-0 text-slate-400 hover:text-slate-700"
                    onClick={handleReset}
                    title="Undo all changes made since you opened this panel"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div
                  className="flex flex-wrap gap-1"
                  role="group"
                  aria-label="Filter palettes by brightness"
                >
                  {COLOR_FILTERS.map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={colorFilter === id}
                      onClick={() => setColorFilter(id)}
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                        colorFilter === id
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className={SECTION_HINT_CLASS}>
                  Start with a venue recipe — it sets colors, fonts, and
                  heading style together. Gold/brass is for badges, not body
                  text. More palettes are collapsed below.
                </p>
                <Accordion
                  type="multiple"
                  defaultValue={["venue"]}
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
                        <div
                          className={cn(
                            "grid gap-2",
                            group.key === "venue"
                              ? "grid-cols-1"
                              : "grid-cols-2",
                          )}
                        >
                          {group.items.map((opt) => {
                            const active = siteEssentialsColorsMatch(
                              values.colors,
                              opt.colors,
                            );
                            const pinned =
                              tryThemeColorGridOptionStorageKey(opt) ===
                              lastColorKey;
                            const presetRow =
                              opt.source === "preset"
                                ? SITE_THEME_PRESETS.find(
                                    (p) => p.id === opt.id,
                                  )
                                : undefined;
                            return (
                              <ColorPresetCard
                                key={
                                  opt.source === "preset"
                                    ? opt.id
                                    : `extra-${opt.key}`
                                }
                                opt={opt}
                                active={active}
                                showRecent={pinned && !active}
                                layout={
                                  group.key === "venue" ? "recipe" : "compact"
                                }
                                fontLabel={
                                  presetRow && group.key === "venue"
                                    ? `${presetRow.headingFontLabel} / ${presetRow.bodyFontLabel}`
                                    : undefined
                                }
                                onSelect={() => applyColorGridOption(opt)}
                              />
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>

              <div className="space-y-2.5">
                <h3 className={SECTION_LABEL_CLASS}>Fonts</h3>
                <p className={SECTION_HINT_CLASS}>
                  Venue recipes already include a font pair. Change this only
                  if you want a different heading/body mix.
                </p>
                <Accordion
                  type="multiple"
                  defaultValue={["venue"]}
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
                        <div className="grid grid-cols-2 gap-2">
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
            </div>
          </ScrollArea>

          {/* Pinned outside ScrollArea so Restore stays visible without scrolling
              past the palette grid, and sits above the preview review chrome. */}
          {footerSlot ? (
            <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-3">
              {footerSlot}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
