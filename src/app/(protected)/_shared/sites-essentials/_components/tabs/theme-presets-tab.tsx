"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useFormContext } from "react-hook-form";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteEssentialsFormValues } from "../../_lib/schema";
import {
  readLastAppliedSiteThemePresetId,
  writeLastAppliedSiteThemePresetId,
} from "../../_lib/site-theme-preset-local-cache";
import {
  SITE_THEME_PRESETS,
  applySiteThemePreset,
  getMatchingSiteThemePresetId,
  presetIncludesCdnStylesheets,
  type SiteThemePresetId,
} from "../../_lib/site-theme-presets";
import { SectionTitle } from "../ui/section-title";
import { cn } from "@/lib/utils";
import { SiteEssentialsGoogleFontsLoader } from "@/components/shared/site-essentials-google-fonts-loader";
import { useSiteEssentialsPresetFontsPreload } from "@/hooks/use-site-essentials-preset-fonts-preload";
import { useToast } from "@/components/ui/use-toast";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SiteHeading } from "@/components/public/site-heading";
import type { HeadingEmphasis } from "@/lib/heading-emphasis";
import {
  heroBannerStackClass,
  heroPreviewMiniVerticalClass,
  normalizeBannerHeadingAlign,
  normalizeBannerHeadingValign,
} from "@/lib/banner-heading-align";
import { Badge } from "@/components/ui/badge";

type ThemePresetsTabProps = {
  onGoToColors: () => void;
  onGoToTypography: () => void;
  onGoToBranding: () => void;
};

export function ThemePresetsTab({
  onGoToColors,
  onGoToTypography,
  onGoToBranding,
}: ThemePresetsTabProps) {
  useSiteEssentialsPresetFontsPreload();
  const { data: session, status: sessionStatus } = useSession();
  /** Stable per-account cache key (id may be absent on some session shapes). */
  const presetCacheUserKey =
    session?.user?.email?.trim() ||
    (session?.user as { id?: string })?.id ||
    session?.user?.uuid ||
    undefined;

  const form = useFormContext<SiteEssentialsFormValues>();
  const { setValue, watch, getValues } = form;
  const { toast } = useToast();

  const colors = watch("colors");
  const typography = watch("typography");
  const headingStack = typography?.fontFamily?.heading ?? "";
  const bodyStack = typography?.fontFamily?.body ?? "";
  const headingEmphasisWatch = (watch("typography.headingEmphasis") ??
    "uniform") as HeadingEmphasis;

  const bannerHeading = watch("banner_heading");
  const bannerAccent = watch("banner_heading_accent");
  const bannerAlignWatch = normalizeBannerHeadingAlign(
    watch("banner_heading_align"),
  );
  const bannerValignWatch = normalizeBannerHeadingValign(
    watch("banner_heading_valign"),
  );

  const previewTitle = useMemo(() => {
    const t = typeof bannerHeading === "string" ? bannerHeading.trim() : "";
    return t || "Find Events Near You";
  }, [bannerHeading]);

  const previewAccentHint = useMemo(() => {
    const t = typeof bannerAccent === "string" ? bannerAccent.trim() : "";
    return t.length > 0 ? t : undefined;
  }, [bannerAccent]);

  const heroPreviewChrome = useMemo(
    () =>
      ({
        "--color-primary": (colors?.primary?.trim() || "#0F172A") as string,
        "--font-heading": headingStack || "Georgia, serif",
        "--font-body": bodyStack || "Arial, sans-serif",
      }) as React.CSSProperties,
    [colors?.primary, headingStack, bodyStack],
  );

  const matchedPresetId = useMemo(
    () =>
      getMatchingSiteThemePresetId({
        colors,
        typography,
      }),
    [colors, typography],
  );

  const [lastAppliedPresetId, setLastAppliedPresetId] =
    useState<SiteThemePresetId | null>(null);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    setLastAppliedPresetId(readLastAppliedSiteThemePresetId(presetCacheUserKey));
  }, [presetCacheUserKey, sessionStatus]);

  useEffect(() => {
    if (matchedPresetId) {
      setLastAppliedPresetId(matchedPresetId);
      writeLastAppliedSiteThemePresetId(presetCacheUserKey, matchedPresetId);
    }
  }, [matchedPresetId, presetCacheUserKey]);

  /** Exact form match, else last “Apply preset” on this browser (localStorage). */
  const activePresetId = matchedPresetId ?? lastAppliedPresetId;

  return (
    <div className="space-y-3">
      <SiteEssentialsGoogleFontsLoader
        linkId="site-essentials-google-fonts-presets-tab"
        headingStack={headingStack || "Arial, sans-serif"}
        bodyStack={bodyStack || "Arial, sans-serif"}
        customStylesheetUrls={typography?.customFontStylesheetUrls}
      />

      <SectionTitle
        title="Theme presets"
        description="Apply a palette and fonts, then adjust other tabs as needed. Your copy and images stay as they are."
      />

      <p className="text-xs text-muted-foreground">
        <span className="text-foreground/70">More control:</span>{" "}
        <button
          type="button"
          className="font-medium text-[color:var(--color-primary)] underline-offset-2 hover:underline"
          onClick={onGoToColors}
        >
          Colors
        </button>
        <span className="mx-1 text-border">·</span>
        <button
          type="button"
          className="font-medium text-[color:var(--color-primary)] underline-offset-2 hover:underline"
          onClick={onGoToTypography}
        >
          Typography
        </button>
        <span className="mx-1 text-border">·</span>
        <button
          type="button"
          className="font-medium text-[color:var(--color-primary)] underline-offset-2 hover:underline"
          onClick={onGoToBranding}
        >
          Landing heading
        </button>
      </p>

      <div className="rounded-lg border border-border/70 bg-muted/15 p-2.5 sm:p-3">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4 lg:items-stretch">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">
              Customer site headings
            </h3>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              Public vendor pages only. Headline:{" "}
              <span className="font-medium text-foreground/80">Branding</span> →
              Landing page heading.
            </p>

            <FormField
              control={form.control}
              name="typography.headingEmphasis"
              render={({ field }) => (
                <FormItem className="mt-3 space-y-2">
                  <FormLabel className="text-xs">Heading style</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value ?? "uniform"}
                      className="grid gap-2 sm:grid-cols-3"
                    >
                      {(
                        [
                          {
                            value: "uniform" as const,
                            label: "Uniform",
                            hint: "One style for the full line",
                          },
                          {
                            value: "accent_tail" as const,
                            label: "Accent tail",
                            hint: "Body + script tail in brand color",
                          },
                          {
                            value: "full_primary" as const,
                            label: "Full primary",
                            hint: "Whole line in brand color",
                          },
                        ] as const
                      ).map((opt) => {
                        const itemId = `presets-heading-emphasis-${opt.value}`;
                        const selected =
                          (field.value ?? "uniform") === opt.value;
                        return (
                          <label
                            key={opt.value}
                            htmlFor={itemId}
                            className={cn(
                              "flex cursor-pointer items-start gap-2 rounded-md border border-border/70 bg-background p-2 transition-colors hover:bg-muted/40",
                              selected &&
                                "border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/15",
                            )}
                          >
                            <RadioGroupItem
                              value={opt.value}
                              id={itemId}
                              className="mt-0.5"
                            />
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-medium leading-tight">
                                {opt.label}
                              </span>
                              <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                                {opt.hint}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex min-h-0 w-full flex-col border-border/60 lg:border-l lg:pl-6">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Preview
            </p>
            <div
              className={cn(
                "mt-1.5 flex-1 rounded-lg bg-neutral-900",
                heroPreviewMiniVerticalClass(bannerValignWatch),
              )}
              style={heroPreviewChrome}
            >
              <div
                className={cn("w-full", heroBannerStackClass(bannerAlignWatch))}
              >
                <SiteHeading
                  level={1}
                  title={previewTitle}
                  accentHint={previewAccentHint}
                  emphasis={headingEmphasisWatch}
                  variant="onDark"
                  align={bannerAlignWatch}
                  className="!text-xl sm:!text-2xl md:!text-3xl"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {SITE_THEME_PRESETS.map((preset) => {
          const selected = activePresetId === preset.id;
          const [c1, c2, c3] = preset.swatch;

          return (
            <div
              key={preset.id}
              className={cn(
                "relative flex flex-col overflow-hidden rounded-md border bg-white shadow-sm transition-shadow",
                selected
                  ? "border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/20"
                  : "border-slate-200/90 hover:border-slate-300 hover:shadow",
              )}
            >
              <div
                className="flex h-7 w-full sm:h-8"
                style={{
                  background: `linear-gradient(110deg, ${c1} 0%, ${c1} 42%, ${c2} 42%, ${c2} 68%, ${c3} 68%, ${c3} 100%)`,
                }}
                aria-hidden
              />
              <div className="flex flex-1 flex-col gap-1.5 p-2 sm:p-2.5">
                <div className="min-h-0">
                  <div className="flex flex-wrap items-center gap-1">
                    <h3 className="text-xs font-semibold leading-tight text-gray-900">
                      {preset.name}
                    </h3>
                    {presetIncludesCdnStylesheets(preset) ? (
                      <Badge
                        variant="secondary"
                        className="px-1 py-0 text-[8px] font-medium uppercase leading-none tracking-wide"
                      >
                        CDN
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-gray-500">
                    {preset.tagline}
                  </p>
                </div>
                <div className="rounded border border-slate-100 bg-slate-50/80 px-2 py-1">
                  <p
                    className="text-xs font-semibold leading-tight text-gray-900"
                    style={{ fontFamily: preset.typography.fontFamily.heading }}
                  >
                    Sample heading
                  </p>
                  <p
                    className="mt-0.5 line-clamp-1 text-[9px] leading-tight text-gray-600"
                    style={{ fontFamily: preset.typography.fontFamily.body }}
                  >
                    {preset.headingFontLabel} · {preset.bodyFontLabel}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={selected ? "event-secondary" : "event-primary"}
                  className="mt-auto h-7 w-full px-2 text-[11px]"
                  onClick={() => {
                    applySiteThemePreset(preset, setValue, getValues);
                    writeLastAppliedSiteThemePresetId(
                      presetCacheUserKey,
                      preset.id,
                    );
                    setLastAppliedPresetId(preset.id);
                    toast({
                      title: "Preset applied",
                      description: presetIncludesCdnStylesheets(preset)
                        ? "Colors, fonts, and CDN stylesheet link added — see Typography → Custom font stylesheets if you want to edit."
                        : "Colors and fonts updated — check the heading preview above.",
                    });
                  }}
                >
                  {selected ? (
                    <>
                      <Check className="mr-1 h-3 w-3 shrink-0" />
                      Applied
                    </>
                  ) : (
                    "Apply"
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] leading-relaxed text-muted-foreground sm:text-[11px]">
        <span className="font-medium text-foreground/70">CDN font</span> presets
        add a stylesheet link (editable under Typography).{" "}
        <span className="text-foreground/60">
          The highlighted preset is remembered in this browser (refresh / Reset)
          until you apply another or the form exactly matches a different preset.
        </span>
      </p>
    </div>
  );
}
