"use client";

import { useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";
import { Check, Palette, Sparkles, SlidersHorizontal, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteEssentialsFormValues } from "../../_lib/schema";
import {
  SITE_THEME_PRESETS,
  applySiteThemePreset,
  getMatchingSiteThemePresetId,
} from "../../_lib/site-theme-presets";
import { SectionTitle } from "../ui/section-title";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { AIColorThemeModal } from "../ai-color-theme-modal";
import { SiteEssentialsGoogleFontsLoader } from "@/components/shared/site-essentials-google-fonts-loader";
import { useToast } from "@/components/ui/use-toast";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { SiteHeading } from "@/components/public/site-heading";
import type { HeadingEmphasis } from "@/lib/heading-emphasis";

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
  const form = useFormContext<SiteEssentialsFormValues>();
  const { setValue, watch, getValues } = form;
  const { toast } = useToast();
  const [showAIModal, setShowAIModal] = useState(false);

  const colors = watch("colors");
  const typography = watch("typography");
  const headingStack = typography?.fontFamily?.heading ?? "";
  const bodyStack = typography?.fontFamily?.body ?? "";
  const headingEmphasisWatch =
    (watch("typography.headingEmphasis") ?? "uniform") as HeadingEmphasis;

  const bannerHeading = watch("banner_heading");
  const bannerAccent = watch("banner_heading_accent");

  const previewTitle = useMemo(() => {
    const t =
      typeof bannerHeading === "string" ? bannerHeading.trim() : "";
    return t || "Find Events Near You";
  }, [bannerHeading]);

  const previewAccentHint = useMemo(() => {
    const t =
      typeof bannerAccent === "string" ? bannerAccent.trim() : "";
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

  const activePresetId = useMemo(
    () =>
      getMatchingSiteThemePresetId({
        colors,
        typography,
      }),
    [colors, typography],
  );

  return (
    <div className="space-y-6">
      <SiteEssentialsGoogleFontsLoader
        linkId="site-essentials-google-fonts-presets-tab"
        headingStack={headingStack || "Arial, sans-serif"}
        bodyStack={bodyStack || "Arial, sans-serif"}
        customStylesheetUrls={typography?.customFontStylesheetUrls}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <SectionTitle
          title="Theme presets"
          description="Start from a professional color and font pairing, then fine-tune anything in Colors and Typography. Your existing branding content is untouched."
        />
        <Button
          type="button"
          variant="default"
          size="default"
          onClick={() => setShowAIModal(true)}
          className="flex shrink-0 items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg hover:from-purple-700 hover:to-blue-700"
        >
          <Sparkles className="h-4 w-4" />
          Generate with AI
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 border-slate-300"
          onClick={onGoToColors}
        >
          <Palette className="h-3.5 w-3.5" />
          Custom colors
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 border-slate-300"
          onClick={onGoToTypography}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Custom fonts
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 border-slate-300"
          onClick={onGoToBranding}
        >
          <Type className="h-3.5 w-3.5" />
          Landing heading text
        </Button>
      </div>

      <Separator />

      <div className="rounded-xl border border-[var(--color-primary)]/25 bg-muted/25 p-4 md:p-5">
        <h3 className="text-sm font-semibold text-foreground">
          Customer site headings
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Public vendor site only — not the dashboard. Text below uses your
          current colors and fonts (including after you apply a preset). Edit the
          line and optional accent under{" "}
          <span className="font-medium">Branding</span> → Landing Page Heading.
        </p>

        <FormField
          control={form.control}
          name="typography.headingEmphasis"
          render={({ field }) => (
            <FormItem className="mt-4 space-y-3">
              <FormLabel>Heading style</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value ?? "uniform"}
                  className="grid gap-4 sm:grid-cols-3"
                >
                  {(
                    [
                      {
                        value: "uniform" as const,
                        label: "Uniform",
                        hint: "Full line, one style",
                      },
                      {
                        value: "accent_tail" as const,
                        label: "Accent tail",
                        hint:
                          "Start: heading font; tail: body font + brand color (accent phrase optional)",
                      },
                      {
                        value: "full_primary" as const,
                        label: "Full primary",
                        hint: "Entire line in brand color",
                      },
                    ] as const
                  ).map((opt) => (
                    <div
                      key={opt.value}
                      className="flex items-start gap-3 rounded-lg border border-border/80 bg-background/80 p-3"
                    >
                      <RadioGroupItem
                        value={opt.value}
                        id={`presets-heading-emphasis-${opt.value}`}
                        className="mt-0.5"
                      />
                      <div className="min-w-0">
                        <Label
                          htmlFor={`presets-heading-emphasis-${opt.value}`}
                          className="cursor-pointer text-sm font-medium leading-none"
                        >
                          {opt.label}
                        </Label>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {opt.hint}
                        </p>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <p className="mt-5 text-xs font-medium text-muted-foreground">
          Live preview (your landing heading + current theme)
        </p>
        <div
          className="mt-2 rounded-lg bg-neutral-900 px-4 py-8 text-center"
          style={heroPreviewChrome}
        >
          <SiteHeading
            level={1}
            title={previewTitle}
            accentHint={previewAccentHint}
            emphasis={headingEmphasisWatch}
            variant="onDark"
            className="!text-2xl md:!text-4xl"
          />
        </div>
      </div>

      <Separator />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {SITE_THEME_PRESETS.map((preset) => {
          const selected = activePresetId === preset.id;
          const [c1, c2, c3] = preset.swatch;

          return (
            <div
              key={preset.id}
              className={cn(
                "relative flex flex-col overflow-hidden rounded-xl border-2 bg-white shadow-sm transition-shadow",
                selected
                  ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/25"
                  : "border-slate-200 hover:border-slate-300 hover:shadow-md",
              )}
            >
              <div
                className="flex h-14 w-full"
                style={{
                  background: `linear-gradient(110deg, ${c1} 0%, ${c1} 42%, ${c2} 42%, ${c2} 68%, ${c3} 68%, ${c3} 100%)`,
                }}
                aria-hidden
              />
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {preset.name}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-gray-500">
                    {preset.tagline}
                  </p>
                </div>
                <div className="rounded-md border border-slate-100 bg-slate-50/80 px-3 py-2">
                  <p
                    className="text-lg font-semibold leading-tight text-gray-900"
                    style={{ fontFamily: preset.typography.fontFamily.heading }}
                  >
                    Sample heading
                  </p>
                  <p
                    className="mt-1 text-xs text-gray-600"
                    style={{ fontFamily: preset.typography.fontFamily.body }}
                  >
                    {preset.headingFontLabel} · {preset.bodyFontLabel}
                  </p>
                </div>
                <Button
                  type="button"
                  variant={selected ? "event-secondary" : "event-primary"}
                  className="mt-auto w-full"
                  onClick={() => {
                    applySiteThemePreset(preset, setValue, getValues);
                    toast({
                      title: "Preset applied",
                      description:
                        "Colors and fonts updated — check the heading preview above.",
                    });
                  }}
                >
                  {selected ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Applied
                    </>
                  ) : (
                    "Apply preset"
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-500">
        AI theme generation updates colors only — pair it with a preset first if
        you want a matching font system, or adjust fonts afterward.
      </p>

      <AIColorThemeModal open={showAIModal} onOpenChange={setShowAIModal} />
    </div>
  );
}
