"use client";

import { useFormContext } from "react-hook-form";
import { SiteEssentialsFormValues } from "../../_lib/hooks";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { SectionTitle } from "../ui/section-title";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectLabel,
  SelectGroup,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SiteEssentialsGoogleFontsLoader } from "@/components/shared/site-essentials-google-fonts-loader";
import { SITE_ESSENTIALS_GOOGLE_FONTS_UI } from "@/lib/site-typography-google-fonts";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Common web-safe fonts
const webSafeFonts = [
  { name: "Arial", value: "Arial, sans-serif" },
  { name: "Verdana", value: "Verdana, sans-serif" },
  { name: "Helvetica", value: "Helvetica, sans-serif" },
  { name: "Tahoma", value: "Tahoma, sans-serif" },
  { name: "Trebuchet MS", value: "Trebuchet MS, sans-serif" },
  { name: "Georgia", value: "Georgia, serif" },
  { name: "Garamond", value: "Garamond, serif" },
  { name: "Times New Roman", value: "Times New Roman, serif" },
  { name: "Courier New", value: "Courier New, monospace" },
  { name: "Lucida Console", value: "Lucida Console, monospace" },
];

const googleFonts = SITE_ESSENTIALS_GOOGLE_FONTS_UI;

const ALL_PRESET_FONTS = [...webSafeFonts, ...googleFonts];

function isPresetFontStack(stack: string | undefined | null): boolean {
  if (!stack) return false;
  return ALL_PRESET_FONTS.some((f) => f.value === stack);
}

function getPresetFontLabel(stack: string | undefined | null): string | null {
  if (!stack) return null;
  return ALL_PRESET_FONTS.find((f) => f.value === stack)?.name ?? null;
}

export function TypographyTab() {
  const form = useFormContext<SiteEssentialsFormValues>();

  const headingStack = form.watch("typography.fontFamily.heading") ?? "";
  const bodyStack = form.watch("typography.fontFamily.body") ?? "";
  const headingFont = headingStack || "Arial, sans-serif";
  const bodyFont = bodyStack || "Arial, sans-serif";

  const [headingTab, setHeadingTab] = useState<"preset" | "custom">("preset");
  const [bodyTab, setBodyTab] = useState<"preset" | "custom">("preset");

  useEffect(() => {
    if (!headingStack) return;
    setHeadingTab(isPresetFontStack(headingStack) ? "preset" : "custom");
  }, [headingStack]);

  useEffect(() => {
    if (!bodyStack) return;
    setBodyTab(isPresetFontStack(bodyStack) ? "preset" : "custom");
  }, [bodyStack]);

  return (
    <div className="space-y-6">
      <SiteEssentialsGoogleFontsLoader
        linkId="site-essentials-google-fonts-typography-tab"
        headingStack={headingFont}
        bodyStack={bodyFont}
        customStylesheetUrls={form.watch("typography.customFontStylesheetUrls")}
      />
      <SectionTitle
        title="Typography"
        description="Configure your site's fonts and typography settings"
      />
      <Separator className="my-4" />

      <div className="grid gap-4 sm:grid-cols-2">
        <div
          className={cn(
            "rounded-lg border-2 bg-background p-4 shadow-sm transition-colors",
            "border-[var(--color-primary)]/40 ring-1 ring-[var(--color-primary)]/10",
          )}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Active heading font
            </span>
            <Badge
              variant={
                isPresetFontStack(headingStack) ? "secondary" : "outline"
              }
            >
              {isPresetFontStack(headingStack) ? "Preset" : "Custom"}
            </Badge>
          </div>
          <p
            className="truncate text-xl font-semibold"
            style={{ fontFamily: headingFont }}
            title={headingStack || undefined}
          >
            {headingStack
              ? (getPresetFontLabel(headingStack) ?? headingStack)
              : "—"}
          </p>
          <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
            {headingStack || "—"}
          </p>
        </div>
        <div
          className={cn(
            "rounded-lg border-2 bg-background p-4 shadow-sm transition-colors",
            "border-[var(--color-primary)]/40 ring-1 ring-[var(--color-primary)]/10",
          )}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Active body font
            </span>
            <Badge
              variant={isPresetFontStack(bodyStack) ? "secondary" : "outline"}
            >
              {isPresetFontStack(bodyStack) ? "Preset" : "Custom"}
            </Badge>
          </div>
          <p
            className="truncate text-xl font-semibold"
            style={{ fontFamily: bodyFont }}
            title={bodyStack || undefined}
          >
            {bodyStack
              ? (getPresetFontLabel(bodyStack) ?? bodyStack)
              : "—"}
          </p>
          <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
            {bodyStack || "—"}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <FormItem>
          <FormLabel>Heading Font</FormLabel>
          <FormDescription>Font used for headings and titles</FormDescription>

          <Tabs
            value={headingTab}
            onValueChange={(v) => setHeadingTab(v as "preset" | "custom")}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger
                value="preset"
                className="data-[state=active]:ring-2 data-[state=active]:ring-[var(--color-primary)]/40"
              >
                Preset Fonts
              </TabsTrigger>
              <TabsTrigger
                value="custom"
                className="data-[state=active]:ring-2 data-[state=active]:ring-[var(--color-primary)]/40"
              >
                Custom Font
              </TabsTrigger>
            </TabsList>

            <TabsContent value="preset" className="mt-2">
              <FormField
                control={form.control}
                name="typography.fontFamily.heading"
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger
                        className={cn(
                          field.value &&
                            isPresetFontStack(field.value) &&
                            "ring-2 ring-[var(--color-primary)]/35",
                        )}
                      >
                        <SelectValue placeholder="Select a font" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Web-safe Fonts</SelectLabel>
                        {webSafeFonts.map((font) => (
                          <SelectItem key={font.value} value={font.value}>
                            {font.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Google Fonts</SelectLabel>
                        {googleFonts.map((font) => (
                          <SelectItem key={font.value} value={font.value}>
                            {font.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              />
            </TabsContent>

            <TabsContent value="custom" className="mt-2">
              <FormField
                control={form.control}
                name="typography.fontFamily.heading"
                render={({ field }) => (
                  <FormItem>
                    <FormDescription className="mb-2">
                      Enter a custom font family (e.g. &quot;My Font,
                      sans-serif&quot;)
                    </FormDescription>
                    <FormControl>
                      <Input
                        placeholder="'My Font', sans-serif"
                        className="font-mono text-sm ring-2 ring-[var(--color-primary)]/25"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription className="text-xs mt-1">
                      Add stylesheet URLs below for fonts not on Google Fonts.
                    </FormDescription>
                  </FormItem>
                )}
              />
            </TabsContent>
          </Tabs>
          <FormMessage />
        </FormItem>

        <FormItem>
          <FormLabel>Body Font</FormLabel>
          <FormDescription>
            Font used for paragraphs and content
          </FormDescription>

          <Tabs
            value={bodyTab}
            onValueChange={(v) => setBodyTab(v as "preset" | "custom")}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger
                value="preset"
                className="data-[state=active]:ring-2 data-[state=active]:ring-[var(--color-primary)]/40"
              >
                Preset Fonts
              </TabsTrigger>
              <TabsTrigger
                value="custom"
                className="data-[state=active]:ring-2 data-[state=active]:ring-[var(--color-primary)]/40"
              >
                Custom Font
              </TabsTrigger>
            </TabsList>

            <TabsContent value="preset" className="mt-2">
              <FormField
                control={form.control}
                name="typography.fontFamily.body"
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger
                        className={cn(
                          field.value &&
                            isPresetFontStack(field.value) &&
                            "ring-2 ring-[var(--color-primary)]/35",
                        )}
                      >
                        <SelectValue placeholder="Select a font" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Web-safe Fonts</SelectLabel>
                        {webSafeFonts.map((font) => (
                          <SelectItem key={font.value} value={font.value}>
                            {font.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Google Fonts</SelectLabel>
                        {googleFonts.map((font) => (
                          <SelectItem key={font.value} value={font.value}>
                            {font.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              />
            </TabsContent>

            <TabsContent value="custom" className="mt-2">
              <FormField
                control={form.control}
                name="typography.fontFamily.body"
                render={({ field }) => (
                  <FormItem>
                    <FormDescription className="mb-2">
                      Enter a custom font family (e.g. &quot;My Font,
                      sans-serif&quot;)
                    </FormDescription>
                    <FormControl>
                      <Input
                        placeholder="'My Font', sans-serif"
                        className="font-mono text-sm ring-2 ring-[var(--color-primary)]/25"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormDescription className="text-xs mt-1">
                      Add stylesheet URLs below for fonts not on Google Fonts.
                    </FormDescription>
                  </FormItem>
                )}
              />
            </TabsContent>
          </Tabs>
          <FormMessage />
        </FormItem>
      </div>

      <FormField
        control={form.control}
        name="typography.customFontStylesheetUrls"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Custom font stylesheets (optional)</FormLabel>
            <FormDescription>
              One https:// URL per line for fonts that are not on Google Fonts.
              Example for Brownhill Script: paste{" "}
              <span className="whitespace-nowrap font-mono text-xs">
                https://fonts.cdnfonts.com/css/brownhill-script
              </span>
              , then set your heading (or body) custom font to{" "}
              <span className="whitespace-nowrap font-mono text-xs">
                &apos;Brownhill Script&apos;, cursive
              </span>
              . Respect the font license for your use case.
            </FormDescription>
            <FormControl>
              <Textarea
                rows={3}
                placeholder="https://fonts.cdnfonts.com/css/brownhill-script"
                value={Array.isArray(field.value) ? field.value.join("\n") : ""}
                onChange={(e) => {
                  const lines = e.target.value
                    .split("\n")
                    .map((l) => l.trim())
                    .filter(Boolean);
                  field.onChange(lines);
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div>
        <h3 className="text-sm font-medium mb-3">Font Preview</h3>
        <div className="space-y-4 rounded-md border-2 border-[var(--color-primary)]/25 bg-muted/30 p-4">
          <div
            className={cn(
              "rounded-md border-l-4 border-[var(--color-primary)] bg-background/80 p-3 pl-4",
            )}
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Heading (live)
            </p>
            <h1
              className="text-2xl font-semibold"
              style={{ fontFamily: headingFont }}
            >
              Heading Font Sample (h1)
            </h1>
            <h2
              className="mt-2 text-xl font-semibold"
              style={{ fontFamily: headingFont }}
            >
              Heading Font Sample (h2)
            </h2>
            <h3
              className="mt-2 text-lg font-semibold"
              style={{ fontFamily: headingFont }}
            >
              Heading Font Sample (h3)
            </h3>
          </div>

          <div
            className={cn(
              "rounded-md border-l-4 border-[var(--color-primary)] bg-background/80 p-3 pl-4",
            )}
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Body (live)
            </p>
            <div style={{ fontFamily: bodyFont }}>
              <p>
                Body font sample. This is how your main content will appear on
                your website. The quick brown fox jumps over the lazy dog. Lorem
                ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
                tempor incididunt ut labore et dolore magna aliqua.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
